# TODO

## Data Models

### Set Info

- Tournament Name
- Round Label
- Best Of: (3 | 5 | 7)
- Format: (1v1 | 2v2)

### Caster

- Name
- []Socials
    - Icon (enum)
    - Handle

### Player

- Name
- Character
- Character Color

### Score Entity

- []Players
- CurrentScore
- Port/Team Color

### Overall Model

- SetInfo
- []Casters
- []ScoreEntities
    - 1v1 will have 2 entities, each containing 1 player
    - 2v2 will have 2 entities, each containing 2 players
    - FFA or 1v1v1 will have 3 or 4 entities, each containing 1+ players
    - etc
