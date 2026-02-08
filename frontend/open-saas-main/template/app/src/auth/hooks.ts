import { HttpError } from 'wasp/server'
import { type OnAfterSignupHook } from 'wasp/server/auth'

export const onAfterSignup: OnAfterSignupHook = async ({ user, prisma }) => {
  console.log('🔗 [SecureTag Hook] Starting Identity Sync for:', user.email)

  const backendUrl = process.env.SECURETAG_API_URL || 'http://securetag-app:8080'
  const systemSecret = process.env.SECURETAG_SYSTEM_SECRET

  try {
    const response = await fetch(`${backendUrl}/api/v1/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(systemSecret ? { 'X-SecureTag-System-Secret': systemSecret } : {})
      },
      body: JSON.stringify({
        email: user.email,
        name: user.username || user.email?.split('@')[0], // Fallback name
        source: 'wasp_signup'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [SecureTag Hook] Sync Failed:', response.status, errorText)
      
      // ROLLBACK: Delete the user from Wasp DB to prevent ghost accounts
      console.log('🔄 [SecureTag Hook] Rolling back user creation...')
      await prisma.user.delete({ where: { id: user.id } })
      
      throw new HttpError(500, 'Failed to synchronize identity with SecureTag Core. Account creation rolled back.')
    }

    const data = await response.json()
    console.log('✅ [SecureTag Hook] Sync Success:', data)

    // Update the Wasp User with the returned IDs
    await prisma.user.update({
      where: { id: user.id },
      data: {
        securetagTenantId: data.tenant_id,
        securetagUserId: data.user_id,
        securetagRole: data.role
      }
    })

  } catch (error: any) {
    console.error('❌ [SecureTag Hook] Exception:', error)
    
    // Check if user still exists (in case exception happened before fetch)
    const existingUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (existingUser) {
        console.log('🔄 [SecureTag Hook] Rolling back user creation (Exception Handler)...')
        await prisma.user.delete({ where: { id: user.id } })
    }

    // If it's already an HttpError, rethrow it
    if (error instanceof HttpError) throw error
    
    // Otherwise wrap it
    throw new HttpError(503, 'SecureTag Backend Unavailable: ' + (error.message || 'Unknown error'))
  }
}
