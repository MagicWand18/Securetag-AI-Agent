import { dbQuery, ensureTenant } from './src/utils/db.js'
import { generateApiKeyHash } from './src/middleware/auth.js'

async function createTestApiKeys() {
    console.log('Creating test API keys...\n')

    // Create or get test tenants
    const tenant1Id = await ensureTenant('tenant-a')
    const tenant2Id = await ensureTenant('tenant-b')

    console.log(`Tenant A ID: ${tenant1Id}`)
    console.log(`Tenant B ID: ${tenant2Id}\n`)

    // Define test API keys
    const keys = [
        { key: 'test-key-tenant-a', tenantId: tenant1Id, name: 'Test Key for Tenant A' },
        { key: 'test-key-tenant-b', tenantId: tenant2Id, name: 'Test Key for Tenant B' },
        { key: 'test-key-tenant-a-2', tenantId: tenant1Id, name: 'Second Key for Tenant A' }
    ]

    for (const { key, tenantId, name } of keys) {
        const keyHash = generateApiKeyHash(key)

        // Check if key already exists
        const existing = await dbQuery(
            'SELECT id FROM securetag.api_key WHERE key_hash = $1',
            [keyHash]
        )

        if (existing.rows.length > 0) {
            console.log(`✓ API Key "${name}" already exists`)
        } else {
            await dbQuery(
                'INSERT INTO securetag.api_key (tenant_id, key_hash, name) VALUES ($1, $2, $3)',
                [tenantId, keyHash, name]
            )
            console.log(`✓ Created API Key: "${name}"`)
            console.log(`  Key: ${key}`)
            console.log(`  Hash: ${keyHash}\n`)
        }
    }

    console.log('\n=== Test API Keys Summary ===')
    console.log('Tenant A:')
    console.log('  - test-key-tenant-a')
    console.log('  - test-key-tenant-a-2')
    console.log('Tenant B:')
    console.log('  - test-key-tenant-b')
    console.log('\nUse these keys in X-API-Key header for testing')
}

createTestApiKeys()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err)
        process.exit(1)
    })
