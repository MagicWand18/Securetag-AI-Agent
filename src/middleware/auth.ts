import http from 'http'
import { dbQuery } from '../utils/db.js'
import crypto from 'crypto'

export interface AuthenticatedRequest extends http.IncomingMessage {
    tenantId?: string
    tenantName?: string
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
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: 'Missing X-API-Key header' }))
        return false
    }

    try {
        const keyHash = hashApiKey(apiKey)

        // Query api_key table
        const result = await dbQuery<any>(
            `SELECT ak.id, ak.tenant_id, ak.expires_at, t.name as tenant_name
       FROM securetag.api_key ak
       JOIN securetag.tenant t ON ak.tenant_id = t.id
       WHERE ak.key_hash = $1`,
            [keyHash]
        )

        if (result.rows.length === 0) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Invalid API key' }))
            return false
        }

        const apiKeyRecord = result.rows[0]

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
