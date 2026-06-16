import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as { bookstorePrisma?: PrismaClient };

export const prisma =
  globalForPrisma.bookstorePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.bookstorePrisma = prisma;
}
