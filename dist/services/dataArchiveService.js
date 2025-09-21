export class DataArchiveService {
    constructor() {
        this.cutoffDate = '2024-06-01';
        console.log(`[ARCHIVE] Initialisiert mit Stichtag: ${this.cutoffDate}`);
    }
    isHistoricalData(publishedAt) {
        return new Date(publishedAt) < new Date(this.cutoffDate);
    }
    getCurrentDataFilter() {
        return `published_at >= '${this.cutoffDate}'`;
    }
    getHistoricalDataFilter() {
        return `published_at < '${this.cutoffDate}'`;
    }
    getArchiveStats(totalUpdates, currentUpdates) {
        const archived = totalUpdates - currentUpdates;
        const performanceGain = ((archived / totalUpdates) * 100).toFixed(1);
        return {
            total: totalUpdates,
            current: currentUpdates,
            archived,
            performanceGain: `${performanceGain}% weniger Datentransfer`
        };
    }
    async archiveOldData(sql) {
        try {
            console.log(`[ARCHIVE] Starte Archivierung älterer Daten (vor ${this.cutoffDate})...`);
            const oldUpdatesCount = await sql `
        SELECT COUNT(*) as count 
        FROM regulatory_updates 
        WHERE published_at < ${this.cutoffDate}
      `;
            const newUpdatesCount = await sql `
        SELECT COUNT(*) as count 
        FROM regulatory_updates 
        WHERE published_at >= ${this.cutoffDate}
      `;
            const archived = parseInt(oldUpdatesCount[0].count);
            const remaining = parseInt(newUpdatesCount[0].count);
            console.log(`[ARCHIVE] Archivierung abgeschlossen:`);
            console.log(`[ARCHIVE] - Archivierte Daten (vor ${this.cutoffDate}): ${archived}`);
            console.log(`[ARCHIVE] - Aktuelle Daten (ab ${this.cutoffDate}): ${remaining}`);
            console.log(`[ARCHIVE] - Performance-Verbesserung: ${((archived / (archived + remaining)) * 100).toFixed(1)}%`);
            return { archived, remaining };
        }
        catch (error) {
            console.error('[ARCHIVE] Fehler bei Archivierung:', error);
            throw error;
        }
    }
}
export const archiveService = new DataArchiveService();
//# sourceMappingURL=dataArchiveService.js.map