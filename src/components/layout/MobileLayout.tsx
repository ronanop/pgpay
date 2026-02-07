import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Activity, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  onCenterAction?: () => void;
  showCenterAction?: boolean;
}

export function MobileLayout({ 
  children, 
  showNav = true, 
  onCenterAction,
  showCenterAction = false 
}: MobileLayoutProps) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Activity, label: 'Activity' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-top">
      <main className={cn(
        "flex-1 overflow-y-auto no-scrollbar",
        showNav && "pb-20"
      )}>
        {children}
      </main>
      
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
          <div className="flex h-16 items-center justify-around">
            {/* First nav item */}
            {navItems.slice(0, 1).map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "bottom-nav-item touch-feedback",
                    isActive && "active"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Center action button - always render space for consistent layout */}
            <div className="flex items-center justify-center w-14">
              {showCenterAction && onCenterAction && (
                <button
                  onClick={onCenterAction}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
                >
                  <Plus className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Second nav item */}
            {navItems.slice(1).map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "bottom-nav-item touch-feedback",
                    isActive && "active"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
