"use client";

import React, { useState } from 'react';
import { useOrder } from './lib/store';
import { DesignList } from '@/components/scarf-app/design-list';
import { OrderPanel } from '@/components/scarf-app/order-panel';
import { CSVImport } from '@/components/scarf-app/csv-import';
import { FloatingDock } from '@/components/scarf-app/floating-dock';
import { ShareView } from '@/components/scarf-app/share-view';
import { Toaster } from '@/components/ui/toaster';
import { Search, ShoppingBag } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

  const isMobile = useIsMobile();
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [isShareMode, setIsShareMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // If Share Mode is active, render only the presentation view
  if (isShareMode) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ShareView 
          order={currentOrder} 
          designs={DESIGNS} 
          settings={settings} 
          onBack={() => setIsShareMode(false)} 
        />
        <Toaster />
      </div>
    );
  }

  const handleSelectDesign = (id: string) => {
    addItem(id);
    if (isMobile) {
      setIsSearchOpen(false);
    }
  };

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

        {/* Mobile Search Trigger */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSearchOpen(true)}
            className="rounded-full hover:bg-muted"
          >
            <Search className="w-5 h-5" />
          </Button>
        )}
      </header>

      {/* Main Content Area - Offset by fixed header height */}
      <main className="flex-1 flex overflow-hidden pt-16">
        {/* Desktop Sidebar - Hidden on Mobile */}
        {!isMobile && (
          <aside className="w-64 border-r bg-muted/20 flex flex-col no-print transition-all duration-300 shrink-0">
            <DesignList 
              designs={DESIGNS} 
              onSelect={handleSelectDesign} 
              selectedIds={currentOrder.items.map(i => i.design_id)} 
            />
          </aside>
        )}

        {/* Right Pane - Order Panel (Full width on mobile) */}
        <section className="flex-1 overflow-y-auto bg-background transition-colors duration-300">
          <OrderPanel 
            order={currentOrder} 
            designs={DESIGNS} 
            onUpdateQty={updateQuantity} 
            onRemove={removeItem}
            settings={settings}
            onShare={() => setIsShareMode(true)}
          />
        </section>
      </main>

      {/* Mobile Search Sheet */}
      {isMobile && (
        <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <SheetContent side="left" className="w-full p-0 flex flex-col border-none">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-left font-black tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Select Design
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <DesignList 
                designs={DESIGNS} 
                onSelect={handleSelectDesign} 
                selectedIds={currentOrder.items.map(i => i.design_id)} 
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Floating Action Dock - Apple-inspired minimal control */}
      <FloatingDock 
        onReset={clearOrder}
      />

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
      
      <Toaster />
    </div>
  );
}
