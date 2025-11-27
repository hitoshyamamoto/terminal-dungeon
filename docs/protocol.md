# Terminal Dungeon - Network Protocol

This document describes the JSON-based network protocol used for client-server communication.

## Overview

- **Transport:** TCP (JSON messages, one per line)
- **Format:** Newline-delimited JSON (`\n`)
- **Keep-Alive:** Ping/pong every ~10s
- **Reconnection:** Client sends RESYNC with last known revision

## Protocol Version

Current version: **1.0.0**

Version mismatches are rejected with an explicit error.

---

## Client → Server Messages

### JOIN
Join a lobby with password authentication.

```json
{
  "t": "JOIN",
  "lobbyId": "e3c7-42b8",
  "name": "Escanor",
  "password": "goblin42"
}
```

**Fields:**
- `lobbyId`: Lobby identifier
- `name`: Player display name
- `password`: Lobby password (plaintext; hashed on server)

**Response:** `WELCOME` or `ERROR`

---

### ACTION
Execute a game action.

```json
{
  "t": "ACTION",
  "kind": "OPEN"
}
```

**Action Kinds:**
- `OPEN` - Open a door
- `PROVOKE` - Provoke trouble (requires `cardId`)
- `FIGHT` - Resolve combat
- `FLEE` - Attempt to flee
- `HELP` - Offer help (requires `target`, optional `offer`)
- `ACCEPT` - Accept help offer
- `DECLINE` - Decline help offer
- `MOD` - Play modifier (requires `value`)
- `PLAY` - Play a card (requires `cardId`)
- `EQUIP` - Equip item (requires `cardId`)
- `UNEQUIP` - Unequip item (requires `cardId`)
- `LEVELUP` - Use level-up card
- `DISCARD` - Discard card (requires `cardId`)
- `LOOT` - Loot the room
- `END` - End turn

**Optional Fields:**
- `cardId` (string): Card identifier
- `target` (string): Target player (e.g., "@ana")
- `offer` (string): Help offer description (e.g., "1t", "2 treasures")
- `value` (number): Modifier value (e.g., +3, -2)

**Response:** `STATE` (if successful) or `ERROR`

---

### CHAT
Send a public chat message.

```json
{
  "t": "CHAT",
  "msg": "Good game!"
}
```

**Broadcast:** All players receive an `EVENT` message.

---

### WHISPER
Send a private message.

```json
{
  "t": "WHISPER",
  "to": "@ana",
  "msg": "Want to team up?"
}
```

**Fields:**
- `to`: Target player name (with `@` prefix)
- `msg`: Message content

---

### RESYNC
Request state synchronization after reconnection.

```json
{
  "t": "RESYNC",
  "sinceRev": 71
}
```

**Fields:**
- `sinceRev`: Last known state revision

**Response:** Server sends `STATE` with full or partial update.

---

### PING
Keep-alive ping.

```json
{
  "t": "PING"
}
```

**Response:** `PONG`

---

## Server → Client Messages

### WELCOME
Sent after successful join.

```json
{
  "t": "WELCOME",
  "you": "p3",
  "state": { ... },
  "decks": {
    "doors": { ... },
    "treasures": { ... }
  },
  "manifest": {
    "maxLevel": 15,
    "tiersEnabled": true,
    "tierWindows": { "1": [1, 5], "2": [6, 10], "3": [11, 15] },
    "tierWeights": { "1": 0.6, "2": 0.3, "3": 0.1 }
  }
}
```

**Fields:**
- `you`: Your player ID
- `state`: Full game state
- `decks`: Deck definitions (doors and treasures)
- `manifest`: Lobby configuration

---

### STATE
Broadcast whenever game state changes.

```json
{
  "t": "STATE",
  "rev": 72,
  "phase": "FIGHT",
  "active": "p2",
  "players": [
    {
      "id": "p1",
      "name": "Alice",
      "level": 3,
      "power": 8,
      "handSize": 5,
      "equipped": [...],
      "isDead": false
    }
  ],
  "fight": {
    "monster": { ... },
    "attacker": "p2",
    "helper": "p3",
    "helperOffer": "1t",
    "modifiers": 3,
    "modifierCount": 1,
    "playerPower": 10,
    "helperPower": 5,
    "monsterPower": 9
  },
  "turnOrder": ["p1", "p2", "p3"],
  "currentTurnIndex": 1
}
```

**Key Fields:**
- `rev`: State revision number (monotonically increasing)
- `phase`: Current game phase
- `active`: ID of active player
- `players`: Array of player summaries (no hand contents)
- `fight`: Current fight state (if in combat)

---

### EVENT
Narrative event or chat message.

```json
{
  "t": "EVENT",
  "msg": "@Alice opened a Door: Goblin Lvl 6 (2 treasures)."
}
```

**Usage:**
- Game events (combat, level-ups, etc.)
- Chat messages
- Whispers

---

### PROMPT
Request player input (advanced; not in MVP).

```json
{
  "t": "PROMPT",
  "kind": "CHOOSE_CARD",
  "from": "hand",
  "count": 1
}
```

---

### ERROR
Action failed or validation error.

```json
{
  "t": "ERROR",
  "msg": "Modifier limit reached (max 1 per Monster)."
}
```

---

### PONG
Keep-alive response.

```json
{
  "t": "PONG"
}
```

---

## State Versioning & Resync

Each `STATE` message includes a `rev` field (revision number). Clients track this locally.

On reconnection:
1. Client sends `RESYNC { "sinceRev": N }`
2. Server responds with:
   - **Patch:** Delta changes since revision N (if available)
   - **Snapshot:** Full state (if patch unavailable)

This ensures clients can recover seamlessly.

---

## Error Handling

### Password Failures
- 3 failed attempts → temporary block (5 minutes)
- Server responds with `ERROR { "msg": "Too many failed attempts." }`

### Version Mismatch
```json
{
  "t": "ERROR",
  "msg": "Version mismatch! Server: 1.0.0, Client: 0.9.0"
}
```

### Invalid Action
```json
{
  "t": "ERROR",
  "msg": "Invalid in this phase. Options: open | provoke | loot | end"
}
```

---

## Keep-Alive & Timeouts

- **Ping Interval:** ~10s
- **Timeout:** 30s without ping/pong → disconnect
- **Reconnect Backoff:** Exponential (2s, 4s, 8s, ..., max 5 attempts)

---

## Security Notes

1. **Password Hashing:** SHA-256 on server; never stored plaintext
2. **Rate Limiting:** JOIN/password attempts limited
3. **Version Check:** Enforced to prevent exploits
4. **Server-Authoritative:** All game logic runs on server

---

## Future Extensions (V1.1+)

- **Fair Shuffling:** Multi-party RNG seed exchange
- **Deck Proofs:** Merkle tree for verifiable shuffles
- **Replay System:** State log for post-game analysis

