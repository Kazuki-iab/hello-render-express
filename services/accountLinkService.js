import crypto from "node:crypto";

const providerClaims = { google: "google-oauth2", password: "auth0" };

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createAccountLinkRepository(prisma) {
  return {
    createAttempt: (data) => prisma.identityLinkAttempt.create({ data }),
    findAttempt: (tokenHash) => prisma.identityLinkAttempt.findUnique({ where: { tokenHash }, include: { user: true } }),
    findIdentity: (subject) => prisma.userIdentity.findUnique({ where: { subject } }),
    consumeAndLink: (attempt, identity, now) => prisma.$transaction(async (tx) => {
      const consumed = await tx.identityLinkAttempt.updateMany({
        where: { id: attempt.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return false;
      await tx.userIdentity.create({ data: { userId: attempt.userId, subject: identity.subject, provider: identity.provider, email: identity.email } });
      return true;
    }),
  };
}

function createAccountLinkService(repository, now = () => new Date()) {
  async function startLink(userId, targetProvider) {
    if (!providerClaims[targetProvider]) throw new Error("対応していないログイン方法です");
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const createdAt = now();
    await repository.createAttempt({
      userId,
      tokenHash: hashToken(rawToken),
      targetProvider,
      expiresAt: new Date(createdAt.getTime() + 5 * 60 * 1000),
    });
    return rawToken;
  }

  async function completeLink(rawToken, identity) {
    if (!rawToken) throw new Error("連携の有効期限が切れています");
    const attempt = await repository.findAttempt(hashToken(rawToken));
    const currentTime = now();
    if (!attempt || attempt.consumedAt || new Date(attempt.expiresAt) <= currentTime) throw new Error("連携は期限切れか使用済みです");
    if (identity?.emailVerified !== true) throw new Error("メール確認が完了していません");
    if (providerClaims[attempt.targetProvider] !== identity.provider) throw new Error("選択したログイン方法と一致しません");
    if (String(attempt.user.email).trim().toLowerCase() !== String(identity.email).trim().toLowerCase()) {
      throw new Error("同じメールアドレスのログイン方法だけ連携できます");
    }
    const existing = await repository.findIdentity(identity.subject);
    if (existing && existing.userId !== attempt.userId) throw new Error("このログイン方法は別のMoney Paceアカウントで使用されています");
    if (existing?.userId === attempt.userId) throw new Error("このログイン方法はすでに接続済みです");
    if (!await repository.consumeAndLink(attempt, identity, currentTime)) throw new Error("連携は期限切れか使用済みです");
    return attempt.user;
  }

  return { startLink, completeLink };
}

export { createAccountLinkRepository, createAccountLinkService, hashToken };
