
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
    addFabricGroup,
    removeFabricGroup,
    addItemToGroup, 
    removeItemFromGroup, 
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
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

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
        .replace(/\sat\s/i, ' ')
        .replace(/\s(am|pm)/i, (match) => match.toUpperCase())
        .replace(/(\d{4})\s/, '$1 | ');
    };

    let msg = `*Order Request - ${settings.company_name}*\n`;
    msg += `Order ID: ${currentOrder.id}\n`;
    msg += `Date: ${formatFullDate(new Date().toISOString())}\n\n`;

    let totalSmall = 0;
    let totalLarge = 0;

    currentOrder.fabricGroups.forEach(group => {
      if (group.items.length === 0) return;
      msg += `*Fabric: ${group.fabric_id}*\n`;
      
      group.items.forEach(item => {
        const design = DESIGNS.find(d => d.design_id === item.design_id);
        if (!design) return;
        
        let hasQty = false;
        let itemLine = `• SKU: ${design.design_id}\n`;
        
        item.sizes.forEach(s => {
          if (s.quantity > 0) {
            const sizeDef = design.sizes.find(sd => sd.size_id === s.size_id);
            itemLine += `  - ${sizeDef?.label}: ${s.quantity}\n`;
            hasQty = true;
            if (s.size_id === 'S-SML') totalSmall += s.quantity;
            if (s.size_id === 'S-LGE') totalLarge += s.quantity;
          }
        });
        
        if (hasQty) {
          msg += itemLine;
        }
      });
      msg += `\n`;
    });

    msg += `*--- SUMMARY ---*\n`;
    if (totalSmall > 0) msg += `Small Scarf Total: ${totalSmall}\n`;
    if (totalLarge > 0) msg += `Large Scarf Total: ${totalLarge}\n`;
    msg += `*Grand Total: ${totalSmall + totalLarge} Pcs*`;

    return msg;
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppMessage());
    const isMobileDevice = typeof navigator !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const baseUrl = isMobileDevice ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    window.open(`${baseUrl}?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    const text = generateWhatsAppMessage();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Order Request - ${settings.company_name}`,
          text: text,
        });
        toast({ title: "Order Shared", description: "Summary sent successfully." });
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to Clipboard", description: "Opening presentation view..." });
        setIsShareMode(true);
      } catch (err) {
        setIsShareMode(true);
      }
    }
  };

  const handleSelectDesign = (id: string) => {
    if (activeGroupId) {
      addItemToGroup(activeGroupId, id);
      if (isMobile) setIsSearchOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "No Fabric Selected",
        description: "Please select or add a fabric group first."
      });
    }
  };

  const handleOpenSearchForGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setIsSearchOpen(true);
  };

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

  const hasItems = currentOrder.fabricGroups.some(g => g.items.length > 0);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass flex items-center justify-between px-6 no-print shadow-sm">
        <h1 className="font-headline font-bold text-lg tracking-tight">GreyFlow</h1>
      </header>

      <main className="flex-1 flex overflow-hidden pt-16">
        {!isMobile && (
          <aside className="w-64 border-r bg-muted/20 flex flex-col no-print shrink-0">
            <DesignList 
              designs={DESIGNS} 
              onSelect={handleSelectDesign} 
              selectedIds={currentOrder.fabricGroups.flatMap(g => g.items.map(i => i.design_id))} 
            />
          </aside>
        )}

        <section className="flex-1 overflow-y-auto bg-background">
          <OrderPanel 
            order={currentOrder} 
            designs={DESIGNS} 
            onUpdateQty={updateQuantity} 
            onRemoveItem={removeItemFromGroup}
            onAddGroup={addFabricGroup}
            onRemoveGroup={removeFabricGroup}
            onAddDesignToGroup={handleOpenSearchForGroup}
            settings={settings}
          />
        </section>
      </main>

      {isMobile && (
        <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <SheetContent side="left" className="w-full p-0 flex flex-col border-none">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-left font-black flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Select Design
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <DesignList 
                designs={DESIGNS} 
                onSelect={handleSelectDesign} 
                selectedIds={currentOrder.fabricGroups.flatMap(g => g.items.map(i => i.design_id))} 
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <FloatingDock 
        onReset={clearOrder}
        onSearch={() => setIsSearchOpen(true)}
        onWhatsApp={shareToWhatsApp}
        onShare={handleNativeShare}
        onPrint={handlePrint}
        hasItems={hasItems}
      />

      <CSVImport 
        open={isCsvOpen} 
        onClose={() => setIsCsvOpen(false)} 
        designs={DESIGNS} 
        onImport={(matchedData) => {
          // Default to a Satin group if none exists, or ask user?
          // For simplicity, create a group for imported items
          const groupId = addFabricGroup('Satin');
          matchedData.forEach(m => {
            addItemToGroup(groupId, m.design_id);
            updateQuantity(groupId, m.design_id, m.size_id, m.quantity);
          });
          setIsCsvOpen(false);
        }}
      />
      
      <Toaster />
    </div>
  );
}
