#!/usr/bin/env node
/**
 * Replit Expo startup wrapper.
 *
 * Replit's health-check expects an HTTP 200 on $PORT immediately after the
 * workflow starts.  Expo's Metro bundler takes 30-90 s to be ready.
 *
 * Strategy:
 *  1. Bind $PORT with an HTTP server that immediately returns 200.
 *  2. Start Metro on $PORT+1 in the background.
 *  3. Once a raw socket arrives that looks like a Metro-native connection
 *     (non-HTTP, i.e. WebSocket / the Expo Go protocol), proxy it straight
 *     to Metro on $PORT+1.
 *
 * For normal HTTP requests (health check, bundle fetch from browser):
 *  - Before Metro is ready: return 200 "starting..." 
 *  - After Metro is ready: HTTP-proxy the request to Metro on $PORT+1.
 */

const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.PORT || "19446", 10);
const METRO_PORT = PORT + 1;

let metroReady = false;

// ── 1. HTTP server on PORT  ─────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (!metroReady) {
    // Health-check / early requests: just say OK.
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Expo Metro is starting — please wait.\n");
    return;
  }

  // Proxy HTTP request to Metro.
  const options = {
    hostname: "127.0.0.1",
    port: METRO_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxy = http.request(options, (metroRes) => {
    res.writeHead(metroRes.statusCode, metroRes.headers);
    metroRes.pipe(res);
  });
  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Metro not ready\n");
  });
  req.pipe(proxy);
});

// Handle WebSocket / raw TCP upgrades (Expo Go native protocol).
httpServer.on("upgrade", (req, socket, head) => {
  const metroSocket = net.connect(METRO_PORT, "127.0.0.1", () => {
    // Replay the upgrade request to Metro.
    const rawRequest =
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") +
      "\r\n\r\n";
    metroSocket.write(rawRequest);
    if (head && head.length) metroSocket.write(head);
    socket.pipe(metroSocket);
    metroSocket.pipe(socket);
  });
  metroSocket.on("error", () => socket.destroy());
  socket.on("error", () => metroSocket.destroy());
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[proxy] HTTP server listening on ${PORT}, Metro will start on ${METRO_PORT}`);
  startMetro();
});

// ── 2. Start Metro on METRO_PORT ─────────────────────────────────────────────
function startMetro() {
  const env = { ...process.env, PORT: String(METRO_PORT) };

  const child = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(METRO_PORT)],
    { env, stdio: "inherit", shell: false }
  );

  // Poll until Metro actually answers on METRO_PORT.
  const pollInterval = setInterval(() => {
    const sock = net.connect(METRO_PORT, "127.0.0.1");
    sock.on("connect", () => {
      sock.destroy();
      if (!metroReady) {
        metroReady = true;
        console.log(`[proxy] Metro ready on ${METRO_PORT} — proxying all traffic`);
      }
      clearInterval(pollInterval);
    });
    sock.on("error", () => sock.destroy());
  }, 2000);

  child.on("exit", (code) => {
    clearInterval(pollInterval);
    console.log(`[proxy] Metro exited (code ${code})`);
    httpServer.close();
    process.exit(code ?? 0);
  });

  process.on("SIGTERM", () => { child.kill("SIGTERM"); httpServer.close(); });
  process.on("SIGINT",  () => { child.kill("SIGINT");  httpServer.close(); });
}
