import { Router } from 'express';
import { logger } from '../services/logger.service';
const router = Router();
router.post('/report', async (req, res) => {
    try {
        const { errors } = req.body;
        if (!Array.isArray(errors)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid error report format'
            });
        }
        for (const errorReport of errors) {
            const logLevel = getLogLevel(errorReport.severity);
            logger[logLevel]('Frontend Error Report', {
                error: errorReport.error,
                context: errorReport.context,
                userAgent: errorReport.userAgent,
                url: errorReport.url,
                timestamp: errorReport.timestamp,
                additionalData: errorReport.additionalData
            });
            if (process.env.NODE_ENV === 'production') {
                await sendToExternalMonitoring(errorReport);
            }
        }
        res.json({
            success: true,
            message: `Processed ${errors.length} error reports`
        });
    }
    catch (error) {
        logger.error('Failed to process error reports', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to process error reports'
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            totalErrors: 0,
            errorsByType: {
                javascript: 0,
                network: 0,
                react: 0,
                api: 0
            },
            errorsBySeverity: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            },
            lastUpdated: new Date().toISOString()
        };
        res.json({ success: true, stats });
    }
    catch (error) {
        logger.error('Failed to get error statistics', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to get error statistics'
        });
    }
});
function getLogLevel(severity) {
    switch (severity) {
        case 'low':
            return 'info';
        case 'medium':
            return 'warn';
        case 'high':
        case 'critical':
            return 'error';
        default:
            return 'warn';
    }
}
async function sendToExternalMonitoring(errorReport) {
    try {
        console.log('[EXTERNAL MONITORING]', errorReport);
    }
    catch (error) {
        logger.warn('Failed to send error to external monitoring', { error });
    }
}
export default router;
//# sourceMappingURL=errors.js.map