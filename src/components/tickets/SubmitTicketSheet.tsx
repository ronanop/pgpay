import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

export function SubmitTicketSheet({ open, onOpenChange, onSuccess }: SubmitTicketSheetProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

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
      // Upload proof image
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setUploading(true);
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofFile);

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
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Submit Payment Proof</SheetTitle>
          <SheetDescription>
            Upload your payment screenshot and enter the amount you paid.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
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
              <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary hover:bg-muted/50">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-muted-foreground">
                  Tap to upload screenshot
                </span>
                <span className="text-xs text-muted-foreground mt-1">
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

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base"
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
        </form>
      </SheetContent>
    </Sheet>
  );
}
