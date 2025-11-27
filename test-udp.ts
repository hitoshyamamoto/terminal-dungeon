// ============================================================================
// UDP DIAGNOSTIC TOOL - Test UDP broadcast discovery
// ============================================================================

import * as dgram from "dgram";
import * as os from "os";

const UDP_PORT = 9999;
const mode = process.argv[2]; // "send" or "receive"

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

if (mode === "send") {
  console.log("=== UDP BROADCAST SENDER ===");
  const localIp = getLocalIp();
  console.log(`Local IP: ${localIp}`);
  console.log(`Broadcasting to 255.255.255.255:${UDP_PORT}`);
  console.log("Sending beacon every 2 seconds...\n");

  const socket = dgram.createSocket("udp4");
  socket.bind(() => {
    socket.setBroadcast(true);
    console.log("Socket ready, starting broadcast...\n");
  });

  let count = 0;
  setInterval(() => {
    count++;
    const message = JSON.stringify({
      t: "TEST_BEACON",
      from: localIp,
      count: count,
      timestamp: Date.now(),
    });

    const buffer = Buffer.from(message);
    socket.send(buffer, UDP_PORT, "255.255.255.255", (err) => {
      if (err) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to send:`, err.message);
      } else {
        console.log(`[${new Date().toISOString()}] ✓ Sent beacon #${count}`);
      }
    });
  }, 2000);

} else if (mode === "receive") {
  console.log("=== UDP BROADCAST RECEIVER ===");
  const localIp = getLocalIp();
  console.log(`Local IP: ${localIp}`);
  console.log(`Listening on UDP port ${UDP_PORT}...`);
  console.log("Waiting for beacons...\n");

  const socket = dgram.createSocket("udp4");

  socket.on("message", (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      console.log(`[${new Date().toISOString()}] ✓ Received beacon from ${rinfo.address}:${rinfo.port}`);
      console.log(`  Content:`, data);
      console.log();
    } catch (err) {
      console.log(`[${new Date().toISOString()}] ⚠️  Received non-JSON message from ${rinfo.address}`);
    }
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
    socket.close();
  });

  socket.bind(UDP_PORT, () => {
    console.log(`✓ Socket bound to port ${UDP_PORT}`);
    console.log("Listening for broadcasts...\n");
  });

} else {
  console.log("UDP Diagnostic Tool");
  console.log("\nUsage:");
  console.log("  On device 1 (sender):   npm run test-udp send");
  console.log("  On device 2 (receiver): npm run test-udp receive");
  console.log("\nThis will test if UDP broadcast is working on your network.");
  console.log("\nExpected behavior:");
  console.log("  ✓ Receiver should see beacons from sender every 2 seconds");
  console.log("  ✓ Both devices must be on the same network");
  console.log("  ✓ Firewall must allow UDP port 9999");
  console.log("\nCommon issues:");
  console.log("  ❌ No beacons received = Firewall or network isolation");
  console.log("  ❌ Socket bind error = Port already in use");
  process.exit(1);
}
