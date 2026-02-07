import { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function SupportChatButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    // For now, just show a confirmation - can be connected to a support system later
    setTimeout(() => {
      setSending(false);
      setMessage('');
      setOpen(false);
    }, 500);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-info text-info-foreground shadow-lg transition-transform active:scale-95 hover:scale-105"
        style={{ boxShadow: '0 4px 14px 0 hsl(var(--info) / 0.4)' }}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Support Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader className="text-left pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10">
                <MessageCircle className="h-5 w-5 text-info" />
              </div>
              <div>
                <SheetTitle>Customer Support</SheetTitle>
                <p className="text-sm text-muted-foreground">We're here to help!</p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col h-full pt-4">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {/* Welcome Message */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/10">
                  <MessageCircle className="h-4 w-4 text-info" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted p-3 max-w-[80%]">
                  <p className="text-sm">
                    👋 Hello! How can we assist you today? 
                  </p>
                  <p className="text-sm mt-2">
                    For quick support, you can also reach us on:
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>📧 Email: support@pgpay.com</p>
                    <p>📱 WhatsApp: +91 9876543210</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t pt-4 pb-safe-area-bottom">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 h-11 rounded-full border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button 
                  size="icon" 
                  className="h-11 w-11 rounded-full"
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
