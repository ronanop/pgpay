-- Create table to track email verification rate limits by IP
CREATE TABLE public.email_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    email TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(ip_address, email)
);

-- Enable RLS
ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow edge functions (service role) to manage this table
-- No direct user access
CREATE POLICY "Service role only"
ON public.email_rate_limits
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_email_rate_limits_ip_email ON public.email_rate_limits(ip_address, email);
CREATE INDEX idx_email_rate_limits_cleanup ON public.email_rate_limits(first_attempt_at);