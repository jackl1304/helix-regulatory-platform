import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
export const tenantIsolationMiddleware = async (req, res, next) => {
    try {
        if (!req.path.startsWith('/api/tenant') && !req.path.startsWith('/tenant')) {
            return next();
        }
        if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access not available for tenant users'
            });
        }
        const tenant = {
            id: '2d224347-b96e-4b61-acac-dbd414a0e048',
            name: 'Demo Medical Corp',
            subdomain: 'demo-medical',
            subscription_tier: 'professional',
            settings: {},
            customer_permissions: {}
        };
        req.tenant = {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
            colorScheme: 'blue',
            subscriptionTier: tenant.subscription_tier,
            settings: tenant.settings
        };
        if (req.session?.user) {
            const user = req.session.user;
            if (user.tenantId !== tenant.id) {
                req.session.destroy((err) => {
                    if (err)
                        console.error('Session destroy error:', err);
                });
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'User does not belong to this tenant'
                });
            }
            if (user.role !== 'super_admin' && (req.path.startsWith('/admin') || req.path.startsWith('/api/admin'))) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Insufficient privileges for admin access'
                });
            }
            req.user = user;
        }
        next();
    }
    catch (error) {
        console.error('[TENANT] Tenant isolation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Tenant resolution failed'
        });
    }
};
export class TenantAwareStorage {
    constructor(tenantId) {
        this.tenantId = tenantId;
    }
    async query(queryTemplate, params = []) {
        return sql(queryTemplate, [this.tenantId, ...params]);
    }
    async getDashboardStats() {
        try {
            const [updates, sources, legalCases] = await Promise.all([
                sql `SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT title) as unique_count,
          COUNT(*) FILTER (WHERE published_at >= CURRENT_DATE - INTERVAL '7 days') as recent_count
        FROM regulatory_updates`,
                sql `SELECT COUNT(*) as count FROM data_sources WHERE is_active = true`,
                sql `SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT title) as unique_count,
          COUNT(*) FILTER (WHERE decision_date >= CURRENT_DATE - INTERVAL '30 days') as recent_count
        FROM legal_cases`
            ]);
            return {
                totalUpdates: parseInt(updates[0]?.total_count || '0'),
                uniqueUpdates: parseInt(updates[0]?.unique_count || '0'),
                totalLegalCases: parseInt(legalCases[0]?.total_count || '0'),
                uniqueLegalCases: parseInt(legalCases[0]?.unique_count || '0'),
                recentUpdates: parseInt(updates[0]?.recent_count || '0'),
                recentLegalCases: parseInt(legalCases[0]?.recent_count || '0'),
                activeDataSources: parseInt(sources[0]?.count || '0')
            };
        }
        catch (error) {
            console.error('[TENANT] Dashboard stats error:', error);
            throw error;
        }
    }
    async getRegulatoryUpdates(limit = 50) {
        try {
            const result = await sql `
        SELECT * FROM regulatory_updates 
        ORDER BY published_at DESC 
        LIMIT ${limit}
      `;
            return result;
        }
        catch (error) {
            console.error('[TENANT] Regulatory updates error:', error);
            throw error;
        }
    }
    async getLegalCases(limit = 50) {
        try {
            const result = await sql `
        SELECT * FROM legal_cases 
        ORDER BY decision_date DESC 
        LIMIT ${limit}
      `;
            return result;
        }
        catch (error) {
            console.error('[TENANT] Legal cases error:', error);
            throw error;
        }
    }
}
export const createTenantStorage = (tenantId) => {
    return new TenantAwareStorage(tenantId);
};
//# sourceMappingURL=tenant-isolation.js.map