"use client";

import React, { useEffect, useState } from 'react';
import { Moon, Sun, Trash2, Search } from 'lucide-react';
import { useTheme } from 'next-themes';

interface FloatingDockProps {
  onReset: () => void;
  onSearch?: () => void;
}

/**
 * A floating action dock inspired by Apple's minimal UI.
 * Provides quick access to settings and destructive actions.
 */
export function FloatingDock({ onReset, onSearch }: FloatingDockProps) {
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
          {onSearch && (
            <>
              <div className="h-9 w-9" />
              <div className="w-px h-4 bg-border/50 mx-1.5" />
            </>
          )}
          <div className="h-9 w-9" />
          <div className="w-px h-4 bg-border/50 mx-1.5" />
          <div className="h-9 w-9" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] no-print">
      <div className="flex items-center bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-full p-1.5 h-12 transition-all duration-300 hover:shadow-primary/5">
        
        {/* Search Action (Mainly for Mobile) */}
        {onSearch && (
          <>
            <button 
              onClick={onSearch}
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-all active:scale-95 focus:outline-none group"
              title="Search Designs"
              aria-label="Search Designs"
            >
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </button>
            <div className="w-px h-4 bg-border/50 mx-1.5 shrink-0" />
          </>
        )}

        {/* Animated Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-all active:scale-95 focus:outline-none group relative overflow-hidden"
          title={resolvedTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={resolvedTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <div className="relative h-4 w-4">
            {/* Sun Icon: Visible in light mode, rotates and scales out in dark */}
            <Sun className="h-4 w-4 absolute inset-0 rotate-0 scale-100 opacity-100 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] dark:-rotate-90 dark:scale-0 dark:opacity-0 text-muted-foreground group-hover:text-foreground" />
            
            {/* Moon Icon: Invisible in light mode, rotates and scales in in dark */}
            <Moon className="h-4 w-4 absolute inset-0 rotate-90 scale-0 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] dark:rotate-0 dark:scale-100 dark:opacity-100 text-muted-foreground group-hover:text-foreground" />
          </div>
        </button>

        <div className="w-px h-4 bg-border/50 mx-1.5 shrink-0" />

        {/* Reset Action Button */}
        <button 
          onClick={onReset}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-all active:scale-95 focus:outline-none group"
          title="Reset Order"
          aria-label="Reset Order"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
        </button>

      </div>
    </div>
  );
}
