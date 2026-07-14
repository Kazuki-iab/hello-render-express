import crypto from "node:crypto";
import { doubleCsrf } from "csrf-csrf";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { renderErrorPage } from "../views/errorPage.js";

function createSecurity(config) {
  const logger = config.logger || console;
  const {
    invalidCsrfTokenError,
    generateCsrfToken,
    doubleCsrfProtection,
  } = doubleCsrf({
    getSecret: () => config.csrfSecret,
    getSessionIdentifier: (req) => req.oidc?.user?.sub || req.currentUser?.id || "signed-out",
    cookieName: config.isProduction ? "__Host-money-pace.csrf" : "money-pace.csrf",
    cookieOptions: { httpOnly: true, secure: config.isProduction, sameSite: "lax", path: "/" },
    getCsrfTokenFromRequest: (req) => req.body?._csrf,
  });

  const mutationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => req.currentUser?.id || ipKeyGenerator(req.ip),
    message: "操作が続いています。少し待ってからもう一度お試しください。",
  });

  function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    const correlationId = crypto.randomUUID();
    const status = error === invalidCsrfTokenError || error?.code === "EBADCSRFTOKEN"
      ? 403
      : ["P1000", "P1001", "P1002", "P1017"].includes(error?.code)
        ? 503
        : error?.status === 401 || error?.status === 403
          ? error.status
          : 500;
    if (status !== 403) logger.error(`[${correlationId}]`, error?.stack || error);
    res.status(status).send(renderErrorPage(status, correlationId));
  }

  return {
    csrfToken: (req, res) => generateCsrfToken(req, res),
    csrfProtection: doubleCsrfProtection,
    mutationLimiter,
    errorHandler,
  };
}

export { createSecurity };
