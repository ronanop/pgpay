import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, LogOut, Save, User, Building, CreditCard } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, updateProfile, signOut } from '@/lib/auth';
import { Profile as ProfileType } from '@/types/database';
import { toast } from 'sonner';

const profileSchema = z.object({
  name: z.string().max(50, 'Name must be less than 50 characters').optional(),
  bank_account_number: z.string().max(30, 'Account number too long').optional(),
  ifsc_code: z.string().max(20, 'IFSC code too long').optional(),
  bank_name: z.string().max(50, 'Bank name too long').optional(),
  upi_id: z.string().max(50, 'UPI ID too long').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await getProfile(user.id);
      if (error) throw error;
      
      setProfile(data);
      reset({
        name: data?.name || '',
        bank_account_number: data?.bank_account_number || '',
        ifsc_code: data?.ifsc_code || '',
        bank_name: data?.bank_name || '',
        upi_id: data?.upi_id || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await updateProfile(user.id, {
        name: data.name || undefined,
        bank_account_number: data.bank_account_number || undefined,
        ifsc_code: data.ifsc_code || undefined,
        bank_name: data.bank_name || undefined,
        upi_id: data.upi_id || undefined,
      });

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info Card */}
        <div className="mobile-card">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{profile?.name || 'User'}</p>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
              <p className="text-sm text-muted-foreground">{profile?.phone}</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Personal Information</h2>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Bank Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Bank Details</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Store your bank details for receiving refunds
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  placeholder="e.g., State Bank of India"
                  {...register('bank_name')}
                />
                {errors.bank_name && (
                  <p className="text-sm text-destructive">{errors.bank_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  placeholder="Your account number"
                  {...register('bank_account_number')}
                />
                {errors.bank_account_number && (
                  <p className="text-sm text-destructive">{errors.bank_account_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  placeholder="e.g., SBIN0001234"
                  {...register('ifsc_code')}
                />
                {errors.ifsc_code && (
                  <p className="text-sm text-destructive">{errors.ifsc_code.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* UPI Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">UPI Details</h2>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                placeholder="yourname@upi"
                {...register('upi_id')}
              />
              {errors.upi_id && (
                <p className="text-sm text-destructive">{errors.upi_id.message}</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <Button 
            type="submit" 
            className="w-full h-12" 
            disabled={!isDirty || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
