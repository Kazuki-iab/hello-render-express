import { createLinkCookie, linkCookieName, readLinkCookie } from "../auth/linkState.js";
import { identityFromClaims } from "../middleware/currentUser.js";

function createAccountLinkController(service, config) {
  const cookieName = linkCookieName(config.isProduction);
  const cookieOptions = { httpOnly: true, secure: config.isProduction, sameSite: "lax", path: "/", maxAge: 5 * 60 * 1000 };

  async function start(req, res, next) {
    try {
      const provider = req.params.provider;
      const rawToken = await service.startLink(req.currentUser.id, provider);
      res.cookie(cookieName, createLinkCookie(rawToken, config.accountLinkSecret), cookieOptions);
      res.oidc.login({
        returnTo: "/account/link/complete",
        authorizationParams: {
          connection: provider === "google" ? "google-oauth2" : "Username-Password-Authentication",
          prompt: "login",
          max_age: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async function complete(req, res) {
    try {
      const rawToken = readLinkCookie(req.cookies?.[cookieName], config.accountLinkSecret);
      await service.completeLink(rawToken, identityFromClaims(req.oidc?.user));
      res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
      res.redirect("/?message=" + encodeURIComponent("ログイン方法を接続しました") + "#account");
    } catch (error) {
      res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
      if (res.oidc?.logout) {
        return res.oidc.logout({ returnTo: config.auth0BaseUrl + "/?message=" + encodeURIComponent(error.message) + "&type=error" });
      }
      return res.redirect("/logout");
    }
  }

  return { start, complete };
}

export { createAccountLinkController };
