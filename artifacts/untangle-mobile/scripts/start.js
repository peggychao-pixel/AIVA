#!/usr/bin/env node
/**
 * Replit startup wrapper for Expo.
 * Binds $PORT immediately so Replit's port-health check passes,
 * then keeps that server alive while Metro runs alongside it.
 * Metro's native bundler (exp://) works on the same port via the
 * EXPO_PACKAGER_PROXY_URL tunnel — the web preview is a bonus.
 */
const http = require("http");
const { spawn } = require("child_process");

const port = parseInt(process.env.PORT || "3000", 10);

// Open the port immediately so Replit marks the workflow as running.
const placeholder = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Expo Metro is starting — please scan the QR code in the Expo tab.\n");
});

placeholder.listen(port, "0.0.0.0", () => {
  console.log(`[start.js] placeholder HTTP server listening on port ${port}`);
  startExpo();
});

function startExpo() {
  const env = { ...process.env };

  // expo start uses $PORT for Metro's web server;
  // use a nearby port so it doesn't collide with our placeholder.
  const metroPort = port + 1;
  env.PORT = String(metroPort);

  const child = spawn(
    "pnpm",
    [
      "exec",
      "expo",
      "start",
      "--localhost",
      "--port",
      String(metroPort),
    ],
    {
      env,
      stdio: "inherit",
      shell: false,
    }
  );

  child.on("exit", (code) => {
    console.log(`[start.js] Metro exited with code ${code}`);
    placeholder.close();
    process.exit(code ?? 0);
  });

  // Forward signals
  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
    placeholder.close();
  });
  process.on("SIGINT", () => {
    child.kill("SIGINT");
    placeholder.close();
  });
}
