import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as { blogPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.blogPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.blogPrisma = prisma;
}
