"use client";

import React, { useState, useEffect } from 'react';
import { useOrder } from '@/app/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Menu, 
  ShoppingBag, 
  Scissors, 
  ChevronRight,
  Search
} from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger
} from '@/components/ui/sheet';
import { DesignList } from '@/components/scarf-app/design-list';
import { OrderPanel } from '@/components/scarf-app/order-panel';
import { FloatingDock } from '@/components/scarf-app/floating-dock';
import { StitchingModule } from '@/components/stitching/stitching-module';
import { CSVImport } from '@/components/scarf-app/csv-import';
import { ShareView } from '@/components/scarf-app/share-view';
import { Toaster } from '@/components/ui/toaster';

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
  const [activeModule, setActiveModule] = useState<'orders' | 'stitching'>('orders');
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [isShareMode, setIsShareMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [highlightedDesignId, setHighlightedDesignId] = useState<string | null>(null);

  // Default active group logic
  useEffect(() => {
    if (!activeGroupId && currentOrder.fabricGroups.length > 0) {
      setActiveGroupId(currentOrder.fabricGroups[0].id);
    }
  }, [currentOrder.fabricGroups, activeGroupId]);

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

    let msg = `*Order Request - Grey Exim*\n`;
    msg += `Order ID: ${currentOrder.id}\n`;
    msg += `Date: ${formatFullDate(new Date().toISOString())}\n\n`;

    let totalSmall = 0;
    let totalLarge = 0;

    currentOrder.fabricGroups.forEach(group => {
      if (group.items.length === 0) return;
      msg += `*Fabric: ${group.fabric_id}*\n`;
      
      const sortedItems = [...group.items].sort((a, b) => 
        a.design_id.localeCompare(b.design_id)
      );

      sortedItems.forEach(item => {
        const design = DESIGNS.find(d => d.design_id === item.design_id);
        if (!design) return;
        
        let hasQty = false;
        let itemLine = `▫️ *${design.design_id}*\n`;
        
        item.sizes.forEach(s => {
          if (s.quantity > 0) {
            const cleanLabel = s.size_id === 'S-SML' ? 'Small' : 'Large';
            itemLine += `  • ${cleanLabel}: ${s.quantity}\n`;
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
    const whatsappUrl = `https://api.whatsapp.com/send?text=${text}`;
    const isMobileDevice = typeof navigator !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
      window.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleNativeShare = async () => {
    const text = generateWhatsAppMessage();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Order Request - Grey Exim`,
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
    const targetGroupId = activeGroupId || (currentOrder.fabricGroups.length > 0 ? currentOrder.fabricGroups[0].id : null);
    
    if (targetGroupId) {
      addItemToGroup(targetGroupId, id);
      setHighlightedDesignId(null);
      
      setTimeout(() => {
        setHighlightedDesignId(id);
        if (isMobile) setIsSearchOpen(false);
      }, 50);

      setTimeout(() => {
        setHighlightedDesignId(null);
      }, 1500);
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
    if (isMobile) {
      setIsSearchOpen(true);
    } else {
      toast({
        title: "Targeting Fabric Group",
        description: "Select designs from the left sidebar to add them here."
      });
    }
  };

  const handleAddGroupAndActivate = (fabricId: string) => {
    const newId = addFabricGroup(fabricId);
    setActiveGroupId(newId);
    if (!isMobile) {
      toast({
        title: `${fabricId} Group Created`,
        description: "Now select designs from the sidebar."
      });
    }
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
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass flex items-center justify-between px-6 no-print">
        <div className="flex-1 flex items-center">
          <h1 className="font-headline font-bold text-lg tracking-tight">GreyFlow</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => setActiveModule('orders')}
            className={cn(
              "text-sm font-medium transition-all relative py-1",
              activeModule === 'orders' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Print Order
            {activeModule === 'orders' && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveModule('stitching')}
            className={cn(
              "text-sm font-medium transition-all relative py-1",
              activeModule === 'stitching' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Stitching
            {activeModule === 'stitching' && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        </nav>

        {/* Mobile Menu Trigger & Right Drawer */}
        <div className="flex-1 flex justify-end items-center">
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0 border-none bg-background/95 backdrop-blur-xl flex flex-col">
                <div className="flex-1 flex flex-col p-6 pt-20 gap-2">
                  <button 
                    onClick={() => {
                      setActiveModule('orders');
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl text-sm font-semibold transition-all group",
                      activeModule === 'orders' 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "bg-transparent text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5" />
                      Print Order
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", activeModule === 'orders' && "translate-x-1")} />
                  </button>
                  <button 
                    onClick={() => {
                      setActiveModule('stitching');
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl text-sm font-semibold transition-all group",
                      activeModule === 'stitching' 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "bg-transparent text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Scissors className="w-5 h-5" />
                      Stitching
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", activeModule === 'stitching' && "translate-x-1")} />
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden pt-16">
        {activeModule === 'orders' ? (
          <>
            {!isMobile && (
              <aside className="w-64 border-r bg-muted/20 flex flex-col no-print shrink-0">
                <DesignList 
                  designs={DESIGNS} 
                  onSelect={handleSelectDesign} 
                  selectedIds={currentOrder.fabricGroups.flatMap(g => g.items.map(i => i.design_id))} 
                />
              </aside>
            )}

            <section className="flex-1 overflow-y-auto bg-background/50">
              <OrderPanel 
                order={currentOrder} 
                designs={DESIGNS} 
                highlightedDesignId={highlightedDesignId}
                activeGroupId={activeGroupId}
                onUpdateQty={updateQuantity} 
                onRemoveItem={removeItemFromGroup}
                onAddGroup={handleAddGroupAndActivate}
                onRemoveGroup={(id) => {
                  removeFabricGroup(id);
                  if (activeGroupId === id) setActiveGroupId(null);
                }}
                onAddDesignToGroup={handleOpenSearchForGroup}
                settings={settings}
              />
            </section>

            {isMobile && (
              <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <SheetContent side="left" className="w-full p-0 flex flex-col border-none">
                  <div className="p-4 border-b bg-background">
                    <h2 className="text-left font-black flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Select Design
                    </h2>
                  </div>
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
              onReset={() => {
                clearOrder();
                setActiveGroupId(null);
              }}
              onSearch={() => setIsSearchOpen(true)}
              onWhatsApp={shareToWhatsApp}
              onShare={handleNativeShare}
              onPrint={handlePrint}
              hasItems={hasItems}
            />
          </>
        ) : (
          <section className="flex-1 overflow-y-auto bg-background/50">
            <StitchingModule designs={DESIGNS} />
          </section>
        )}
      </main>

      <CSVImport 
        open={isCsvOpen} 
        onClose={() => setIsCsvOpen(false)} 
        designs={DESIGNS} 
        onImport={(matchedData) => {
          const groupId = addFabricGroup('Satin');
          setActiveGroupId(groupId);
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
