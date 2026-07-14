import { fileURLToPath } from "node:url";
import { createApp, createProductionApp } from "./app.js";
import { hasAuthConfig } from "./config/env.js";

function startServer() {
  const port = process.env.PORT || 3000;
  if (process.env.NODE_ENV === "production" && !hasAuthConfig()) {
    throw new Error("Production authentication configuration is incomplete");
  }
  const app = hasAuthConfig() ? createProductionApp() : createApp();
  return app.listen(port, () => console.log(`Server started on ${port}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startServer();

export { startServer };
