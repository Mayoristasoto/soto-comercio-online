-- Add rate limiting table for facial authentication attempts
-- This tracks failed authentication attempts for security monitoring

CREATE TABLE IF NOT EXISTS public.facial_auth_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on rate limit table
ALTER TABLE public.facial_auth_rate_limit ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit data
CREATE POLICY "Admins can view rate limit data"
ON public.facial_auth_rate_limit
FOR SELECT
TO authenticated
USING (current_user_is_admin());

-- Create index for efficient IP lookups
CREATE INDEX IF NOT EXISTS idx_facial_auth_rate_limit_ip 
ON public.facial_auth_rate_limit(ip_address, window_start DESC);

-- Create index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_facial_auth_rate_limit_created 
ON public.facial_auth_rate_limit(created_at);

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_facial_auth_rate_limit(
  p_ip_address INET,
  p_max_attempts INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 5,
  p_block_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(
  allowed BOOLEAN,
  attempts_remaining INTEGER,
  blocked_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  v_window_start := v_now - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if IP is currently blocked
  SELECT * INTO v_record
  FROM facial_auth_rate_limit
  WHERE ip_address = p_ip_address
    AND blocked_until IS NOT NULL
    AND blocked_until > v_now
  ORDER BY blocked_until DESC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 0, v_record.blocked_until;
    RETURN;
  END IF;
  
  -- Get or create rate limit record for current window
  SELECT * INTO v_record
  FROM facial_auth_rate_limit
  WHERE ip_address = p_ip_address
    AND window_start > v_window_start
  ORDER BY window_start DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Create new window
    INSERT INTO facial_auth_rate_limit (ip_address, attempt_count, window_start, last_attempt)
    VALUES (p_ip_address, 1, v_now, v_now)
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT TRUE, p_max_attempts - 1, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Update existing record
  IF v_record.attempt_count >= p_max_attempts THEN
    -- Block the IP
    UPDATE facial_auth_rate_limit
    SET blocked_until = v_now + (p_block_minutes || ' minutes')::INTERVAL,
        last_attempt = v_now,
        attempt_count = attempt_count + 1
    WHERE id = v_record.id
    RETURNING blocked_until INTO v_record.blocked_until;
    
    RETURN QUERY SELECT FALSE, 0, v_record.blocked_until;
  ELSE
    -- Increment attempt count
    UPDATE facial_auth_rate_limit
    SET attempt_count = attempt_count + 1,
        last_attempt = v_now
    WHERE id = v_record.id
    RETURNING attempt_count INTO v_record.attempt_count;
    
    RETURN QUERY SELECT TRUE, p_max_attempts - v_record.attempt_count, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_facial_auth_rate_limit IS 
'Rate limiting for facial authentication attempts. Blocks IPs after too many attempts within time window.';

-- Function to reset rate limit for an IP (admin use)
CREATE OR REPLACE FUNCTION public.reset_facial_auth_rate_limit(p_ip_address INET)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can reset rate limits';
  END IF;
  
  DELETE FROM facial_auth_rate_limit WHERE ip_address = p_ip_address;
END;
$$;

-- Cleanup function for old rate limit records (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM facial_auth_rate_limit
  WHERE created_at < now() - INTERVAL '7 days'
    AND (blocked_until IS NULL OR blocked_until < now());
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;