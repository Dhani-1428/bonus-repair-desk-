/**
 * MySQL Database Connection
 * Direct MySQL connection without Prisma
 */

import mysql from "mysql2/promise"

/**
 * Convert a Date object or ISO string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
 * MySQL DATETIME doesn't support timezone or milliseconds
 */
export function toMySQLDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null
  
  let dateObj: Date
  if (typeof date === "string") {
    // Remove timezone info and parse
    const cleaned = date.replace(/Z$/, "").replace(/\.\d{3}$/, "")
    dateObj = new Date(cleaned)
  } else {
    dateObj = date
  }
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`)
  }
  
  // Format as YYYY-MM-DD HH:MM:SS
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, "0")
  const day = String(dateObj.getDate()).padStart(2, "0")
  const hours = String(dateObj.getHours()).padStart(2, "0")
  const minutes = String(dateObj.getMinutes()).padStart(2, "0")
  const seconds = String(dateObj.getSeconds()).padStart(2, "0")
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// Connection pool configuration
const getSSLConfig = () => {
  // For Aiven or any cloud database requiring SSL
  if (process.env.DB_SSL === "true" || process.env.DB_HOST?.includes("aivencloud.com") || process.env.DB_HOST?.includes("cloud")) {
    return {
      rejectUnauthorized: false, // Aiven uses self-signed certificates
    }
  }
  return undefined
}

// Log connection config (without password) for debugging
const connectionConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ? "***" : "NOT SET",
  database: process.env.DB_NAME || "admin_panel_db",
  ssl: getSSLConfig(),
}

console.log("[MySQL] Connection config:", {
  host: connectionConfig.host,
  port: connectionConfig.port,
  user: connectionConfig.user,
  password: connectionConfig.password,
  database: connectionConfig.database,
  ssl: connectionConfig.ssl ? "enabled" : "disabled",
  DB_SSL: process.env.DB_SSL,
})

// Validate required environment variables
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.error("[MySQL] ⚠️  Missing required environment variables:")
  console.error("   DB_HOST:", process.env.DB_HOST ? "✓" : "✗ MISSING")
  console.error("   DB_PORT:", process.env.DB_PORT ? "✓" : "✗ MISSING (using default 3306)")
  console.error("   DB_USER:", process.env.DB_USER ? "✓" : "✗ MISSING")
  console.error("   DB_PASSWORD:", process.env.DB_PASSWORD ? "✓" : "✗ MISSING")
  console.error("   DB_NAME:", process.env.DB_NAME ? "✓" : "✗ MISSING")
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "admin_panel_db",
  ssl: getSSLConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000, // 60 seconds timeout for cloud databases
  // Additional options for better connection stability
  multipleStatements: false,
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
})

// Handle pool errors
pool.on("connection", (connection) => {
  console.log("[MySQL] New connection established")
  
  connection.on("error", (err: any) => {
    console.error("[MySQL] Connection error:", err?.code || err?.message)
    if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNRESET") {
      console.log("[MySQL] Connection lost, will be reconnected automatically")
    }
  })
})

pool.on("error", (err: any) => {
  console.error("[MySQL] Pool error:", err?.code || err?.message)
})

/**
 * Execute a query with retry logic for connection errors
 * Note: For table/column names, use escapeId() before passing to query
 */
export async function query(sql: string, params?: any[], retries = 2): Promise<any> {
  // Check if required env vars are set before attempting query
  // Log what we're actually seeing (for debugging)
  const envCheck = {
    DB_HOST: process.env.DB_HOST ? `Set (${process.env.DB_HOST.substring(0, 10)}...)` : "NOT SET",
    DB_PORT: process.env.DB_PORT ? `Set (${process.env.DB_PORT})` : "NOT SET",
    DB_USER: process.env.DB_USER ? `Set (${process.env.DB_USER})` : "NOT SET",
    DB_PASSWORD: process.env.DB_PASSWORD ? "Set (***)" : "NOT SET",
    DB_NAME: process.env.DB_NAME ? `Set (${process.env.DB_NAME})` : "NOT SET",
    DB_SSL: process.env.DB_SSL ? `Set (${process.env.DB_SSL})` : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }
  
  console.log("[MySQL] Environment check:", envCheck)
  
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    const missing = []
    if (!process.env.DB_HOST) missing.push("DB_HOST")
    if (!process.env.DB_USER) missing.push("DB_USER")
    if (!process.env.DB_PASSWORD) missing.push("DB_PASSWORD")
    if (!process.env.DB_NAME) missing.push("DB_NAME")
    
    console.error("[MySQL] ❌ Missing environment variables:", missing)
    console.error("[MySQL] All environment variables:", Object.keys(process.env).filter(k => k.startsWith("DB_")))
    
    const error = new Error(`Missing required database environment variables: ${missing.join(", ")}. Please configure them in Vercel project settings and redeploy.`)
    ;(error as any).code = "ENV_MISSING"
    ;(error as any).missing = missing
    ;(error as any).envCheck = envCheck
    throw error
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const [results] = await pool.execute(sql, params || [])
      return results
    } catch (error: any) {
      const isConnectionError = 
        error?.code === "ECONNRESET" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "ECONNREFUSED" ||
        error?.code === "PROTOCOL_CONNECTION_LOST" ||
        error?.code === "PROTOCOL_ENQUEUE_AFTER_QUIT" ||
        error?.code === "ER_ACCESS_DENIED_ERROR" ||
        error?.code === "ER_BAD_DB_ERROR" ||
        error?.message?.includes("Connection lost") ||
        error?.message?.includes("read ECONNRESET") ||
        error?.message?.includes("connect ECONNREFUSED")
      
      if (isConnectionError && attempt < retries) {
        console.warn(`[MySQL] Connection error (attempt ${attempt + 1}/${retries + 1}), retrying...`, error?.code || error?.message)
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        continue
      }
      
      // Log detailed error information
      console.error("[MySQL] Query error:", {
        code: error?.code,
        errno: error?.errno,
        sqlState: error?.sqlState,
        sqlMessage: error?.sqlMessage,
        message: error?.message,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
      })
      
      throw error
    }
  }
  throw new Error("Query failed after retries")
}

/**
 * Execute a query and return first result
 */
export async function queryOne(sql: string, params?: any[], retries = 2): Promise<any> {
  const results = await query(sql, params, retries)
  return Array.isArray(results) && results.length > 0 ? results[0] : null
}

/**
 * Execute an insert/update/delete query
 */
export async function execute(sql: string, params?: any[], retries = 2): Promise<any> {
  return query(sql, params, retries)
}

/**
 * Get a connection from the pool
 */
export async function getConnection() {
  return await pool.getConnection()
}

/**
 * Begin a transaction
 */
export async function beginTransaction() {
  const connection = await pool.getConnection()
  await connection.beginTransaction()
  return connection
}

/**
 * Commit a transaction
 */
export async function commit(connection: mysql.PoolConnection) {
  await connection.commit()
  connection.release()
}

/**
 * Rollback a transaction
 */
export async function rollback(connection: mysql.PoolConnection) {
  await connection.rollback()
  connection.release()
}

/**
 * Escape a value for SQL
 */
export function escape(value: any): string {
  return mysql.escape(value)
}

/**
 * Escape an identifier (table/column name)
 */
export function escapeId(value: string): string {
  return mysql.escapeId(value)
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await query("SELECT 1")
    return true
  } catch (error) {
    console.error("[MySQL] Connection test failed:", error)
    return false
  }
}

/**
 * Close all connections
 */
export async function closePool() {
  await pool.end()
}

export default pool

