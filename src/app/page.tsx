"use client";

import React, { useState } from 'react';
import { useOrder } from './lib/store';
import { DesignList } from '@/components/scarf-app/design-list';
import { OrderPanel } from '@/components/scarf-app/order-panel';
import { CSVImport } from '@/components/scarf-app/csv-import';
import { FloatingDock } from '@/components/scarf-app/floating-dock';
import { ShareView } from '@/components/scarf-app/share-view';
import { Toaster } from '@/components/ui/toaster';
import { ShoppingBag } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [isShareMode, setIsShareMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // --- Handlers for Floating Dock ---

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const generateWhatsAppMessage = () => {
    const formatFullDate = (isoString: string) => {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date).replace(',', '')
        .replace(/\s(am|pm)/i, (match) => match.toUpperCase())
        .replace(/(\d{4})\s/, '$1 | ');
    };

    let msg = `*Order Request - ${settings.company_name}*\n`;
    msg += `Order ID: ${currentOrder.id}\n`;
    msg += `Date: ${formatFullDate(new Date().toISOString())}\n\n`;

    let totalSmall = 0;
    let totalLarge = 0;

    currentOrder.items.forEach(item => {
      const design = DESIGNS.find(d => d.design_id === item.design_id);
      if (!design) return;
      
      let hasQty = false;
      let itemLine = `*SKU: ${design.design_id}*\n`;
      
      item.sizes.forEach(s => {
        if (s.quantity > 0) {
          const sizeDef = design.sizes.find(sd => sd.size_id === s.size_id);
          itemLine += `• ${sizeDef?.label}: ${s.quantity}\n`;
          hasQty = true;
          if (s.size_id === 'S-SML') totalSmall += s.quantity;
          if (s.size_id === 'S-LGE') totalLarge += s.quantity;
        }
      });
      
      if (hasQty) {
        msg += itemLine + `\n`;
      }
    });

    msg += `*--- SUMMARY ---*\n`;
    if (totalSmall > 0) msg += `Small Scarf Total: ${totalSmall}\n`;
    if (totalLarge > 0) msg += `Large Scarf Total: ${totalLarge}\n`;
    msg += `*Grand Total: ${totalSmall + totalLarge} Pcs*`;

    return msg;
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppMessage());
    
    // Detect mobile/tablet to use the most direct app link (api.whatsapp.com)
    // while falling back to web.whatsapp.com for desktop users.
    const isMobileDevice = typeof navigator !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const baseUrl = isMobileDevice 
      ? "https://api.whatsapp.com/send" 
      : "https://web.whatsapp.com/send";
      
    window.open(`${baseUrl}?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    const text = generateWhatsAppMessage();
    
    // Use native share API if available (Mobile/Tablet)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Order Request - ${settings.company_name}`,
          text: text,
        });
        toast({
          title: "Order Shared",
          description: "Summary sent to platforms.",
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Desktop Fallback: Copy to clipboard and open Presentation View
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied to Clipboard",
          description: "Order summary copied. Opening presentation view...",
        });
        setIsShareMode(true);
      } catch (err) {
        setIsShareMode(true);
      }
    }
  };

  const handleSelectDesign = (id: string) => {
    addItem(id);
    if (isMobile) {
      setIsSearchOpen(false);
    }
  };

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

      {/* Floating Action Dock - Apple-inspired minimal control center */}
      <FloatingDock 
        onReset={clearOrder}
        onSearch={() => setIsSearchOpen(true)}
        onWhatsApp={shareToWhatsApp}
        onShare={handleNativeShare}
        onPrint={handlePrint}
        hasItems={currentOrder.items.length > 0}
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
