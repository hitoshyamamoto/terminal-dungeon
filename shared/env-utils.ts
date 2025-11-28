// ============================================================================
// ENVIRONMENT UTILITIES - WSL detection and network configuration
// ============================================================================

import * as fs from "fs";
import * as os from "os";
import { execSync } from "child_process";

/**
 * Detect if running inside WSL (Windows Subsystem for Linux)
 */
export function isWSL(): boolean {
  try {
    // Check if /proc/version exists and contains 'microsoft' or 'WSL'
    if (fs.existsSync("/proc/version")) {
      const version = fs.readFileSync("/proc/version", "utf8").toLowerCase();
      return version.includes("microsoft") || version.includes("wsl");
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get the Windows host IP address when running in WSL
 * This is the IP that external devices can connect to
 *
 * Note: This returns null because there's no reliable way to detect
 * the Windows physical network IP from inside WSL.
 * Users should check Windows network settings manually.
 */
export function getWindowsHostIP(): string | null {
  if (!isWSL()) return null;

  // Cannot reliably detect Windows physical IP from WSL
  // The gateway IP (nameserver in resolv.conf) is WSL-internal
  return null;
}

/**
 * Get the WSL internal IP address
 */
export function getWSLInternalIP(): string | null {
  if (!isWSL()) return null;

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        // Look for eth0 or similar interface with 172.x.x.x address
        if (
          iface.family === "IPv4" &&
          !iface.internal &&
          iface.address.startsWith("172.")
        ) {
          return iface.address;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get network configuration information
 */
export function getNetworkInfo(): {
  isWSL: boolean;
  localIP: string;
  windowsHostIP: string | null;
  wslInternalIP: string | null;
  recommendedIP: string;
} {
  const inWSL = isWSL();
  const windowsHostIP = getWindowsHostIP();
  const wslInternalIP = getWSLInternalIP();

  // Get local IP (fallback)
  let localIP = "127.0.0.1";
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }

  // Determine recommended IP for server
  const recommendedIP = inWSL && windowsHostIP ? windowsHostIP : localIP;

  return {
    isWSL: inWSL,
    localIP,
    windowsHostIP,
    wslInternalIP,
    recommendedIP,
  };
}

/**
 * Get port forwarding command for WSL
 */
export function getPortForwardCommand(
  wslIP: string,
  port: number
): { powershell: string; info: string } {
  const powershell = `netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=${port} connectaddress=${wslIP} connectport=${port}`;
  const info = `Run this in PowerShell as Administrator on Windows to forward port ${port}`;

  return { powershell, info };
}
