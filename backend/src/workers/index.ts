import { createReportWorker } from './reportWorker.js'
import { PrismaClient } from '@prisma/client'

export function startWorkers(prisma: PrismaClient) {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  
  try {
    createReportWorker(prisma, redisUrl)
    console.log('✓ Report worker started')
  } catch (err) {
    console.warn('Report worker failed to start (Redis may not be available):', err)
  }
}
