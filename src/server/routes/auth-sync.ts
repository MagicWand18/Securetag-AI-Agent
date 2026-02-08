import http from 'http'
import { dbQuery } from '../../utils/db.js'
import { randomUUID } from 'crypto'
import { z } from 'zod'

function send(res: http.ServerResponse, code: number, body: any) {
  const data = JSON.stringify(body)
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(data)
}

const SyncUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  source: z.string().optional()
})

const SyncApiKeySchema = z.object({
  user_id: z.string().uuid(),
  key_hash: z.string(),
  label: z.string(),
})

export async function handleAuthSyncRoutes(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  const method = req.method || 'GET'
  const url = req.url || '/'

  // POST /api/v1/auth/sync
  if (method === 'POST' && url === '/api/v1/auth/sync') {
    return await syncUser(req, res)
  }

  // POST /api/v1/auth/sync-key
  if (method === 'POST' && url === '/api/v1/auth/sync-key') {
    return await syncApiKey(req, res)
  }

  // DELETE /api/v1/auth/sync-key
  if (method === 'DELETE' && url === '/api/v1/auth/sync-key') {
    return await deleteApiKey(req, res)
  }

  return false
}

async function deleteApiKey(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    try {
      const authSecret = req.headers['x-securetag-system-secret']
      if (process.env.SECURETAG_SYSTEM_SECRET && authSecret !== process.env.SECURETAG_SYSTEM_SECRET) {
        send(res, 401, { error: 'Unauthorized System Call' })
        return
      }

      const data = JSON.parse(body)
      const { key_hash } = data

      if (!key_hash) {
        send(res, 400, { error: 'Missing key_hash' })
        return
      }

      await dbQuery(
        'DELETE FROM securetag.api_key WHERE key_hash = $1',
        [key_hash]
      )

      send(res, 200, { ok: true })
    } catch (error) {
      console.error('Delete ApiKey Error:', error)
      send(res, 500, { error: 'Internal Server Error' })
    }
  })
  return true
}

async function syncApiKey(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    try {
      const authSecret = req.headers['x-securetag-system-secret']
      if (process.env.SECURETAG_SYSTEM_SECRET && authSecret !== process.env.SECURETAG_SYSTEM_SECRET) {
        send(res, 401, { error: 'Unauthorized System Call' })
        return
      }

      const data = JSON.parse(body)
      const validation = SyncApiKeySchema.safeParse(data)
      
      if (!validation.success) {
        send(res, 400, { error: 'Invalid input', details: validation.error })
        return
      }

      const { user_id, key_hash, label } = validation.data

      // Get user's tenant
      const userRes = await dbQuery<any>(
        'SELECT tenant_id FROM securetag.app_user WHERE id = $1',
        [user_id]
      )

      if (userRes.rows.length === 0) {
        send(res, 404, { error: 'User not found in Core' })
        return
      }

      const tenantId = userRes.rows[0].tenant_id

      // Insert API Key
      // Note: id is generated here for Core DB tracking
      const apiKeyId = randomUUID()
      await dbQuery(
        `INSERT INTO securetag.api_key (id, tenant_id, user_id, key_hash, label, created_at, is_active)
         VALUES ($1, $2, $3, $4, $5, NOW(), true)
         ON CONFLICT (key_hash) DO NOTHING`,
        [apiKeyId, tenantId, user_id, key_hash, label]
      )

      send(res, 201, { ok: true, id: apiKeyId })
    } catch (error) {
      console.error('Sync ApiKey Error:', error)
      send(res, 500, { error: 'Internal Server Error' })
    }
  })
  return true
}

async function syncUser(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    try {
      // Basic security check: Require a shared secret header from Wasp Backend
      const authSecret = req.headers['x-securetag-system-secret']
      
      // Enforce secret if configured
      if (process.env.SECURETAG_SYSTEM_SECRET && authSecret !== process.env.SECURETAG_SYSTEM_SECRET) {
        send(res, 401, { error: 'Unauthorized System Call' })
        return
      }

      const data = JSON.parse(body)
      const validation = SyncUserSchema.safeParse(data)
      
      if (!validation.success) {
        send(res, 400, { error: 'Invalid input', details: validation.error })
        return
      }

      const { email, name } = validation.data

      // 1. Check if user exists
      const existingUser = await dbQuery<any>(
        'SELECT id, tenant_id, role FROM securetag.app_user WHERE email = $1',
        [email]
      )

      if (existingUser.rows.length > 0) {
        // User exists (e.g. was invited)
        const user = existingUser.rows[0]
        send(res, 200, {
          user_id: user.id,
          tenant_id: user.tenant_id,
          role: user.role,
          is_new: false
        })
        return
      }

      // 2. User does not exist -> Create Tenant + User
      // Create Tenant
      const tenantId = randomUUID()
      // Use name for tenant or fallback
      const tenantName = name ? `${name}'s Team` : `Personal Team`
      
      await dbQuery(
        'INSERT INTO securetag.tenant (id, name, plan, credits_balance, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [tenantId, tenantName, 'free', 10] // Give 10 credits to start
      )

      // Create User (Admin of their own tenant)
      const userId = randomUUID()
      await dbQuery(
        `INSERT INTO securetag.app_user (id, email, password_hash, role, tenant_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, email, 'EXTERNAL_AUTH', 'admin', tenantId]
      )

      // Set the user as the tenant owner
      await dbQuery(
        'UPDATE securetag.tenant SET owner_user_id = $1 WHERE id = $2',
        [userId, tenantId]
      )

      send(res, 201, {
        user_id: userId,
        tenant_id: tenantId,
        role: 'admin',
        is_new: true
      })

    } catch (error) {
      console.error('Error syncing user:', error)
      send(res, 500, { error: 'Internal Server Error' })
    }
  })
  return true
}
