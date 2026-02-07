"use client";

import React, { useState } from 'react';
import { useOrder } from './lib/store';
import { DesignList } from '@/components/scarf-app/design-list';
import { OrderPanel } from '@/components/scarf-app/order-panel';
import { CSVImport } from '@/components/scarf-app/csv-import';
import { FloatingDock } from '@/components/scarf-app/floating-dock';
import { Toaster } from '@/components/ui/toaster';

export default function ScarfOrderApp() {
  const { 
    currentOrder, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearOrder,
    DESIGNS,
    settings
  } = useOrder();

  const [isCsvOpen, setIsCsvOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Fixed Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass flex items-center justify-between px-6 no-print shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="font-headline font-bold text-lg leading-tight tracking-tight text-foreground">GreyFlow</h1>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Grey Exim LLP</span>
          </div>
        </div>
      </header>

      {/* Main Content Area - Offset by fixed header height */}
      <main className="flex-1 flex overflow-hidden pt-16">
        {/* Left Pane - Searchable Design List */}
        <aside className="w-64 border-r bg-muted/20 flex flex-col no-print transition-all duration-300 shrink-0">
          <DesignList designs={DESIGNS} onSelect={addItem} selectedIds={currentOrder.items.map(i => i.design_id)} />
        </aside>

        {/* Right Pane - Order Panel */}
        <section className="flex-1 overflow-y-auto bg-background transition-colors duration-300">
          <OrderPanel 
            order={currentOrder} 
            designs={DESIGNS} 
            onUpdateQty={updateQuantity} 
            onRemove={removeItem}
            settings={settings}
          />
        </section>
      </main>

      {/* Floating Action Dock - Apple-inspired minimal control */}
      <FloatingDock 
        onReset={clearOrder}
      />

      {/* Dialogs - Hidden but kept for logic stability */}
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
      
      <Toaster />
    </div>
  );
}
