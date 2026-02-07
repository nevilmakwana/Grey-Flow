"use client";

import React, { useState } from 'react';
import { useOrder } from './lib/store';
import { DesignList } from '@/components/scarf-app/design-list';
import { OrderPanel } from '@/components/scarf-app/order-panel';
import { CSVImport } from '@/components/scarf-app/csv-import';
import { DraftsList } from '@/components/scarf-app/drafts-list';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  History, 
  Trash2
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

export default function ScarfOrderApp() {
  const { 
    currentOrder, 
    addItem, 
    removeItem, 
    updateQuantity, 
    drafts, 
    loadDraft,
    clearOrder,
    DESIGNS,
    settings
  } = useOrder();

  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Navigation Header - Fixed Sticky */}
      <header className="sticky top-0 z-50 h-16 glass flex items-center justify-between px-6 no-print shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="font-headline font-bold text-lg leading-tight tracking-tight text-foreground">Scarf Order Pro</h1>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Grey Exim Enterprise</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <div className="h-4 w-px bg-border mx-2" />
          <Button variant="ghost" size="icon" onClick={() => setIsDraftsOpen(true)} className="rounded-full hover:bg-secondary">
            <History className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={clearOrder} className="rounded-full text-destructive hover:bg-destructive/10 border-destructive/20 transition-colors">
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline ml-2">Reset</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane - Searchable Design List (Sticky search bar already handled inside) */}
        <aside className="w-64 border-r bg-muted/20 flex flex-col no-print transition-all duration-300 shrink-0">
          <DesignList designs={DESIGNS} onSelect={addItem} selectedIds={currentOrder.items.map(i => i.design_id)} />
        </aside>

        {/* Right Pane - Order Panel (With its own sticky header) */}
        <section className="flex-1 overflow-y-auto bg-background transition-colors duration-300 relative">
          <div className="h-full">
            <OrderPanel 
              order={currentOrder} 
              designs={DESIGNS} 
              onUpdateQty={updateQuantity} 
              onRemove={removeItem}
              settings={settings}
            />
          </div>
        </section>
      </main>

      {/* Dialogs */}
      <CSVImport 
        open={isCsvOpen} 
        onClose={() => setIsCsvOpen(false)} 
        designs={DESIGNS} 
        onImport={(matchedData) => {
          matchedData.forEach(m => {
            addItem(m.design_id);
            updateQuantity(m.design_id, m.size_id, m.quantity);
          });
          setIsCsvOpen(false);
        }}
      />
      
      <DraftsList 
        open={isDraftsOpen} 
        onClose={() => setIsDraftsOpen(false)} 
        drafts={drafts} 
        onLoad={loadDraft} 
      />

      <Toaster />
    </div>
  );
}
