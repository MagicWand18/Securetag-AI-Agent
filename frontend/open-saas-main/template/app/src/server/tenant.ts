import { type InviteMember, type GetTenantInfo, type GetTenantMembers } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'

const CORE_URL = process.env.SECURETAG_API_URL || 'http://securetag-nginx:80'
const SYSTEM_SECRET = process.env.SECURETAG_SYSTEM_SECRET

// Helper to call Core
async function callCore(method: string, path: string, user: any, body?: any) {
  if (!user.securetagUserId) {
    console.error('User missing securetagUserId:', user.id)
    throw new HttpError(400, 'User not linked to SecureTag Core')
  }

  console.log(`[Wasp] Calling Core: ${method} ${path} for User ${user.securetagUserId}`)

  try {
    const response = await fetch(`${CORE_URL}${path}`, {
        method,
        headers: {
        'Content-Type': 'application/json',
        'X-SecureTag-System-Secret': SYSTEM_SECRET || '',
        'X-SecureTag-User-Id': user.securetagUserId
        },
        body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Wasp] Core Error (${response.status}):`, errorText)
        
        let errorJson
        try { errorJson = JSON.parse(errorText) } catch {}
        
        throw new HttpError(response.status, errorJson?.error || errorText || 'Core API Error')
    }

    return await response.json()
  } catch (err: any) {
    console.error('[Wasp] Fetch Error:', err)
    if (err instanceof HttpError) throw err
    throw new HttpError(500, 'Failed to connect to SecureTag Core')
  }
}

export const getTenantInfo: GetTenantInfo<void, any> = async (_args: void, context: any) => {
  if (!context.user) { throw new HttpError(401) }
  return callCore('GET', '/api/v1/tenant/me', context.user)
}

export const getTenantMembers: GetTenantMembers<void, any> = async (_args: void, context: any) => {
  if (!context.user) { throw new HttpError(401) }
  return callCore('GET', '/api/v1/tenant/users', context.user)
}

export const inviteMember: InviteMember<{ email: string }, any> = async ({ email }: { email: string }, context: any) => {
  if (!context.user) { throw new HttpError(401) }
  return callCore('POST', '/api/v1/tenant/invite', context.user, { email })
}

export const updateUserRole = async ({ userId, role }: { userId: string, role: string }, context: any) => {
  if (!context.user) { throw new HttpError(401) }
  return callCore('PUT', `/api/v1/tenant/users/${userId}/role`, context.user, { role })
}

export const removeUser = async ({ userId }: { userId: string }, context: any) => {
  if (!context.user) { throw new HttpError(401) }

  // 1. Sync with Core (Best Effort)
  try {
    await callCore('DELETE', `/api/v1/tenant/users/${userId}`, context.user)
  } catch (error) {
    console.error(`[Ghost Persistence] Failed to delete user ${userId} in Core. Proceeding with local deletion. Error:`, error)
  }

  // 2. Delete Local Data (Strict Cleanup)
  try {
    // Delete Credit Usages first if not cascading (Prisma usually handles cascade if configured, but to be safe)
    await context.entities.CreditUsage.deleteMany({ where: { userId: userId } })
    await context.entities.ApiKey.deleteMany({ where: { userId: userId } })
    
    // Finally delete the user
    return await context.entities.User.delete({ where: { id: userId } })
  } catch (error: any) {
    console.error(`[Ghost Persistence] Failed to delete user ${userId} locally:`, error)
    throw new HttpError(500, `Failed to remove user: ${error.message}`)
  }
}
