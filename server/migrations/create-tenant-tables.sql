-- Multi-Tenant System Migration
-- This migration adds tenant isolation to the Helix platform

-- Create user_role enum
CREATE TYPE user_role AS ENUM ('tenant_admin', 'tenant_user', 'super_admin');

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  subdomain VARCHAR UNIQUE NOT NULL,
  custom_domain VARCHAR,
  logo VARCHAR,
  color_scheme VARCHAR DEFAULT 'blue',
  settings JSONB,
  subscription_tier VARCHAR DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for tenants
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- Add tenant_id to existing tables (NON-DESTRUCTIVE)
-- Note: These columns will be nullable initially for existing data

-- Add tenant_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'tenant_user';

-- Add tenant_id to regulatory_updates table  
ALTER TABLE regulatory_updates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to legal_cases table
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE;

-- Create new indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_updates_tenant ON regulatory_updates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_tenant ON legal_cases(tenant_id);

-- Insert demo tenants for testing
INSERT INTO tenants (name, subdomain, color_scheme, subscription_tier) VALUES
  ('Demo Medical Corp', 'demo-medical', 'blue', 'premium'),
  ('TechHealth Solutions', 'techhealth', 'purple', 'enterprise'),
  ('RegulaTech GmbH', 'regulatech', 'green', 'standard')
ON CONFLICT (subdomain) DO NOTHING;

-- Create a super admin user (no tenant)
INSERT INTO users (email, name, role, password_hash, is_active) VALUES
  ('admin@helix.local', 'System Administrator', 'super_admin', '$2b$10$example.hash.here', true)
ON CONFLICT (email) DO NOTHING;

-- Create demo tenant users
DO $$
DECLARE
    demo_tenant_id VARCHAR;
    tech_tenant_id VARCHAR;
    regula_tenant_id VARCHAR;
BEGIN
    -- Get tenant IDs
    SELECT id INTO demo_tenant_id FROM tenants WHERE subdomain = 'demo-medical';
    SELECT id INTO tech_tenant_id FROM tenants WHERE subdomain = 'techhealth';
    SELECT id INTO regula_tenant_id FROM tenants WHERE subdomain = 'regulatech';
    
    -- Insert demo users
    INSERT INTO users (tenant_id, email, name, role, password_hash, is_active) VALUES
      (demo_tenant_id, 'admin@demo-medical.helix.local', 'Demo Admin', 'tenant_admin', '$2b$10$example.hash.here', true),
      (demo_tenant_id, 'user@demo-medical.helix.local', 'Demo User', 'tenant_user', '$2b$10$example.hash.here', true),
      (tech_tenant_id, 'admin@techhealth.helix.local', 'TechHealth Admin', 'tenant_admin', '$2b$10$example.hash.here', true),
      (regula_tenant_id, 'admin@regulatech.helix.local', 'RegulaTech Admin', 'tenant_admin', '$2b$10$example.hash.here', true)
    ON CONFLICT (email) DO NOTHING;
END $$;

-- Update existing data to assign to demo tenant (OPTIONAL)
-- This is safe as it only affects existing demo data
DO $$
DECLARE
    demo_tenant_id VARCHAR;
BEGIN
    SELECT id INTO demo_tenant_id FROM tenants WHERE subdomain = 'demo-medical';
    
    -- Assign existing regulatory updates to demo tenant
    UPDATE regulatory_updates 
    SET tenant_id = demo_tenant_id 
    WHERE tenant_id IS NULL;
    
    -- Assign existing legal cases to demo tenant
    UPDATE legal_cases 
    SET tenant_id = demo_tenant_id 
    WHERE tenant_id IS NULL;
    
    -- Assign existing users to demo tenant (except super_admin)
    UPDATE users 
    SET tenant_id = demo_tenant_id 
    WHERE tenant_id IS NULL AND role != 'super_admin';
END $$;