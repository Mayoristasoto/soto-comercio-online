/**
 * Authentication Security Utilities
 * 
 * IMPORTANT SECURITY NOTE:
 * ======================
 * This file contains utilities for CLIENT-SIDE UI/UX purposes ONLY.
 * 
 * Client-side role checks (checking userInfo.rol) are ONLY for:
 * - Showing/hiding UI elements
 * - Navigation and routing
 * - User experience optimization
 * 
 * Client-side checks DO NOT provide security enforcement because:
 * - Users can manipulate browser state via DevTools
 * - JavaScript can be modified before execution
 * - Client code runs in an untrusted environment
 * 
 * ACTUAL SECURITY is enforced by:
 * - Row-Level Security (RLS) policies on database tables
 * - Database functions like current_user_is_admin(), is_admin(), etc.
 * - Edge function JWT verification
 * - Server-side authorization checks
 * 
 * If you're adding sensitive operations, ensure they:
 * 1. Have proper RLS policies on the database tables
 * 2. Use SECURITY DEFINER functions with role validation
 * 3. Verify permissions server-side, never trust client claims
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * UI-ONLY: Check if user appears to have admin role
 * @param userRole - The role from client state (userInfo.rol)
 * @returns boolean - For UI rendering only, NOT security enforcement
 * 
 * WARNING: This check is cosmetic only. Never use for sensitive operations.
 */
export const isAdminRole = (userRole: string | undefined): boolean => {
  return userRole === 'admin_rrhh';
};

/**
 * UI-ONLY: Check if user appears to have manager role
 * @param userRole - The role from client state
 * @returns boolean - For UI rendering only
 */
export const isManagerRole = (userRole: string | undefined): boolean => {
  return userRole === 'gerente_sucursal';
};

/**
 * UI-ONLY: Get display name for role
 * @param userRole - The role from client state
 * @returns string - Localized role name for display
 */
export const getRoleDisplayName = (userRole: string | undefined): string => {
  switch (userRole) {
    case 'admin_rrhh':
      return 'Admin RRHH';
    case 'gerente_sucursal':
      return 'Gerente de Sucursal';
    case 'lider_grupo':
      return 'Líder de Grupo';
    case 'empleado':
      return 'Empleado';
    default:
      return 'Usuario';
  }
};

/**
 * SERVER-SIDE VALIDATION: Verify admin role via secure RPC
 * Use this when you need actual security enforcement
 * @returns Promise<boolean> - True if user has admin role (server-verified)
 */
export const verifyAdminRoleSecure = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('current_user_is_admin');
    if (error) {
      console.error('Error verifying admin role:', error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error('Exception verifying admin role:', error);
    return false;
  }
};

/**
 * Rate limiting utility for client-side operations
 * Provides basic protection against rapid repeated calls
 * NOTE: This is NOT security - servers must implement their own rate limiting
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  /**
   * Check if action is rate limited
   * @param key - Unique identifier for the action
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns boolean - True if action is allowed
   */
  checkLimit(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();
