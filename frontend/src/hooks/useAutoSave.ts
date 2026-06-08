import { useEffect, useRef, useState } from "react";
import type { StreamState } from "../types";
import { SetState, Update } from "../../wailsjs/go/internal/App";
import { EventsOn } from "../../wailsjs/runtime/runtime";

type ToastKind = "info" | "ok" | "warn" | "err";
type Toast = { kind: ToastKind; message: string } | null;

export function useAutoSave() {
  const loadedRef = useRef(false);
  const fromGoRef = useRef(false);
  const [toast, setToast] = useState<Toast>(null);

  const flash = (kind: ToastKind, message: string) =>
    setToast({ kind, message });

  // Auto-save state changes to Go backend
  function useAutoSaveEffect(state: StreamState | null) {
    useEffect(() => {
      if (!state) return;
      if (!loadedRef.current) {
        loadedRef.current = true;
        return;
      }
      if (fromGoRef.current) {
        fromGoRef.current = false;
        return;
      }
      const timer = setTimeout(async () => {
        try {
          await SetState(state as any);
          await Update();
        } catch (e: any) {
          flash("err", "Error: " + e);
        }
      }, 300);
      return () => clearTimeout(timer);
    }, [state]);
  }

  // Listen for Go-side state changes
  function useGoStateSync(
    setSt: (s: StreamState) => void,
  ) {
    useEffect(() => {
      const cancel = EventsOn("state:changed", (newState: StreamState) => {
        fromGoRef.current = true;
        setSt(newState as unknown as StreamState);
      });
      return cancel;
    }, []);
  }

  return { flash, toast, setToast, useAutoSaveEffect, useGoStateSync };
}
