// Prisma configuration for Prisma 7.x
import "dotenv/config";
import { defineConfig } from "prisma/config";

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

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
    adapter: "mysql",
  },
});
