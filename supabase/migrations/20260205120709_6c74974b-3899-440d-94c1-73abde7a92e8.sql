-- First drop functions that depend on the enum
DROP FUNCTION IF EXISTS public.has_admin_permission(uuid, admin_permission);

-- Drop the new enum type that was partially created from failed migration
DROP TYPE IF EXISTS public.admin_permission_new;

-- Create new enum type with granular permissions
CREATE TYPE public.admin_permission_new AS ENUM (
  -- Ticket permissions
  'view_tickets',
  'delete_tickets', 
  'process_tickets',
  -- User permissions
  'view_users',
  'delete_users',
  -- Settings permission
  'manage_settings',
  -- Admin management permission (Super Admin)
  'manage_admins'
);

-- Create temporary table to store existing permissions mapping
CREATE TEMP TABLE permission_migration AS
SELECT 
  id,
  user_id,
  granted_by,
  created_at,
  CASE permission::text
    WHEN 'manage_tickets' THEN 'view_tickets'
    WHEN 'manage_users' THEN 'view_users'
    WHEN 'manage_settings' THEN 'manage_settings'
    WHEN 'manage_admins' THEN 'manage_admins'
  END as new_permission
FROM public.admin_permissions;

-- Add additional permissions for old 'manage_tickets' -> add delete_tickets and process_tickets
INSERT INTO permission_migration (id, user_id, granted_by, created_at, new_permission)
SELECT gen_random_uuid(), user_id, granted_by, created_at, 'delete_tickets'
FROM public.admin_permissions WHERE permission::text = 'manage_tickets';

INSERT INTO permission_migration (id, user_id, granted_by, created_at, new_permission)
SELECT gen_random_uuid(), user_id, granted_by, created_at, 'process_tickets'
FROM public.admin_permissions WHERE permission::text = 'manage_tickets';

-- Add additional permissions for old 'manage_users' -> add delete_users
INSERT INTO permission_migration (id, user_id, granted_by, created_at, new_permission)
SELECT gen_random_uuid(), user_id, granted_by, created_at, 'delete_users'
FROM public.admin_permissions WHERE permission::text = 'manage_users';

-- Drop the old table (this removes dependency on old enum)
DROP TABLE public.admin_permissions;

-- Now we can drop the old enum
DROP TYPE public.admin_permission;

-- Rename new enum to the standard name
ALTER TYPE public.admin_permission_new RENAME TO admin_permission;

-- Create new table with new enum
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission admin_permission NOT NULL,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Super admins can delete permissions" 
ON public.admin_permissions 
FOR DELETE 
USING (can_manage_admins(auth.uid()));

CREATE POLICY "Super admins can insert permissions" 
ON public.admin_permissions 
FOR INSERT 
WITH CHECK (can_manage_admins(auth.uid()));

CREATE POLICY "Super admins can view all permissions" 
ON public.admin_permissions 
FOR SELECT 
USING (can_manage_admins(auth.uid()));

CREATE POLICY "Users can view their own permissions" 
ON public.admin_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Migrate data back
INSERT INTO public.admin_permissions (id, user_id, permission, granted_by, created_at)
SELECT id, user_id, new_permission::admin_permission, granted_by, created_at
FROM permission_migration
WHERE new_permission IS NOT NULL;

-- Drop temp table
DROP TABLE permission_migration;

-- Recreate has_admin_permission function
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission admin_permission)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  -- Super admins (can_manage_admins) have all permissions
  SELECT public.can_manage_admins(_user_id) OR EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id AND permission = _permission
  )
$$;