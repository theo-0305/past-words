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

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roles && roles.length > 0) {
        const hasAdminRole = roles.some(r => 
          ['admin', 'super_admin', 'moderator'].includes(r.role)
        );
        setIsAdmin(hasAdminRole);
        
        // Get highest role
        if (roles.some(r => r.role === 'super_admin')) {
          setUserRole('super_admin');
        } else if (roles.some(r => r.role === 'admin')) {
          setUserRole('admin');
        } else if (roles.some(r => r.role === 'moderator')) {
          setUserRole('moderator');
        } else {
          setUserRole('user');
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, isLoading, userRole };
}
