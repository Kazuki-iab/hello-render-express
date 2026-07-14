function required(env, name) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const config = {
    isProduction,
    databaseUrl: required(env, "DATABASE_URL"),
    auth0Secret: required(env, "AUTH0_SECRET"),
    auth0BaseUrl: required(env, "AUTH0_BASE_URL"),
    auth0ClientId: required(env, "AUTH0_CLIENT_ID"),
    auth0ClientSecret: required(env, "AUTH0_CLIENT_SECRET"),
    auth0IssuerBaseUrl: required(env, "AUTH0_ISSUER_BASE_URL"),
    csrfSecret: required(env, "CSRF_SECRET"),
    accountLinkSecret: required(env, "ACCOUNT_LINK_SECRET"),
  };
  if (isProduction) {
    for (const [name, value] of [
      ["AUTH0_SECRET", config.auth0Secret],
      ["AUTH0_CLIENT_SECRET", config.auth0ClientSecret],
      ["CSRF_SECRET", config.csrfSecret],
      ["ACCOUNT_LINK_SECRET", config.accountLinkSecret],
    ]) {
      if (value.length < 32) throw new Error(`${name} must be at least 32 characters`);
    }
    if (!config.auth0BaseUrl.startsWith("https://")) throw new Error("AUTH0_BASE_URL must use HTTPS in production");
  }
  return config;
}

function hasAuthConfig(env = process.env) {
  return ["DATABASE_URL", "AUTH0_SECRET", "AUTH0_BASE_URL", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_ISSUER_BASE_URL", "CSRF_SECRET", "ACCOUNT_LINK_SECRET"].every((name) => String(env[name] || "").trim());
}

export { loadConfig, hasAuthConfig };
