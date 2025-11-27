# Installation Guide - Terminal Dungeon

## Prerequisites

- **Node.js:** v18+ (with npm)
- **Operating System:** Linux, macOS, or Windows (with WSL)

## Installation Steps

### 1. Install Node.js

#### Ubuntu/Debian (WSL or native)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### macOS
```bash
brew install node
```

#### Windows
Download from [nodejs.org](https://nodejs.org/)

### 2. Install Dependencies

Navigate to the project directory and install dependencies:

```bash
cd /path/to/terminal-dungeon
npm install
```

### 3. Build the Project

```bash
npm run build
```

## Running the Game

### Start a Server (Host)

```bash
npm run server
```

**Commands:**
- `create <name>` - Create a lobby
- `start` - Start the game (requires 2-6 players)
- `status` - Check lobby status
- `quit` - Stop server

### Start a Client (Player)

In a new terminal:

```bash
npm run client
```

**Commands:**
- `list` - List available lobbies on LAN
- `join <code>` - Join a lobby with 4-character code
- `help` - Show all commands

## Development Scripts

### Validate Decks
```bash
npm run deckcheck
```

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

## Troubleshooting

### "npm: command not found"

Make sure Node.js is installed:
```bash
node --version
npm --version
```

If using WSL, make sure you're running the commands inside WSL (Ubuntu), not PowerShell.

### "No lobbies found"

1. Check firewall settings (allow UDP 9999, TCP 4000-4010)
2. Ensure all devices are on the same subnet
3. Wait 2-3 seconds after starting server before running `list`

### "Connection refused"

1. Verify server is running
2. Check the TCP port (default 4000)
3. Ensure firewall allows TCP connections

### Permission errors on Linux

```bash
sudo chmod +x scripts/deckcheck.ts
```

## Playing on LAN

### Same Machine (Testing)

**Terminal 1:**
```bash
npm run server
# Create lobby, start game
```

**Terminal 2:**
```bash
npm run client
# List, join lobby
```

### Multiple Machines

1. All devices must be on the same network
2. Start server on host machine
3. Note the 4-character lobby code
4. On other machines, run client and use `join <code>`

## Network Configuration

### Linux Firewall (UFW)
```bash
sudo ufw allow 9999/udp
sudo ufw allow 4000:4010/tcp
```

### Windows Firewall
```powershell
netsh advfirewall firewall add rule name="Terminal Dungeon UDP" dir=in action=allow protocol=UDP localport=9999
netsh advfirewall firewall add rule name="Terminal Dungeon TCP" dir=in action=allow protocol=TCP localport=4000-4010
```

### macOS Firewall
Usually allows LAN traffic by default. If issues occur, temporarily disable firewall or add exception.

## Remote Play (Advanced)

For playing over the internet, use:
- **Tailscale:** Zero-config VPN
- **ZeroTier:** Virtual LAN
- **ngrok:** TCP tunneling

See [docs/networking.md](docs/networking.md) for details.

## Support

For issues or questions:
1. Check [docs/](docs/) folder for detailed documentation
2. Verify network connectivity
3. Check firewall settings
4. Review terminal output for error messages

## Quick Start (TL;DR)

```bash
# Install
npm install
npm run build

# Host (Terminal 1)
npm run server
# > create MyGame
# > (set password)
# > start

# Client (Terminal 2)
npm run client
# > list
# > join <CODE>
# > (enter password)
```

Enjoy the game!

