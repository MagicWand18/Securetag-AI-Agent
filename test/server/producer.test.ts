import { getTasksQueue } from '../../src/server/queues';
import { v4 as uuidv4 } from 'uuid';
import { getRedisConnection } from '../../src/utils/redis';

// Mock DB interactions (since we are testing Producer logic, not full E2E here)
// But we need Redis real connection
describe('Event Producer (Server)', () => {
  const queue = getTasksQueue();

  afterAll(async () => {
    await queue.close();
    const redis = getRedisConnection();
    await redis.quit();
  });

  it('should add a web scan task to Redis queue', async () => {
    const taskId = uuidv4();
    const job = await queue.add('web', {
      id: taskId,
      taskId,
      type: 'web',
      url: 'http://example.com'
    }, {
      jobId: taskId
    });

    expect(job.id).toBe(taskId);

    const storedJob = await queue.getJob(taskId);
    expect(storedJob).toBeDefined();
    expect(storedJob?.data.url).toBe('http://example.com');
  });
});
