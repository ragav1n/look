/**
 * Local full-stack dev server — an alternative to `vercel dev`.
 *
 * `vercel dev` conflicts with this project's SPA rewrite under Vite 6 (it feeds
 * index.html through Vite's JS import-analysis and errors). This script sidesteps
 * it: one Vite server (middleware mode) serves the SPA + HMR, and requests under
 * /api/* are dispatched to the matching serverless handler in api/ — loaded and
 * transformed on the fly via Vite's ssrLoadModule, so the .ts handlers run without
 * a build step. Everything is on ONE origin (http://localhost:3000) so the BFF's
 * same-origin cookie/CSRF checks pass exactly as in production.
 *
 * Reads .env itself (no dotenv dependency). Dev only — never used in a deploy.
 *
 * Run:  node scripts/dev-local.mjs        (PORT env overrides the default 3000)
 */
import { createServer as createHttpServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 3000;

/** Minimal .env loader — KEY=VALUE, ignores comments/blanks, strips one layer of
 *  surrounding quotes. Existing process.env wins so `PORT=x node …` still works. */
function loadEnv() {
  const path = resolve(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k) out[k] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function readBody(req) {
  return new Promise((res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (!data) return res(undefined);
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/json")) {
        try {
          return res(JSON.parse(data));
        } catch {
          return res(undefined);
        }
      }
      res(data);
    });
    req.on("error", () => res(undefined));
  });
}

/** Give a Node req/res the small slice of the Vercel req/res API the handlers use. */
async function shim(req, res, url) {
  req.query = Object.fromEntries(url.searchParams);
  req.cookies = parseCookies(req.headers.cookie);
  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    req.body = await readBody(req);
  }
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (body) => {
    res.end(body);
    return res;
  };
}

async function main() {
  loadEnv();

  const vite = await createViteServer({
    root: ROOT,
    appType: "spa",
    server: { middlewareMode: true },
  });

  const server = createHttpServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    if (url.pathname.startsWith("/api/")) {
      const rel = url.pathname.replace(/^\/+/, ""); // api/admin/login
      const file = resolve(ROOT, `${rel}.ts`);
      if (!file.startsWith(resolve(ROOT, "api")) || !existsSync(file)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "not_found", path: url.pathname }));
        return;
      }
      try {
        await shim(req, res, url);
        const mod = await vite.ssrLoadModule(`/${rel}.ts`);
        await mod.default(req, res);
        if (!res.writableEnded) res.end();
      } catch (err) {
        vite.ssrFixStacktrace?.(err);
        console.error(`[dev-local] ${url.pathname} threw:`, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
        }
        if (!res.writableEnded) res.end(JSON.stringify({ error: "handler_threw" }));
      }
      return;
    }

    // Everything else → the SPA (assets, modules, HMR, index.html fallback).
    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end("Not found");
    });
  });

  server.listen(PORT, () => {
    console.log(`\n  LOOK local dev (SPA + /api) → http://localhost:${PORT}\n`);
    console.log(`  Admin console: http://localhost:${PORT}/admin\n`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
