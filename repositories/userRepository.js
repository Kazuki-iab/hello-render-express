function createUserRepository(prisma) {
  async function resolveIdentity(identity) {
    if (!identity?.subject || !identity?.email || identity.emailVerified !== true) {
      throw new Error("確認済みのメールアドレスが必要です");
    }
    const existing = await prisma.userIdentity.findUnique({ where: { subject: identity.subject }, include: { user: true } });
    if (existing) return existing.user;

    try {
      return await prisma.$transaction((tx) => tx.user.create({
        data: {
          email: identity.email,
          displayName: identity.displayName || identity.email.split("@")[0],
          avatarUrl: identity.avatarUrl || null,
          identities: {
            create: { subject: identity.subject, provider: identity.provider, email: identity.email },
          },
        },
      }));
    } catch (error) {
      if (error?.code !== "P2002") throw error;
      const raced = await prisma.userIdentity.findUnique({ where: { subject: identity.subject }, include: { user: true } });
      if (!raced) throw error;
      return raced.user;
    }
  }

  const findUser = (id) => prisma.user.findUnique({ where: { id }, include: { identities: true } });
  const updateProfile = (id, displayName) => prisma.user.update({ where: { id }, data: { displayName } });

  return { resolveIdentity, findUser, updateProfile };
}

export { createUserRepository };
