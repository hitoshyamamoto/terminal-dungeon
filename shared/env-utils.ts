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
 * Executes PowerShell from WSL to get the physical network IP
 */
export function getWindowsHostIP(): string | null {
  if (!isWSL()) return null;

  try {
    // Execute PowerShell command from WSL to get Windows IP
    // Get IPv4 from Wi-Fi or Ethernet adapters, excluding link-local addresses
    const result = execSync(
      `powershell.exe -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {\\$_.InterfaceAlias -like 'Wi-Fi*' -or \\$_.InterfaceAlias -like 'Ethernet*'} | Where-Object {\\$_.IPAddress -notlike '169.254.*'} | Select-Object -First 1 -ExpandProperty IPAddress"`,
      { encoding: "utf8", timeout: 5000 }
    );

    const ip = result.trim().replace(/\r?\n/g, '');

    // Validate IP format
    if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      return ip;
    }

    return null;
  } catch (error) {
    // Fallback: try simpler method with ipconfig
    try {
      const result = execSync(
        `powershell.exe -Command "ipconfig" | grep -A 4 "Wireless LAN\\|Ethernet adapter" | grep "IPv4" | head -1`,
        { encoding: "utf8", timeout: 5000 }
      );

      // Extract IP from output like "   IPv4 Address. . . . . . . . . . . : 192.168.1.100"
      const match = result.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (match && match[1]) {
        return match[1];
      }
    } catch {
      // Ignore fallback errors
    }

    return null;
  }
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
