// ============================================================================
// PORT UTILITIES - Dynamic port allocation and management
// ============================================================================

import * as net from "net";

/**
 * Find an available TCP port starting from a base port
 * @param basePort - Starting port to try
 * @param maxAttempts - Maximum number of ports to try
 * @returns Promise with available port number
 */
export async function findAvailablePort(
  basePort: number = 4000,
  maxAttempts: number = 10
): Promise<number> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = basePort + attempt;

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `Could not find available port in range ${basePort}-${basePort + maxAttempts - 1}`
  );
}

/**
 * Check if a port is available
 * @param port - Port number to check
 * @returns Promise with boolean indicating if port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false); // Port is in use
      } else {
        resolve(false); // Other error, consider unavailable
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true); // Port is available
    });

    server.listen(port);
  });
}

/**
 * Get a random port in a given range
 * @param min - Minimum port number
 * @param max - Maximum port number
 * @returns Random port number
 */
export function getRandomPort(min: number = 4000, max: number = 5000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Find available port with retry logic
 * Tries random ports first, then sequential
 * @param preferredPort - Preferred port to try first (optional)
 * @returns Promise with available port number
 */
export async function findAvailablePortSmart(
  preferredPort?: number
): Promise<number> {
  // Try preferred port first
  if (preferredPort && (await isPortAvailable(preferredPort))) {
    return preferredPort;
  }

  // Try 3 random ports
  for (let i = 0; i < 3; i++) {
    const randomPort = getRandomPort(4000, 4100);
    if (await isPortAvailable(randomPort)) {
      return randomPort;
    }
  }

  // Fall back to sequential search
  return findAvailablePort(4000, 20);
}
