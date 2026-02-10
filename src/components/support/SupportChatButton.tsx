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
    if (!chatUrl) return;

    // Extract phone and text from various WhatsApp URL formats
    let phone = '';
    let text = '';
    try {
      const parsed = new URL(chatUrl.replace('whatsapp://send', 'https://wa.me'));
      phone = parsed.searchParams.get('phone') || parsed.pathname.replace('/', '');
      text = parsed.searchParams.get('text') || '';
    } catch {
      // fallback: just open the URL
      window.open(chatUrl, '_system');
      return;
    }

    const waWebUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;

    // For Android WebView: use intent:// scheme to force external browser/app
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android') && userAgent.includes('wv')) {
      // Android WebView detected - use intent scheme
      const intentUrl = `intent://send?phone=${phone}&text=${encodeURIComponent(text)}#Intent;scheme=https;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(waWebUrl)};end`;
      window.location.href = intentUrl;
    } else {
      window.open(waWebUrl, '_blank');
    }
  };

  if (!chatUrl) return null;

  return (
    <div className="fixed bottom-24 left-4 z-50 flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-info text-info-foreground shadow-lg transition-transform active:scale-95 hover:scale-105"
        style={{ boxShadow: '0 4px 14px 0 hsl(var(--info) / 0.4)' }}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
      <span className="text-[10px] font-medium text-muted-foreground">Whatsapp Support</span>
    </div>
  );
}
