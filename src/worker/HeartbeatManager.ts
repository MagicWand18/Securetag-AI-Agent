import { dbQuery } from '../utils/db.js'
import { logger } from '../utils/logger.js'
import os from 'os'

export class HeartbeatManager {
    private workerId: string
    private taskId: string | null = null
    private intervalId: NodeJS.Timeout | null = null
    private heartbeatIntervalMs: number

    constructor(workerId?: string, heartbeatIntervalMs: number = 30000) {
        this.workerId = workerId || `${os.hostname()}-${process.pid}`
        this.heartbeatIntervalMs = heartbeatIntervalMs
    }

    async start(taskId: string): Promise<void> {
        this.taskId = taskId

        // Send initial heartbeat
        await this.sendHeartbeat('processing')

        // Start periodic heartbeats
        this.intervalId = setInterval(async () => {
            try {
                await this.sendHeartbeat('processing')
            } catch (err: any) {
                logger.error(`Failed to send heartbeat for task ${taskId}: ${err.message}`)
            }
        }, this.heartbeatIntervalMs)

        logger.info(`Heartbeat started for task ${taskId} (interval: ${this.heartbeatIntervalMs}ms)`)
    }

    async stop(status: 'completed' | 'failed' | 'timeout' = 'completed'): Promise<void> {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }

        if (this.taskId) {
            // Send final heartbeat with completion status
            await this.sendHeartbeat(status)
            logger.info(`Heartbeat stopped for task ${this.taskId} (status: ${status})`)
            this.taskId = null
        }
    }

    private async sendHeartbeat(status: string): Promise<void> {
        if (!this.taskId) return

        try {
            await dbQuery(
                `INSERT INTO securetag.worker_heartbeat (worker_id, task_id, status, last_heartbeat, created_at) 
         VALUES ($1, $2, $3, NOW(), NOW())`,
                [this.workerId, this.taskId, status]
            )
        } catch (err: any) {
            logger.error(`Failed to insert heartbeat: ${err.message}`)
            throw err
        }
    }

    getWorkerId(): string {
        return this.workerId
    }
}
