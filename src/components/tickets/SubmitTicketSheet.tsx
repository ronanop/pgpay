import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Loader2, X, Image as ImageIcon, Shuffle, BarChart3, Gamepad2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UsdtType } from '@/types/database';
// Compress image using Canvas API
const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
const ticketSchema = z.object({
  amount: z.string()
    .nonempty('Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be a positive number',
    }),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface SubmitTicketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const USDT_TYPE_CONFIG = [
  { type: 'mixed' as UsdtType, label: 'Mixed', icon: Shuffle, colorClass: 'border-primary bg-primary/10 text-primary', rateKey: 'usdt_rate_mixed' },
  { type: 'stock' as UsdtType, label: 'Stock', icon: BarChart3, colorClass: 'border-blue-500 bg-blue-500/10 text-blue-500', rateKey: 'usdt_rate_stock' },
  { type: 'game' as UsdtType, label: 'Game', icon: Gamepad2, colorClass: 'border-amber-500 bg-amber-500/10 text-amber-500', rateKey: 'usdt_rate_game' },
];

export function SubmitTicketSheet({ open, onOpenChange, onSuccess }: SubmitTicketSheetProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<UsdtType>('mixed');
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loadingRates, setLoadingRates] = useState(true);

  // Fetch USDT rates
  useEffect(() => {
    if (open) {
      fetchRates();
    }
  }, [open]);

  const fetchRates = async () => {
    try {
      setLoadingRates(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['usdt_rate_mixed', 'usdt_rate_stock', 'usdt_rate_game']);

      if (error) throw error;

      const ratesMap: Record<string, string> = {};
      data?.forEach((s) => {
        ratesMap[s.key] = s.value || '—';
      });
      setRates(ratesMap);
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoadingRates(false);
    }
  };

  const getCurrentRate = (): number | null => {
    const config = USDT_TYPE_CONFIG.find(c => c.type === selectedType);
    if (!config) return null;
    const rateStr = rates[config.rateKey];
    const rate = parseFloat(rateStr);
    return isNaN(rate) ? null : rate;
  };

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const removeProof = () => {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofFile(null);
    setProofPreview(null);
  };

  const onSubmit = async (data: TicketFormData) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!proofFile) {
      toast.error('Please upload a payment screenshot');
      return;
    }

    setSubmitting(true);

    try {
      setUploading(true);
      
      // Compress image before upload (max 1200px, 70% quality)
      const compressedBlob = await compressImage(proofFile, 1200, 1200, 0.7);
      const fileName = `${user.id}/${Date.now()}.jpg`; // Always save as jpg after compression
      
      console.log(`Original: ${(proofFile.size / 1024).toFixed(1)}KB → Compressed: ${(compressedBlob.size / 1024).toFixed(1)}KB`);

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;
      setUploading(false);

      // Store the file path (not public URL) since bucket is private
      // Admin will generate signed URLs to view images
      const { error: ticketError } = await supabase
        .from('payment_tickets')
        .insert({
          user_id: user.id,
          amount: parseFloat(data.amount),
          notes: data.notes || null,
          proof_url: fileName, // Store path, not URL
          usdt_type: selectedType,
          usdt_rate: getCurrentRate(),
        });

      if (ticketError) throw ticketError;

      toast.success('Payment proof submitted successfully!');
      reset();
      removeProof();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast.error(error.message || 'Failed to submit payment proof');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      reset();
      removeProof();
      setSelectedType('mixed');
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="text-left flex-shrink-0">
          <SheetTitle>Submit Payment Proof</SheetTitle>
          <SheetDescription>
            Upload your payment screenshot and enter the amount you paid.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col flex-1 overflow-hidden">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Proof Upload */}
            <div className="space-y-2">
              <Label>Payment Screenshot *</Label>
              {proofPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img
                    src={proofPreview}
                    alt="Payment proof"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeProof}
                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary hover:bg-muted/50">
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Tap to upload screenshot
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* USDT Type Selection */}
            <div className="space-y-2">
              <Label>USDT Type *</Label>
              <div className="grid grid-cols-3 gap-2">
                {USDT_TYPE_CONFIG.map((config) => {
                  const Icon = config.icon;
                  const rate = rates[config.rateKey] || '—';
                  const isSelected = selectedType === config.type;
                  
                  return (
                    <button
                      key={config.type}
                      type="button"
                      onClick={() => setSelectedType(config.type)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? config.colorClass + ' border-current' 
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-lg font-bold">₹{rate}</span>
                      <span className="text-xs opacity-80">{config.label}</span>
                    </button>
                  );
                })}
              </div>
              {loadingRates && (
                <p className="text-xs text-muted-foreground">Loading rates...</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDT) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount')}
                className="text-lg"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Transaction ID or any reference..."
                rows={3}
                {...register('notes')}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>
          </div>

          {/* Fixed Submit Button at bottom with safe area padding */}
          <div className="flex-shrink-0 pt-4 pb-safe-area-bottom">
            <Button
              type="submit"
              className="w-full h-12 text-base mb-4"
              disabled={submitting || !proofFile}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Payment Proof
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
