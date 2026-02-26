const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const CRM_URL = process.env.CRM_URL || "http://209.38.223.61:3000";
const CRM_API_KEY = process.env.CRM_API_KEY || "";

const indexHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // Proxy endpoint
  if (req.method === "POST" && req.url === "/api/submit") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        // Validate required fields
        if (!parsed.title || !parsed.description) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Title and description required" }));
        }

        const taskTitle = parsed.title.slice(0, 500);
        const taskBody = parsed.description.slice(0, 5000);

        const resp = await fetch(`${CRM_URL}/rest/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CRM_API_KEY}`,
          },
          body: JSON.stringify({
            title: taskTitle,
            status: "TODO",
            bodyV2: { markdown: taskBody },
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error("CRM error:", resp.status, text);
          res.writeHead(502, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "CRM error" }));
        }

        const data = await resp.json();
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, id: data?.data?.createTask?.id || data?.id }));
      } catch (err) {
        console.error("Submit error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal error" }));
      }
    });
    return;
  }

  // Serve index.html for everything else
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(indexHtml);
});

server.listen(PORT, () => console.log(`Bug form server on :${PORT}`));
