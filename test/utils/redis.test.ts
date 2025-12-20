import { getRedisConnection } from '../../src/utils/redis';

describe('Redis Connection', () => {
  it('should connect to Redis successfully', async () => {
    const redis = getRedisConnection();
    const ping = await redis.ping();
    expect(ping).toBe('PONG');
  });

  afterAll(async () => {
    const redis = getRedisConnection();
    await redis.quit();
  });
});
