-- Add insert policy for rate limiting table (system use only)
-- This allows the check_facial_auth_rate_limit function to create records

CREATE POLICY "System can insert rate limit records"
ON public.facial_auth_rate_limit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add update policy for rate limiting (system use only)
CREATE POLICY "System can update rate limit records"
ON public.facial_auth_rate_limit
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add delete policy for admin cleanup
CREATE POLICY "Admins can delete rate limit records"
ON public.facial_auth_rate_limit
FOR DELETE
TO authenticated
USING (current_user_is_admin());