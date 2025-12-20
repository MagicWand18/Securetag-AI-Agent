import http from 'http'
import { dbQuery } from '../utils/db.js'
import { getRedisConnection } from '../utils/redis.js'

// Rate Limit Configuration
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
const UPLOAD_MAX = parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '5', 10)

// Ban Configuration
const BAN_DURATION_HOURS = parseInt(process.env.SECURITY_BAN_DURATION_HOURS || '24', 10)
const BAN_PERMANENT = (process.env.SECURITY_BAN_PERMANENT_ENABLED === '1')
const BAN_APIKEY = (process.env.SECURITY_BAN_APIKEY_ENABLED === '1')
const BAN_TENANT = (process.env.SECURITY_BAN_TENANT_ENABLED === '1')
const BAN_USER = true // Always enabled as it's a core feature now

// Strike Configuration
const STRIKE_THRESHOLD = parseInt(process.env.SECURITY_STRIKE_THRESHOLD || '3', 10)
const STRIKE_WINDOW_MINUTES = parseInt(process.env.SECURITY_STRIKE_WINDOW_MINUTES || '60', 10)

// Local Cache for Bans (Synced with DB)
const bannedIPs: Set<string> = new Set()
const bannedApiKeys: Set<string> = new Set()
const bannedTenants: Set<string> = new Set()
const bannedUsers: Set<string> = new Set()

// Sync banned entities from DB every minute
async function syncBans() {
  try {
    const result = await dbQuery<{ type: string, value: string }>('SELECT type, value FROM securetag.security_ban WHERE is_banned = true AND (is_permanent = true OR banned_until > now())')
    
    bannedIPs.clear()
    bannedApiKeys.clear()
    bannedTenants.clear()
    bannedUsers.clear()

    result.rows.forEach(row => {
      if (row.type === 'ip') bannedIPs.add(row.value)
      else if (row.type === 'api_key') bannedApiKeys.add(row.value)
      else if (row.type === 'tenant') bannedTenants.add(row.value)
      else if (row.type === 'user') bannedUsers.add(row.value)
    })
  } catch (e) {
    console.error('[Security] Failed to sync bans:', e)
  }
}
setInterval(syncBans, 60000)
syncBans() // Initial sync

export function getClientIP(req: http.IncomingMessage): string {
  return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
}

// Check if entity is banned
export function isBanned(ip: string, apiKeyHash?: string, tenantId?: string, userId?: string): boolean {
  if (bannedIPs.has(ip)) return true
  if (apiKeyHash && bannedApiKeys.has(apiKeyHash)) return true
  if (tenantId && bannedTenants.has(tenantId)) return true
  if (userId && bannedUsers.has(userId)) return true
  return false
}

export async function checkRateLimit(req: http.IncomingMessage, isUpload = false): Promise<boolean> {
  const ip = getClientIP(req)
  
  if (isBanned(ip)) {
    return false // IP is banned
  }

  const limit = isUpload ? UPLOAD_MAX : MAX_REQUESTS
  const keyPrefix = isUpload ? 'ratelimit:upload' : 'ratelimit:request'
  const key = `${keyPrefix}:${ip}`
  const redis = getRedisConnection()

  try {
      const multi = redis.multi()
      multi.incr(key)
      multi.ttl(key)
      const results = await multi.exec()
      
      if (!results) throw new Error('Redis transaction failed')
      
      const count = results[0][1] as number
      const ttl = results[1][1] as number
      
      // Set expiration if key is new or has no TTL
      if (count === 1 || ttl === -1) {
          await redis.expire(key, Math.ceil(WINDOW_MS / 1000))
      }
      
      if (count > limit) {
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
  } catch (err) {
      console.error('[Security] Rate limit Redis error, failing open:', err)
      return true
  }
}

export async function banEntity(type: 'ip' | 'api_key' | 'tenant' | 'user', value: string, reason: string) {
    if (type === 'api_key' && !BAN_APIKEY) return
    if (type === 'tenant' && !BAN_TENANT) return
    // Users are always bannable

    console.warn(`[Security] BANNING ${type.toUpperCase()}: ${value} Reason: ${reason}`)
    
    // Update local cache immediately
    if (type === 'ip') bannedIPs.add(value)
    if (type === 'api_key') bannedApiKeys.add(value)
    if (type === 'tenant') bannedTenants.add(value)
    if (type === 'user') bannedUsers.add(value)

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

export async function addStrike(type: 'ip' | 'api_key' | 'tenant' | 'user', value: string, reason: string) {
    // Check feature flags for non-mandatory types
    if (type === 'api_key' && !BAN_APIKEY) return
    if (type === 'tenant' && !BAN_TENANT) return

    try {
        // 1. Record the strike
        await dbQuery(
            'INSERT INTO securetag.security_strike (type, value, reason) VALUES ($1, $2, $3)',
            [type, value, reason]
        )

        // 2. Check strike count in window
        const result = await dbQuery<{ count: string }>(
            `SELECT COUNT(*) as count 
             FROM securetag.security_strike 
             WHERE type = $1 AND value = $2 
             AND created_at > now() - interval '${STRIKE_WINDOW_MINUTES} minutes'`,
            [type, value]
        )

        const count = parseInt(result.rows[0].count, 10)

        if (count >= STRIKE_THRESHOLD) {
            await banEntity(type, value, `Strike limit exceeded (${count}/${STRIKE_THRESHOLD} in ${STRIKE_WINDOW_MINUTES}m). Last reason: ${reason}`)
        }
    } catch (e) {
        console.error(`[Security] Failed to process strike for ${type}:${value}`, e)
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
