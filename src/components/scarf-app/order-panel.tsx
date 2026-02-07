"use client";

import React, { useState, useEffect } from 'react';
import { Order, Design, AppSettings } from '@/app/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Hash,
  ShoppingBag
} from 'lucide-react';
import Image from 'next/image';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

/**
 * Live Clock Component with Blinking Colon
 */
function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
      setBlink((b) => !b);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <span className="opacity-0 text-muted-foreground text-[10px]">Loading...</span>;

  const day = time.getDate().toString().padStart(2, '0');
  const month = time.toLocaleString('en-GB', { month: 'short' });
  const year = time.getFullYear();
  
  let hours = time.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <span className="inline-flex items-center text-muted-foreground font-medium">
      {day} {month} {year} | {hours}
      <span className={`${blink ? 'opacity-100' : 'opacity-20'} transition-opacity duration-100 mx-0.5`}>:</span>
      {minutes} {ampm}
    </span>
  );
}

interface OrderPanelProps {
  order: Order;
  designs: Design[];
  onUpdateQty: (designId: string, sizeId: string, qty: number) => void;
  onRemove: (designId: string) => void;
  settings: AppSettings;
}

export function OrderPanel({ order, designs, onUpdateQty, onRemove, settings }: OrderPanelProps) {
  
  const getDesignById = (id: string) => designs.find(d => d.design_id === id);

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

  const totals = order.items.reduce((acc, item) => {
    item.sizes.forEach(s => {
      if (s.size_id === 'S-SML') acc.small += s.quantity;
      if (s.size_id === 'S-LGE') acc.large += s.quantity;
    });
    return acc;
  }, { small: 0, large: 0 });

  const grandTotal = totals.small + totals.large;

  if (order.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 opacity-20" />
        </div>
        <h3 className="text-xl font-medium mb-2 text-foreground">No items in order</h3>
        <p className="max-w-xs text-center">Select SKUs from the left panel to start building your order request.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto print-container p-0">
      {/* MINIMAL PRINT HEADER */}
      <div className="hidden print:flex justify-between items-start mb-12 border-b border-black/10 pb-6">
        <div>
          <h1 className="text-sm font-light uppercase tracking-[0.1em] text-muted-foreground">Grey Exim</h1>
          <p className="text-xs mt-1 text-muted-foreground">Print Order</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold tracking-tight text-black">{order.id}</h2>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            {formatFullDate(order.created_at)}
          </p>
        </div>
      </div>

      {/* SCREEN-ONLY HEADER */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md py-4 px-4 md:px-8 no-print border-b border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Order Summary</h2>
            <div className="flex flex-col mt-1">
              <span className="font-mono text-sm font-bold text-primary">{order.id}</span>
              <span className="text-[10px] uppercase tracking-wider mt-0.5">
                <LiveClock />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCT SECTION - Added pb-32 to allow scrolling above the floating dock */}
      <div className="space-y-4 p-4 md:p-8 print:p-0 print:space-y-10 pb-32">
        {order.items.map((item) => {
          const design = getDesignById(item.design_id);
          if (!design) return null;

          return (
            <div key={item.design_id} className="print-avoid-break group">
              {/* COMPACT SCREEN CARD (Optimized for Mobile) */}
              <Card className="no-print overflow-hidden border-border bg-card shadow-sm rounded-3xl transition-all hover:shadow-md">
                <CardContent className="p-3 sm:p-0">
                  <div className="flex flex-row sm:flex-row items-center sm:items-stretch gap-4 sm:gap-0">
                    {/* Responsive Thumbnail/Full Image */}
                    <div className="w-20 h-20 sm:w-48 sm:h-48 relative shrink-0 rounded-2xl sm:rounded-none overflow-hidden bg-muted border sm:border-none">
                      <Image 
                        src={design.image_url} 
                        alt={design.design_id} 
                        fill 
                        className="object-cover"
                        sizes="(max-width: 640px) 80px, 192px"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center sm:p-6">
                      <div className="flex justify-between items-center mb-2 sm:mb-4">
                        <h3 className="text-base sm:text-xl font-black font-mono tracking-tighter text-foreground truncate">{design.design_id}</h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onRemove(item.design_id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:w-5" />
                        </Button>
                      </div>

                      {/* Desktop Table - Hidden on Mobile */}
                      <div className="hidden sm:block rounded-2xl overflow-hidden border border-border bg-background/50">
                        <Table>
                          <TableHeader className="bg-muted/50 border-none">
                            <TableRow className="hover:bg-transparent border-none">
                              <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground py-2 h-auto">Size Specs</TableHead>
                              <TableHead className="text-center font-bold uppercase tracking-widest text-[10px] text-muted-foreground py-2 h-auto">Quantity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {design.sizes.map((size) => {
                              const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                              const qty = orderSize?.quantity || 0;
                              return (
                                <TableRow key={size.size_id} className="hover:bg-transparent border-border">
                                  <TableCell className="font-bold py-3 text-foreground text-sm">{size.label}</TableCell>
                                  <TableCell className="text-center py-3">
                                    <Input 
                                      type="number" 
                                      min="0"
                                      inputMode="numeric"
                                      value={qty === 0 ? "" : qty}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        onUpdateQty(item.design_id, size.size_id, isNaN(val) ? 0 : val);
                                      }}
                                      className="w-20 mx-auto text-center h-9 rounded-lg border-2 font-bold bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Grid - Hidden on Desktop */}
                      <div className="flex sm:hidden gap-2">
                        {design.sizes.map((size) => {
                          const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                          const qty = orderSize?.quantity || 0;
                          return (
                            <div key={size.size_id} className="flex-1 flex flex-col">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase truncate mb-1">
                                {size.label.includes('Small') ? 'Small' : 'Large'}
                              </span>
                              <Input 
                                type="number" 
                                min="0"
                                inputMode="numeric"
                                value={qty === 0 ? "" : qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  onUpdateQty(item.design_id, size.size_id, isNaN(val) ? 0 : val);
                                }}
                                className="w-full text-center h-8 rounded-lg border-2 font-bold bg-background text-foreground text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MINIMAL PRINT BLOCK (Fixed for A4) */}
              <div className="hidden print:flex gap-10 items-start">
                <div className="w-[140px] h-[140px] relative shrink-0 rounded-xl overflow-hidden bg-muted border border-black/5">
                  <Image 
                    src={design.image_url} 
                    alt={design.design_id} 
                    fill 
                    className="object-cover"
                    sizes="140px"
                  />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-bold tracking-tight text-black mb-4">{design.design_id}</h3>
                  <div className="space-y-2 border-t border-black/5 pt-3">
                    {design.sizes.map((size) => {
                      const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                      const qty = orderSize?.quantity || 0;
                      if (qty === 0) return null;
                      return (
                        <div key={size.size_id} className="flex justify-between items-center text-xs text-black/90">
                          <span className="font-light">{size.label}</span>
                          <span className="font-bold">— {qty} pcs</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* SUMMARY SECTION */}
        <div className="no-print mt-8 p-4 bg-muted/50 rounded-[2rem] border-2 border-border transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-foreground text-background rounded-xl">
              <Hash className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">Consolidated Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col p-3 bg-card rounded-2xl border-2 border-border shadow-sm">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.1em] mb-0.5">Small Scarf Total</span>
              <span className="text-2xl font-black text-foreground">{totals.small}</span>
            </div>
            <div className="flex flex-col p-3 bg-card rounded-2xl border-2 border-border shadow-sm">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.1em] mb-0.5">Large Scarf Total</span>
              <span className="text-2xl font-black text-foreground">{totals.large}</span>
            </div>
            <div className="flex flex-col p-3 bg-foreground text-background rounded-2xl">
              <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.1em] mb-0.5">Net Grand Total</span>
              <span className="text-2xl font-black">{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* MINIMAL PRINT SUMMARY */}
        <div className="hidden print:block mt-16 pt-8 border-t border-black/10">
          <h3 className="text-xs font-light uppercase tracking-[0.2em] text-muted-foreground mb-4">Order Summary</h3>
          <div className="space-y-2 max-w-xs">
            <div className="flex justify-between text-xs font-medium">
              <span>Small (50×50 cm)</span>
              <span>{totals.small} pcs</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span>Large (90×90 cm)</span>
              <span>{totals.large} pcs</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-black/10 pt-2 mt-2">
              <span>Total Units</span>
              <span>{grandTotal} pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT FOOTER */}
      <div className="hidden print:block mt-20 pt-10 border-t border-black/5 text-center">
        <p className="text-[9px] text-muted-foreground font-light tracking-wide">
          This is a system-generated print order via <span className="font-medium">GreyFlow</span>
        </p>
      </div>
    </div>
  );
}
