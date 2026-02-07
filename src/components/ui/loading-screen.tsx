import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message = "Loading...", className }: LoadingScreenProps) {
  return (
    <div className={cn(
      "flex min-h-screen flex-col items-center justify-center bg-background gap-6",
      className
    )}>
      {/* Animated logo/spinner */}
      <div className="relative">
        {/* Outer ring */}
        <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
        
        {/* Spinning arc */}
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
        </div>
      </div>

      {/* Loading text with fade animation */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-foreground animate-pulse">
          {message}
        </p>
        
        {/* Animated dots */}
        <div className="flex gap-1">
          <span 
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '0ms' }}
          />
          <span 
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '150ms' }}
          />
          <span 
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-3 border-muted" />
        <div className="absolute inset-0 h-10 w-10 rounded-full border-3 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  );
}
