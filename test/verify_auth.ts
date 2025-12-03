import http from 'http'

const PORT = 8081
const BASE_URL = `http://localhost:${PORT}`

// Test API keys
const TENANT_A_KEY = 'test-key-tenant-a'
const TENANT_B_KEY = 'test-key-tenant-b'
const INVALID_KEY = 'invalid-key-12345'

async function runTests() {
    console.log('=== Authentication and Multi-tenancy Tests ===\n')

    // Test 1: Request without API key (should fail with 401)
    console.log('Test 1: POST /scans/web without API key')
    try {
        const res1 = await fetch(`${BASE_URL}/scans/web`, {
            method: 'POST',
            body: JSON.stringify({ url: 'http://example.com' }),
            headers: { 'Content-Type': 'application/json' }
        })
        const json1 = await res1.json()
        console.log(`  Status: ${res1.status}`)
        console.log(`  Response:`, json1)
        if (res1.status === 401 && json1.error) {
            console.log('  ✅ PASS - Correctly rejected\n')
        } else {
            console.log('  ❌ FAIL - Should return 401\n')
            process.exit(1)
        }
    } catch (e) {
        console.log('  ❌ FAIL - Server not running?\n')
        process.exit(1)
    }

    // Test 2: Request with invalid API key (should fail with 401)
    console.log('Test 2: POST /scans/web with invalid API key')
    const res2 = await fetch(`${BASE_URL}/scans/web`, {
        method: 'POST',
        body: JSON.stringify({ url: 'http://example.com' }),
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': INVALID_KEY
        }
    })
    const json2 = await res2.json()
    console.log(`  Status: ${res2.status}`)
    console.log(`  Response:`, json2)
    if (res2.status === 401 && json2.error) {
        console.log('  ✅ PASS - Correctly rejected\n')
    } else {
        console.log('  ❌ FAIL - Should return 401\n')
        process.exit(1)
    }

    // Test 3: Request with valid API key (should succeed)
    console.log('Test 3: POST /scans/web with valid API key (Tenant A)')
    const res3 = await fetch(`${BASE_URL}/scans/web`, {
        method: 'POST',
        body: JSON.stringify({ url: 'http://example.com' }),
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': TENANT_A_KEY
        }
    })
    const json3 = await res3.json()
    console.log(`  Status: ${res3.status}`)
    console.log(`  Response:`, json3)
    if (res3.status === 202 && json3.taskId) {
        console.log('  ✅ PASS - Task created\n')
    } else {
        console.log('  ❌ FAIL - Should return 202 with taskId\n')
        process.exit(1)
    }

    const tenantATaskId = json3.taskId

    // Test 4: Create task for Tenant B
    console.log('Test 4: POST /scans/web with valid API key (Tenant B)')
    const res4 = await fetch(`${BASE_URL}/scans/web`, {
        method: 'POST',
        body: JSON.stringify({ url: 'http://example.org' }),
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': TENANT_B_KEY
        }
    })
    const json4 = await res4.json()
    console.log(`  Status: ${res4.status}`)
    console.log(`  Response:`, json4)
    if (res4.status === 202 && json4.taskId) {
        console.log('  ✅ PASS - Task created\n')
    } else {
        console.log('  ❌ FAIL - Should return 202 with taskId\n')
        process.exit(1)
    }

    const tenantBTaskId = json4.taskId

    // Test 5: Tenant A tries to access their own task (should succeed)
    console.log('Test 5: GET /scans/{id} - Tenant A accessing own task')
    const res5 = await fetch(`${BASE_URL}/scans/${tenantATaskId}`, {
        headers: { 'X-API-Key': TENANT_A_KEY }
    })
    const json5 = await res5.json()
    console.log(`  Status: ${res5.status}`)
    console.log(`  Response:`, json5)
    if ((res5.status === 200 || res5.status === 202) && json5.taskId === tenantATaskId) {
        console.log('  ✅ PASS - Can access own task\n')
    } else {
        console.log('  ❌ FAIL - Should be able to access own task\n')
        process.exit(1)
    }

    // Test 6: Tenant A tries to access Tenant B's task (should fail - 404)
    console.log('Test 6: GET /scans/{id} - Tenant A trying to access Tenant B task')
    const res6 = await fetch(`${BASE_URL}/scans/${tenantBTaskId}`, {
        headers: { 'X-API-Key': TENANT_A_KEY }
    })
    const json6 = await res6.json()
    console.log(`  Status: ${res6.status}`)
    console.log(`  Response:`, json6)
    if (res6.status === 404) {
        console.log('  ✅ PASS - Correctly denied access to other tenant data\n')
    } else {
        console.log('  ❌ FAIL - Should return 404 (tenant isolation)\n')
        process.exit(1)
    }

    // Test 7: Health check endpoints should still be public
    console.log('Test 7: GET /healthz (should be public)')
    const res7 = await fetch(`${BASE_URL}/healthz`)
    const json7 = await res7.json()
    console.log(`  Status: ${res7.status}`)
    console.log(`  Response:`, json7)
    if (res7.status === 200 && json7.ok) {
        console.log('  ✅ PASS - Health check is public\n')
    } else {
        console.log('  ❌ FAIL - Health check should be accessible\n')
        process.exit(1)
    }

    console.log('=== ALL TESTS PASSED ===')
    console.log('\n✅ Authentication working correctly')
    console.log('✅ Tenant isolation enforced')
    console.log('✅ Public endpoints remain accessible')
    process.exit(0)
}

runTests().catch(e => {
    console.error('Test error:', e)
    process.exit(1)
})
