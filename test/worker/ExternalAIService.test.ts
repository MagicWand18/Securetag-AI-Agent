import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExternalAIService } from '../../src/worker/services/ExternalAIService.js'
import * as db from '../../src/utils/db.js'

// Mock dbQuery
vi.mock('../../src/utils/db.js', () => ({
    dbQuery: vi.fn(),
    getPool: vi.fn()
}))

// Mock OpenAI and Anthropic
vi.mock('openai', () => {
    return {
        default: class OpenAI {
            chat = {
                completions: {
                    create: vi.fn().mockRejectedValue(new Error('OpenAI Error'))
                }
            }
        }
    }
})

vi.mock('@anthropic-ai/sdk', () => {
    return {
        default: class Anthropic {
            messages = {
                create: vi.fn().mockResolvedValue({
                    content: [{ type: 'text', text: '{"triage": "True Positive", "reasoning": "Fallback works"}' }]
                })
            }
        }
    }
})

describe('ExternalAIService Double Check', () => {
    let service: ExternalAIService

    beforeEach(() => {
        vi.clearAllMocks()
        service = new ExternalAIService()
    })

    it('should fallback to Anthropic if OpenAI fails', async () => {
        // Mock credits check
        const mockDb = db.dbQuery as any
        mockDb.mockResolvedValueOnce({ rows: [{ credits_balance: 100 }], rowCount: 1 }) // check
        mockDb.mockResolvedValueOnce({ rows: [{ credits_balance: 99 }], rowCount: 1 }) // deduct

        process.env.AI_PROVIDER_OPENAI_KEY = 'mock-openai'
        process.env.AI_PROVIDER_ANTHROPIC_KEY = 'mock-anthropic'

        const result = await service.performDoubleCheck(
            { rule_id: 'test' },
            {},
            'prompt',
            'tenant-1',
            { level: 'standard' }
        )

        expect(result).toBeDefined()
        expect(result?.reasoning).toBe('Fallback works')
        
        // Verify db calls
        // 1 check, 1 deduct
        expect(db.dbQuery).toHaveBeenCalledTimes(2)
    })
})
