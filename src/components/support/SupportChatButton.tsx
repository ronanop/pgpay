import { MessageCircle } from 'lucide-react';

export function SupportChatButton() {
  const handleClick = () => {
    // Open WhatsApp support directly
    window.open('https://wa.me/919876543210', '_blank');
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
