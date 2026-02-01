import { useState, useEffect } from 'react';
import { Copy, Check, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function WalletCard() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletAddress();
  }, []);

  const fetchWalletAddress = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'wallet_address')
        .single();
      
      if (error) throw error;
      setWalletAddress(data?.value || '');
    } catch (error) {
      console.error('Error fetching wallet address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Wallet address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  if (loading) {
    return (
      <div className="wallet-card animate-pulse">
        <div className="h-20 bg-white/20 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="wallet-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm opacity-80">USDT Wallet Address</p>
          <p className="text-xs opacity-60">Send your payment here</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3">
        <p className="flex-1 truncate font-mono text-sm">
          {walletAddress || 'No wallet configured'}
        </p>
        <button
          onClick={handleCopy}
          disabled={!walletAddress}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 transition-all hover:bg-white/30 active:scale-95 disabled:opacity-50"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
