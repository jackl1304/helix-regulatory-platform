import { db } from "../db";
import { tenants, tenantUsers, tenantDashboards, tenantDataAccess, tenantInvitations } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { InsertTenant, Tenant, InsertTenantUser, TenantUser } from "@shared/schema";

export class TenantService {
  // Get all tenants with user counts
  static async getAllTenants() {
    const tenantsWithCounts = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        subscriptionPlan: tenants.subscriptionPlan,
        subscriptionStatus: tenants.subscriptionStatus,
        billingEmail: tenants.billingEmail,
        maxUsers: tenants.maxUsers,
        maxDataSources: tenants.maxDataSources,
        apiAccessEnabled: tenants.apiAccessEnabled,
        customBrandingEnabled: tenants.customBrandingEnabled,
        trialEndsAt: tenants.trialEndsAt,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt
      })
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    // Manually get counts for each tenant
    const tenantsWithCountsResult = await Promise.all(
      tenantsWithCounts.map(async (tenant) => {
        const [userCount, dashboardCount] = await Promise.all([
          db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenant.id)),
          db.select().from(tenantDashboards).where(eq(tenantDashboards.tenantId, tenant.id))
        ]);

        return {
          ...tenant,
          _count: {
            tenantUsers: userCount.length,
            dashboards: dashboardCount.length
          }
        };
      })
    );

    return tenantsWithCountsResult;
  }

  // Get tenant by ID
  static async getTenantById(id: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant;
  }

  // Get tenant by slug
  static async getTenantBySlug(slug: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    return tenant;
  }

  // Create new tenant
  static async createTenant(data: InsertTenant & { contactEmail?: string; contactName?: string }) {
    // Check if slug is unique
    const existingTenant = await this.getTenantBySlug(data.slug);
    if (existingTenant) {
      throw new Error('Slug already exists');
    }

    // Set trial end date (30 days from now)
    if (!data.trialEndsAt && data.subscriptionStatus === 'trial') {
      data.trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const [tenant] = await db
      .insert(tenants)
      .values(data)
      .returning();

    if (!tenant) {
      throw new Error('Failed to create tenant');
    }

    // Create default data access permissions
    await db.insert(tenantDataAccess).values({
      tenantId: tenant.id,
      dataSourceId: 'default',
      allowedRegions: ['US', 'EU'],
      monthlyLimit: data.subscriptionPlan === 'starter' ? 500 : 
                   data.subscriptionPlan === 'professional' ? 2500 : 999999
    });

    // Send welcome email if contact email is provided
    if (data.contactEmail) {
      try {
        const { emailService } = await import('./emailService');
        const customerName = data.contactName || tenant.name;
        const subscriptionPlan = tenant.subscriptionPlan || 'Professional';
        // Determine correct frontend URL
        const baseUrl = process.env.FRONTEND_URL || 
                       process.env.REPLIT_DEV_DOMAIN ||
                       'https://helix.replit.app';
        const loginUrl = `${baseUrl}/customer-dashboard`;
        
        const emailContent = emailService.generateCustomerOnboardingEmail(
          customerName,
          subscriptionPlan,
          loginUrl
        );
        
        const emailSent = await emailService.sendEmail(
          data.contactEmail,
          emailContent.subject,
          emailContent.html
        );

        if (emailSent) {
          console.log(`[TENANT] Welcome email sent to ${data.contactEmail} for tenant ${tenant.id}`);
        } else {
          console.warn(`[TENANT] Failed to send welcome email to ${data.contactEmail} for tenant ${tenant.id}`);
        }
      } catch (emailError) {
        console.error(`[TENANT] Error sending welcome email for tenant ${tenant.id}:`, emailError);
        // Don't fail tenant creation if email fails
      }
    }

    return tenant;
  }

  // Update tenant
  static async updateTenant(id: string, data: Partial<InsertTenant>) {
    const [tenant] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant;
  }

  // Delete tenant
  static async deleteTenant(id: string) {
    // First, delete all related data
    await Promise.all([
      db.delete(tenantUsers).where(eq(tenantUsers.tenantId, id)),
      db.delete(tenantDashboards).where(eq(tenantDashboards.tenantId, id)),
      db.delete(tenantDataAccess).where(eq(tenantDataAccess.tenantId, id)),
      db.delete(tenantInvitations).where(eq(tenantInvitations.tenantId, id))
    ]);

    // Then delete the tenant
    const [deletedTenant] = await db
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning();

    if (!deletedTenant) {
      throw new Error('Tenant not found');
    }

    return { success: true };
  }

  // Get tenant users
  static async getTenantUsers(tenantId: string) {
    return await db
      .select({
        id: tenantUsers.id,
        tenantId: tenantUsers.tenantId,
        userId: tenantUsers.userId,
        role: tenantUsers.role,
        permissions: tenantUsers.permissions,
        dashboardConfig: tenantUsers.dashboardConfig,
        isActive: tenantUsers.isActive,
        invitedAt: tenantUsers.invitedAt,
        joinedAt: tenantUsers.joinedAt,
        createdAt: tenantUsers.createdAt
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId))
      .orderBy(desc(tenantUsers.createdAt));
  }

  // Add user to tenant
  static async addUserToTenant(data: InsertTenantUser) {
    const [tenantUser] = await db
      .insert(tenantUsers)
      .values(data)
      .returning();

    return tenantUser;
  }

  // Update tenant user
  static async updateTenantUser(id: string, data: Partial<InsertTenantUser>) {
    const [tenantUser] = await db
      .update(tenantUsers)
      .set(data)
      .where(eq(tenantUsers.id, id))
      .returning();

    if (!tenantUser) {
      throw new Error('Tenant user not found');
    }

    return tenantUser;
  }

  // Remove user from tenant
  static async removeUserFromTenant(tenantId: string, userId: string) {
    const [deletedUser] = await db
      .delete(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
      .returning();

    if (!deletedUser) {
      throw new Error('Tenant user not found');
    }

    return { success: true };
  }

  // Get tenant statistics
  static async getTenantStats() {
    const allTenants = await db.select().from(tenants);
    
    const stats = {
      totalTenants: allTenants.length,
      activeTenants: allTenants.filter(t => t.subscriptionStatus === 'active').length,
      trialTenants: allTenants.filter(t => t.subscriptionStatus === 'trial').length,
      suspendedTenants: allTenants.filter(t => t.subscriptionStatus === 'suspended').length,
      planDistribution: {
        starter: allTenants.filter(t => t.subscriptionPlan === 'starter').length,
        professional: allTenants.filter(t => t.subscriptionPlan === 'professional').length,
        enterprise: allTenants.filter(t => t.subscriptionPlan === 'enterprise').length
      }
    };

    return stats;
  }

  // Check tenant limits and usage
  static async checkTenantLimits(tenantId: string) {
    const tenant = await this.getTenantById(tenantId);
    const users = await this.getTenantUsers(tenantId);
    
    const [dataAccess] = await db
      .select()
      .from(tenantDataAccess)
      .where(eq(tenantDataAccess.tenantId, tenantId))
      .limit(1);

    return {
      users: {
        current: users.length,
        max: tenant.maxUsers || 0,
        available: (tenant.maxUsers || 0) - users.length
      },
      dataAccess: {
        currentUsage: dataAccess?.currentUsage || 0,
        monthlyLimit: dataAccess?.monthlyLimit || 500,
        remaining: (dataAccess?.monthlyLimit || 500) - (dataAccess?.currentUsage || 0)
      },
      features: {
        apiAccess: tenant.apiAccessEnabled,
        customBranding: tenant.customBrandingEnabled
      }
    };
  }

  // Customer Self-Administration Methods
  static async getCustomerDashboard(tenantId: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error('Tenant not found');

    const tenantUsersData = await this.getTenantUsers(tenantId);
    const limits = this.getSubscriptionLimits(tenant.subscriptionPlan);
    const currentUsage = Math.floor(Math.random() * limits.monthlyUpdates);

    return {
      tenant,
      usage: {
        currentMonth: currentUsage,
        limit: limits.monthlyUpdates,
        users: tenantUsersData.length,
        userLimit: limits.maxUsers
      },
      dashboard: {
        regulatoryUpdates: {
          total: currentUsage,
          thisMonth: Math.floor(currentUsage * 0.3),
          critical: Math.floor(currentUsage * 0.1),
          regions: {
            US: Math.floor(currentUsage * 0.4),
            EU: Math.floor(currentUsage * 0.35),
            Asia: Math.floor(currentUsage * 0.25)
          }
        },
        compliance: {
          score: 85 + Math.floor(Math.random() * 15),
          alerts: Math.floor(Math.random() * 5),
          upcoming: Math.floor(Math.random() * 10),
          resolved: Math.floor(currentUsage * 0.8)
        },
        analytics: {
          riskTrend: 'decreasing',
          engagement: 85 + Math.floor(Math.random() * 15),
          efficiency: 88 + Math.floor(Math.random() * 12)
        }
      }
    };
  }

  static async getTenantSubscription(tenantId: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error('Subscription not found');

    const limits = this.getSubscriptionLimits(tenant.subscriptionPlan);
    const currentUsage = Math.floor(Math.random() * limits.monthlyUpdates);

    return {
      plan: tenant.subscriptionPlan,
      status: tenant.subscriptionStatus,
      limits,
      currentUsage,
      usage: {
        dataAccess: {
          current: currentUsage,
          limit: limits.monthlyUpdates,
          percentage: Math.round((currentUsage / limits.monthlyUpdates) * 100)
        },
        users: {
          current: Math.floor(Math.random() * limits.maxUsers),
          limit: limits.maxUsers
        }
      }
    };
  }

  static async updateTenantSettings(tenantId: string, settings: any) {
    const updatedTenant = await db
      .update(tenants)
      .set({
        settings: { ...settings },
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    if (updatedTenant.length === 0) {
      throw new Error('Tenant not found');
    }

    return updatedTenant[0];
  }

  static async getTenantUsage(tenantId: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error('Tenant not found');

    const limits = this.getSubscriptionLimits(tenant.subscriptionPlan);

    return {
      currentPeriod: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        dataRequests: Math.floor(Math.random() * limits.monthlyUpdates),
        apiCalls: Math.floor(Math.random() * 1000),
        users: Math.floor(Math.random() * limits.maxUsers)
      },
      limits,
      history: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(new Date().getFullYear(), new Date().getMonth() - i, 1),
        dataRequests: Math.floor(Math.random() * limits.monthlyUpdates),
        apiCalls: Math.floor(Math.random() * 1000)
      }))
    };
  }

  static async getTenantFilteredData(tenantId: string, filters: {
    region?: string;
    category?: string;
    limit?: number;
  }) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error('Tenant not found');

    // Mock filtered data - replace with actual regulatory data queries
    const mockData = {
      regulatory_updates: Array.from({ length: Math.min(filters.limit || 50, 100) }, (_, i) => ({
        id: `update_${tenantId}_${i}`,
        title: `Regulatory Update ${i + 1} for ${tenant.name}`,
        region: filters.region || ['US', 'EU', 'Asia'][Math.floor(Math.random() * 3)],
        category: filters.category || ['approvals', 'guidance', 'recalls'][Math.floor(Math.random() * 3)],
        date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
      })),
      total: Math.floor(Math.random() * 1000),
      filtered: filters.limit || 50
    };

    return mockData;
  }

  private static getSubscriptionLimits(plan: string) {
    switch (plan) {
      case 'starter':
        return { monthlyUpdates: 500, maxUsers: 5, features: ['basic_dashboard', 'email_support'] };
      case 'professional':
        return { monthlyUpdates: 2500, maxUsers: 25, features: ['ai_insights', 'priority_support', 'custom_dashboards', 'api_access'] };
      case 'enterprise':
        return { monthlyUpdates: -1, maxUsers: -1, features: ['unlimited', 'white_label', 'dedicated_manager', 'custom_integrations'] };
      default:
        return { monthlyUpdates: 500, maxUsers: 5, features: ['basic'] };
    }
  }
}