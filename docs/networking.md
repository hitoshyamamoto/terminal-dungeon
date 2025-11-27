# Terminal Dungeon - Networking & LAN Discovery

This document explains the network architecture, UDP discovery, and TCP game protocol.

## Architecture Overview

```
┌─────────────────────────────────────┐
│  Host Player + Authoritative Server │
│  (TCP Server + UDP Beacon)          │
└────────────┬────────────────────────┘
             │
             ├──── TCP ───→ [Client Player 1]
             ├──── TCP ───→ [Client Player 2]
             └──── TCP ───→ [Client Player N]
             
             ↓ UDP Broadcast (discovery)
        [All Clients on LAN]
```

### Key Points
- **Host is a Player:** The host runs the server AND plays normally
- **Server-Authoritative:** All game logic runs on the host
- **LAN-Only (MVP):** No internet support; same subnet required
- **Multi-Lobby Support:** Multiple lobbies can run on the same LAN

---

## UDP Discovery (Port 9999)

### Beacon Broadcasting

Every lobby broadcasts a UDP beacon every ~2 seconds on port **9999**.

**Beacon Format:**
```json
{
  "t": "BEACON",
  "game": "Terminal Dungeon",
  "lobbyId": "e3c7-42b8",
  "code": "F9K3",
  "host": "192.168.0.23",
  "port": 4001,
  "players": 3,
  "maxPlayers": 6,
  "status": "OPEN",
  "version": "1.0.0",
  "decks": {
    "doors": "door_02",
    "treasures": "treasure_03"
  }
}
```

**Fields:**
- `lobbyId`: Unique lobby identifier (e.g., `e3c7-42b8`)
- `code`: 4-character join code (e.g., `F9K3`)
- `host`: Host IP address
- `port`: TCP port for game connection
- `players`: Current player count
- `maxPlayers`: Maximum players (6)
- `status`: `OPEN`, `IN_GAME`, or `FULL`
- `version`: Protocol version
- `decks`: Selected deck IDs (optional)

### Client Discovery

Clients listen on UDP port **9999** for beacons.

**Behavior:**
1. Receive beacon → update lobby list
2. Deduplicate by `lobbyId` (keep latest)
3. Expire lobbies with no beacon for >6s

**Usage:**
```bash
# Client command
list
```

**Output:**
```
=== Available Lobbies ===
  Code: F9K3 | 192.168.0.23:4001 | 3/6 | OPEN
  Code: A7B2 | 192.168.0.45:4002 | 2/6 | OPEN
```

---

## TCP Game Protocol

### Port Allocation

- **Base Port:** 4000
- **Subsequent Lobbies:** 4001, 4002, ...

Each lobby binds to a unique TCP port.

### Connection Flow

1. **Client Discovery:** Listen for UDP beacons
2. **Join:** Client connects to `host:port` via TCP
3. **Authenticate:** Send `JOIN` with password
4. **Welcome:** Server sends `WELCOME` with full state
5. **Game Loop:** Exchange `ACTION`, `STATE`, `EVENT` messages
6. **Keep-Alive:** Ping/pong every ~10s

### Message Format

**Newline-Delimited JSON:**
```
{"t":"ACTION","kind":"OPEN"}\n
{"t":"STATE","rev":72,...}\n
```

Each message is a single line terminated by `\n`.

---

## Multi-Lobby Support

Multiple lobbies can coexist on the same LAN:

| Lobby | Code | TCP Port | UDP Beacons |
|-------|------|----------|-------------|
| 1     | F9K3 | 4000     | Every 2s    |
| 2     | A7B2 | 4001     | Every 2s    |
| 3     | X5Y9 | 4002     | Every 2s    |

Clients filter by `lobbyId` and `code`.

---

## Password Protection

### Flow

1. Client sends `JOIN` with plaintext password
2. Server hashes password (SHA-256) and compares
3. If match → `WELCOME`
4. If mismatch → `ERROR` and increment fail counter
5. After 3 failed attempts → temporary block (5 min)

### Changing Password (Host Only)

```bash
# Pre-game only
password <new_password>
```

---

## Reconnection & State Sync

### Scenario: Client Disconnects

1. Client loses connection
2. Client attempts reconnect with exponential backoff (2s, 4s, 8s, ...)
3. On reconnect, client sends `RESYNC { "sinceRev": N }`
4. Server responds with:
   - **Patch:** Changes since revision N
   - **Snapshot:** Full state (if patch unavailable)

### Keep-Alive

- **Ping Interval:** 10s
- **Timeout:** 30s without ping/pong → disconnect

---

## Host Failure (MVP Limitation)

If the host disconnects:
- **Match ends** (no host migration in V1.0)
- Clients show disconnect message

**Future (V1.1+):** Host migration or persistent server mode.

---

## Firewall & Network Tips

### Windows
```powershell
# Allow UDP port 9999
netsh advfirewall firewall add rule name="Terminal Dungeon UDP" dir=in action=allow protocol=UDP localport=9999

# Allow TCP port 4000+
netsh advfirewall firewall add rule name="Terminal Dungeon TCP" dir=in action=allow protocol=TCP localport=4000-4010
```

### Linux
```bash
# UFW
sudo ufw allow 9999/udp
sudo ufw allow 4000:4010/tcp

# iptables
sudo iptables -A INPUT -p udp --dport 9999 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 4000:4010 -j ACCEPT
```

### macOS
```bash
# Built-in firewall usually allows LAN traffic
# If issues, disable firewall temporarily or add exception
```

---

## Testing on LAN

### Single Machine (localhost)
```bash
# Terminal 1 (Host)
npm run server

# Terminal 2 (Client)
npm run client
```

### Multiple Machines
1. All devices on same subnet (e.g., `192.168.1.x`)
2. Start server on one machine
3. Run `list` on clients to discover lobby
4. Join with `join <code>`

### University Networks (eduroam)

**Important:** Many university Wi-Fi networks (like eduroam) use **client isolation** for security, which prevents devices from communicating directly even when on the same network.

**Testing:**
```bash
# Try the game normally first
# If "No lobbies found", client isolation is active
```

**Solutions:**

1. **Wired Ethernet (Recommended)**
   - University lab networks often allow device-to-device communication
   - More stable than Wi-Fi
   - Lower latency

2. **Personal Hotspot**
   - One player creates a Wi-Fi hotspot from their laptop
   - Other players connect to this hotspot
   - Works around university network restrictions

   ```bash
   # Linux: Settings → Wi-Fi → "Use as access point"
   # Windows: Settings → Network → Mobile Hotspot → Enable
   ```

3. **Network Switch**
   - Use a small unmanaged network switch (~$50)
   - Connect all devices via Ethernet to the switch
   - Completely isolated from university network
   - Portable and works anywhere

---

## Troubleshooting

### "No lobbies found"
- Check firewall settings
- Ensure all devices on same subnet
- Verify UDP port 9999 is not blocked

### "Connection refused"
- Check TCP port (default 4000)
- Ensure server is running
- Verify host IP is correct

### "Version mismatch"
- Update all clients and server to same version

### "Disconnected from server"
- Check network stability
- Verify keep-alive is working (ping/pong)
- Check for firewall interruptions

---

## Performance Notes

- **Bandwidth:** ~1-5 KB/s per client (very light)
- **Latency:** LAN latency (~1-5ms typical)
- **Max Players:** 6 (configurable, but tested up to 6)
- **Max Lobbies:** Limited by TCP port availability (4000-65535)

---

## Security Considerations

1. **LAN-Only (MVP):** Minimal attack surface
2. **Password Protection:** SHA-256 hashed, rate-limited
3. **No PII:** Only display names stored
4. **Server-Authoritative:** No client-side cheating possible
5. **Version Check:** Prevents protocol exploits

**For production use:** Add TLS, authentication tokens, and proper session management.

