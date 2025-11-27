# Terminal Dungeon

> A Munchkin-inspired multiplayer card game that runs entirely in the terminal

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Terminal 1: Start server/host
npm run server

# Terminal 2: Start client/player
npm run client
```

**[📖 Full Installation Guide](docs/INSTALL.md)** | **[🚀 5-Minute Quickstart](docs/QUICKSTART.md)** | **[🇧🇷 Português](README_PT.md)**

---

## What is Terminal Dungeon?

A **text-only multiplayer card game** for 2-6 players on LAN:
- 🎮 **38 CLI commands** - No GUI, pure terminal interface
- 🌐 **Auto-discovery** - Find games on your network automatically
- 🃏 **99 cards** - Complete deck system with 3 progression tiers
- 🔒 **Password-protected lobbies** - Private games
- 🎲 **Munchkin-style gameplay** - Battle monsters, collect loot, reach Level 15

---

## Features

| Feature | Description |
|---------|-------------|
| **CLI-Only** | All actions via text commands, no keyboard shortcuts |
| **LAN Multiplayer** | UDP auto-discovery + TCP synchronized gameplay |
| **Multiple Lobbies** | Password-protected games on the same network |
| **Modular Decks** | YAML-based card definitions with schema validation |
| **Tier Progression** | Unlock stronger cards as you level up |
| **Server-Authoritative** | Robust FSM-based rules engine |
| **Reconnection** | Automatic state resync if disconnected |

---

## Gameplay

**Objective:** Be the first to reach **Level 15**!

**Your Turn:**
1. **Open Door** - Reveal a Monster, Curse, or Event
2. **Fight or Flee** - Battle monsters to gain levels and loot
3. **Loot** - Draw treasure if you didn't fight
4. **End Turn** - Discard down to 5 cards

**Power = Your Level + Item Bonuses**

[📚 Complete Rules](docs/ABOUT_GAME/rules.md) | [💬 All Commands](docs/ABOUT_GAME/commands.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| **[START_HERE.md](docs/START_HERE.md)** | New user guide - start here! |
| **[QUICKSTART.md](docs/QUICKSTART.md)** | Get playing |
| **[INSTALL.md](docs/INSTALL.md)** | Detailed installation instructions |
| **[TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** | Automated testing & simulation |
| **[LAN_SETUP_GUIDE.md](docs/LAN_SETUP_GUIDE.md)** | Network configuration & troubleshooting |
| **[PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)** | Technical overview & architecture |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | How to contribute |

### Game Documentation

- [Commands Reference](docs/ABOUT_GAME/commands.md) - All 38 commands explained
- [Game Rules](docs/ABOUT_GAME/rules.md) - Complete gameplay rules
- [Networking Guide](docs/ABOUT_GAME/networking.md) - LAN setup & firewall
- [Protocol Spec](docs/ABOUT_GAME/protocol.md) - Network protocol details
- [Card Interactions](docs/ABOUT_GAME/card_interactions.md) - Card mechanics & effects

---

## Commands Cheat Sheet

```bash
# Lobby
list                  # List available games
join <code>           # Join a lobby (4-char code)
create <name>         # Create a lobby (host)
start                 # Start game (host, 2-6 players)

# Gameplay
open                  # Open a door
fight                 # Fight monster
flee                  # Attempt to flee (d6: 5-6 success)
loot                  # Draw treasure
end                   # End your turn

# Items & Cards
hand                  # View your hand
equip <id>            # Equip item
levelup               # Use "Go Up a Level" card
view all              # See everything

# Help
help                  # Show all commands
rules                 # Quick rules summary
status                # Your level and power
```

---

## Development

```bash
# Run automated tests
npm run test:complete

# Run game simulator
npm run test:simulate

# Validate decks
npm run deckcheck

# Lint code
npm run lint
```

---

## Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Networking:** Native TCP (`net`) and UDP (`dgram`)
- **Validation:** Zod schemas
- **Data Format:** YAML decks (js-yaml)
- **Logging:** Pino

---

## Network Ports

- **UDP 9999** - Lobby discovery (beacons every 2s)
- **TCP 4000+** - Game protocol (JSON-per-line)

Make sure these ports are open in your firewall for multiplayer!

---

## Project Structure

```
terminal-dungeon/
├── client/           # Client implementation
├── server/           # Server implementation
├── shared/           # Shared code & types
├── decks/            # YAML card definitions
├── docs/             # Documentation
└── scripts/          # Utilities & tests
```

---

## License

[MIT](LICENSE) - See LICENSE file for details

---

## Status

✅ **100% Complete** - All requirements implemented and tested!

---

**Ready to play?** Check out **[START_HERE.md](docs/START_HERE.md)** to get started!
