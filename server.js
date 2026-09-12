const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;
const dataFile = path.join(root, "letters.json");
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".mp3":"audio/mpeg"};

function readLetters() {
  try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    return [];
  }
}
function send(res, status, body, type="application/json; charset=utf-8") {
  res.writeHead(status, {"Content-Type": type, "Cache-Control": "no-store"});
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
function saveLetters(letters) { fs.writeFileSync(dataFile, JSON.stringify(letters, null, 2)); }

const server = http.createServer((req, res) => {
  if (req.url === "/api/letters" && req.method === "GET") return send(res, 200, readLetters());
  if (req.url.startsWith("/api/letters/") && req.method === "DELETE") {
    const id = Number(decodeURIComponent(req.url.slice("/api/letters/".length)));
    if (!Number.isInteger(id)) return send(res, 400, {error:"Mã tâm thư không hợp lệ."});
    const letters = readLetters();
    const remaining = letters.filter(letter => letter.id !== id);
    if (remaining.length === letters.length) return send(res, 404, {error:"Không tìm thấy tâm thư."});
    saveLetters(remaining);
    return send(res, 204, null);
  }
  if (req.url === "/api/letters" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 100000) req.destroy();
    });
    req.on("end", () => {
      try {
        const input = JSON.parse(body);
        const message = String(input.message || "").trim();
        const words = message ? message.split(/\s+/).length : 0;
        if (!message || words > 1000) return send(res, 400, {error:"Tâm thư phải có từ 1 đến 1.000 từ."});
        const item = {
          id: Date.now(),
          name: String(input.name || "").trim().slice(0, 40),
          type: String(input.type || "💌 Tâm thư").slice(0, 40),
          message,
          createdAt: new Date().toISOString()
        };
        const letters = readLetters();
        letters.push(item);
        saveLetters(letters);
        return send(res, 201, item);
      } catch (error) { return send(res, 400, {error:"Dữ liệu không hợp lệ."}); }
    });
    return;
  }

  const requested = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.normalize(path.join(root, requested));
  if (!file.startsWith(root)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    send(res, 200, content, mime[path.extname(file)] || "application/octet-stream");
  });
});

server.listen(port, () => console.log(`Góc Tâm Thư đang chạy tại http://localhost:${port}`));
