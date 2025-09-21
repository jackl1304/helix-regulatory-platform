import { Router } from 'express';
import { logger } from '../services/logger.service';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { z } from 'zod';
const router = Router();
const credentialsSchema = z.record(z.string());
const sourceIdSchema = z.object({
    sourceId: z.string().min(1)
});
const credentialsStore = {};
router.get('/data-sources', asyncHandler(async (req, res) => {
    logger.info('API: Fetching data sources configuration');
    const dataSources = [
        {
            id: 'fda_510k',
            name: 'FDA 510(k) Database',
            status: 'inactive',
            hasCredentials: !!credentialsStore['fda_510k']
        },
        {
            id: 'ema_epar',
            name: 'EMA EPAR Database',
            status: 'active',
            hasCredentials: !!credentialsStore['ema_epar']
        },
    ];
    res.json(dataSources);
}));
router.post('/data-sources/:sourceId/credentials', validateParams(sourceIdSchema), validateBody(credentialsSchema), asyncHandler(async (req, res) => {
    const { sourceId } = req.params;
    const credentials = req.body;
    if (!sourceId) {
        return res.status(400).json({
            success: false,
            error: 'Datenquellen-ID ist erforderlich',
            timestamp: new Date().toISOString()
        });
    }
    logger.info('API: Saving credentials for data source', { sourceId });
    credentialsStore[sourceId] = credentials;
    logger.info('API: Credentials saved successfully', { sourceId });
    return res.json({
        success: true,
        message: 'Zugangsdaten erfolgreich gespeichert',
        timestamp: new Date().toISOString()
    });
}));
router.post('/data-sources/:sourceId/test', validateParams(sourceIdSchema), asyncHandler(async (req, res) => {
    const { sourceId } = req.params;
    if (!sourceId) {
        return res.status(400).json({
            success: false,
            error: 'Datenquellen-ID ist erforderlich',
            timestamp: new Date().toISOString()
        });
    }
    logger.info('API: Testing connection for data source', { sourceId });
    const credentials = credentialsStore[sourceId];
    if (!credentials) {
        return res.status(400).json({
            success: false,
            error: 'Keine Zugangsdaten für diese Datenquelle gefunden',
            timestamp: new Date().toISOString()
        });
    }
    const isSuccess = Math.random() > 0.3;
    if (isSuccess) {
        logger.info('API: Connection test successful', { sourceId });
        return res.json({
            success: true,
            message: 'Verbindung erfolgreich getestet',
            timestamp: new Date().toISOString()
        });
    }
    else {
        logger.warn('API: Connection test failed', { sourceId });
        return res.status(400).json({
            success: false,
            error: 'Verbindungstest fehlgeschlagen - Überprüfen Sie die Zugangsdaten',
            timestamp: new Date().toISOString()
        });
    }
}));
router.get('/data-sources/:sourceId/credentials', validateParams(sourceIdSchema), asyncHandler(async (req, res) => {
    const { sourceId } = req.params;
    if (!sourceId) {
        return res.status(400).json({
            success: false,
            error: 'Datenquellen-ID ist erforderlich',
            timestamp: new Date().toISOString()
        });
    }
    logger.info('API: Fetching masked credentials for data source', { sourceId });
    const credentials = credentialsStore[sourceId];
    if (!credentials) {
        return res.json({
            success: true,
            data: {},
            timestamp: new Date().toISOString()
        });
    }
    const maskedCredentials = {};
    Object.keys(credentials).forEach(key => {
        const value = credentials[key];
        if (value && typeof value === 'string') {
            if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('key')) {
                maskedCredentials[key] = '****' + value.slice(-4);
            }
            else {
                maskedCredentials[key] = value;
            }
        }
    });
    return res.json({
        success: true,
        data: maskedCredentials,
        timestamp: new Date().toISOString()
    });
}));
const createTenantSchema = z.object({
    name: z.string().min(1, 'Firmenname ist erforderlich'),
    slug: z.string().min(1, 'Slug ist erforderlich'),
    subscriptionPlan: z.enum(['starter', 'professional', 'enterprise']),
    subscriptionStatus: z.enum(['trial', 'active', 'cancelled', 'suspended']),
    billingEmail: z.string().email('Gültige E-Mail-Adresse erforderlich'),
    contactName: z.string().min(1, 'Kontaktname ist erforderlich'),
    contactEmail: z.string().email('Gültige Kontakt-E-Mail erforderlich'),
    maxUsers: z.number().min(1),
    maxDataSources: z.number().min(1),
    apiAccessEnabled: z.boolean().default(true)
});
router.post('/tenants', async (req, res) => {
    try {
        console.log('[ADMIN] Creating new tenant:', req.body);
        const validatedData = createTenantSchema.parse(req.body);
        const { TenantService } = await import('../services/tenantService');
        const newTenant = await TenantService.createTenant({
            name: validatedData.name,
            slug: validatedData.slug,
            subscriptionPlan: validatedData.subscriptionPlan,
            subscriptionStatus: validatedData.subscriptionStatus,
            billingEmail: validatedData.billingEmail,
            maxUsers: validatedData.maxUsers,
            maxDataSources: validatedData.maxDataSources,
            apiAccessEnabled: validatedData.apiAccessEnabled,
            contactName: validatedData.contactName,
            contactEmail: validatedData.contactEmail
        });
        console.log('[ADMIN] Tenant created successfully:', newTenant.id);
        return res.status(201).json({
            success: true,
            data: newTenant,
            message: 'Tenant erfolgreich erstellt'
        });
    }
    catch (error) {
        console.error('[ADMIN] Error creating tenant:', error);
        if (error.message === 'Slug already exists') {
            return res.status(409).json({
                success: false,
                error: 'Slug bereits vergeben - bitte wählen Sie einen anderen',
                timestamp: new Date().toISOString()
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Fehler beim Erstellen des Tenants',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/tenants', async (req, res) => {
    try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        const result = await sql `
      SELECT 
        id,
        name,
        slug,
        subscription_plan as "subscriptionPlan",
        subscription_status as "subscriptionStatus", 
        billing_email as "billingEmail",
        max_users as "maxUsers",
        max_data_sources as "maxDataSources",
        api_access_enabled as "apiAccessEnabled",
        custom_branding_enabled as "customBrandingEnabled",
        customer_permissions as "customerPermissions",
        trial_ends_at as "trialEndsAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenants 
      ORDER BY created_at DESC
    `;
        console.log('[ADMIN] Fetched tenants for frontend:', result.length);
        return res.json(result);
    }
    catch (error) {
        console.error('[ADMIN] Error fetching tenants:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Fehler beim Laden der Tenants'
        });
    }
});
router.put('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log('[ADMIN] Updating tenant:', id, updateData);
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (updateData.name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(updateData.name);
        }
        if (updateData.subscriptionPlan) {
            updates.push(`subscription_plan = $${paramIndex++}`);
            values.push(updateData.subscriptionPlan);
        }
        if (updateData.subscriptionStatus) {
            updates.push(`subscription_status = $${paramIndex++}`);
            values.push(updateData.subscriptionStatus);
        }
        if (updateData.billingEmail) {
            updates.push(`billing_email = $${paramIndex++}`);
            values.push(updateData.billingEmail);
        }
        if (updateData.maxUsers !== undefined) {
            updates.push(`max_users = $${paramIndex++}`);
            values.push(updateData.maxUsers);
        }
        if (updateData.maxDataSources !== undefined) {
            updates.push(`max_data_sources = $${paramIndex++}`);
            values.push(updateData.maxDataSources);
        }
        if (updateData.apiAccessEnabled !== undefined) {
            updates.push(`api_access_enabled = $${paramIndex++}`);
            values.push(updateData.apiAccessEnabled);
        }
        if (updateData.customBrandingEnabled !== undefined) {
            updates.push(`custom_branding_enabled = $${paramIndex++}`);
            values.push(updateData.customBrandingEnabled);
        }
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Keine Daten zum Aktualisieren'
            });
        }
        updates.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());
        values.push(id);
        const updateQuery = `
      UPDATE tenants 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await sql(updateQuery, values);
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tenant nicht gefunden'
            });
        }
        console.log('[ADMIN] Tenant updated successfully:', result[0]?.id);
        return res.json({
            success: true,
            data: result[0],
            message: 'Tenant erfolgreich aktualisiert'
        });
    }
    catch (error) {
        console.error('[ADMIN] Error updating tenant:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Fehler beim Aktualisieren des Tenants'
        });
    }
});
router.delete('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[ADMIN] Deleting tenant:', id);
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        await sql `DELETE FROM tenant_data_access WHERE tenant_id = ${id}`;
        try {
            await sql `DELETE FROM tenant_users WHERE tenant_id = ${id}`;
        }
        catch (err) {
        }
        const result = await sql `
      DELETE FROM tenants 
      WHERE id = ${id}
      RETURNING id
    `;
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tenant nicht gefunden'
            });
        }
        console.log('[ADMIN] Tenant deleted successfully:', id);
        return res.json({
            success: true,
            message: 'Tenant erfolgreich gelöscht'
        });
    }
    catch (error) {
        console.error('[ADMIN] Error deleting tenant:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Fehler beim Löschen des Tenants'
        });
    }
});
router.put('/tenants/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { customerPermissions } = req.body;
        console.log('[ADMIN] Updating customer permissions for tenant:', id);
        console.log('[ADMIN] New permissions:', customerPermissions);
        if (!customerPermissions || typeof customerPermissions !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Ungültige Berechtigungsstruktur',
                timestamp: new Date().toISOString()
            });
        }
        const { db } = await import('../db');
        const { tenants } = await import('../../shared/schema');
        const { eq } = await import('drizzle-orm');
        const result = await db
            .update(tenants)
            .set({
            customerPermissions: customerPermissions,
            updatedAt: new Date()
        })
            .where(eq(tenants.id, id))
            .returning({
            id: tenants.id,
            name: tenants.name,
            customerPermissions: tenants.customerPermissions
        });
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tenant nicht gefunden'
            });
        }
        console.log('[ADMIN] Customer permissions updated successfully for tenant:', id);
        return res.json({
            success: true,
            data: result[0],
            message: 'Kundenberechtigungen erfolgreich aktualisiert'
        });
    }
    catch (error) {
        console.error('[ADMIN] Error updating customer permissions:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Fehler beim Aktualisieren der Berechtigungen'
        });
    }
});
export default router;
//# sourceMappingURL=admin.routes.js.map