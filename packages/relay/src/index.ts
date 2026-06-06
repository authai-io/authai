import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { authRoutes } from "./auth-routes.js";

const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Access-Control-Max-Age", "86400");
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  await next();
});

app.get("/", (c) => c.json({ ok: true, service: "ai-connect-relay" }));
app.route("/auth", authRoutes);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`ai-connect relay listening on http://localhost:${info.port}`);
});
