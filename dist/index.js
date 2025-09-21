import express from "express";
import { createServer } from "http";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupCustomerAIRoutes } from "./temp-ai-routes";
import tenantAuthRoutes from "./routes/tenant-auth-simple";
import tenantApiRoutes from "./routes/tenant-api";
import aiSearchRoutes from "./routes/ai-search-routes";
import { tenantIsolationMiddleware } from "./middleware/tenant-isolation";
import { setupVite, log } from "./vite";
import fs from "fs";
import path from "path";
import { Logger } from "./services/logger.service";
import fetch from "node-fetch";
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 30;
process.setMaxListeners(30);
export const app = express();
const server = createServer(app);
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use('/api/tenant', (req, res, next) => {
    tenantIsolationMiddleware(req, res, next).catch(next);
});
app.use('/tenant', (req, res, next) => {
    tenantIsolationMiddleware(req, res, next).catch(next);
});
async function perplexityChat(prompt, model = "sonar") {
    const API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!API_KEY)
        throw new Error("PERPLEXITY_API_KEY ist nicht gesetzt");
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok)
        throw new Error(`Perplexity API Error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}
const logger = new Logger("ServerMain");
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.post("/api/ai", async (req, res) => {
    try {
        const prompt = req.body?.prompt;
        if (!prompt)
            return res.status(400).json({ error: "Feld 'prompt' erforderlich." });
        const answer = await perplexityChat(prompt);
        return res.json({ answer });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "AI-Service nicht verfügbar." });
    }
});
registerRoutes(app);
setupCustomerAIRoutes(app);
app.use('/api/tenant/auth', tenantAuthRoutes);
app.use('/api/tenant', tenantApiRoutes);
app.use('/api/ai', aiSearchRoutes);
app.post("/api/webhook", (req, res) => {
    console.log("Webhook empfangen:", req.body);
    res.json({ received: true });
});
app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API nicht gefunden: ${req.path}` });
});
app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});
const isProd = process.env.NODE_ENV === "production" || app.get("env") !== "development";
if (!isProd) {
    setupVite(app, server).catch(console.error);
}
else {
    const distPath = path.resolve(import.meta.url.replace("file://", ""), "../public");
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (_req, res) => {
            res.sendFile(path.resolve(distPath, "index.html"));
        });
    }
}
const port = parseInt(process.env.PORT || "5000", 10);
server.listen(port, "0.0.0.0", () => {
    log(`Server läuft auf Port ${port}`);
    console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
});
//# sourceMappingURL=index.js.map