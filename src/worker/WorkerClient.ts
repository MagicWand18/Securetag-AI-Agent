import axios, { AxiosInstance } from 'axios'
import { logger } from '../utils/logger.js'

export class WorkerClient {
  private client: AxiosInstance
  private appHost: string
  private appPort: number

  constructor() {
    this.appHost = process.env.APP_HOST || 'securetag-app'
    this.appPort = parseInt(process.env.APP_PORT || '8080', 10)

    const headers: Record<string, string> = {}
    if (process.env.WORKER_API_KEY) {
      headers['x-api-key'] = process.env.WORKER_API_KEY
    }

    this.client = axios.create({
      baseURL: `http://${this.appHost}:${this.appPort}`,
      timeout: 10000,
      headers
    })
  }

  async fetchNextTask(): Promise<any | null> {
    try {
      const res = await this.client.post('/queue/next')
      if (res.status === 204) return null
      return res.data
    } catch (err: any) {
      logger.error(`Failed to fetch next task: ${err.message}`)
      return null
    }
  }

  async reportResult(taskId: string, success: boolean, result: any): Promise<void> {
    const maxRetries = 5
    let delay = 1000

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.post('/queue/result', { taskId, ok: success, result })
        return
      } catch (err: any) {
        logger.error(`Failed to report result (attempt ${i + 1}/${maxRetries}): ${err.message}`)
        if (i === maxRetries - 1) throw err
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff
      }
    }
  }

  async reportProgress(taskId: string, progress: number, etaSeconds: number | null): Promise<void> {
    try {
      // Fire-and-forget logic, but we await to catch immediate networking errors without blocking logic too much
      // We can use a shorter timeout for progress updates
      await this.client.post(`/internal/tasks/${taskId}/progress`, 
        { progress, eta: etaSeconds },
        { timeout: 2000 } // 2s timeout for progress updates
      )
    } catch (err: any) {
      // Log warning but do not throw - progress updates are non-critical
      logger.warn(`Failed to report progress for task ${taskId}: ${err.message}`)
    }
  }

  async saveCustomRule(rule: any): Promise<void> {
    try {
      await this.client.post('/internal/rules', rule)
    } catch (err: any) {
      logger.error(`Failed to save custom rule: ${err.message}`)
    }
  }
}
