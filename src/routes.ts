import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { mcpManager } from "./mcp-manager.js";
import { loadConfig, saveConfig, type ServerConfig } from "./config.js";

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function createRoutes() {
  const router = new Hono();

  // Load initial servers from config file
  const cfg = loadConfig();
  for (const [name, config] of Object.entries(cfg.mcpServers)) {
    mcpManager.addServer(name, name, config);
  }

  // ── Servers ──────────────────────────────────────────────────────────────

  router.get("/servers", (c) => c.json(mcpManager.getAllServerInfo()));

  router.post("/servers", async (c) => {
    const { id, name, config } = await c.req.json<{
      id: string;
      name: string;
      config: ServerConfig;
    }>();
    const info = mcpManager.addServer(id, name, config);
    const cfg = loadConfig();
    cfg.mcpServers[id] = config;
    saveConfig(cfg);
    return c.json(info, 201);
  });

  router.put("/servers/:id", async (c) => {
    const { id } = c.req.param();
    const { name, config } = await c.req.json<{ name: string; config: ServerConfig }>();
    const info = mcpManager.updateServer(id, name, config);
    const cfg = loadConfig();
    cfg.mcpServers[id] = config;
    saveConfig(cfg);
    return c.json(info);
  });

  router.delete("/servers/:id", async (c) => {
    const { id } = c.req.param();
    await mcpManager.removeServer(id);
    const cfg = loadConfig();
    delete cfg.mcpServers[id];
    saveConfig(cfg);
    return c.json({ success: true });
  });

  router.get("/servers/:id", (c) => {
    const info = mcpManager.getServerInfo(c.req.param("id"));
    return info ? c.json(info) : c.json({ error: "Not found" }, 404);
  });

  // ── Connect / Disconnect ──────────────────────────────────────────────────

  router.post("/servers/:id/connect", async (c) => {
    const { id } = c.req.param();
    try {
      await mcpManager.connect(id);
      return c.json({ status: "connected" });
    } catch (err) {
      return c.json({ status: "error", error: errMsg(err) }, 500);
    }
  });

  router.post("/servers/:id/disconnect", async (c) => {
    const { id } = c.req.param();
    await mcpManager.disconnect(id);
    return c.json({ status: "disconnected" });
  });

  // ── Tools ─────────────────────────────────────────────────────────────────

  router.get("/servers/:id/tools", async (c) => {
    const { id } = c.req.param();
    try {
      return c.json(await mcpManager.listTools(id));
    } catch (err) {
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  router.post("/servers/:id/tools/:tool/call", async (c) => {
    const { id, tool } = c.req.param();
    const args = await c.req.json();
    try {
      return c.json(await mcpManager.callTool(id, tool, args));
    } catch (err) {
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── Resources ─────────────────────────────────────────────────────────────

  router.get("/servers/:id/resources", async (c) => {
    const { id } = c.req.param();
    try {
      return c.json(await mcpManager.listResources(id));
    } catch (err) {
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  router.post("/servers/:id/resources/read", async (c) => {
    const { id } = c.req.param();
    const { uri } = await c.req.json<{ uri: string }>();
    try {
      return c.json(await mcpManager.readResource(id, uri));
    } catch (err) {
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── Prompts ───────────────────────────────────────────────────────────────

  router.get("/servers/:id/prompts", async (c) => {
    const { id } = c.req.param();
    try {
      return c.json(await mcpManager.listPrompts(id));
    } catch (err) {
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  router.post("/servers/:id/prompts/:prompt/get", async (c) => {
    const { id, prompt } = c.req.param();
    const args = await c.req.json();
    try {
      return c.json(await mcpManager.getPrompt(id, prompt, args));
    } catch (err) {
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── Logs ──────────────────────────────────────────────────────────────────

  router.get("/servers/:id/logs", (c) => {
    const { id } = c.req.param();
    return c.json(mcpManager.getLogs(id));
  });

  router.delete("/servers/:id/logs", (c) => {
    const { id } = c.req.param();
    mcpManager.clearLogs(id);
    return c.json({ success: true });
  });

  router.get("/servers/:id/logs/stream", (c) => {
    const { id } = c.req.param();
    return streamSSE(c, async (stream) => {
      // Send buffered log entries first
      for (const entry of mcpManager.getLogs(id)) {
        await stream.writeSSE({ data: JSON.stringify(entry) });
      }

      // Stream new entries as they arrive
      let unsub: (() => void) | undefined;
      await new Promise<void>((done) => {
        stream.onAbort(() => {
          unsub?.();
          done();
        });

        unsub = mcpManager.subscribe(id, async (entry) => {
          try {
            await stream.writeSSE({ data: JSON.stringify(entry) });
          } catch {
            unsub?.();
            done();
          }
        });
      });
    });
  });

  return router;
}
