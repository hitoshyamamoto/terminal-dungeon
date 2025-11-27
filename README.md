# Terminal Dungeon

A simplified, text-only, LAN-synchronized, Munchkin-inspired boardgame that runs entirely in the terminal.

## Features

- **CLI-only**: All actions via text commands, no keyboard shortcuts
- **LAN Multiplayer**: Auto-discovery with UDP beacons, synchronized state via TCP
- **Multiple Lobbies**: Password-protected lobbies on the same LAN
- **Modular Decks**: Data-driven YAML decks (Doors & Treasures)
- **Tier Progression**: Card unlock system based on player levels
- **Server-Authoritative**: Robust rules engine with state versioning

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start a server (host)
npm run server

# Start a client (player)
npm run client
```

## Gameplay

The objective is to reach **Level 15** (default, configurable). Each turn follows these phases:

1. **Open Door**: Reveal a card from the Doors deck
2. **Fight** (if Monster): Battle or flee
3. **Provoke Trouble** (optional): Play a Monster from hand
4. **Loot the Room** (if no fight): Draw a face-down Door card
5. **End Turn**: Enforce hand limit (≤5 cards)

### Core Mechanics

- **Power = Level + Item Bonuses + Temporary Effects**
- **Win Fight**: Power ≥ Monster Level → gain rewards
- **Lose Fight**: Attempt to flee (d6: 5-6 success) or suffer penalty
- **Death**: Lose items, -1 Level (min 1), draw 4+4 cards next turn
- **Interaction**: Players can help or harass during fights

## Commands

See [docs/commands.md](docs/commands.md) for the complete list of 38 commands.

Key commands:
- `list` - List available lobbies
- `join <code>` - Join a lobby
- `create <name>` - Create a lobby
- `open` - Open a door
- `fight` - Resolve combat
- `end` - End your turn
- `help [command]` - Get help

## Decks

Decks are defined in YAML format in the `decks/` directory:
- `decks/doors/` - Door decks (Monsters, Curses, Events)
- `decks/treasures/` - Treasure decks (Items, Instant cards, Level-ups)

### Validation

```bash
npm run deckcheck
```

This validates deck schemas and provides balance hints.

## Network Architecture

- **UDP (Port 9999)**: Lobby discovery beacons
- **TCP (Port 4000+)**: Game protocol, JSON-per-line
- **Server-Authoritative**: Host runs server and plays normally
- **State Versioning**: Reconnection support with RESYNC

## Documentation

- [Commands](docs/commands.md) - Complete command reference
- [Protocol](docs/protocol.md) - Network protocol specification
- [Networking](docs/networking.md) - LAN discovery and connection details
- [Rules](docs/rules.md) - Complete game rules

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Validate decks
npm run deckcheck
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Networking**: Native `net` (TCP) and `dgram` (UDP)
- **Validation**: Zod schemas
- **YAML**: js-yaml
- **Logging**: Pino

## License

MIT

