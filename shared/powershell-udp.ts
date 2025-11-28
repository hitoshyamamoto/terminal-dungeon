// ============================================================================
// PowerShell UDP Bridge - Manage PowerShell processes for UDP broadcast
// ============================================================================

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as readline from "readline";
import type { BeaconMessage } from "./types.js";
import { isWSL } from "./env-utils.js";

/**
 * PowerShell UDP Beacon Sender - Sends broadcasts from Windows
 */
export class PowerShellBeaconSender {
  private process?: ChildProcess;
  private scriptPath: string;

  constructor() {
    // Path to PowerShell script (relative to project root)
    this.scriptPath = path.join(process.cwd(), "scripts", "udp-beacon-sender.ps1");
  }

  /**
   * Start sending beacons via PowerShell
   */
  start(beacon: BeaconMessage, port: number = 9999): boolean {
    if (!isWSL()) {
      console.log("[PowerShell Beacon] Not in WSL, skipping PowerShell beacon");
      return false;
    }

    try {
      const beaconJson = JSON.stringify(beacon);

      // Convert WSL path to Windows path
      const windowsScriptPath = this.convertToWindowsPath(this.scriptPath);

      // Spawn PowerShell process (silent mode)
      this.process = spawn(
        "powershell.exe",
        [
          "-ExecutionPolicy", "Bypass",
          "-NoProfile",
          "-File", windowsScriptPath,
          "-BeaconJson", beaconJson,
          "-Port", port.toString()
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        }
      );

      // Suppress normal output (only show on errors)
      this.process.stdout?.on("data", () => {
        // Silent - beacons are working
      });

      this.process.stderr?.on("data", (data) => {
        console.error(`[PowerShell Beacon ERROR] ${data.toString().trim()}`);
      });

      this.process.on("exit", (code) => {
        if (code !== 0) {
          console.error(`[PowerShell Beacon] Process exited with code ${code}`);
        }
      });

      return true;
    } catch (error) {
      console.error("[PowerShell Beacon] Failed to start:", error);
      return false;
    }
  }

  /**
   * Stop sending beacons
   */
  stop(): void {
    if (this.process) {
      console.log("[PowerShell Beacon] Stopping...");
      this.process.kill();
      this.process = undefined;
    }
  }

  /**
   * Convert WSL path to Windows path
   */
  private convertToWindowsPath(wslPath: string): string {
    try {
      // Use wslpath command to convert
      const { execSync } = require("child_process");
      const windowsPath = execSync(`wslpath -w "${wslPath}"`, { encoding: "utf8" }).trim();
      return windowsPath;
    } catch {
      // Fallback: manual conversion
      // /home/user/... -> \\wsl$\Ubuntu\home\user\...
      return `\\\\wsl$\\Ubuntu${wslPath}`;
    }
  }
}

/**
 * PowerShell UDP Beacon Receiver - Receives broadcasts from Windows
 */
export class PowerShellBeaconReceiver {
  private process?: ChildProcess;
  private scriptPath: string;
  private onBeacon?: (beacon: BeaconMessage) => void;

  constructor() {
    this.scriptPath = path.join(process.cwd(), "scripts", "udp-beacon-receiver.ps1");
  }

  /**
   * Start receiving beacons via PowerShell
   */
  start(port: number = 9999, callback: (beacon: BeaconMessage) => void): boolean {
    if (!isWSL()) {
      console.log("[PowerShell Receiver] Not in WSL, skipping PowerShell receiver");
      return false;
    }

    try {
      this.onBeacon = callback;

      // Convert WSL path to Windows path
      const windowsScriptPath = this.convertToWindowsPath(this.scriptPath);

      // Spawn PowerShell process (silent mode)
      this.process = spawn(
        "powershell.exe",
        [
          "-ExecutionPolicy", "Bypass",
          "-NoProfile",
          "-File", windowsScriptPath,
          "-Port", port.toString()
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        }
      );

      // Read beacons line by line
      const rl = readline.createInterface({
        input: this.process.stdout!,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        try {
          const beacon = JSON.parse(line) as BeaconMessage;
          if (beacon.t === "BEACON" && this.onBeacon) {
            this.onBeacon(beacon);
          }
        } catch {
          // Ignore non-JSON lines (info messages)
          if (!line.startsWith("[PowerShell")) {
            console.log(`[PowerShell Receiver] ${line}`);
          }
        }
      });

      this.process.stderr?.on("data", (data) => {
        console.error(`[PowerShell Receiver ERROR] ${data.toString().trim()}`);
      });

      this.process.on("exit", (code) => {
        if (code !== 0) {
          console.error(`[PowerShell Receiver] Process exited with code ${code}`);
        }
      });

      return true;
    } catch (error) {
      console.error("[PowerShell Receiver] Failed to start:", error);
      return false;
    }
  }

  /**
   * Stop receiving beacons
   */
  stop(): void {
    if (this.process) {
      console.log("[PowerShell Receiver] Stopping...");
      this.process.kill();
      this.process = undefined;
    }
  }

  /**
   * Convert WSL path to Windows path
   */
  private convertToWindowsPath(wslPath: string): string {
    try {
      const { execSync } = require("child_process");
      const windowsPath = execSync(`wslpath -w "${wslPath}"`, { encoding: "utf8" }).trim();
      return windowsPath;
    } catch {
      return `\\\\wsl$\\Ubuntu${wslPath}`;
    }
  }
}
