function identityFromClaims(claims = {}) {
  if (!claims.sub) throw new Error("ログイン情報を確認できませんでした");
  if (!claims.email || claims.email_verified !== true) throw new Error("ログイン前にメール確認を完了してください");
  return {
    subject: claims.sub,
    provider: String(claims.sub).split("|")[0],
    email: String(claims.email).trim().toLowerCase(),
    emailVerified: true,
    displayName: String(claims.name || claims.nickname || "").trim(),
    avatarUrl: claims.picture || null,
  };
}

function createCurrentUserMiddleware(userRepository) {
  return async function attachCurrentUser(req, res, next) {
    try {
      if (!req.oidc?.isAuthenticated?.()) return next();
      req.currentUser = await userRepository.resolveIdentity(identityFromClaims(req.oidc.user));
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireCurrentUser(req, res, next) {
  if (!req.currentUser) return res.redirect("/login");
  next();
}

export { identityFromClaims, createCurrentUserMiddleware, requireCurrentUser };
