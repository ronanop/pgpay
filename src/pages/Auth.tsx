import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, Wallet, Mail, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signInWithPhone, signInWithEmail, signUp } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CountryCodeSelect, countryCodes, CountryCode } from '@/components/ui/country-code-select';
import { supabase } from '@/integrations/supabase/client';

const phoneLoginSchema = z.object({
  phone: z.string()
    .nonempty('Phone number is required')
    .regex(/^[0-9]{6,14}$/, 'Enter a valid phone number (digits only)'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters'),
});

const emailLoginSchema = z.object({
  email: z.string()
    .nonempty('Email is required')
    .email('Enter a valid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  name: z.string()
    .nonempty('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z.string()
    .nonempty('Email is required')
    .email('Enter a valid email address'),
  phone: z.string()
    .nonempty('Phone number is required')
    .regex(/^[0-9]{6,14}$/, 'Enter a valid phone number (digits only)'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;
type EmailLoginFormData = z.infer<typeof emailLoginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [countryCode, setCountryCode] = useState<CountryCode>(countryCodes[0]); // Default to India
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const phoneLoginForm = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
  });

  const emailLoginForm = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handlePhoneLogin = async (data: PhoneLoginFormData) => {
    setLoading(true);
    try {
      const fullPhone = `${countryCode.dial}${data.phone}`;
      const { error } = await signInWithPhone(fullPhone, data.password);
      if (error) {
        toast.error(error.message || 'Failed to sign in');
        return;
      }
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (data: EmailLoginFormData) => {
    setLoading(true);
    try {
      const { error } = await signInWithEmail(data.email, data.password);
      if (error) {
        // Check if error is about email not confirmed
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          setResendEmail(data.email);
          setShowResendVerification(true);
          toast.error('Please verify your email before signing in');
        } else {
          toast.error(error.message || 'Failed to sign in');
        }
        return;
      }
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setResendLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('resend-verification-email', {
        body: { email: resendEmail }
      });

      if (error) {
        toast.error(error.message || 'Failed to resend verification email');
        return;
      }

      if (data?.error) {
        if (data.rateLimited) {
          toast.error(data.error);
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success(`Verification email sent! ${data.attemptsRemaining > 0 ? `(${data.attemptsRemaining} attempts remaining)` : ''}`);
      setShowResendVerification(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setLoading(true);
    try {
      const fullPhone = `${countryCode.dial}${data.phone}`;
      const { error } = await signUp(data.email, data.password, fullPhone, data.name);
      if (error) {
        if (error.message?.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else if (error.message?.includes('duplicate key')) {
          toast.error('This phone number is already registered. Please sign in instead.');
        } else {
          toast.error(error.message || 'Failed to sign up');
        }
        return;
      }
      toast.success('Account created! Please check your email to verify your account.');
      setActiveTab('login');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
          <Wallet className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">PG Pay</h1>
        <p className="text-muted-foreground mt-1">Secure Payment Management</p>
      </div>

      {/* Auth Forms */}
      <div className="flex-1 px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {/* Login Method Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'phone'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Phone className="h-4 w-4" />
                Phone
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
            </div>

            {loginMethod === 'phone' ? (
              <form onSubmit={phoneLoginForm.handleSubmit(handlePhoneLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <CountryCodeSelect
                      value={countryCode}
                      onChange={setCountryCode}
                      disabled={loading}
                    />
                    <Input
                      id="login-phone"
                      type="tel"
                      placeholder="9876543210"
                      className="flex-1"
                      {...phoneLoginForm.register('phone')}
                    />
                  </div>
                  {phoneLoginForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {phoneLoginForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password-phone">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password-phone"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...phoneLoginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {phoneLoginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {phoneLoginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={emailLoginForm.handleSubmit(handleEmailLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    {...emailLoginForm.register('email')}
                  />
                  {emailLoginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {emailLoginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password-email">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password-email"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...emailLoginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {emailLoginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {emailLoginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Resend Verification Link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResendEmail(emailLoginForm.getValues('email') || '');
                      setShowResendVerification(true);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary underline"
                  >
                    Didn't receive verification email?
                  </button>
                </div>
              </form>
            )}

            {/* Resend Verification Modal */}
            {showResendVerification && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <RefreshCw className="h-4 w-4" />
                  Resend Verification Email
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your email to receive a new verification link. You can request up to 3 emails per 24 hours.
                </p>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleResendVerification} 
                    disabled={resendLoading || !resendEmail}
                    className="flex-1"
                  >
                    {resendLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Send Email'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowResendVerification(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  {...signupForm.register('name')}
                />
                {signupForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  {...signupForm.register('email')}
                />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone Number</Label>
                <div className="flex gap-2">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={setCountryCode}
                    disabled={loading}
                  />
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="9876543210"
                    className="flex-1"
                    {...signupForm.register('phone')}
                  />
                </div>
                {signupForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...signupForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  {...signupForm.register('confirmPassword')}
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
