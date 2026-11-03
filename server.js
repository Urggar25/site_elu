const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 4173);
const publicFiles = new Set(["/index.html", "/styles.css", "/app.js"]);
const publicDirectories = ["/assets/"];

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8"
};

const securityHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' data: blob:; child-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, { ...securityHeaders, ...headers });
  response.end(body);
}

const server = http.createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    send(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    return;
  }

  const url = new URL(request.url, "http://localhost");
  let requestedPath;
  try {
    requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  } catch {
    send(response, 400, "Bad request");
    return;
  }

  const normalizedUrlPath = path.posix.normalize(requestedPath);
  const isPublicFile = publicFiles.has(normalizedUrlPath);
  const isPublicAsset = publicDirectories.some((directory) => normalizedUrlPath.startsWith(directory));
  if (!isPublicFile && !isPublicAsset) {
    send(response, 404, "Not found");
    return;
  }

  const filePath = path.resolve(root, `.${normalizedUrlPath}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(response, 404, "Not found");
      return;
    }

    const headers = { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" };
    response.writeHead(200, { ...securityHeaders, ...headers });
    if (request.method === "HEAD") response.end();
    else response.end(content);
  });
});

server.listen(port, () => {
  console.log(`Site local disponible sur http://localhost:${port}`);
});
