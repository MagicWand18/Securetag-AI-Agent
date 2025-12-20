import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../utils/redis.js';
import { TaskExecutor } from './TaskExecutor.js';
import { WorkerClient } from './WorkerClient.js';
import { logger } from '../utils/logger.js';
import { QUEUE_NAMES } from '../server/queues.js';

export const startWorker = (executor: TaskExecutor, client: WorkerClient) => {
  const connection = getRedisConnection();
  
  const worker = new Worker(QUEUE_NAMES.TASKS, async (job: Job) => {
    logger.info(`Processing job ${job.id} (${job.name})`);
    
    // job.data contains the task payload
    // Ensure payload has what executor expects
    const task = job.data;
    
    try {
        const result = await executor.execute(task);
        
        // Report result to API (for DB persistence)
        // We use taskId from payload or job.id as fallback
        const taskId = task.taskId || task.id;
        
        await client.reportResult(taskId, result.ok, result);
        
        return result;
    } catch (err: any) {
        logger.error(`Job ${job.id} failed: ${err.message}`);
        
        // Report failure to API
        const taskId = task.taskId || task.id;
        if (taskId) {
            await client.reportResult(taskId, false, { error: err.message });
        }
        
        throw err; // BullMQ will handle retries based on queue config
    }
  }, {
    connection,
    concurrency: process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : 5
  });
  
  worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });
  
  logger.info(`BullMQ Worker started listening on queue "${QUEUE_NAMES.TASKS}"`);
  return worker;
};
