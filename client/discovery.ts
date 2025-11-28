// ============================================================================
// CLIENT DISCOVERY - Listen for UDP beacons and manage lobby list
// ============================================================================

import * as dgram from "dgram";
import type { BeaconMessage, LobbyInfo } from "../shared/types.js";
import { UDP_PORT } from "../shared/types.js";
import { isWSL } from "../shared/env-utils.js";
import { PowerShellBeaconReceiver } from "../shared/powershell-udp.js";

export class ClientDiscovery {
  private socket: dgram.Socket;
  private lobbies: Map<string, LobbyInfo> = new Map();
  private expirationInterval?: NodeJS.Timeout;
  private powershellReceiver?: PowerShellBeaconReceiver;

  constructor() {
    this.socket = dgram.createSocket("udp4");

    // Initialize PowerShell receiver if in WSL
    if (isWSL()) {
      this.powershellReceiver = new PowerShellBeaconReceiver();
    }

    this.socket.on("message", (msg, rinfo) => {
      try {
        const beacon = JSON.parse(msg.toString()) as BeaconMessage;
        this.handleBeacon(beacon, rinfo.address);
      } catch (err) {
        console.log(`[Discovery] Received non-JSON message from ${rinfo.address}:${rinfo.port}`);
      }
    });

    this.socket.on("error", (err) => {
      console.error(`[Discovery] Socket error:`, err);
    });
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.on("error", (err) => {
        console.error(`[Discovery] Failed to bind to UDP port ${UDP_PORT}:`, err.message);
        reject(err);
      });

      // Use exclusive: false to allow multiple clients on same machine
      this.socket.bind({
        port: UDP_PORT,
        address: "0.0.0.0",
        exclusive: false,
      }, () => {
        console.log(`[Discovery] Listening for lobbies on UDP port ${UDP_PORT}...`);
        this.expirationInterval = setInterval(() => this.expireLobbies(), 3000);

        // Start PowerShell receiver if in WSL
        if (this.powershellReceiver) {
          this.powershellReceiver.start(UDP_PORT, (beacon) => {
            this.handleBeacon(beacon, "PowerShell");
          });
        }

        resolve();
      });
    });
  }

  stop(): void {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
    }
    this.socket.close();

    // Stop PowerShell receiver
    if (this.powershellReceiver) {
      this.powershellReceiver.stop();
    }
  }

  private handleBeacon(beacon: BeaconMessage, source: string): void {
    if (beacon.t === "BEACON" && beacon.game === "Terminal Dungeon") {
      // Only log if this is a new lobby (not seen before)
      const isNew = !this.lobbies.has(beacon.lobbyId);

      this.lobbies.set(beacon.lobbyId, {
        lobbyId: beacon.lobbyId,
        code: beacon.code,
        host: beacon.host,
        port: beacon.port,
        players: beacon.players,
        maxPlayers: beacon.maxPlayers,
        status: beacon.status,
        version: beacon.version,
        lastSeen: Date.now(),
        decks: beacon.decks,
      });

      // Only log when discovering a NEW lobby
      if (isNew) {
        console.log(`[Discovery] Found lobby: ${beacon.code} @ ${beacon.host}:${beacon.port}`);
      }
    }
  }

  private expireLobbies(): void {
    const now = Date.now();
    for (const [id, lobby] of this.lobbies.entries()) {
      if (now - lobby.lastSeen > 6000) {
        this.lobbies.delete(id);
      }
    }
  }

  getLobbies(): LobbyInfo[] {
    return Array.from(this.lobbies.values());
  }

  findLobbyByCode(code: string): LobbyInfo | undefined {
    return Array.from(this.lobbies.values()).find(
      (l) => l.code.toUpperCase() === code.toUpperCase()
    );
  }
}

