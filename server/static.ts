import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  // ⬇️ IMPORTANT FIX:
  // If frontend is not built (Render backend-only deploy),
  // do NOT crash the server.
  if (!fs.existsSync(distPath)) {
    console.warn(
      `[static] Frontend build not found at ${distPath}. Skipping static file serving.`,
    );
    return;
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
