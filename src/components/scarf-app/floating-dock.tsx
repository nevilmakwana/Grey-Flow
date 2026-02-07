"use client";

import React from 'react';
import { Moon, Sun, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface FloatingDockProps {
  onReset: () => void;
}

/**
 * A floating action dock inspired by Apple's minimal UI.
 * Provides quick access to settings and destructive actions.
 */
export function FloatingDock({ onReset }: FloatingDockProps) {
  const { setTheme } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-[100] no-print">
      <div className="flex items-center bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-full p-1.5 h-12 transition-all duration-300 hover:shadow-primary/5">
        
        {/* Theme Segment */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-all active:scale-90 focus:outline-none group"
              title="Toggle Theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground group-hover:text-foreground" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground group-hover:text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="rounded-2xl mb-3 border-border bg-background/95 backdrop-blur-md">
            <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-xl px-4 py-2">Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-xl px-4 py-2">Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-xl px-4 py-2">System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border/50 mx-1.5 shrink-0" />

        {/* Reset Segment */}
        <button 
          onClick={onReset}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-all active:scale-90 focus:outline-none group"
          title="Reset Order"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
        </button>

      </div>
    </div>
  );
}
