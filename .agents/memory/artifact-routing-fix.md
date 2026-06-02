---
name: Artifact routing fix
description: How to fix 502 errors caused by Replit artifact router sending main-domain traffic to the API server instead of the frontend.
---

# Artifact Router 502 Fix

## The Rule
When `.replit` has `[[artifacts]]` entries (e.g. `id = "artifacts/api-server"`), Replit's artifact router sends **all main-domain traffic to that artifact service**, overriding `[[ports]]` mappings. If the artifact service doesn't serve HTML on `/`, users see a 502.

**Why:** The `REPLIT_ARTIFACT_ROUTER` binary intercepts requests before port-level routing. Any artifact listed in `.replit` becomes the routing target for the main domain.

**How to apply:** When you see a 502 on the main domain and the API server logs show it's receiving `GET /` requests — this is the cause.

## Fix Applied
Since `.replit` cannot be edited directly (the write/edit tools block it), add a dev-mode reverse proxy inside the API server itself:

In `artifacts/api-server/src/app.ts`, after the `/api` router and before the production static-serve block, add:

```typescript
} else {
  // In development, proxy all non-API requests to Vite dev server on port 5000.
  // Needed because Replit's artifact router sends main-domain traffic here.
  app.use((req, res) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: "localhost:5000" },
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on("error", () => {
      res.status(503).send("Frontend dev server not ready yet — please refresh.");
    });
    req.pipe(proxyReq, { end: true });
  });
}
```

Also import `http` from Node's built-in module at the top of `app.ts`.

## Secondary fix: API Server workflow waitForPort
The `waitForPort = 8080` in the API Server workflow causes Replit's restart tool to time out (even when the server starts fine). Fix: reconfigure via `configureWorkflow` without `waitForPort` — the server still starts and runs, Replit just doesn't gate startup on port detection.
