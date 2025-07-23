import { PrismaClient } from '../../generated/prisma/index.js'
import { withAccelerate } from '@prisma/extension-accelerate'

// Initialize Prisma Client with Accelerate extension for edge and serverless environments
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient().$extends(withAccelerate())

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma as any
}

export default prisma

// Export types for convenience
export type * from '../../generated/prisma/index.js'
