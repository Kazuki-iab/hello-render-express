import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

function startServer() {
  const port = process.env.PORT || 3000;
  return createApp().listen(port, () => console.log(`Server started on ${port}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startServer();

export { startServer };
