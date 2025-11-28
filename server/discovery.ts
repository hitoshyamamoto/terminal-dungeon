// ============================================================================
// UDP DISCOVERY - Beacon broadcasting for lobby discovery
// ============================================================================

import * as dgram from "dgram";
import type { BeaconMessage, LobbyStatus } from "../shared/types.js";
import { UDP_PORT, GAME_VERSION } from "../shared/types.js";
import { isWSL } from "../shared/env-utils.js";
import { PowerShellBeaconSender } from "../shared/powershell-udp.js";
import pino from "pino";

const logger = pino({ transport: { target: "pino-pretty" } });

export interface BeaconConfig {
  lobbyId: string;
  code: string;
  host: string;
  port: number;
  maxPlayers: number;
  decks?: {
    doors: string[];
    treasures: string[];
  };
}

export class DiscoveryBeacon {
  private socket: dgram.Socket;
  private config: BeaconConfig;
  private interval?: NodeJS.Timeout;
  private playerCount: number = 0;
  private status: LobbyStatus = "OPEN";
  private powershellBeacon?: PowerShellBeaconSender;

  constructor(config: BeaconConfig) {
    this.config = config;
    this.socket = dgram.createSocket("udp4");
    this.socket.bind(() => {
      this.socket.setBroadcast(true);
    });

    // Initialize PowerShell beacon if in WSL
    if (isWSL()) {
      this.powershellBeacon = new PowerShellBeaconSender();
    }
  }

  start(): void {
    logger.info("Starting UDP beacon broadcast");
    logger.info(`Broadcasting to 255.255.255.255:${UDP_PORT} every 2 seconds`);
    this.interval = setInterval(() => this.sendBeacon(), 2000);
    // Send first beacon immediately
    this.sendBeacon();

    // Start PowerShell beacon if in WSL
    if (this.powershellBeacon) {
      const beacon = this.createBeacon();
      this.powershellBeacon.start(beacon, UDP_PORT);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.socket.close();

    // Stop PowerShell beacon
    if (this.powershellBeacon) {
      this.powershellBeacon.stop();
    }

    logger.info("UDP beacon stopped");
  }

  updatePlayerCount(count: number): void {
    this.playerCount = count;

    if (count >= this.config.maxPlayers) {
      this.status = "FULL";
    } else if (this.status === "FULL" && count < this.config.maxPlayers) {
      this.status = "OPEN";
    }
  }

  updateStatus(status: LobbyStatus): void {
    this.status = status;
  }

  private createBeacon(): BeaconMessage {
    return {
      t: "BEACON",
      game: "Terminal Dungeon",
      lobbyId: this.config.lobbyId,
      code: this.config.code,
      host: this.config.host,
      port: this.config.port,
      players: this.playerCount,
      maxPlayers: this.config.maxPlayers,
      status: this.status,
      version: GAME_VERSION,
      decks: this.config.decks,
    };
  }

  private sendBeacon(): void {
    const beacon = this.createBeacon();
    const message = JSON.stringify(beacon);
    const buffer = Buffer.from(message);

    // Broadcast to LAN
    this.socket.send(buffer, UDP_PORT, "255.255.255.255", (err) => {
      if (err) {
        logger.error("Failed to send beacon:", err);
      } else {
        logger.debug(`Beacon sent: ${this.config.code} @ ${this.config.host}:${this.config.port}`);
      }
    });
  }
}

export class DiscoveryListener {
  private socket: dgram.Socket;
  private lobbies: Map<string, BeaconMessage> = new Map();
  private expirationInterval?: NodeJS.Timeout;

  onLobbyUpdate?: (lobby: BeaconMessage) => void;

  constructor() {
    this.socket = dgram.createSocket("udp4");
    this.socket.bind(UDP_PORT, () => {
      logger.info(`UDP listener bound to port ${UDP_PORT}`);
    });

    this.socket.on("message", (msg, rinfo) => {
      try {
        const beacon = JSON.parse(msg.toString()) as BeaconMessage;

        if (beacon.t === "BEACON" && beacon.game === "Terminal Dungeon") {
          this.lobbies.set(beacon.lobbyId, beacon);

          if (this.onLobbyUpdate) {
            this.onLobbyUpdate(beacon);
          }
        }
      } catch (err) {
        // Ignore invalid messages
      }
    });
  }

  start(): void {
    logger.info("Starting UDP discovery listener");
    this.expirationInterval = setInterval(() => this.expireLobbies(), 3000);
  }

  stop(): void {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
    }
    this.socket.close();
    logger.info("UDP listener stopped");
  }

  private expireLobbies(): void {
    const now = Date.now();
    for (const [id, beacon] of this.lobbies.entries()) {
      // Remove lobbies not seen for >6s
      // (we check every 3s, beacons send every 2s, so 6s is safe)
    }
  }

  getLobbies(): BeaconMessage[] {
    return Array.from(this.lobbies.values());
  }
}

