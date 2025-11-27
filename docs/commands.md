# Terminal Dungeon - Command Reference

Complete list of all 38 commands available in Terminal Dungeon.

## Global Commands (Always Available)

### `help [command]`
Display contextual help. If a command is specified, show detailed help for that command.

**Examples:**
```
help
help open
help fight
```

### `chat <message>`
Send a message to all players in the lobby.

**Example:**
```
chat Good game everyone!
```

### `whisper @name <message>`
Send a private message to a specific player.

**Example:**
```
whisper @alice Want to team up?
```

### `rules`
Display a short summary of the game rules.

### `status`
Show your current status: level, power, phase, turn state, and hand limit.

### `quit`
Leave the lobby or match. Prompts for confirmation.

### `feedback <text>`
Send UX feedback to the host logs (for improving the game).

## Lobby / Pre-Game Commands

### `list`
List all lobbies discovered on the LAN via UDP beacons.

**Output includes:**
- Lobby code
- Host IP and port
- Player count
- Status (OPEN, IN_GAME, FULL)

### `join <code>`
Join a lobby using its 4-character code. You'll be prompted for the password.

**Example:**
```
join F9K3
```

### `create <name>`
Create a new lobby with the given name. You'll be prompted to set a password.

**Example:**
```
create Alice's Game
```

### `start`
Start the match (host only). Requires 2-6 players.

### `password <new>`
Change the lobby password (host only, pre-game only).

## Turn Flow Commands

### `open`
Open a Door card. This begins your turn and reveals a card from the Doors deck.

**Valid in phase:** OPEN_DOOR

### `provoke`
Provoke Trouble by playing a Monster from your hand to start a fight.

**Valid in phase:** OPTIONAL_TROUBLE

**Example:**
```
provoke D117
```

### `loot`
Loot the Room. Draw a face-down Door card (only if no fight occurred this turn).

**Valid in phase:** OPTIONAL_TROUBLE, LOOT

### `end`
End your turn. Enforces hand limit (≤5 cards). Excess cards go to the lowest-level player.

**Valid in phase:** END_TURN (or any phase after completing required actions)

## Combat & Interaction Commands

### `fight`
Resolve the current fight. Compare your power vs. the monster's power.

**Valid in phase:** FIGHT

### `flee`
Attempt to flee from combat. Roll d6: 5-6 succeeds, otherwise you take the penalty.

**Valid in phase:** FIGHT

### `help @player [offer]`
Offer to help another player in combat. Optionally specify what you want in return.

**Examples:**
```
help @bob
help @bob 1t
help @alice 2 treasures
```

**Valid in phase:** FIGHT

### `accept`
Accept a help offer (if you're the one being helped).

**Valid in phase:** FIGHT

### `decline`
Decline a help offer.

**Valid in phase:** FIGHT

### `mod +N`
Play a modifier on the current Monster. Maximum 1 modifier per Monster (MVP rule).

**Example:**
```
mod +3
mod -2
```

**Valid in phase:** FIGHT

## Hand / Items / Cards Commands

### `hand`
List all cards in your hand with indices.

### `show <id>`
Show detailed information about a specific card (by ID or index).

**Examples:**
```
show 0
show D117
show T020
```

### `play <id>`
Play a card. Context determines the target (e.g., instant cards in combat).

**Example:**
```
play T020
```

### `equip <id>`
Equip an item card. Adds its bonus to your power.

**Example:**
```
equip T001
```

### `unequip <id>`
Unequip an item card (to discard it or make room).

**Example:**
```
unequip T001
```

### `levelup`
Play a "Go Up a Level" card. Maximum once per turn.

### `discard <id>`
Discard a card from your hand. Prompts for confirmation if the card is rare (Tier 3).

**Example:**
```
discard T033
```

## Dashboard Commands

### `view players`
Show all players' levels, power, and hand sizes.

### `view table`
Show the current turn, phase, active player, and fight details (if any).

### `view hand`
Same as `hand` command.

### `view feed [n]`
Show the last n events (default: 10).

**Example:**
```
view feed
view feed 20
```

### `view all`
Show table, players, and your hand all at once.

### `inspect @name`
See another player's board: level, equipped items, and power. Does NOT show their hand.

**Example:**
```
inspect @alice
```

## Auto-Refresh Commands

### `follow table`
Automatically reprint the table view whenever the state changes.

### `follow feed`
Follow the event feed like `tail -f`. New events print automatically.

### `unfollow`
Stop following table or feed.

---

## Command Errors & Suggestions

If you type an invalid command, the game will:
- Show an error message
- Suggest the closest valid command (using Levenshtein distance)

**Example:**
```
> oppen
Unknown command 'oppen'. Did you mean 'open'?
```

If you try to use a command in the wrong phase:
```
> loot
Invalid in this phase. Options: open | provoke | end
```

---

## Tips

- Commands are **case-insensitive**.
- No keyboard shortcuts; all actions are text commands.
- Type `help` at any time for a quick reference.
- Use `view all` to see everything at once if you're lost.

