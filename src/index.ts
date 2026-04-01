import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createRoutes } from "./routes.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());
app.route("/api", createRoutes());

if (process.env.NODE_ENV === "production") {
  app.use("*", serveStatic({ root: "./client/dist" }));
  app.get("*", serveStatic({ path: "./client/dist/index.html" }));
}

const PORT = Number(process.env.PORT ?? 8000);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n  MCP Playground`);
  console.log(`  Server  → http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`  UI      → http://localhost:5173\n`);
  }
});
