import crypto from "node:crypto";

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createLinkCookie(rawToken, secret) {
  return `${rawToken}.${sign(rawToken, secret)}`;
}

function readLinkCookie(value, secret) {
  const [rawToken, signature, extra] = String(value || "").split(".");
  if (!rawToken || !signature || extra) return null;
  const expected = sign(rawToken, secret);
  if (signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? rawToken : null;
}

function linkCookieName(isProduction) {
  return isProduction ? "__Host-money-pace.link" : "money-pace.link";
}

export { createLinkCookie, readLinkCookie, linkCookieName };
