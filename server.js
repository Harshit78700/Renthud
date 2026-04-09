const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp"
};

function ensureStore() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STORE_FILE)) {
        let initial = {
            adminUser: null,
            currentUser: null,
            rooms: [],
            tenants: [],
            payments: [],
            ownerProfile: null,
            customScannerImage: "",
            flags: {}
        };
        fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
    }
}

function readStore() {
    ensureStore();
    try {
        return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    } catch (err) {
        return {
            adminUser: null,
            currentUser: null,
            rooms: [],
            tenants: [],
            payments: [],
            ownerProfile: null,
            customScannerImage: "",
            flags: {}
        };
    }
}

function writeStore(store) {
    ensureStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function sendJson(res, code, payload) {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

function handleApi(req, res) {
    if (req.url === "/api/health" && req.method === "GET") {
        return sendJson(res, 200, { ok: true, service: "RentHub Node Backend" });
    }

    if (req.url === "/api/snapshot" && req.method === "GET") {
        return sendJson(res, 200, { ok: true, data: readStore() });
    }

    if (req.url === "/api/snapshot" && req.method === "POST") {
        let chunks = [];
        req.on("data", chunk => {
            chunks.push(chunk);
            if (Buffer.concat(chunks).length > 5 * 1024 * 1024) {
                chunks = [];
                sendJson(res, 413, { ok: false, error: "Payload too large" });
                req.destroy();
            }
        });
        req.on("end", () => {
            try {
                let raw = Buffer.concat(chunks).toString("utf8") || "{}";
                let payload = JSON.parse(raw);
                let data = payload && payload.data ? payload.data : payload;
                if (!data || typeof data !== "object") {
                    return sendJson(res, 400, { ok: false, error: "Invalid snapshot payload" });
                }
                writeStore(data);
                return sendJson(res, 200, { ok: true });
            } catch (err) {
                return sendJson(res, 400, { ok: false, error: "Invalid JSON" });
            }
        });
        return;
    }

    return false;
}

function serveStatic(req, res) {
    let reqPath = req.url.split("?")[0];
    if (reqPath === "/") reqPath = "/index.html";

    let safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, "");
    let filePath = path.join(ROOT, safePath);

    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not Found");
            return;
        }

        let ext = path.extname(filePath).toLowerCase();
        let contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(filePath).pipe(res);
    });
}

const server = http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
        let handled = handleApi(req, res);
        if (handled !== false) return;
    }
    serveStatic(req, res);
});

server.listen(PORT, () => {
    ensureStore();
    console.log(`RentHub running on http://localhost:${PORT}`);
});
