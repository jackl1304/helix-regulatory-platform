import express from 'express';
import { neon } from "@neondatabase/serverless";
const router = express.Router();
const sql = neon(process.env.DATABASE_URL);
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const tenantSubdomain = req.headers['x-tenant-subdomain'];
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email und Passwort sind erforderlich'
            });
        }
        const tenant = {
            id: '2d224347-b96e-4b61-acac-dbd414a0e048',
            name: 'Demo Medical Corp',
            subdomain: 'demo-medical',
            subscription_tier: 'professional'
        };
        const userResult = await sql `
      SELECT id, email, name, role, created_at
      FROM users 
      WHERE email = ${email}
    `;
        const user = userResult[0];
        if (!user) {
            return res.status(401).json({
                error: 'Ungültige Anmeldedaten'
            });
        }
        const validPassword = password === 'demo123';
        if (!validPassword) {
            return res.status(401).json({
                error: 'Ungültige Anmeldedaten'
            });
        }
        try {
            await sql `
        UPDATE users 
        SET updated_at = NOW() 
        WHERE id = ${user.id}
      `;
        }
        catch (error) {
            console.log('[AUTH] Update user login time skipped:', error.message);
        }
        const sessionUser = {
            id: user.id,
            tenantId: tenant.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        if (req.session) {
            req.session.user = sessionUser;
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                subdomain: tenant.subdomain,
                colorScheme: 'blue',
                subscriptionTier: tenant.subscription_tier
            }
        });
    }
    catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({
            error: 'Anmeldung fehlgeschlagen',
            message: 'Bitte versuchen Sie es erneut oder kontaktieren Sie den Support'
        });
    }
});
router.post('/logout', async (req, res) => {
    try {
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('[AUTH] Logout error:', err);
                    return res.status(500).json({ error: 'Abmeldung fehlgeschlagen' });
                }
                res.json({ success: true, message: 'Erfolgreich abgemeldet' });
            });
        }
        else {
            res.json({ success: true, message: 'Bereits abgemeldet' });
        }
    }
    catch (error) {
        console.error('[AUTH] Logout error:', error);
        res.status(500).json({ error: 'Abmeldung fehlgeschlagen' });
    }
});
router.get('/profile', async (req, res) => {
    try {
        if (!req.user || !req.tenant) {
            return res.status(401).json({ error: 'Nicht angemeldet' });
        }
        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role
            },
            tenant: {
                id: req.tenant.id,
                name: req.tenant.name,
                subdomain: req.tenant.subdomain,
                colorScheme: req.tenant.colorScheme,
                subscriptionTier: req.tenant.subscriptionTier
            }
        });
    }
    catch (error) {
        console.error('[AUTH] Profile error:', error);
        res.status(500).json({ error: 'Profil konnte nicht geladen werden' });
    }
});
export default router;
//# sourceMappingURL=auth-routes.js.map