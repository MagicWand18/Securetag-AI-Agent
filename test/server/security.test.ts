import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../../src/server/security.js';
import * as dbUtils from '../../src/utils/db.js';

// Mock Redis
const mockRedis = {
    multi: vi.fn().mockReturnThis(),
    incr: vi.fn().mockReturnThis(),
    ttl: vi.fn().mockReturnThis(),
    exec: vi.fn(),
    expire: vi.fn()
};

vi.mock('../../src/utils/redis.js', () => ({
    getRedisConnection: vi.fn(() => mockRedis)
}));

vi.mock('../../src/utils/db.js', () => ({
    dbQuery: vi.fn().mockResolvedValue({ rows: [] })
}));

describe('Security Middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should allow request under limit', async () => {
        mockRedis.exec.mockResolvedValue([[null, 1], [null, 60]]); // count=1, ttl=60
        
        const req = {
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
        
        const result = await checkRateLimit(req);
        expect(result).toBe(true);
    });

    it('should block request over limit', async () => {
        mockRedis.exec.mockResolvedValue([[null, 101], [null, 60]]); // count=101 (limit 100)
        
        const req = {
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
        
        const result = await checkRateLimit(req);
        expect(result).toBe(false);
        // Should trigger ban logic (dbQuery)
        expect(dbUtils.dbQuery).toHaveBeenCalled();
    });
});
