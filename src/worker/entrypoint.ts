import { WorkerClient } from './WorkerClient.js'
import { TaskExecutor } from './TaskExecutor.js'
import { logger } from '../utils/logger.js'
import { ExternalToolManager } from '../agent/tools/ExternalToolManager.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

async function setupSemgrep() {
  try {
    const tok = process.env.SEMGREP_APP_TOKEN
    const anon = process.env.SEMGREP_ANONYMOUS_USER_ID
    const shown = process.env.SEMGREP_HAS_SHOWN_METRICS_NOTIFICATION
    if (tok || anon || shown) {
      const home = process.env.HOME || '/root'
      const dir = path.join(home, '.semgrep')
      fs.mkdirSync(dir, { recursive: true })
      const settings = {
        has_shown_metrics_notification: shown ? shown === 'true' || shown === '1' : true,
        anonymous_user_id: anon || 'anonymous',
        api_token: tok || ''
      }
      fs.writeFileSync(path.join(dir, 'settings.yml'), `has_shown_metrics_notification: ${settings.has_shown_metrics_notification}\nanonymous_user_id: ${settings.anonymous_user_id}\napi_token: ${settings.api_token}\n`)
      if (tok) process.env.SEMGREP_APP_TOKEN = tok
    }
  } catch (err) {
    logger.warn('Failed to setup semgrep settings', err)
  }
}

async function run() {
  await setupSemgrep()
  await ExternalToolManager.scan()

  // Generate unique worker ID
  const workerId = process.env.WORKER_ID || `${os.hostname()}-${process.pid}`

  const client = new WorkerClient()
  const executor = new TaskExecutor(workerId)
  const loopMode = process.env.LOOP_MODE === 'true'
  const tenant = process.env.TENANT_ID || 'default'

  logger.info(`Worker starting. ID: ${workerId}, Tenant: ${tenant}, LoopMode: ${loopMode}`)
  console.log('DEBUG: process.env.LOOP_MODE =', process.env.LOOP_MODE)
  console.log('DEBUG: loopMode variable =', loopMode)
  console.log('DEBUG: *** DOCKER WORKER IS ALIVE AND LOGGING ***')


  do {
    try {
      const nextTask = await client.fetchNextTask(tenant);

      if (!nextTask || !nextTask.task) {
        if (!loopMode) {
          console.log(JSON.stringify({ ok: true, idle: true, tenant }))
          process.exit(0)
        }
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }

      const job = nextTask.task
      logger.info(`Processing task ${job.id || job.taskId} (${job.type})`)

      const result = await executor.execute(job)

      await client.reportResult(job.id || job.taskId, result.ok, result)

      console.log(JSON.stringify(result))

      if (!loopMode) {
        process.exit(result.ok ? 0 : 1)
      }
    } catch (err: any) {
      logger.error('Worker loop error', err)
      if (!loopMode) {
        console.log(JSON.stringify({ ok: false, error: err.message }))
        process.exit(1)
      }
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  } while (loopMode)
}

run().catch(err => {
  logger.error('worker entrypoint failed', err)
  console.log(JSON.stringify({ ok: false, error: String(err && err.message || err) }))
  process.exit(1)
})