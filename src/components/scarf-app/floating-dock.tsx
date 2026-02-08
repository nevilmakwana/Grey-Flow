"use client";

import React, { useEffect, useState } from 'react';
import { Moon, Sun, Trash2, Search, MessageCircle, Share2, Printer } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface FloatingDockProps {
  onReset: () => void;
  onSearch?: () => void;
  // Order Actions
  onWhatsApp?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  hasItems?: boolean;
}

/**
 * A unified floating action dock inspired by Apple's minimal UI.
 * Merges order actions and system controls into a single elegant pill.
 */
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

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Minimal placeholder during hydration to prevent layout shift
  if (!mounted) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] no-print">
        <div className="flex items-center bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-full p-1.5 h-12">
          <div className="h-9 w-9" />
        </div>
      </div>
    );
  }

  const showOrderActions = hasItems && (onWhatsApp || onShare || onPrint);

  return (
    <div className="fixed bottom-6 right-6 z-[100] no-print">
      <div className="flex items-center bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-full p-1.5 h-12 transition-all duration-500 hover:shadow-primary/5">
        
        {/* ORDER ACTIONS GROUP - Animated reveal/exit */}
        <div className={cn(
          "flex items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden",
          showOrderActions 
            ? "max-w-[400px] opacity-100 pr-1.5" 
            : "max-w-0 opacity-0 pointer-events-none pr-0 -translate-x-4"
        )}>
          <div className="flex items-center">
            {onWhatsApp && (
              <button 
                onClick={onWhatsApp}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-green-500/10 transition-all active:scale-95 group focus:outline-none"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
              </button>
            )}
            
            {onShare && (
              <>
                {onWhatsApp && <div className="w-px h-4 bg-border/50 mx-1.5 shrink-0" />}
                <button 
                  onClick={onShare}
                  className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-primary/10 transition-all active:scale-95 group focus:outline-none"
                  title="Share Order"
                >
                  <Share2 className="h-4 w-4 text-primary" />
                </button>
              </>
            )}

            {onPrint && (
              <>
                {(onWhatsApp || onShare) && <div className="w-px h-4 bg-border/50 mx-1.5 shrink-0" />}
                <button 
                  onClick={onPrint}
                  className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-all active:scale-95 group focus:outline-none"
                  title="Print Order"
                >
                  <Printer className="h-4 w-4 text-foreground" />
                </button>
              </>
            )}
          </div>
          {/* Divider between Order and System groups */}
          <div className="w-px h-4 bg-border/50 ml-1.5 shrink-0" />
        </div>

        {/* SYSTEM CONTROLS GROUP */}
        <div className="flex items-center">
          {onSearch && (
            <div className="md:hidden flex items-center">
              <button 
                onClick={onSearch}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-all active:scale-95 focus:outline-none group"
                title="Search Designs"
              >
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </button>
              <div className="w-px h-4 bg-border/50 mx-1.5 shrink-0" />
            </div>
          )}

          {/* Animated Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-all active:scale-95 focus:outline-none group relative"
            title={resolvedTheme === 'dark' ? "Light Mode" : "Dark Mode"}
          >
            <div className="relative h-4 w-4">
              <Sun className="h-4 w-4 absolute inset-0 rotate-0 scale-100 opacity-100 transition-all duration-500 ease-out dark:-rotate-90 dark:scale-0 dark:opacity-0 text-muted-foreground group-hover:text-foreground" />
              <Moon className="h-4 w-4 absolute inset-0 rotate-90 scale-0 opacity-0 transition-all duration-500 ease-out dark:rotate-0 dark:scale-100 dark:opacity-100 text-muted-foreground group-hover:text-foreground" />
            </div>
          </button>

          <div className="w-px h-4 bg-border/50 mx-1.5 shrink-0" />

          {/* Reset Action Button */}
          <button 
            onClick={onReset}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-all active:scale-95 focus:outline-none group"
            title="Reset Order"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
          </button>
        </div>

      </div>
    </div>
  );
}
