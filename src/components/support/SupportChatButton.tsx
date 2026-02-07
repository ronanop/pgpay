import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function SupportChatButton() {
  const { user } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState('919876543210');
  const [whatsappMessage, setWhatsappMessage] = useState('Hello! I need help with my PGPAY account.');
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string; email: string } | null>(null);

  useEffect(() => {
    fetchSupportSettings();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, email')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchSupportSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['support_whatsapp_number', 'support_whatsapp_message']);

      if (error) throw error;

      data?.forEach((s) => {
        if (s.key === 'support_whatsapp_number' && s.value) {
          setWhatsappNumber(s.value);
        }
        if (s.key === 'support_whatsapp_message' && s.value) {
          setWhatsappMessage(s.value);
        }
      });
    } catch (error) {
      console.error('Error fetching support settings:', error);
    }
  };

  const getFormattedMessage = () => {
    let message = whatsappMessage;
    
    if (userProfile) {
      message = message
        .replace(/{name}/gi, userProfile.name || 'N/A')
        .replace(/{phone}/gi, userProfile.phone || 'N/A')
        .replace(/{email}/gi, userProfile.email || 'N/A');
    } else {
      // Replace placeholders with empty or default if no profile
      message = message
        .replace(/{name}/gi, '')
        .replace(/{phone}/gi, '')
        .replace(/{email}/gi, '');
    }
    
    return message;
  };

  const handleClick = () => {
    const formattedMessage = getFormattedMessage();
    const encodedMessage = encodeURIComponent(formattedMessage);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
  };

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
