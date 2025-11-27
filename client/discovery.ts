// ============================================================================
// CLIENT DISCOVERY - Listen for UDP beacons and manage lobby list
// ============================================================================

import * as dgram from "dgram";
import type { BeaconMessage, LobbyInfo } from "../shared/types.js";
import { UDP_PORT } from "../shared/types.js";

export class ClientDiscovery {
  private socket: dgram.Socket;
  private lobbies: Map<string, LobbyInfo> = new Map();
  private expirationInterval?: NodeJS.Timeout;

  constructor() {
    this.socket = dgram.createSocket("udp4");

    this.socket.on("message", (msg, rinfo) => {
      try {
        const beacon = JSON.parse(msg.toString()) as BeaconMessage;

        if (beacon.t === "BEACON" && beacon.game === "Terminal Dungeon") {
          console.log(`[Discovery] Received beacon from ${beacon.host}:${beacon.port} (${rinfo.address}) - Code: ${beacon.code}`);
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
        } else {
          console.log(`[Discovery] Received unknown message from ${rinfo.address}:${rinfo.port}`);
        }
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
        console.log(`[Discovery] SO_REUSEPORT enabled - multiple clients per machine allowed`);
        this.expirationInterval = setInterval(() => this.expireLobbies(), 3000);
        resolve();
      });
    });
  }

  stop(): void {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
    }
    this.socket.close();
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

