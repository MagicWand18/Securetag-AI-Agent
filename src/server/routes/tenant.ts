
import http from 'http'
import { dbQuery } from '../../utils/db.js'
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.js'
import { randomUUID } from 'crypto'
import { z } from 'zod'

function send(res: http.ServerResponse, code: number, body: any) {
  const data = JSON.stringify(body)
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(data)
}

function parseUrl(url: string) {
  const parts = url.split('?')
  return {
    path: parts[0],
    query: parts[1]
  }
}

// Zod schemas for validation
const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).optional().default('member')
})

const UpdateRoleSchema = z.object({
  role: z.enum(['admin', 'member'])
})

export async function handleTenantRoutes(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  const method = req.method || 'GET'
  const urlInfo = parseUrl(req.url || '/')
  const path = urlInfo.path

  // Check if this is a tenant route
  if (!path.startsWith('/api/v1/tenant')) return false

  // Authentication
  const authReq = req as AuthenticatedRequest
  // We allow all tenant routes to be accessed by authenticated users for now.
  // Finer grained permission checks (admin vs member) should be done inside the handlers.
  const isAuthenticated = await authenticate(authReq, res)
  if (!isAuthenticated) return true // Response already sent by authenticate

  const tenantId = authReq.tenantId!
  // We need to fetch the current user's role to enforce permissions
  // Assuming the auth middleware might not populate role yet, we fetch it or trust the token if it had it.
  // For now, let's query the role from DB to be safe.
  // Note: authenticate middleware populates authReq.user with { id, email, role, ... } if available
  // Let's assume authReq.user is populated from the token/DB lookup in authenticate.
  // If not, we might need to fetch it. Let's look at auth.ts later to confirm.
  
  // Route Dispatcher
  
  // GET /api/v1/tenant/me
  if (method === 'GET' && path === '/api/v1/tenant/me') {
    return await getTenantInfo(authReq, res, tenantId)
  }

  // GET /api/v1/tenant/users
  if (method === 'GET' && path === '/api/v1/tenant/users') {
    return await getTenantUsers(authReq, res, tenantId)
  }

  // POST /api/v1/tenant/invite
  if (method === 'POST' && path === '/api/v1/tenant/invite') {
    return await inviteUser(authReq, res, tenantId)
  }

  // DELETE /api/v1/tenant/users/:id
  const deleteUserMatch = path.match(/^\/api\/v1\/tenant\/users\/([a-zA-Z0-9-]+)$/)
  if (method === 'DELETE' && deleteUserMatch) {
    const userIdToDelete = deleteUserMatch[1]
    return await removeUser(authReq, res, tenantId, userIdToDelete)
  }

  // PUT /api/v1/tenant/users/:id/role
  const updateRoleMatch = path.match(/^\/api\/v1\/tenant\/users\/([a-zA-Z0-9-]+)\/role$/)
  if (method === 'PUT' && updateRoleMatch) {
    const userIdToUpdate = updateRoleMatch[1]
    return await updateUserRole(authReq, res, tenantId, userIdToUpdate)
  }

  // POST /api/v1/tenant/credits/sync
  if (method === 'POST' && path === '/api/v1/tenant/credits/sync') {
    return await syncCredits(authReq, res, tenantId)
  }

  // POST /api/v1/tenant/plan/sync
  if (method === 'POST' && path === '/api/v1/tenant/plan/sync') {
    return await syncPlan(authReq, res, tenantId)
  }

  // DELETE /api/v1/tenants/:id
  const deleteTenantMatch = path.match(/^\/api\/v1\/tenants\/([a-zA-Z0-9-]+)$/)
  if (method === 'DELETE' && deleteTenantMatch) {
    const tenantIdToDelete = deleteTenantMatch[1]
    return await deleteTenant(authReq, res, tenantIdToDelete)
  }

  return false
}

// --- Handlers ---

async function deleteTenant(req: AuthenticatedRequest, res: http.ServerResponse, tenantIdToDelete: string): Promise<boolean> {
  const systemSecret = req.headers['x-securetag-system-secret'] as string
  const isSystemCall = systemSecret && systemSecret === process.env.SECURETAG_SYSTEM_SECRET

  // 1. Authorization: System Secret OR Tenant Owner
  if (!isSystemCall) {
    // Check if the authenticated user is the owner of the tenant they are trying to delete
    // Note: We use req.userId which comes from the AuthIdentity providerUserId (e.g. email)
    // But in SecureTag Core, owner_user_id is a UUID.
    // Wait, let's check how owner_user_id is stored. 
    // In auth-sync.ts, we return data.user_id which is a UUID.
    // The authenticated middleware should populate req.userId with that UUID.
    
    // However, if the call comes from Wasp backend via operations.ts, 
    // it sends 'X-SecureTag-User-Id'. 
    // The middleware might not extract that automatically into req.userId if it relies on JWT.
    // Let's rely on the header 'X-SecureTag-User-Id' passed from Wasp if present,
    // OR the authenticated user ID if a direct API call.
    
    const requestUserId = (req.headers['x-securetag-user-id'] as string) || req.userId
    
    if (!requestUserId) {
       send(res, 401, { error: 'Unauthorized: Missing User ID' })
       return true
    }

    const isOwner = await isTenantOwner(tenantIdToDelete, requestUserId)
    if (!isOwner) {
       send(res, 403, { error: 'Forbidden: Only the tenant owner or system can delete the tenant' })
       return true
    }
  }

  try {
    // 2. Delete Tenant (Cascading deletes should be handled by DB FKs usually, 
    // but if not, we might need to delete related data first. 
    // Assuming securetag-db schema handles cascade or we just delete tenant for now).
    
    // Check existence first
    const check = await dbQuery('SELECT id FROM securetag.tenant WHERE id = $1', [tenantIdToDelete])
    if (check.rows.length === 0) {
      send(res, 404, { error: 'Tenant not found' })
      return true
    }

    await dbQuery('DELETE FROM securetag.tenant WHERE id = $1', [tenantIdToDelete])
    
    console.log(`[Tenant] Deleted tenant ${tenantIdToDelete} (System: ${isSystemCall})`)
    send(res, 200, { ok: true, message: 'Tenant deleted successfully' })
    return true
  } catch (error) {
    console.error('Error deleting tenant:', error)
    send(res, 500, { error: 'Internal Server Error' })
    return true
  }
}

async function syncPlan(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string): Promise<boolean> {
  // Security Check: Only allow System Secret calls
  const systemSecret = req.headers['x-securetag-system-secret'] as string
  if (!systemSecret || systemSecret !== process.env.SECURETAG_SYSTEM_SECRET) {
      send(res, 403, { error: 'Forbidden: System Secret required' })
      return true
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString())
        const { plan, llm_config } = body
        
        if (!plan || typeof plan !== 'string') {
          send(res, 400, { error: 'Invalid plan value' })
          resolve(true)
          return
        }

        // Update plan and optionally llm_config
        if (llm_config) {
             await dbQuery(
            'UPDATE securetag.tenant SET plan = $1, llm_config = $2 WHERE id = $3',
            [plan.toLowerCase(), llm_config, tenantId]
          )
        } else {
             await dbQuery(
            'UPDATE securetag.tenant SET plan = $1 WHERE id = $2',
            [plan.toLowerCase(), tenantId]
          )
        }

        send(res, 200, { ok: true, plan })
        resolve(true)
      } catch (error) {
        console.error('Error syncing plan:', error)
        send(res, 500, { error: 'Internal Server Error' })
        resolve(true)
      }
    })
  })
}

async function syncCredits(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string): Promise<boolean> {
  // Security Check: Only allow System Secret calls
  const systemSecret = req.headers['x-securetag-system-secret'] as string
  if (!systemSecret || systemSecret !== process.env.SECURETAG_SYSTEM_SECRET) {
      send(res, 403, { error: 'Forbidden: System Secret required' })
      return true
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString())
        const { credits } = body
        
        if (typeof credits !== 'number') {
          send(res, 400, { error: 'Invalid credits value' })
          resolve(true)
          return
        }

        await dbQuery(
          'UPDATE securetag.tenant SET credits_balance = $1 WHERE id = $2',
          [credits, tenantId]
        )

        send(res, 200, { ok: true, credits })
        resolve(true)
      } catch (error) {
        console.error('Error syncing credits:', error)
        send(res, 500, { error: 'Internal Server Error' })
        resolve(true)
      }
    })
  })
}

async function getTenantInfo(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string): Promise<boolean> {
  try {
    const result = await dbQuery<any>(
      'SELECT id, name, plan, credits_balance, created_at, owner_user_id FROM securetag.tenant WHERE id = $1',
      [tenantId]
    )

    if (result.rows.length === 0) {
      send(res, 404, { error: 'Tenant not found' })
      return true
    }

    send(res, 200, result.rows[0])
    return true
  } catch (error) {
    console.error('Error fetching tenant info:', error)
    send(res, 500, { error: 'Internal Server Error' })
    return true
  }
}

// Helper to check ownership
async function isTenantOwner(tenantId: string, userId: string): Promise<boolean> {
  try {
    const result = await dbQuery<any>(
      'SELECT owner_user_id FROM securetag.tenant WHERE id = $1',
      [tenantId]
    )
    if (result.rows.length === 0) return false
    return result.rows[0].owner_user_id === userId
  } catch (error) {
    console.error('Error checking tenant ownership:', error)
    return false
  }
}

async function getTenantUsers(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string): Promise<boolean> {
  try {
    const result = await dbQuery<any>(
      `SELECT id, email, role, created_at, last_login 
       FROM securetag.app_user 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC`,
      [tenantId]
    )

    send(res, 200, result.rows)
    return true
  } catch (error) {
    console.error('Error fetching tenant users:', error)
    send(res, 500, { error: 'Internal Server Error' })
    return true
  }
}

async function inviteUser(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string): Promise<boolean> {
  // Check permissions: Only admins can invite
  if (req.userRole !== 'admin') {
    send(res, 403, { error: 'Forbidden: Only admins can invite users' })
    return true
  }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    try {
      const data = JSON.parse(body)
      const validation = InviteUserSchema.safeParse(data)
      
      if (!validation.success) {
        send(res, 400, { error: 'Invalid input', details: validation.error })
        return
      }

      const { email, role } = validation.data

      // Check if user already exists in THIS tenant
      const existingUser = await dbQuery<any>(
        'SELECT id FROM securetag.app_user WHERE email = $1 AND tenant_id = $2',
        [email, tenantId]
      )

      if (existingUser.rows.length > 0) {
        send(res, 409, { error: 'User already exists in this tenant' })
        return
      }

      // Check if user exists in ANY tenant (Global uniqueness check for email)
      const checkGlobal = await dbQuery<any>('SELECT id FROM securetag.app_user WHERE email = $1', [email])
      if (checkGlobal.rows.length > 0) {
         send(res, 400, { error: 'User with this email already exists in the system (Multi-tenant user support not yet implemented)' })
         return
      }

      const newUser = await dbQuery<any>(
        `INSERT INTO securetag.app_user (id, email, password_hash, role, tenant_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, role, created_at`,
        [randomUUID(), email, 'PENDING_INVITE', role, tenantId] // Placeholder password
      )

      send(res, 201, newUser.rows[0])
    } catch (error) {
      console.error('Error inviting user:', error)
      send(res, 500, { error: 'Internal Server Error' })
    }
  })
  return true
}

async function removeUser(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string, userIdToDelete: string): Promise<boolean> {
  // Check permissions
  if (req.userRole !== 'admin') {
    send(res, 403, { error: 'Forbidden: Only admins can remove users' })
    return true
  }

  // Prevent self-deletion
  if (req.userId === userIdToDelete) {
      send(res, 400, { error: 'Cannot remove yourself' })
      return true
  }

  // Prevent removing the tenant owner
  if (await isTenantOwner(tenantId, userIdToDelete)) {
      send(res, 403, { error: 'Forbidden: Cannot remove the tenant owner' })
      return true
  }

  try {
    const result = await dbQuery<any>(
      'DELETE FROM securetag.app_user WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [userIdToDelete, tenantId]
    )

    if (result.rows.length === 0) {
      send(res, 404, { error: 'User not found' })
    } else {
      send(res, 200, { message: 'User removed successfully' })
    }
    return true
  } catch (error) {
    console.error('Error removing user:', error)
    send(res, 500, { error: 'Internal Server Error' })
    return true
  }
}

async function updateUserRole(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string, userIdToUpdate: string): Promise<boolean> {
   // Check permissions
  if (req.userRole !== 'admin') {
    send(res, 403, { error: 'Forbidden: Only admins can update roles' })
    return true
  }

  // Prevent self-modification (Admin cannot degrade themselves)
  if (req.userId === userIdToUpdate) {
    send(res, 400, { error: 'Cannot change your own role' })
    return true
  }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    try {
      const data = JSON.parse(body)
      const validation = UpdateRoleSchema.safeParse(data)
      
      if (!validation.success) {
        send(res, 400, { error: 'Invalid input', details: validation.error })
        return
      }

      const { role } = validation.data
      
      // Prevent demoting the tenant owner
      if (await isTenantOwner(tenantId, userIdToUpdate) && role !== 'admin') {
          send(res, 403, { error: 'Forbidden: Tenant owner must remain an admin' })
          return
      }

      const result = await dbQuery<any>(
        'UPDATE securetag.app_user SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING id, role',
        [role, userIdToUpdate, tenantId]
      )

      if (result.rows.length === 0) {
        send(res, 404, { error: 'User not found' })
      } else {
        send(res, 200, result.rows[0])
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      send(res, 500, { error: 'Internal Server Error' })
    }
  })
  return true
}
