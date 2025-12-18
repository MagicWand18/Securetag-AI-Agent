import { dbQuery } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';

export class CreditsManager {
    
    async hasSufficientCredits(tenantId: string, required: number): Promise<boolean> {
        try {
            const res = await dbQuery(
                'SELECT credits_balance FROM securetag.tenant WHERE id = $1',
                [tenantId]
            );
            
            if (res.rows.length === 0) return false;
            return (res.rows[0].credits_balance || 0) >= required;
        } catch (error) {
            logger.error(`Error checking credits for tenant ${tenantId}`, error);
            return false;
        }
    }

    async deductCredits(tenantId: string, amount: number, description: string): Promise<boolean> {
        try {
            // Atomic update: ensure balance >= amount
            const res = await dbQuery(
                `UPDATE securetag.tenant 
                 SET credits_balance = credits_balance - $2 
                 WHERE id = $1 AND credits_balance >= $2
                 RETURNING credits_balance`,
                [tenantId, amount]
            );

            if (res.rowCount === 0) {
                logger.warn(`Failed to deduct ${amount} credits from tenant ${tenantId}: Insufficient balance or tenant not found.`);
                return false;
            }

            logger.info(`Deducted ${amount} credits from tenant ${tenantId} for ${description}. New balance: ${res.rows[0].credits_balance}`);
            return true;
        } catch (error) {
            logger.error(`Error deducting credits from tenant ${tenantId}`, error);
            return false;
        }
    }
}
