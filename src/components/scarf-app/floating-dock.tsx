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
      <div className="flex items-center bg-background/80 backdrop-blur-xl shadow-2xl rounded-2xl p-1.5 h-12 border border-border/50">
        
        {/* Order Actions Group */}
        <div className={cn(
          "flex items-center transition-all duration-300 ease-in-out overflow-hidden",
          showOrderActions ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0 pointer-events-none"
        )}>
          <div className="flex items-center gap-0.5 px-1">
            {onWhatsApp && (
              <button 
                onClick={onWhatsApp} 
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-green-500/10 text-green-500 transition-colors"
                title="WhatsApp Message"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
            )}
            {onShare && (
              <button 
                onClick={onShare} 
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-primary/10 text-primary transition-colors"
                title="Share Order"
              >
                <Share2 className="h-5 w-5" />
              </button>
            )}
            {onPrint && (
              <button 
                onClick={onPrint} 
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted text-foreground transition-colors"
                title="Print A4 PDF"
              >
                <Printer className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="w-px h-6 bg-border/60 mx-1 shrink-0" />
        </div>

        {/* System Controls Group */}
        <div className="flex items-center gap-0.5 px-0.5">
          {onSearch && (
            <div className="md:hidden flex items-center">
              <button 
                onClick={onSearch} 
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                title="Search Designs"
              >
                <Search className="h-5 w-5" />
              </button>
              <div className="w-px h-6 bg-border/60 mx-1 shrink-0" />
            </div>
          )}

          <button 
            onClick={toggleTheme} 
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-colors relative"
            title="Toggle Appearance"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          <div className="w-px h-6 bg-border/60 mx-1 shrink-0" />

          <button 
            onClick={onReset} 
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Clear Order"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}