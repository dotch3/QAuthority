import 'dotenv/config'

export const config = {
  DATABASE_URL: process.env.DATABASE_URL!,
  DATABASE_POOL_URL: process.env.DATABASE_POOL_URL!,
  SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  AUTH_MODE: process.env.AUTH_MODE || 'local',
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION === 'true',
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  OAUTH_GITHUB_CLIENT_ID: process.env.OAUTH_GITHUB_CLIENT_ID || '',
  OAUTH_GITHUB_CLIENT_SECRET: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
  OAUTH_GOOGLE_CLIENT_ID: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
  OAUTH_GOOGLE_CLIENT_SECRET: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
  OAUTH_MICROSOFT_CLIENT_ID: process.env.OAUTH_MICROSOFT_CLIENT_ID || '',
  OAUTH_MICROSOFT_CLIENT_SECRET: process.env.OAUTH_MICROSOFT_CLIENT_SECRET || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@testtools.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Changeme123!',
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  STORAGE_PATH: process.env.STORAGE_PATH || './data/uploads',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'testtool-uploads',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_BUCKET: process.env.S3_BUCKET || 'testtool-uploads',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  BACKUP_PATH: process.env.BACKUP_PATH || './data/backups',
  BACKUP_CRON: process.env.BACKUP_CRON || '0 2 * * *',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_OUTPUT: process.env.LOG_OUTPUT || 'both',
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || '20m',
  LOG_MAX_FILES: process.env.LOG_MAX_FILES || '14d',
  LOG_PATH: process.env.LOG_PATH || './logs',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  UI_DEFAULT_THEME: process.env.UI_DEFAULT_THEME || 'dark',
  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
  PASSWORD_REQUIRE_UPPERCASE: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  PASSWORD_REQUIRE_SYMBOL: process.env.PASSWORD_REQUIRE_SYMBOL !== 'false',
  LOCKOUT_MAX_ATTEMPTS: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5', 10),
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'TestTool <no-reply@testtools.com>',
}

export interface Config {
  DATABASE_URL: string
  DATABASE_POOL_URL: string
  SHADOW_DATABASE_URL: string
  REDIS_URL: string
  AUTH_MODE: string
  ALLOW_REGISTRATION: boolean
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
  JWT_REFRESH_EXPIRES_IN: string
  ENCRYPTION_KEY: string
  OAUTH_GITHUB_CLIENT_ID: string
  OAUTH_GITHUB_CLIENT_SECRET: string
  OAUTH_GOOGLE_CLIENT_ID: string
  OAUTH_GOOGLE_CLIENT_SECRET: string
  OAUTH_MICROSOFT_CLIENT_ID: string
  OAUTH_MICROSOFT_CLIENT_SECRET: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  STORAGE_PROVIDER: string
  STORAGE_PATH: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  SUPABASE_STORAGE_BUCKET: string
  S3_ENDPOINT: string
  S3_BUCKET: string
  S3_REGION: string
  S3_ACCESS_KEY_ID: string
  S3_SECRET_ACCESS_KEY: string
  BACKUP_PATH: string
  BACKUP_CRON: string
  LOG_LEVEL: string
  LOG_OUTPUT: string
  LOG_MAX_SIZE: string
  LOG_MAX_FILES: string
  LOG_PATH: string
  FRONTEND_URL: string
  NEXT_PUBLIC_API_URL: string
  UI_DEFAULT_THEME: string
  PASSWORD_MIN_LENGTH: number
  PASSWORD_REQUIRE_UPPERCASE: boolean
  PASSWORD_REQUIRE_SYMBOL: boolean
  LOCKOUT_MAX_ATTEMPTS: number
  LOCKOUT_DURATION_MINUTES: number
  SMTP_HOST: string
  SMTP_PORT: number
  SMTP_SECURE: boolean
  SMTP_USER: string
  SMTP_PASS: string
  SMTP_FROM: string
}

export const APP_CONFIG = {
  name: "QAuthority",
  version: "1.0.0",
  description: "Enterprise QA Governance Platform",
} as const
