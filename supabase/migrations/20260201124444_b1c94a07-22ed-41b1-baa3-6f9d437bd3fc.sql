-- Drop the public access policy
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

-- Create new policy for authenticated users only
CREATE POLICY "Authenticated users can view app settings" 
ON public.app_settings 
FOR SELECT 
TO authenticated
USING (true);