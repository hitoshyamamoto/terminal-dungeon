// ============================================================================
// NETWORK LAYER - TCP server, client management, broadcast
// ============================================================================

import * as net from "net";
import type {
  ServerMessage,
  ClientMessage,
  GameState,
  StateMessage,
  Player,
} from "../shared/types.js";
import { calculatePower } from "../shared/utils.js";
import pino from "pino";

const logger = pino({ transport: { target: "pino-pretty" } });

export interface ConnectedClient {
  socket: net.Socket;
  playerId: string;
  playerName: string;
  lastPing: number;
}

export class GameServer {
  private server: net.Server;
  private clients: Map<string, ConnectedClient> = new Map();
  private port: number;
  private keepAliveInterval?: NodeJS.Timeout;

  onMessage?: (playerId: string, message: ClientMessage) => void;
  onDisconnect?: (playerId: string) => void;

  constructor(port: number) {
    this.port = port;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        logger.info(`TCP server listening on port ${this.port}`);
        this.startKeepAlive();
        resolve();
      });

      this.server.on("error", (err) => {
        logger.error("TCP server error:", err);
        reject(err);
      });
    });
  }

  stop(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    for (const client of this.clients.values()) {
      client.socket.destroy();
    }

    this.server.close();
    logger.info("TCP server stopped");
  }

  private handleConnection(socket: net.Socket): void {
    const address = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.info(`New connection from ${address}`);

    let buffer = "";
    let clientId: string | null = null;

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const message = JSON.parse(line) as ClientMessage;

          if (message.t === "JOIN") {
            clientId = this.registerClient(socket, message.name);
          } else if (message.t === "PING") {
            this.send(clientId!, { t: "PONG" });
            if (clientId) {
              const client = this.clients.get(clientId);
              if (client) {
                client.lastPing = Date.now();
              }
            }
          } else {
            if (clientId && this.onMessage) {
              this.onMessage(clientId, message);
            }
          }
        } catch (err) {
          logger.error("Failed to parse message:", err);
        }
      }
    });

    socket.on("close", () => {
      logger.info(`Connection closed: ${address}`);
      if (clientId) {
        this.clients.delete(clientId);
        if (this.onDisconnect) {
          this.onDisconnect(clientId);
        }
      }
    });

    socket.on("error", (err) => {
      logger.error(`Socket error for ${address}:`, err);
    });
  }

  private registerClient(socket: net.Socket, name: string): string {
    const playerId = `p${this.clients.size + 1}`;
    this.clients.set(playerId, {
      socket,
      playerId,
      playerName: name,
      lastPing: Date.now(),
    });
    logger.info(`Registered client ${playerId} (${name})`);
    return playerId;
  }

  send(playerId: string, message: ServerMessage): void {
    const client = this.clients.get(playerId);
    if (client) {
      client.socket.write(JSON.stringify(message) + "\n");
    }
  }

  broadcast(message: ServerMessage, excludeId?: string): void {
    for (const [id, client] of this.clients.entries()) {
      if (id !== excludeId) {
        client.socket.write(JSON.stringify(message) + "\n");
      }
    }
  }

  broadcastState(state: GameState): void {
    const stateMsg = this.buildStateMessage(state);
    this.broadcast(stateMsg);
  }

  private buildStateMessage(state: GameState): StateMessage {
    const players = state.turnOrder.map((id) => {
      const p = state.players[id];
      return {
        id: p.id,
        name: p.name,
        level: p.level,
        power: calculatePower(p),
        handSize: p.hand.length,
        equipped: p.equipped,
        isDead: p.isDead,
      };
    });

    return {
      t: "STATE",
      rev: state.rev,
      phase: state.phase,
      active: state.activePlayer,
      players,
      fight: state.fight,
      turnOrder: state.turnOrder,
      currentTurnIndex: state.currentTurnIndex,
    };
  }

  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(() => {
      const now = Date.now();

      for (const [id, client] of this.clients.entries()) {
        // Disconnect if no ping for 30s
        if (now - client.lastPing > 30000) {
          logger.warn(`Client ${id} timed out`);
          client.socket.destroy();
          this.clients.delete(id);
          if (this.onDisconnect) {
            this.onDisconnect(id);
          }
        } else {
          // Send ping
          this.send(id, { t: "PONG" });
        }
      }
    }, 10000); // Every 10s
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClients(): Map<string, ConnectedClient> {
    return this.clients;
  }
}

