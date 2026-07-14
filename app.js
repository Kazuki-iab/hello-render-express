import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import routes from "./routes/index.js";
import { createAuthMiddleware } from "./auth/auth0.js";
import { loadConfig } from "./config/env.js";
import { createAppController } from "./controllers/appController.js";
import { createAccountLinkController } from "./controllers/accountLinkController.js";
import { getPrisma } from "./lib/prisma.js";
import { createCurrentUserMiddleware, requireCurrentUser } from "./middleware/currentUser.js";
import { createSecurity } from "./middleware/security.js";
import { createMoneyRepository } from "./repositories/moneyRepository.js";
import { createUserRepository } from "./repositories/userRepository.js";
import { createRoutes } from "./routes/index.js";
import { createMoneyService } from "./services/moneyService.js";
import { createAccountLinkRepository, createAccountLinkService } from "./services/accountLinkService.js";

const pass = (req, res, next) => next();

function createApp({
  authMiddleware = pass,
  currentUserMiddleware = pass,
  cookieMiddleware = cookieParser(),
  router = routes,
  errorHandler,
} = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }));
  app.use(authMiddleware);
  app.use(cookieMiddleware);
  app.use(express.urlencoded({ extended: false }));
  app.use(currentUserMiddleware);
  app.use(express.static("public", { index: false }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/", router);
  if (errorHandler) app.use(errorHandler);
  return app;
}

function createProductionApp(env = process.env) {
  const config = loadConfig(env);
  const prisma = getPrisma(config.databaseUrl);
  const userRepository = createUserRepository(prisma);
  const moneyService = createMoneyService(createMoneyRepository(prisma));
  const security = createSecurity(config);
  const controller = createAppController({ moneyService, userRepository, csrfToken: security.csrfToken, authRequired: true });
  const linkService = createAccountLinkService(createAccountLinkRepository(prisma));
  const linkController = createAccountLinkController(linkService, config);
  const router = createRoutes({ controller, requireCurrentUser, csrfProtection: security.csrfProtection, mutationLimiter: security.mutationLimiter, linkController });
  return createApp({
    authMiddleware: createAuthMiddleware(config),
    currentUserMiddleware: createCurrentUserMiddleware(userRepository),
    router,
    errorHandler: security.errorHandler,
  });
}

export { createApp, createProductionApp };
