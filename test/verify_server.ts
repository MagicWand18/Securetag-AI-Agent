import http from 'http'
import { dbQuery, ensureTenant } from '../src/utils/db.js'
import { v4 as uuidv4 } from 'uuid'
import assert from 'assert'

const PORT = 8081
process.env.PORT = String(PORT)
process.env.TENANT_ID = 'test_tenant'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://securetag:${POSTGRES_PASSWORD}@localhost:5433/securetag'

// Start server (we need to import it, but it starts on import if we are not careful. 
// checking src/server/index.ts, it starts listening at the end. 
// So we might need to run this script separately while server is running, 
// OR modify server to export app. 
// For now, let's assume we run the server in background or just use the code logic if possible.
// Actually, let's just try to hit the endpoints if the server is running, 
// OR start the server in this script if we can.
// But src/server/index.ts has `server.listen(...)` at top level.
// So importing it will start it. That's fine for a script.

// import './src/server/index.ts'

async function runTests() {
    console.log('Waiting for server to start...')
    await new Promise(r => setTimeout(r, 1000))

    const tenantId = await ensureTenant('test_tenant')
    console.log('Tenant ID:', tenantId)

    // Test 1: POST /scans/web (Enqueue)
    console.log('Test 1: POST /scans/web')
    const taskUrl = 'http://example.com'
    const res1 = await fetch(`http://localhost:${PORT}/scans/web`, {
        method: 'POST',
        body: JSON.stringify({ url: taskUrl }),
        headers: { 'Content-Type': 'application/json' }
    })
    const json1 = await res1.json()
    assert.strictEqual(res1.status, 202)
    assert.ok(json1.taskId)
    console.log('  -> Enqueued Task ID:', json1.taskId)

    // Verify in DB
    const dbTask = await dbQuery('SELECT * FROM securetag.task WHERE id=$1', [json1.taskId])
    assert.strictEqual(dbTask.rows.length, 1)
    assert.strictEqual(dbTask.rows[0].status, 'queued')
    console.log('  -> Verified in DB')

    // Test 2: POST /queue/next (Worker fetch)
    console.log('Test 2: POST /queue/next')
    const res2 = await fetch(`http://localhost:${PORT}/queue/next`, {
        method: 'POST'
    })
    const json2 = await res2.json()
    assert.strictEqual(res2.status, 200)
    assert.strictEqual(json2.task.id, json1.taskId)
    console.log('  -> Fetched Task ID:', json2.task.id)

    // Verify status update
    const dbTask2 = await dbQuery('SELECT status FROM securetag.task WHERE id=$1', [json1.taskId])
    assert.strictEqual(dbTask2.rows[0].status, 'running')
    console.log('  -> Verified status running in DB')

    // Test 3: POST /queue/result (Worker report)
    console.log('Test 3: POST /queue/result')
    const resultPayload = {
        taskId: json1.taskId,
        ok: true,
        type: 'web',
        summary_json: { foo: 'bar' }
    }
    const res3 = await fetch(`http://localhost:${PORT}/queue/result`, {
        method: 'POST',
        body: JSON.stringify(resultPayload),
        headers: { 'Content-Type': 'application/json' }
    })
    assert.strictEqual(res3.status, 200)
    console.log('  -> Reported result')

    // Verify status completed and result saved
    const dbTask3 = await dbQuery('SELECT status FROM securetag.task WHERE id=$1', [json1.taskId])
    assert.strictEqual(dbTask3.rows[0].status, 'completed')

    const dbResult = await dbQuery('SELECT summary_json FROM securetag.scan_result WHERE task_id=$1', [json1.taskId])
    assert.strictEqual(dbResult.rows.length, 1)
    // Note: The server wraps the body in summary_json, so we check that.
    // Actually in index.ts: JSON.stringify(body) is saved as summary_json.
    const savedJson = dbResult.rows[0].summary_json
    assert.strictEqual(savedJson.taskId, json1.taskId)
    console.log('  -> Verified result in DB')

    console.log('ALL TESTS PASSED')
    process.exit(0)
}

runTests().catch(e => {
    console.error(e)
    process.exit(1)
})
