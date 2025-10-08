import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminRole() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const email = user.email ?? '';
      if (!email) {
        setIsAdmin(false);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Prefer RPC that runs as security definer to avoid RLS/type mismatches
      const { data: isSuperAdmin } = await supabase.rpc('has_role_by_email', { _email: email, _role: 'super_admin' });
      if (isSuperAdmin === true) {
        setIsAdmin(true);
        setUserRole('super_admin');
        setIsLoading(false);
        return;
      }

      const { data: isAdminRole } = await supabase.rpc('has_role_by_email', { _email: email, _role: 'admin' });
      if (isAdminRole === true) {
        setIsAdmin(true);
        setUserRole('admin');
        setIsLoading(false);
        return;
      }

      const { data: isModerator } = await supabase.rpc('has_role_by_email', { _email: email, _role: 'moderator' });
      if (isModerator === true) {
        setIsAdmin(true);
        setUserRole('moderator');
        setIsLoading(false);
        return;
      }

      // Fallback to direct table query if RPC fails to confirm
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roles && roles.length > 0) {
        const hasAdminRole = roles.some(r => ['admin', 'super_admin', 'moderator'].includes((r as any).role));
        setIsAdmin(hasAdminRole);

        if (roles.some(r => (r as any).role === 'super_admin')) {
          setUserRole('super_admin');
        } else if (roles.some(r => (r as any).role === 'admin')) {
          setUserRole('admin');
        } else if (roles.some(r => (r as any).role === 'moderator')) {
          setUserRole('moderator');
        } else {
          setUserRole('user');
        }
      } else {
        setIsAdmin(false);
        setUserRole('user');
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, isLoading, userRole };
}
