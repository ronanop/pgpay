-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('pending', 'approved', 'rejected', 'refunded', 'closed');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    bank_account_number TEXT,
    ifsc_code TEXT,
    bank_name TEXT,
    upi_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment_tickets table
CREATE TABLE public.payment_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    notes TEXT,
    proof_url TEXT,
    status ticket_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create app_settings table
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default app settings
INSERT INTO public.app_settings (key, value) VALUES
    ('app_name', 'PG Pay'),
    ('wallet_address', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'),
    ('primary_color', '#10B981'),
    ('logo_url', NULL);

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payment_tickets_updated_at
    BEFORE UPDATE ON public.payment_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, email, phone, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
        NEW.raw_user_meta_data->>'name'
    );
    
    -- Create user role (default: user)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- RLS Policies for payment_tickets
CREATE POLICY "Users can view their own tickets"
    ON public.payment_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
    ON public.payment_tickets FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own tickets"
    ON public.payment_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending tickets"
    ON public.payment_tickets FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all tickets"
    ON public.payment_tickets FOR UPDATE
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tickets"
    ON public.payment_tickets FOR DELETE
    USING (public.is_admin(auth.uid()));

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for app_settings
CREATE POLICY "Anyone can view app settings"
    ON public.app_settings FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage app settings"
    ON public.app_settings FOR ALL
    USING (public.is_admin(auth.uid()));

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false);

-- Storage policies for payment proofs
CREATE POLICY "Users can upload their own proofs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'payment-proofs' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own proofs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'payment-proofs' 
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR public.is_admin(auth.uid())
        )
    );

CREATE POLICY "Admins can view all proofs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'payment-proofs' 
        AND public.is_admin(auth.uid())
    );

CREATE POLICY "Admins can delete proofs"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'payment-proofs' 
        AND public.is_admin(auth.uid())
    );