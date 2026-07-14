import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

let client;

function getPrisma(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!client) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    client = new PrismaClient({ adapter });
  }
  return client;
}

async function disconnectPrisma() {
  if (client) await client.$disconnect();
  client = undefined;
}

export { getPrisma, disconnectPrisma };
