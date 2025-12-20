import IORedis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD;

/**
 * Singleton Redis connection instance
 */
let redisConnection: IORedis | null = null;

export const getRedisConnection = (): IORedis => {
  if (!redisConnection) {
    redisConnection = new IORedis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisConnection.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisConnection.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  return redisConnection;
};
