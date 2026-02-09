import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function SupportChatButton() {
  const [chatUrl, setChatUrl] = useState('');

  useEffect(() => {
    fetchChatUrl();
  }, []);

  const fetchChatUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'support_chat_url')
        .single();

      if (error) throw error;
      if (data?.value) setChatUrl(data.value);
    } catch (error) {
      console.error('Error fetching support chat URL:', error);
    }
  };

  const handleClick = () => {
    if (chatUrl) {
      window.open(chatUrl, '_blank');
    }
  };

  if (!chatUrl) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-info text-info-foreground shadow-lg transition-transform active:scale-95 hover:scale-105"
      style={{ boxShadow: '0 4px 14px 0 hsl(var(--info) / 0.4)' }}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
