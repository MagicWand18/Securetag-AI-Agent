import { Queue } from 'bullmq';
import { getRedisConnection } from '../utils/redis.js';

// Define queue names
export const QUEUE_NAMES = {
  TASKS: 'securetag-tasks',
};

// Singleton queue instances
let tasksQueue: Queue | null = null;

export const getTasksQueue = (): Queue => {
  if (!tasksQueue) {
    const connection = getRedisConnection();
    tasksQueue = new Queue(QUEUE_NAMES.TASKS, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true, // Keep Redis clean
        removeOnFail: false, // Keep failed jobs for inspection
      },
    });
  }
  return tasksQueue;
};
