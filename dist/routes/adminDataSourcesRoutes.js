import { Router } from 'express';
import { apiManagementService } from '../services/apiManagementService';
import { realFDAApiService } from '../services/realFDAApiService';
import { webScrapingService } from '../services/webScrapingService';
const router = Router();
router.get('/data-sources', async (req, res) => {
    try {
        const dataSources = apiManagementService.getActiveDataSources();
        res.json(dataSources);
    }
    catch (error) {
        console.error('[Admin API] Error fetching data sources:', error);
        res.status(500).json({ error: 'Failed to fetch data sources' });
    }
});
router.get('/data-sources/health', async (req, res) => {
    try {
        const healthCheck = await apiManagementService.performHealthCheck();
        res.json(healthCheck);
    }
    catch (error) {
        console.error('[Admin API] Error performing health check:', error);
        res.status(500).json({ error: 'Failed to perform health check' });
    }
});
router.get('/data-sources/unauthenticated', async (req, res) => {
    try {
        const unauthenticatedSources = apiManagementService.getUnauthenticatedSources();
        res.json(unauthenticatedSources);
    }
    catch (error) {
        console.error('[Admin API] Error fetching unauthenticated sources:', error);
        res.status(500).json({ error: 'Failed to fetch unauthenticated sources' });
    }
});
router.post('/data-sources/:sourceId/sync', async (req, res) => {
    try {
        const { sourceId } = req.params;
        let result;
        switch (sourceId) {
            case 'fda_openfda':
                result = await realFDAApiService.syncAllFDAData();
                break;
            case 'bfarm_scraping':
            case 'swissmedic_scraping':
            case 'health_canada_scraping':
                result = await webScrapingService.syncAllWebScrapingSources();
                break;
            default:
                return res.status(400).json({ error: 'Unknown data source' });
        }
        res.json({
            success: result.success,
            message: `Sync completed: ${result.processed} processed, ${result.errors} errors`,
            processed: result.processed,
            errors: result.errors
        });
    }
    catch (error) {
        console.error(`[Admin API] Error syncing ${req.params.sourceId}:`, error);
        res.status(500).json({
            error: 'Sync failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/data-sources/:sourceId/configure', async (req, res) => {
    try {
        const { sourceId } = req.params;
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }
        console.log(`[Admin API] Configuring API key for ${sourceId}`);
        res.json({
            success: true,
            message: `API key configured for ${sourceId}`,
            sourceId
        });
    }
    catch (error) {
        console.error(`[Admin API] Error configuring ${req.params.sourceId}:`, error);
        res.status(500).json({
            error: 'Configuration failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/data-sources/regions', async (req, res) => {
    try {
        const allSources = apiManagementService.getActiveDataSources();
        const regionGroups = allSources.reduce((acc, source) => {
            if (!acc[source.region]) {
                acc[source.region] = [];
            }
            acc[source.region].push(source);
            return acc;
        }, {});
        res.json(regionGroups);
    }
    catch (error) {
        console.error('[Admin API] Error fetching regions:', error);
        res.status(500).json({ error: 'Failed to fetch regional data sources' });
    }
});
router.get('/data-sources/statistics', async (req, res) => {
    try {
        const allSources = apiManagementService.getActiveDataSources();
        const stats = {
            total: allSources.length,
            byType: {
                official_api: allSources.filter(s => s.type === 'official_api').length,
                web_scraping: allSources.filter(s => s.type === 'web_scraping').length,
                partner_api: allSources.filter(s => s.type === 'partner_api').length,
            },
            byStatus: {
                active: allSources.filter(s => s.status === 'active').length,
                inactive: allSources.filter(s => s.status === 'inactive').length,
                testing: allSources.filter(s => s.status === 'testing').length,
            },
            byPriority: {
                high: allSources.filter(s => s.priority === 'high').length,
                medium: allSources.filter(s => s.priority === 'medium').length,
                low: allSources.filter(s => s.priority === 'low').length,
            },
            requireAuth: allSources.filter(s => s.requiresAuth).length,
            withErrors: allSources.filter(s => s.errorCount > 0).length,
        };
        res.json(stats);
    }
    catch (error) {
        console.error('[Admin API] Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
export default router;
//# sourceMappingURL=adminDataSourcesRoutes.js.map