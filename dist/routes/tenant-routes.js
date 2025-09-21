import express from 'express';
import { createTenantStorage } from '../middleware/tenant-isolation';
const router = express.Router();
router.get('/dashboard/stats-old', async (req, res) => {
    try {
        console.log('[TENANT] Dashboard stats request received');
        const stats = {
            totalUpdates: 15,
            totalLegalCases: 8,
            activeDataSources: 12,
            monthlyUsage: 23,
            usageLimit: 200
        };
        console.log('[TENANT] Returning tenant-specific stats:', stats);
        res.json(stats);
    }
    catch (error) {
        console.error('[TENANT] Dashboard stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard stats',
            message: 'Please try again or contact support'
        });
    }
});
router.get('/context-old', async (req, res) => {
    try {
        console.log('[TENANT] Context request received');
        const tenant = {
            id: '2d224347-b96e-4b61-acac-dbd414a0e048',
            name: 'Demo Medical Corp',
            subdomain: 'demo-medical',
            colorScheme: 'blue',
            subscriptionTier: 'professional',
            settings: {}
        };
        console.log('[TENANT] Returning tenant context:', tenant);
        res.json(tenant);
    }
    catch (error) {
        console.error('[TENANT] Context error:', error);
        res.status(500).json({
            error: 'Failed to fetch tenant context'
        });
    }
});
router.get('/regulatory-updates-old', async (req, res) => {
    try {
        console.log('[TENANT] Regulatory updates request received');
        const updates = [
            {
                id: 'tenant-update-1',
                title: 'FDA Medical Device Guidance Update',
                description: 'New guidelines for medical device approval process specific to your sector',
                published_at: '2025-08-15T10:00:00Z',
                type: 'guidance'
            },
            {
                id: 'tenant-update-2',
                title: 'EU MDR Implementation Changes',
                description: 'Updated requirements for medical device registration in Europe',
                published_at: '2025-08-14T14:30:00Z',
                type: 'regulatory'
            },
            {
                id: 'tenant-update-3',
                title: 'ISO 13485:2016 Updates',
                description: 'Quality management system updates for medical devices',
                published_at: '2025-08-13T09:15:00Z',
                type: 'standard'
            }
        ];
        console.log('[TENANT] Returning tenant regulatory updates:', updates.length);
        res.json(updates);
    }
    catch (error) {
        console.error('[TENANT] Regulatory updates error:', error);
        res.status(500).json({
            error: 'Failed to fetch regulatory updates'
        });
    }
});
router.get('/legal-cases', async (req, res) => {
    try {
        if (!req.tenant) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        const limit = parseInt(req.query.limit) || 50;
        const storage = createTenantStorage(req.tenant.id);
        const legalCases = await storage.getLegalCases(limit);
        res.json(legalCases);
    }
    catch (error) {
        console.error('[TENANT] Legal cases error:', error);
        res.status(500).json({
            error: 'Failed to fetch legal cases'
        });
    }
});
router.get('/profile', async (req, res) => {
    try {
        if (!req.user || !req.tenant) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.tenantId !== req.tenant.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            tenant: {
                id: req.tenant.id,
                name: req.tenant.name,
                subscriptionTier: req.tenant.subscriptionTier
            }
        });
    }
    catch (error) {
        console.error('[TENANT] Profile error:', error);
        res.status(500).json({
            error: 'Failed to fetch user profile'
        });
    }
});
router.get('/settings', async (req, res) => {
    try {
        if (!req.user || !req.tenant) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.role !== 'tenant_admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        res.json({
            tenant: req.tenant,
            users: [],
            subscription: {
                tier: req.tenant.subscriptionTier,
                features: []
            }
        });
    }
    catch (error) {
        console.error('[TENANT] Settings error:', error);
        res.status(500).json({
            error: 'Failed to fetch tenant settings'
        });
    }
});
router.put('/settings', async (req, res) => {
    try {
        if (!req.user || !req.tenant) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.role !== 'tenant_admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        res.json({ message: 'Settings updated successfully' });
    }
    catch (error) {
        console.error('[TENANT] Update settings error:', error);
        res.status(500).json({
            error: 'Failed to update tenant settings'
        });
    }
});
export default router;
//# sourceMappingURL=tenant-routes.js.map