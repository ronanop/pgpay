import { useState, useEffect } from 'react';
import { TrendingUp, Gamepad2, BarChart3, Shuffle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UsdtRate {
  type: string;
  label: string;
  icon: typeof TrendingUp;
  rate: string;
  colorClass: string;
}

export function UsdtRatesCard() {
  const [rates, setRates] = useState<Record<string, string>>({
    usdt_rate_mixed: '—',
    usdt_rate_stock: '—',
    usdt_rate_game: '—',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['usdt_rate_mixed', 'usdt_rate_stock', 'usdt_rate_game']);

      if (error) throw error;

      const ratesMap: Record<string, string> = {};
      data?.forEach((s) => {
        ratesMap[s.key] = s.value || '—';
      });
      setRates((prev) => ({ ...prev, ...ratesMap }));
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const rateConfigs: UsdtRate[] = [
    {
      type: 'usdt_rate_mixed',
      label: 'Mixed',
      icon: Shuffle,
      rate: rates.usdt_rate_mixed,
      colorClass: 'bg-primary/10 text-primary',
    },
    {
      type: 'usdt_rate_stock',
      label: 'Stock',
      icon: BarChart3,
      rate: rates.usdt_rate_stock,
      colorClass: 'bg-info/10 text-info',
    },
    {
      type: 'usdt_rate_game',
      label: 'Game',
      icon: Gamepad2,
      rate: rates.usdt_rate_game,
      colorClass: 'bg-warning/10 text-warning',
    },
  ];

  if (loading) {
    return (
      <div className="mobile-card animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-card">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">USDT Rates (₹)</h3>
      <div className="grid grid-cols-3 gap-3">
        {rateConfigs.map((config) => {
          const Icon = config.icon;
          return (
            <div
              key={config.type}
              className={`flex flex-col items-center justify-center p-3 rounded-lg ${config.colorClass}`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-lg font-bold">{config.rate}</span>
              <span className="text-xs opacity-80">{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
