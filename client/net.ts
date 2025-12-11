// ============================================================================
// CLIENT NETWORK - TCP client with reconnect and resync
// ============================================================================

import * as net from "net";
import type { ServerMessage, ClientMessage } from "../shared/types.js";

export class GameClient {
  private socket?: net.Socket;
  private host: string;
  private port: number;
  private buffer: string = "";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private shouldReconnect = true;
  private sessionToken?: string;
  private lobbyId?: string;
  private playerName?: string;
  private password?: string;
  private pingInterval?: NodeJS.Timeout;

  onMessage?: (message: ServerMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(
        { host: this.host, port: this.port },
        () => {
          this.reconnectAttempts = 0;
          this.startPingInterval();
          if (this.onConnect) {
            this.onConnect();
          }
          resolve();
        }
      );

      this.socket.on("data", (data) => this.handleData(data));

      this.socket.on("close", () => {
        this.stopPingInterval();
        if (this.onDisconnect) {
          this.onDisconnect();
        }
        this.attemptReconnect();
      });

      this.socket.on("error", (err) => {
        reject(err);
      });
    });
  }

  sendRejoin(): boolean {
    if (this.sessionToken) {
      this.send({ t: "REJOIN", sessionToken: this.sessionToken });
      return true;
    }
    return false;
  }

  sendJoin(lobbyId: string, name: string, password: string): void {
    this.send({ t: "JOIN", lobbyId, name, password });
  }

  clearSession(): void {
    this.sessionToken = undefined;
  }

  send(message: ClientMessage): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify(message) + "\n");
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPingInterval();
    if (this.socket) {
      this.socket.destroy();
    }
  }

  disableReconnect(): void {
    this.shouldReconnect = false;
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  setConnectionInfo(lobbyId: string, name: string, password: string): void {
    this.lobbyId = lobbyId;
    this.playerName = name;
    this.password = password;
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as ServerMessage;
        if (this.onMessage) {
          this.onMessage(message);
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    }
  }

  private attemptReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached.");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => {
      this.connect().catch((err) => {
        console.error("Reconnect failed:", err);
      });
    }, delay);
  }

  private startPingInterval(): void {
    // Send PING every 10 seconds to keep connection alive
    // Server times out after 30s without ping
    this.pingInterval = setInterval(() => {
      this.send({ t: "PING" });
    }, 10000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}

