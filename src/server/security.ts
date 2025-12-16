import http from 'http'
import { dbQuery } from '../utils/db.js'

// Rate Limit Configuration
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
const UPLOAD_MAX = parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '5', 10)

// Ban Configuration
const BAN_DURATION_HOURS = parseInt(process.env.SECURITY_BAN_DURATION_HOURS || '24', 10)
const BAN_PERMANENT = (process.env.SECURITY_BAN_PERMANENT_ENABLED === '1')
const BAN_APIKEY = (process.env.SECURITY_BAN_APIKEY_ENABLED === '1')
const BAN_TENANT = (process.env.SECURITY_BAN_TENANT_ENABLED === '1')

// Simple In-Memory Store
const ipStore: Map<string, { count: number, resetTime: number }> = new Map()
const uploadStore: Map<string, { count: number, resetTime: number }> = new Map()

// Local Cache for Bans
const bannedIPs: Set<string> = new Set()
const bannedApiKeys: Set<string> = new Set()
const bannedTenants: Set<string> = new Set()

// Sync banned entities from DB every minute
async function syncBans() {
  try {
    const result = await dbQuery<{ type: string, value: string }>('SELECT type, value FROM securetag.security_ban WHERE is_banned = true AND (is_permanent = true OR banned_until > now())')
    
    bannedIPs.clear()
    bannedApiKeys.clear()
    bannedTenants.clear()

    result.rows.forEach(row => {
      if (row.type === 'ip') bannedIPs.add(row.value)
      else if (row.type === 'api_key') bannedApiKeys.add(row.value)
      else if (row.type === 'tenant') bannedTenants.add(row.value)
    })
  } catch (e) {
    console.error('[Security] Failed to sync bans:', e)
  }
}
setInterval(syncBans, 60000)
syncBans() // Initial sync

function cleanupStore(store: Map<string, { count: number, resetTime: number }>) {
  const now = Date.now()
  for (const [ip, data] of store.entries()) {
    if (now > data.resetTime) {
      store.delete(ip)
    }
  }
}

setInterval(() => {
  cleanupStore(ipStore)
  cleanupStore(uploadStore)
}, 5 * 60 * 1000)

export function getClientIP(req: http.IncomingMessage): string {
  return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
}

// Check if entity is banned
export function isBanned(ip: string, apiKeyHash?: string, tenantId?: string): boolean {
  if (bannedIPs.has(ip)) return true
  if (apiKeyHash && bannedApiKeys.has(apiKeyHash)) return true
  if (tenantId && bannedTenants.has(tenantId)) return true
  return false
}

export function checkRateLimit(req: http.IncomingMessage, isUpload = false): boolean {
  const ip = getClientIP(req)
  
  if (isBanned(ip)) {
    return false // IP is banned
  }

  const store = isUpload ? uploadStore : ipStore
  const limit = isUpload ? UPLOAD_MAX : MAX_REQUESTS
  const now = Date.now()

  let data = store.get(ip)
  if (!data || now > data.resetTime) {
    data = { count: 0, resetTime: now + WINDOW_MS }
    store.set(ip, data)
  }

  data.count++
  
  if (data.count > limit) {
      // Async record violation
      dbQuery(
          `INSERT INTO securetag.security_ban (type, value, violation_count, last_violation_at) 
           VALUES ('ip', $1, 1, now()) 
           ON CONFLICT (type, value) DO UPDATE 
           SET violation_count = security_ban.violation_count + 1, last_violation_at = now()`,
          [ip]
      ).catch(console.error)
      return false
  }
  
  return true
}

export async function banEntity(type: 'ip' | 'api_key' | 'tenant', value: string, reason: string) {
    if (type === 'api_key' && !BAN_APIKEY) return
    if (type === 'tenant' && !BAN_TENANT) return

    console.warn(`[Security] BANNING ${type.toUpperCase()}: ${value} Reason: ${reason}`)
    
    // Update local cache immediately
    if (type === 'ip') bannedIPs.add(value)
    if (type === 'api_key') bannedApiKeys.add(value)
    if (type === 'tenant') bannedTenants.add(value)

    const durationSQL = BAN_PERMANENT ? "NULL" : `now() + interval '${BAN_DURATION_HOURS} hours'`
    
    try {
        await dbQuery(
            `INSERT INTO securetag.security_ban (type, value, violation_count, is_banned, is_permanent, banned_until, last_violation_at) 
             VALUES ($1, $2, 1, true, $3, ${durationSQL}, now()) 
             ON CONFLICT (type, value) DO UPDATE 
             SET is_banned = true, 
                 is_permanent = $3,
                 banned_until = ${durationSQL}, 
                 violation_count = security_ban.violation_count + 1, 
                 last_violation_at = now()`,
            [type, value, BAN_PERMANENT]
        )
    } catch (e) {
        console.error(`[Security] Failed to persist ${type} ban:`, e)
    }
}

export async function banIP(ip: string, reason: string) {
  return banEntity('ip', ip, reason)
}

export function addSecurityHeaders(res: http.ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none';")
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
}
