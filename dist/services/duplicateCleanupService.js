import { Logger } from './logger.service';
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
export class DuplicateCleanupService {
    constructor() {
        this.logger = new Logger('DuplicateCleanupService');
    }
    async performEmergencyDuplicateCleanup() {
        const startTime = Date.now();
        this.logger.info('STARTING EMERGENCY DUPLICATE CLEANUP - System has 95.5% duplicates!');
        try {
            const beforeStats = await this.getDuplicateStats();
            this.logger.info('Before cleanup statistics', beforeStats);
            const regulatoryCleanup = await this.cleanupRegulatoryUpdateDuplicates();
            const legalCleanup = await this.cleanupLegalCaseDuplicates();
            const afterStats = await this.getDuplicateStats();
            this.logger.info('After cleanup statistics', afterStats);
            const cleanupTime = Date.now() - startTime;
            const totalRemoved = regulatoryCleanup.removed + legalCleanup.removed;
            const qualityImprovement = ((afterStats.uniquenessRatio - beforeStats.uniquenessRatio) * 100);
            const stats = {
                totalRecords: afterStats.totalRegulatory + afterStats.totalLegal,
                uniqueRecords: afterStats.uniqueRegulatory + afterStats.uniqueLegal,
                duplicatesRemoved: totalRemoved,
                cleanupTime,
                qualityImprovement
            };
            this.logger.info('EMERGENCY DUPLICATE CLEANUP COMPLETED', stats);
            return stats;
        }
        catch (error) {
            this.logger.error('Emergency duplicate cleanup failed', { error: error.message });
            throw error;
        }
    }
    async cleanupRegulatoryUpdateDuplicates() {
        this.logger.info('Cleaning regulatory updates duplicates...');
        const duplicateQuery = `
      WITH duplicate_groups AS (
        SELECT 
          id,
          title,
          published_at,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(title)) 
            ORDER BY published_at DESC, created_at DESC
          ) as row_num
        FROM regulatory_updates
        WHERE title IS NOT NULL AND TRIM(title) != ''
      ),
      duplicates_to_delete AS (
        SELECT id FROM duplicate_groups WHERE row_num > 1
      )
      DELETE FROM regulatory_updates 
      WHERE id IN (SELECT id FROM duplicates_to_delete)
    `;
        const result = await sql(duplicateQuery);
        const removed = Array.isArray(result) ? result.length : 0;
        const remaining = await sql `SELECT COUNT(*) as count FROM regulatory_updates`;
        const kept = parseInt(remaining[0]?.count || '0');
        this.logger.info('Regulatory updates cleanup completed', { kept, removed });
        return { kept, removed };
    }
    async cleanupLegalCaseDuplicates() {
        this.logger.info('Cleaning legal cases duplicates...');
        const duplicateQuery = `
      WITH duplicate_groups AS (
        SELECT 
          id,
          title,
          decision_date,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(title)) 
            ORDER BY decision_date DESC, created_at DESC
          ) as row_num
        FROM legal_cases
        WHERE title IS NOT NULL AND TRIM(title) != ''
      ),
      duplicates_to_delete AS (
        SELECT id FROM duplicate_groups WHERE row_num > 1
      )
      DELETE FROM legal_cases 
      WHERE id IN (SELECT id FROM duplicates_to_delete)
    `;
        const result = await sql(duplicateQuery);
        const removed = Array.isArray(result) ? result.length : 0;
        const remaining = await sql `SELECT COUNT(*) as count FROM legal_cases`;
        const kept = parseInt(remaining[0]?.count || '0');
        this.logger.info('Legal cases cleanup completed', { kept, removed });
        return { kept, removed };
    }
    async getDuplicateStats() {
        const [regulatoryStats, legalStats] = await Promise.all([
            sql `SELECT 
        COUNT(*) as total_count,
        COUNT(DISTINCT LOWER(TRIM(title))) as unique_count
      FROM regulatory_updates
      WHERE title IS NOT NULL AND TRIM(title) != ''`,
            sql `SELECT 
        COUNT(*) as total_count,
        COUNT(DISTINCT LOWER(TRIM(title))) as unique_count
      FROM legal_cases
      WHERE title IS NOT NULL AND TRIM(title) != ''`
        ]);
        const totalRegulatory = parseInt(regulatoryStats[0]?.total_count || '0');
        const uniqueRegulatory = parseInt(regulatoryStats[0]?.unique_count || '0');
        const totalLegal = parseInt(legalStats[0]?.total_count || '0');
        const uniqueLegal = parseInt(legalStats[0]?.unique_count || '0');
        const totalRecords = totalRegulatory + totalLegal;
        const uniqueRecords = uniqueRegulatory + uniqueLegal;
        const uniquenessRatio = totalRecords > 0 ? uniqueRecords / totalRecords : 0;
        return {
            totalRegulatory,
            uniqueRegulatory,
            totalLegal,
            uniqueLegal,
            uniquenessRatio
        };
    }
    async generateCleanupReport() {
        const stats = await this.getDuplicateStats();
        const duplicateRatio = stats.totalRegulatory > 0 ?
            ((stats.totalRegulatory - stats.uniqueRegulatory) / stats.totalRegulatory * 100) : 0;
        return {
            currentStats: stats,
            duplicatePercentage: Math.round(duplicateRatio * 100) / 100,
            recommendedAction: duplicateRatio > 10 ? 'IMMEDIATE_CLEANUP_REQUIRED' : 'MONITORING',
            qualityScore: Math.round((stats.uniquenessRatio * 100) * 100) / 100,
            generatedAt: new Date().toISOString()
        };
    }
}
export const duplicateCleanupService = new DuplicateCleanupService();
//# sourceMappingURL=duplicateCleanupService.js.map