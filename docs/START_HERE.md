# 🎮 Terminal Dungeon - START HERE

**Welcome to Terminal Dungeon!** This guide will get you up and running in minutes.

---

## ✨ What is This?

Terminal Dungeon is a **complete multiplayer card game** inspired by Munchkin that runs entirely in your terminal.

### 🎯 Key Features

- ✅ **38 CLI commands** - No GUI, pure text interface
- ✅ **2-6 players on LAN** - Auto-discovery via UDP
- ✅ **99 cards** - 43 doors + 56 treasures
- ✅ **3 tier progression system** - Unlock stronger cards as you level up
- ✅ **Password-protected lobbies** - Private games
- ✅ **Automatic reconnection** - State resync if disconnected
- ✅ **Complete documentation** - Guides for everything

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Node.js

**On WSL/Ubuntu** (recommended):
```bash
# Open Ubuntu terminal (WSL)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install Dependencies

```bash
# Navigate to project directory
cd ~/Documents/unifei/ecos12/project

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 3: Play!

#### Terminal 1 - Server (Host)
```bash
npm run server

# At the server prompt:
create MyGame
# (enter a password, e.g., test123)
start
```

#### Terminal 2 - Client (Player)
```bash
npm run client

# At the client prompt:
list
join <CODE>
# (enter password: test123)
# (enter your name: Bob)

# After game starts:
open      # Open a door
fight     # Fight monster
end       # End turn
```

---

## 📖 Documentation

### Getting Started

| Document | When to Use |
|----------|-------------|
| **[QUICKSTART.md](QUICKSTART.md)** | Get playing in 5 minutes |
| **[INSTALL.md](INSTALL.md)** | Detailed installation & troubleshooting |
| **[LAN_SETUP_GUIDE.md](LAN_SETUP_GUIDE.md)** | Network configuration for multiplayer |

### Game Documentation

| Document | Description |
|----------|-------------|
| **[commands.md](ABOUT_GAME/commands.md)** | All 38 commands explained |
| **[rules.md](ABOUT_GAME/rules.md)** | Complete gameplay rules |
| **[card_interactions.md](ABOUT_GAME/card_interactions.md)** | Card mechanics & effects |
| **[networking.md](ABOUT_GAME/networking.md)** | Network setup & firewall |
| **[protocol.md](ABOUT_GAME/protocol.md)** | Technical protocol specification |

### Developer Documentation

| Document | Description |
|----------|-------------|
| **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | Automated tests & game simulator |
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Technical architecture overview |
| **[../CONTRIBUTING.md](../CONTRIBUTING.md)** | How to contribute & create decks |

---

## 🎮 Essential Commands

### In Lobby
```bash
list              # List available lobbies
join <code>       # Join a lobby (4-character code)
create <name>     # Create a lobby (host only)
start             # Start game (host, 2-6 players)
```

### During Game
```bash
open              # Open a door
fight             # Fight monster
flee              # Flee (d6 roll: 5-6 = success)
loot              # Draw treasure (if didn't fight)
end               # End your turn

hand              # View your cards
equip <id>        # Equip item
levelup           # Use "Go Up a Level" card

view all          # See everything
view players      # See all players
view table        # See game state
view feed         # See event feed

help              # Show all commands
rules             # Quick rules summary
status            # Your level and power
```

---

## 🏆 Game Objective

**Be the first to reach Level 15!**

### How to Play (Quick Summary)

1. **Open a Door** (`open`) - Reveals a Monster, Curse, or Event
2. **Fight or Flee** - If monster: compare your Power vs Monster Level
3. **Earn Rewards** - Level up and collect treasures
4. **End Turn** (`end`) - Hand limit of 5 cards

**Power = Your Level + Item Bonuses**

---

## 🔧 Testing & Validation

### Run Automated Tests
```bash
npm run test:complete    # Run full test suite
npm run test:simulate    # Watch simulated games
npm run test:integration # Basic integration test
```

### Validate Decks
```bash
npm run deckcheck
```

### Lint Code
```bash
npm run lint
```

---

## 🌐 LAN Multiplayer

### Requirements
- All devices on same network/subnet
- Open firewall ports:
  - **UDP 9999** - Lobby discovery
  - **TCP 4000-4010** - Game communication

### Test on Same Machine
```bash
# Terminal 1
npm run server

# Terminal 2
npm run client
```

### Play on Multiple Machines
1. Start server on one machine (host)
2. Note the 4-character lobby code (e.g., F9K3)
3. On other computers, run client
4. Use `list` to find the lobby
5. Use `join <CODE>` to enter

---

## 🐛 Troubleshooting

### "npm: command not found"
→ Install Node.js (see Step 1 above)

### "No lobbies found"
→ Wait 2-3 seconds after starting server
→ Check firewall (allows UDP 9999?)
→ Make sure you're on the same network

### "Connection refused"
→ Verify server is running
→ Check firewall (allows TCP 4000?)
→ Use correct host IP

### TypeScript compilation error
→ Run `npm install` again
→ Check you have Node.js 18+

---

## 📊 Project Stats

- **Lines of Code:** ~3,500+
- **TypeScript Files:** 15
- **Commands:** 38
- **Cards:** 99 (43 doors + 56 treasures)
- **Tier System:** 3 progression levels
- **Players:** 2-6 per lobby
- **Max Level:** 15 (default, configurable)

---

## ✅ Status: 100% Complete

All requirements from the master prompt have been successfully implemented!

### What's Next?

1. ✅ Structure created
2. ✅ Code implemented
3. ✅ Decks created
4. ✅ Documentation complete
5. ✅ Testing suite complete
6. ⏭️ **YOUR TURN:** Install and play!

```bash
# On WSL/Ubuntu:
cd ~/Documents/unifei/ecos12/project
npm install
npm run build
npm run server  # In one terminal
npm run client  # In another terminal
```

---

## 🎯 Recommended Reading Order

1. **This file** - You're here! ✓
2. **[QUICKSTART.md](QUICKSTART.md)** - 5-minute guide
3. **[commands.md](ABOUT_GAME/commands.md)** - Learn all commands
4. **[rules.md](ABOUT_GAME/rules.md)** - Master the game
5. **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Explore automated testing
6. **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Create your own decks!

---

## 💡 Tips

- Use **WSL/Ubuntu** instead of PowerShell for better compatibility
- Run `help` in-game to see available commands
- Use `view all` to see complete game state
- Create backups before modifying custom decks
- Check [TESTING_GUIDE.md](TESTING_GUIDE.md) to see automated game simulations

---

## 🎉 Have Fun!

Terminal Dungeon is ready to play! If you need help:

1. Read documentation in `docs/`
2. Run `help` in-game
3. Check [INSTALL.md](INSTALL.md) for installation issues
4. Review [LAN_SETUP_GUIDE.md](LAN_SETUP_GUIDE.md) for network problems

**Good luck in the dungeons!** 🗡️🐉✨
