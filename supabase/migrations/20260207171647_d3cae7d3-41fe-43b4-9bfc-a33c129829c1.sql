-- Add usdt_type column to payment_tickets table
ALTER TABLE public.payment_tickets 
ADD COLUMN usdt_type TEXT DEFAULT 'mixed' CHECK (usdt_type IN ('mixed', 'stock', 'game'));

-- Add usdt_rate column to store the rate at time of submission
ALTER TABLE public.payment_tickets 
ADD COLUMN usdt_rate DECIMAL(10,2);