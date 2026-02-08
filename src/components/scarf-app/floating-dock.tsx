"use client";

import React, { useEffect, useState } from 'react';
import { Moon, Sun, Trash2, Search, MessageCircle, Share2, Printer } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface FloatingDockProps {
  onReset: () => void;
  onSearch?: () => void;
  onWhatsApp?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  hasItems?: boolean;
}

export function FloatingDock({ 
  onReset, 
  onSearch, 
  onWhatsApp, 
  onShare, 
  onPrint,
  hasItems 
}: FloatingDockProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const showOrderActions = hasItems && (onWhatsApp || onShare || onPrint);

  return (
    <div className="fixed bottom-6 right-6 z-[100] no-print">
      <div className="flex items-center bg-card border border-border shadow-lg stripe-shadow rounded-lg p-1.5 h-12">
        
        {/* Order Actions */}
        <div className={cn(
          "flex items-center transition-all duration-300 overflow-hidden",
          showOrderActions ? "max-w-[300px] opacity-100 pr-1.5" : "max-w-0 opacity-0 pointer-events-none pr-0"
        )}>
          <div className="flex items-center gap-1">
            {onWhatsApp && (
              <button onClick={onWhatsApp} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-green-500/10 text-green-600 transition-colors">
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
            {onShare && (
              <button onClick={onShare} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-primary/10 text-primary transition-colors">
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {onPrint && (
              <button onClick={onPrint} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors">
                <Printer className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="w-px h-5 bg-border mx-2 shrink-0" />
        </div>

        {/* System Controls */}
        <div className="flex items-center gap-1">
          {onSearch && (
            <div className="md:hidden flex items-center">
              <button onClick={onSearch} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                <Search className="h-4 w-4" />
              </button>
              <div className="w-px h-5 bg-border mx-2 shrink-0" />
            </div>
          )}

          <button onClick={toggleTheme} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors relative">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          <div className="w-px h-5 bg-border mx-2 shrink-0" />

          <button onClick={onReset} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}