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
          if (this.onConnect) {
            this.onConnect();
          }
          resolve();
        }
      );

      this.socket.on("data", (data) => this.handleData(data));

      this.socket.on("close", () => {
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

  send(message: ClientMessage): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify(message) + "\n");
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
    }
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
}

