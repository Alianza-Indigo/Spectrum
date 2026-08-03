import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton. En serverless (Vercel) evitamos crear un cliente por
 * invocación reutilizando la instancia global en desarrollo.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
