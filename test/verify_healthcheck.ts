import http from 'http'
import { dbQuery } from '../src/utils/db.js'

const PORT = 8081

async function runTests() {
    console.log('=== Health Check and Gating Tests ===\n')

    // Test 1: /healthz/db with DB up
    console.log('Test 1: GET /healthz/db (DB up)')
    try {
        const res1 = await fetch(`http://localhost:${PORT}/healthz/db`)
        const json1 = await res1.json()
        console.log(`  Status: ${res1.status}`)
        console.log(`  Response:`, json1)
        if (res1.status === 200 && json1.db === 'connected') {
            console.log('  ✅ PASS\n')
        } else {
            console.log('  ❌ FAIL\n')
            process.exit(1)
        }
    } catch (e) {
        console.log('  ❌ FAIL - Server not running?\n')
        process.exit(1)
    }

    // Test 2: POST /scans/web with DB up
    console.log('Test 2: POST /scans/web (DB up)')
    const res2 = await fetch(`http://localhost:${PORT}/scans/web`, {
        method: 'POST',
        body: JSON.stringify({ url: 'http://example.com' }),
        headers: { 'Content-Type': 'application/json' }
    })
    const json2 = await res2.json()
    console.log(`  Status: ${res2.status}`)
    console.log(`  Response:`, json2)
    if (res2.status === 202 && json2.taskId) {
        console.log('  ✅ PASS\n')
    } else {
        console.log('  ❌ FAIL\n')
        process.exit(1)
    }

    // Test 3: Simulate DB down by stopping the proxy
    console.log('Test 3: Stopping DB proxy to simulate DB down...')
    const { exec } = await import('child_process')
    await new Promise((resolve) => {
        exec('docker stop db-proxy 2>/dev/null || docker run -d --name db-proxy --network core-net -p 5433:5432 alpine/socat tcp-listen:5432,fork,bind=0.0.0.0 tcp-connect:core-db:5432', () => {
            exec('docker stop db-proxy', () => {
                console.log('  DB proxy stopped\n')
                resolve(null)
            })
        })
    })

    // Wait a bit for connection to fail
    await new Promise(r => setTimeout(r, 1000))

    // Test 4: /healthz/db with DB down
    console.log('Test 4: GET /healthz/db (DB down)')
    const res4 = await fetch(`http://localhost:${PORT}/healthz/db`)
    const json4 = await res4.json()
    console.log(`  Status: ${res4.status}`)
    console.log(`  Response:`, json4)
    if (res4.status === 503 && json4.db === 'disconnected') {
        console.log('  ✅ PASS\n')
    } else {
        console.log('  ❌ FAIL\n')
        // Cleanup
        exec('docker start db-proxy')
        process.exit(1)
    }

    // Test 5: POST /scans/web with DB down (should be rejected)
    console.log('Test 5: POST /scans/web (DB down - should reject)')
    const res5 = await fetch(`http://localhost:${PORT}/scans/web`, {
        method: 'POST',
        body: JSON.stringify({ url: 'http://example.com' }),
        headers: { 'Content-Type': 'application/json' }
    })
    const json5 = await res5.json()
    console.log(`  Status: ${res5.status}`)
    console.log(`  Response:`, json5)
    if (res5.status === 503 && json5.error) {
        console.log('  ✅ PASS\n')
    } else {
        console.log('  ❌ FAIL\n')
        // Cleanup
        exec('docker start db-proxy')
        process.exit(1)
    }

    // Cleanup: Restart DB proxy
    console.log('Cleanup: Restarting DB proxy...')
    await new Promise((resolve) => {
        exec('docker start db-proxy', () => {
            console.log('  DB proxy restarted\n')
            resolve(null)
        })
    })

    console.log('=== ALL TESTS PASSED ===')
    process.exit(0)
}

runTests().catch(e => {
    console.error('Test error:', e)
    process.exit(1)
})
