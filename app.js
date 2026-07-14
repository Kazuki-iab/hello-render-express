import express from "express";
import helmet from "helmet";
import routes from "./routes/index.js";

function createApp({ authMiddleware = (req, res, next) => next(), router = routes } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(authMiddleware);
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static("public", { index: false }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/", router);
  return app;
}

export { createApp };
