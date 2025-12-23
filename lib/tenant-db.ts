/**
 * Multi-tenant database utilities
 * Each user gets their own set of tables prefixed with their tenantId
 */

import { query, execute, escapeId } from "./mysql"

export interface TenantTableNames {
  repairTickets: string
  teamMembers: string
  deletedTickets: string
  deletedMembers: string
}

/**
 * Get table names for a specific tenant
 */
export function getTenantTableNames(tenantId: string): TenantTableNames {
  const prefix = `tenant_${tenantId.replace(/-/g, "_")}`
  return {
    repairTickets: `${prefix}_repair_tickets`,
    teamMembers: `${prefix}_team_members`,
    deletedTickets: `${prefix}_deleted_tickets`,
    deletedMembers: `${prefix}_deleted_members`,
  }
}

/**
 * Create tables for a new tenant
 */
export async function createTenantTables(tenantId: string): Promise<void> {
  const tables = getTenantTableNames(tenantId)
  const repairTicketsTable = escapeId(tables.repairTickets)
  const teamMembersTable = escapeId(tables.teamMembers)
  const deletedTicketsTable = escapeId(tables.deletedTickets)
  const deletedMembersTable = escapeId(tables.deletedMembers)

  // Create repair_tickets table
  await execute(`
    CREATE TABLE IF NOT EXISTS ${repairTicketsTable} (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      repairNumber VARCHAR(50) UNIQUE NOT NULL,
      spu VARCHAR(50) UNIQUE NOT NULL,
      clientId VARCHAR(255),
      customerName VARCHAR(255) NOT NULL,
      contact VARCHAR(255) NOT NULL,
      imeiNo VARCHAR(15) UNIQUE NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      serialNo VARCHAR(255),
      softwareVersion VARCHAR(100),
      warranty VARCHAR(50) DEFAULT 'Without Warranty',
      simCard BOOLEAN DEFAULT FALSE,
      memoryCard BOOLEAN DEFAULT FALSE,
      charger BOOLEAN DEFAULT FALSE,
      battery BOOLEAN DEFAULT FALSE,
      waterDamaged BOOLEAN DEFAULT FALSE,
      loanEquipment BOOLEAN DEFAULT FALSE,
      equipmentObs TEXT,
      repairObs TEXT,
      selectedServices JSON,
      \`condition\` TEXT,
      problem TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      INDEX idx_repairNumber (repairNumber),
      INDEX idx_imeiNo (imeiNo),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Create team_members table
  await execute(`
    CREATE TABLE IF NOT EXISTS ${teamMembersTable} (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'member',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userId (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Create deleted_tickets table
  await execute(`
    CREATE TABLE IF NOT EXISTS ${deletedTicketsTable} (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      repairNumber VARCHAR(50) NOT NULL,
      spu VARCHAR(50) NOT NULL,
      clientId VARCHAR(255),
      customerName VARCHAR(255) NOT NULL,
      contact VARCHAR(255) NOT NULL,
      imeiNo VARCHAR(15) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      serialNo VARCHAR(255),
      softwareVersion VARCHAR(100),
      warranty VARCHAR(50),
      simCard BOOLEAN,
      memoryCard BOOLEAN,
      charger BOOLEAN,
      battery BOOLEAN,
      waterDamaged BOOLEAN,
      loanEquipment BOOLEAN,
      equipmentObs TEXT,
      repairObs TEXT,
      selectedServices JSON,
      \`condition\` TEXT,
      problem TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'),
      deletedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_userId (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Create deleted_members table
  await execute(`
    CREATE TABLE IF NOT EXISTS ${deletedMembersTable} (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50),
      deletedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_userId (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)
}

/**
 * Get all tenant IDs from the database
 */
export async function getAllTenantIds(): Promise<string[]> {
  const users = await query(`
    SELECT tenantId 
    FROM users 
    WHERE role != 'SUPER_ADMIN'
  `) as any[]

  return users.map((u) => u.tenantId).filter(Boolean)
}

/**
 * Get all tables for a tenant (for super admin)
 */
export async function getTenantTables(tenantId: string): Promise<any> {
  const tables = getTenantTableNames(tenantId)

  const repairTicketsTable = escapeId(tables.repairTickets)
  const teamMembersTable = escapeId(tables.teamMembers)
  const deletedTicketsTable = escapeId(tables.deletedTickets)
  const deletedMembersTable = escapeId(tables.deletedMembers)

  const [repairTickets, teamMembers, deletedTickets, deletedMembers] = await Promise.all([
    query(`SELECT * FROM ${repairTicketsTable} ORDER BY createdAt DESC`),
    query(`SELECT * FROM ${teamMembersTable} ORDER BY createdAt DESC`),
    query(`SELECT * FROM ${deletedTicketsTable} ORDER BY deletedAt DESC`),
    query(`SELECT * FROM ${deletedMembersTable} ORDER BY deletedAt DESC`),
  ])

  return {
    repairTickets,
    teamMembers,
    deletedTickets,
    deletedMembers,
  }
}

/**
 * Check if tenant tables exist
 */
export async function tenantTablesExist(tenantId: string): Promise<boolean> {
  const tables = getTenantTableNames(tenantId)
  try {
    const tableName = escapeId(tables.repairTickets)
    await query(`SELECT 1 FROM ${tableName} LIMIT 1`)
    return true
  } catch {
    return false
  }
}

/**
 * Migrate existing tenant tables to add missing columns
 * This ensures backward compatibility when new columns are added
 */
export async function migrateTenantTables(tenantId: string): Promise<void> {
  const tables = getTenantTableNames(tenantId)
  const repairTicketsTable = escapeId(tables.repairTickets)
  const deletedTicketsTable = escapeId(tables.deletedTickets)

  try {
    // Check if repair_tickets table exists
    const tableExists = await tenantTablesExist(tenantId)
    if (!tableExists) {
      return // Table doesn't exist, will be created with all columns
    }

    // Check if waterDamaged column exists in repair_tickets table
    try {
      await query(`SELECT waterDamaged FROM ${repairTicketsTable} LIMIT 1`)
    } catch (error: any) {
      // Column doesn't exist, add it
      if (error.code === "ER_BAD_FIELD_ERROR" || error.message?.includes("Unknown column")) {
        console.log(`[Migration] Adding waterDamaged column to ${tables.repairTickets}`)
        await execute(`
          ALTER TABLE ${repairTicketsTable} 
          ADD COLUMN waterDamaged BOOLEAN DEFAULT FALSE AFTER battery
        `)
        console.log(`[Migration] ✅ Added waterDamaged column to ${tables.repairTickets}`)
      } else {
        throw error
      }
    }

    // Check if waterDamaged column exists in deleted_tickets table
    try {
      await query(`SELECT waterDamaged FROM ${deletedTicketsTable} LIMIT 1`)
    } catch (error: any) {
      // Column doesn't exist, add it
      if (error.code === "ER_BAD_FIELD_ERROR" || error.message?.includes("Unknown column")) {
        console.log(`[Migration] Adding waterDamaged column to ${tables.deletedTickets}`)
        await execute(`
          ALTER TABLE ${deletedTicketsTable} 
          ADD COLUMN waterDamaged BOOLEAN DEFAULT NULL AFTER battery
        `)
        console.log(`[Migration] ✅ Added waterDamaged column to ${tables.deletedTickets}`)
      } else {
        throw error
      }
    }
  } catch (error: any) {
    // If table doesn't exist, that's fine - it will be created with all columns
    if (error.code === "ER_NO_SUCH_TABLE") {
      return
    }
    console.error(`[Migration] Error migrating tables for tenant ${tenantId}:`, error)
    // Don't throw - allow operation to continue
  }
}