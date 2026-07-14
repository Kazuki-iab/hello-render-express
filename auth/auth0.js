import { auth } from "express-openid-connect";

function createAuthMiddleware(config) {
  return auth({
    authRequired: false,
    auth0Logout: true,
    secret: config.auth0Secret,
    baseURL: config.auth0BaseUrl,
    clientID: config.auth0ClientId,
    clientSecret: config.auth0ClientSecret,
    issuerBaseURL: config.auth0IssuerBaseUrl,
    authorizationParams: { response_type: "code", scope: "openid profile email" },
    session: {
      rolling: true,
      rollingDuration: 86400,
      absoluteDuration: 604800,
      cookie: { httpOnly: true, secure: config.isProduction, sameSite: "Lax" },
    },
  });
}

export { createAuthMiddleware };
