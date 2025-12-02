import { supabase } from './supabase';

export type LicenseTier = 'read_only' | 'team_member' | 'full_license';
export type ModuleKey = 'base' | 'skills' | 'benefits';

interface UserLicense {
  license_tier: LicenseTier;
  is_active: boolean;
  organization_id: string;
}

interface OrganizationModule {
  module_key: ModuleKey;
  is_active: boolean;
}

interface Permission {
  permission_key: string;
  can_execute: boolean;
}

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

class PermissionService {
  private userLicenseCache: Map<string, UserLicense> = new Map();
  private orgModulesCache: Map<string, OrganizationModule[]> = new Map();
  private permissionsCache: Map<string, Permission[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) return false;
    return Date.now() < expiry;
  }

  private setCacheExpiry(key: string): void {
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  async getUserLicenseTier(userEmail: string): Promise<LicenseTier> {
    const cacheKey = `user_${userEmail}`;

    if (this.isCacheValid(cacheKey) && this.userLicenseCache.has(cacheKey)) {
      const cached = this.userLicenseCache.get(cacheKey);
      return cached!.license_tier;
    }

    try {
      const { data, error } = await supabase
        .from('user_licenses')
        .select('license_tier, is_active, organization_id')
        .eq('user_email', userEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user license:', error);
        return 'full_license'; // Default to full license for backward compatibility
      }

      if (data) {
        this.userLicenseCache.set(cacheKey, data);
        this.setCacheExpiry(cacheKey);
        return data.license_tier as LicenseTier;
      }

      return 'full_license'; // Default for users without license record
    } catch (err) {
      console.error('Error in getUserLicenseTier:', err);
      return 'full_license';
    }
  }

  async getOrganizationId(userEmail: string): Promise<string> {
    const cacheKey = `user_${userEmail}`;

    if (this.isCacheValid(cacheKey) && this.userLicenseCache.has(cacheKey)) {
      const cached = this.userLicenseCache.get(cacheKey);
      return cached!.organization_id;
    }

    try {
      const { data, error } = await supabase
        .from('user_licenses')
        .select('organization_id')
        .eq('user_email', userEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        return DEFAULT_ORG_ID;
      }

      return data.organization_id;
    } catch (err) {
      console.error('Error in getOrganizationId:', err);
      return DEFAULT_ORG_ID;
    }
  }

  async hasModuleAccess(organizationId: string, moduleKey: ModuleKey): Promise<boolean> {
    if (moduleKey === 'base') return true; // Base is always available

    const cacheKey = `org_${organizationId}`;

    let modules: OrganizationModule[];

    if (this.isCacheValid(cacheKey) && this.orgModulesCache.has(cacheKey)) {
      modules = this.orgModulesCache.get(cacheKey)!;
    } else {
      try {
        const { data, error } = await supabase
          .from('organization_modules')
          .select('module_key, is_active')
          .eq('organization_id', organizationId);

        if (error) {
          console.error('Error fetching organization modules:', error);
          return true; // Default to allowing access for backward compatibility
        }

        modules = data || [];
        this.orgModulesCache.set(cacheKey, modules);
        this.setCacheExpiry(cacheKey);
      } catch (err) {
        console.error('Error in hasModuleAccess:', err);
        return true;
      }
    }

    const module = modules.find(m => m.module_key === moduleKey);
    return module ? module.is_active : false;
  }

  async canPerformAction(userEmail: string, permissionKey: string): Promise<boolean> {
    const licenseTier = await this.getUserLicenseTier(userEmail);
    const cacheKey = `perms_${licenseTier}`;

    let permissions: Permission[];

    if (this.isCacheValid(cacheKey) && this.permissionsCache.has(cacheKey)) {
      permissions = this.permissionsCache.get(cacheKey)!;
    } else {
      try {
        const { data, error } = await supabase
          .from('license_tier_permissions')
          .select('permission_key, can_execute')
          .eq('license_tier', licenseTier);

        if (error) {
          console.error('Error fetching permissions:', error);
          return true; // Default to allowing for backward compatibility
        }

        permissions = data || [];
        this.permissionsCache.set(cacheKey, permissions);
        this.setCacheExpiry(cacheKey);
      } catch (err) {
        console.error('Error in canPerformAction:', err);
        return true;
      }
    }

    const permission = permissions.find(p => p.permission_key === permissionKey);
    return permission ? permission.can_execute : false;
  }

  async getAvailableModules(organizationId: string): Promise<ModuleKey[]> {
    const cacheKey = `org_${organizationId}`;

    let modules: OrganizationModule[];

    if (this.isCacheValid(cacheKey) && this.orgModulesCache.has(cacheKey)) {
      modules = this.orgModulesCache.get(cacheKey)!;
    } else {
      try {
        const { data, error } = await supabase
          .from('organization_modules')
          .select('module_key, is_active')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching available modules:', error);
          return ['base', 'skills', 'benefits']; // Default to all for backward compatibility
        }

        modules = data || [];
        this.orgModulesCache.set(cacheKey, modules);
        this.setCacheExpiry(cacheKey);
      } catch (err) {
        console.error('Error in getAvailableModules:', err);
        return ['base', 'skills', 'benefits'];
      }
    }

    return modules.filter(m => m.is_active).map(m => m.module_key as ModuleKey);
  }

  clearCache(userEmail?: string): void {
    if (userEmail) {
      const cacheKey = `user_${userEmail}`;
      this.userLicenseCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    } else {
      this.userLicenseCache.clear();
      this.orgModulesCache.clear();
      this.permissionsCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

export const permissionService = new PermissionService();
