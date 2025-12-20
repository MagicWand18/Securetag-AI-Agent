import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startWorker } from '../../src/worker/consumer.js';
import { TaskExecutor } from '../../src/worker/TaskExecutor.js';
import { WorkerClient } from '../../src/worker/WorkerClient.js';
import { getTasksQueue } from '../../src/server/queues.js';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
vi.mock('../../src/worker/TaskExecutor.js');
vi.mock('../../src/worker/WorkerClient.js');

describe('Event Consumer (Worker)', () => {
  let worker: any;
  let queue: any;
  let mockExecutor: any;
  let mockClient: any;

  beforeEach(async () => {
    // Setup mocks
    mockExecutor = {
      execute: vi.fn().mockResolvedValue({ ok: true, data: 'test result' })
    };
    mockClient = {
      reportResult: vi.fn().mockResolvedValue(undefined)
    };
    
    // Get real queue (connected to real Redis)
    queue = getTasksQueue();
    
    // Start worker
    worker = startWorker(mockExecutor as unknown as TaskExecutor, mockClient as unknown as WorkerClient);
  });

  afterEach(async () => {
    if (worker) await worker.close();
    if (queue) {
        // Clean queue
        await queue.drain();
    }
  });

  it('should process a job from the queue and report results', async () => {
    const taskId = uuidv4();
    const taskPayload = {
      id: taskId,
      taskId,
      type: 'test-task',
      data: 'some data'
    };

    // 1. Add job to queue (simulate Server)
    await queue.add('test', taskPayload);

    // 2. Wait for worker to process
    // We can use a promise that resolves when the worker emits 'completed'
    // But since our worker instance is local, we can attach a listener to it in the test?
    // startWorker returns the worker instance.
    
    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for job completion')), 5000);
        worker.on('completed', (job: any) => {
            if (job.data.id === taskId) {
                clearTimeout(timeout);
                resolve();
            }
        });
        worker.on('failed', (job: any, err: any) => {
            if (job.data.id === taskId) {
                clearTimeout(timeout);
                reject(err);
            }
        });
    });

    // 3. Verify interactions
    expect(mockExecutor.execute).toHaveBeenCalledWith(expect.objectContaining({
        id: taskId
    }));
    
    expect(mockClient.reportResult).toHaveBeenCalledWith(
        taskId, 
        true, 
        expect.objectContaining({ ok: true })
    );
  });
});
