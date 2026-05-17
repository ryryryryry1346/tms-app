import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadServerEntry } from "srvx/loader";
import { log } from "srvx/log";
import { serveStatic } from "srvx/static";

const distDir = resolve(".");
const staticDir = resolve("dist/client");
const entry = "dist/server/server.js";

if (!existsSync(staticDir)) {
  throw new Error(`Static directory not found: ${staticDir}`);
}

const loaded = await loadServerEntry({
  dir: distDir,
  entry,
});

const { serve } = loaded.nodeCompat ? await import("srvx/node") : await import("srvx");
const staticMiddleware = serveStatic({ dir: staticDir });

function withAssetCache(middleware) {
  return async (request, next) => {
    const response = await middleware(request, next);
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith("/assets/") && response.status === 200) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  };
}

function renderError(error) {
  console.error(error);

  return new Response(
    "<!DOCTYPE html><html><head><title>Server Error</title></head><body><h1>Server Error</h1><p>Something went wrong while processing your request.</p></body></html>",
    {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

const serverOptions = {
  ...loaded.module?.default,
  default: undefined,
  ...loaded.module,
};

const server = serve({
  ...serverOptions,
  gracefulShutdown: true,
  port: process.env.PORT || serverOptions.port,
  hostname: "0.0.0.0",
  error: renderError,
  fetch:
    loaded.fetch ||
    (() =>
      new Response("No Fetch Handler Exported", {
        status: 501,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })),
  middleware: [
    log(),
    withAssetCache(staticMiddleware),
    ...(serverOptions.middleware || []),
  ],
});

await server.ready();
