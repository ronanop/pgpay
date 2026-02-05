-- Create enum for admin permissions
CREATE TYPE public.admin_permission AS ENUM (
  'manage_tickets',
  'manage_users', 
  'manage_settings',
  'manage_admins'
);

-- Create admin_permissions table for granular access control
CREATE TABLE public.admin_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission admin_permission NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only super admins (users with manage_admins permission OR original admins) can manage permissions
CREATE OR REPLACE FUNCTION public.can_manage_admins(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id AND permission = 'manage_admins'
  ) OR EXISTS (
    -- Original admins (those in user_roles with admin role who have no granted_by in admin_permissions)
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_permissions ap 
      WHERE ap.user_id = _user_id
    )
  )
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission admin_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Super admins (can_manage_admins) have all permissions
  SELECT public.can_manage_admins(_user_id) OR EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id AND permission = _permission
  )
$$;

-- RLS Policies
CREATE POLICY "Super admins can view all permissions"
ON public.admin_permissions FOR SELECT
USING (public.can_manage_admins(auth.uid()));

CREATE POLICY "Super admins can insert permissions"
ON public.admin_permissions FOR INSERT
WITH CHECK (public.can_manage_admins(auth.uid()));

CREATE POLICY "Super admins can delete permissions"
ON public.admin_permissions FOR DELETE
USING (public.can_manage_admins(auth.uid()));

CREATE POLICY "Users can view their own permissions"
ON public.admin_permissions FOR SELECT
USING (auth.uid() = user_id);