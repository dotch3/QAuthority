// Server entry point — validates config, runs first-boot init, starts Fastify.
import 'dotenv/config'
import { config } from './config.js'
import { logger } from './logger.js'
import { buildApp } from './app.js'
import { runInit } from './init.js'

async function start() {
  // Run first-boot initialization (create dirs, etc.) before accepting requests
  await runInit()

  const app = await buildApp()

  try {
    await app.listen({ port: 3001, host: '0.0.0.0' })
    logger.info('QAuthority backend started', { action: 'server.start', port: 3001 })
  } catch (err) {
    logger.error('Failed to start server', { action: 'server.start', error: err })
    process.exit(1)
  }
}

start()
