import http from 'http'
import { dbQuery } from '../utils/db.js'
import crypto from 'crypto'
import { isBanned, getClientIP, addStrike } from '../server/security.js'

export interface AuthenticatedRequest extends http.IncomingMessage {
    tenantId?: string
    tenantName?: string
    userId?: string
    userRole?: string
}

/**
 * Simple hash function for API keys (for demo purposes)
 * In production, use bcrypt or argon2
 */
function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Authentication middleware
 * Validates X-API-Key header and attaches tenantId to request
 */
export async function authenticate(
    req: AuthenticatedRequest,
    res: http.ServerResponse
): Promise<boolean> {
    // 1. Check for System Secret (Internal Microservice / Wasp Backend)
    const systemSecret = req.headers['x-securetag-system-secret'] as string
    const impersonateUserId = req.headers['x-securetag-user-id'] as string

    if (systemSecret && systemSecret === process.env.SECURETAG_SYSTEM_SECRET) {
        if (!impersonateUserId) {
             res.statusCode = 400
             res.setHeader('Content-Type', 'application/json')
             res.end(JSON.stringify({ ok: false, error: 'Missing X-SecureTag-User-Id for system call' }))
             return false
        }

        // Fetch user details to populate context
        try {
            const userResult = await dbQuery<any>(
                `SELECT u.id, u.tenant_id, u.role, t.name as tenant_name
                 FROM securetag.app_user u
                 JOIN securetag.tenant t ON u.tenant_id = t.id
                 WHERE u.id = $1`,
                [impersonateUserId]
            )

            if (userResult.rows.length === 0) {
                 res.statusCode = 404
                 res.setHeader('Content-Type', 'application/json')
                 res.end(JSON.stringify({ ok: false, error: 'Impersonated user not found' }))
                 return false
            }

            const user = userResult.rows[0]
            req.userId = user.id
            req.tenantId = user.tenant_id
            req.userRole = user.role
            req.tenantName = user.tenant_name
            return true

        } catch (error) {
            console.error('System Auth Error:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: 'System Auth Failed' }))
            return false
        }
    }

    // 2. Standard API Key Auth
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: 'Missing X-API-Key header' }))
        return false
    }

    try {
        const keyHash = hashApiKey(apiKey)

        // Query api_key table to get tenant AND user info
        const result = await dbQuery<any>(
            `SELECT ak.id, ak.tenant_id, ak.user_id, ak.expires_at, ak.is_active, t.name as tenant_name, u.role as user_role
       FROM securetag.api_key ak
       JOIN securetag.tenant t ON ak.tenant_id = t.id
       LEFT JOIN securetag.app_user u ON ak.user_id = u.id
       WHERE ak.key_hash = $1`,
            [keyHash]
        )

        if (result.rows.length === 0) {
            // Add strike to IP for invalid key attempt
            const clientIP = getClientIP(req)
            await addStrike('ip', clientIP, 'Invalid API Key attempt')

            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Invalid API key' }))
            return false
        }

        const apiKeyRecord = result.rows[0]

        // Check if key is active (Revocation check)
        if (apiKeyRecord.is_active === false) {
             const clientIP = getClientIP(req)
             await addStrike('ip', clientIP, 'Revoked API Key usage attempt')

             res.statusCode = 403
             res.setHeader('Content-Type', 'application/json')
             res.end(JSON.stringify({ ok: false, error: 'Access denied. API Key has been revoked.' }))
             return false
        }

        // Check for bans (API Key, Tenant OR User)
        const clientIP = getClientIP(req)
        if (isBanned(clientIP, keyHash, apiKeyRecord.tenant_id, apiKeyRecord.user_id)) {
             res.statusCode = 403
             res.setHeader('Content-Type', 'application/json')
             res.end(JSON.stringify({ ok: false, error: 'Access denied. Banned due to security violations.' }))
             return false
        }

        // Check if key is expired
        if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'API key expired' }))
            return false
        }

        // Attach tenant info to request
        req.tenantId = apiKeyRecord.tenant_id
        req.tenantName = apiKeyRecord.tenant_name
        req.userId = apiKeyRecord.user_id
        req.userRole = apiKeyRecord.user_role || 'member' // Default to member if not found

        // Update last_used_at (fire and forget)
        dbQuery(
            'UPDATE securetag.api_key SET last_used_at = now() WHERE id = $1',
            [apiKeyRecord.id]
        ).catch(() => { }) // Ignore errors in background update

        return true
    } catch (error) {
        console.error('Authentication error:', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
        return false
    }
}

/**
 * Helper to generate API key hash (for creating test keys)
 */
export function generateApiKeyHash(key: string): string {
    return hashApiKey(key)
}
