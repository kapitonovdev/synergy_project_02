import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as { travelPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.travelPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.travelPrisma = prisma;
}
