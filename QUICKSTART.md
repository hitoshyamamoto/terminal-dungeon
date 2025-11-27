# Terminal Dungeon - Quick Start Guide

Get up and running in 5 minutes!

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build
```

## Playing Locally (Same Computer)

### Terminal 1 - Host
```bash
npm run server
```

Then type:
```
create Alice
(enter password: test123)
start
```

### Terminal 2 - Client
```bash
npm run client
```

Then type:
```
list
join <CODE>
(enter password: test123)
(enter name: Bob)
```

## Basic Gameplay

### Your Turn

1. **Open Door:** `open`
2. **Fight Monster (if appears):** `fight` or `flee`
3. **End Turn:** `end`

### Combat

- **Check Power:** `status`
- **Equip Items:** `equip <card_id>`
- **Use Potions:** `play <card_id>`
- **Flee:** `flee` (roll 5-6 to escape)

### Viewing State

- **Your Hand:** `hand`
- **Game State:** `view all`
- **Players:** `view players`
- **Event Feed:** `view feed`

### Help & Info

- **Rules:** `rules`
- **Commands:** `help`
- **Card Details:** `show <card_id>`

## Example Game Flow

```bash
# Alice's turn
> open              # Reveals Goblin Lvl 3
> status            # Check your power
> fight             # Power 5 >= Monster 3 → WIN!
> end               # End turn

# Bob's turn
> open              # Reveals curse
> loot              # No fight, so loot a card
> equip T001        # Equip Shortsword +3
> end
```

## Win Condition

First to **Level 15** wins!

## Tips

1. **Equip items early** to increase power
2. **Save "Go Up a Level" cards** for critical moments
3. **Help others for rewards** during combat
4. **Watch the event feed** for what's happening

## Troubleshooting

### Can't find lobbies?
- Wait 2-3 seconds after server starts
- Check firewall (allow UDP 9999)

### Can't connect?
- Verify password
- Check TCP port 4000 is open
- Ensure same network/subnet

### Need more help?
- Read `INSTALL.md` for detailed setup
- Check `docs/` folder for full documentation
- Run `help` in-game for commands

## Commands Cheat Sheet

| Action | Command |
|--------|---------|
| Open door | `open` |
| Fight | `fight` |
| Flee | `flee` |
| Loot | `loot` |
| End turn | `end` |
| View hand | `hand` |
| Equip item | `equip <id>` |
| Level up | `levelup` |
| View state | `view all` |
| Chat | `chat <message>` |
| Help | `help` |

Have fun! 🎲

