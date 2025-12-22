import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Construct DATABASE_URL from individual DB_* variables if DATABASE_URL is not set
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Build from individual variables
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "3306";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "admin_panel_db";
  const ssl = process.env.DB_SSL === "true" ? "?sslaccept=strict" : "";
  
  return `mysql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}${ssl}`;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: {
      url: getDatabaseUrl(),
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
