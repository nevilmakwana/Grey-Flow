"use client";

import React, { useState, useEffect } from 'react';
import { Order, Design, AppSettings } from '@/app/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Printer, 
  MessageCircle,
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
 * Live Clock Component
 * Displays the current date and time with a blinking colon.
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

  if (!time) return <span className="opacity-0">Loading Clock...</span>;

  const day = time.getDate().toString().padStart(2, '0');
  const month = time.toLocaleString('en-GB', { month: 'short' });
  const year = time.getFullYear();
  
  let hours = time.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <span className="inline-flex items-center">
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

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const generateWhatsAppMessage = () => {
    let msg = `*Order Request - ${settings.company_name}*\n`;
    msg += `Order ID: ${order.id}\n`;
    msg += `Date: ${formatFullDate(new Date().toISOString())}\n\n`;

    order.items.forEach(item => {
      const design = getDesignById(item.design_id);
      if (!design) return;
      
      let hasQty = false;
      let itemLine = `*SKU: ${design.design_id}*\n`;
      
      item.sizes.forEach(s => {
        if (s.quantity > 0) {
          const sizeDef = design.sizes.find(sd => sd.size_id === s.size_id);
          itemLine += `• ${sizeDef?.label}: ${s.quantity}\n`;
          hasQty = true;
        }
      });
      
      if (hasQty) {
        msg += itemLine + `\n`;
      }
    });

    msg += `*--- SUMMARY ---*\n`;
    if (totals.small > 0) msg += `Small Scarf Total: ${totals.small}\n`;
    if (totals.large > 0) msg += `Large Scarf Total: ${totals.large}\n`;
    msg += `*Grand Total: ${grandTotal} Pcs*`;

    return msg;
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (order.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 opacity-20" />
        </div>
        <h3 className="text-xl font-medium mb-2">No items in order</h3>
        <p className="max-w-xs text-center">Select SKUs from the left panel to start building your order request.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto print-container p-0 md:p-0">
      {/* Printable Header - hidden screen */}
      <div className="hidden print:flex justify-between items-end mb-10 border-b-4 border-foreground pb-8 px-4 md:px-8 pt-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">{settings.company_name}</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Professional Textile Order Draft</p>
        </div>
        <div className="text-right">
          <div className="bg-foreground text-background px-4 py-2 rounded-xl inline-block mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Order ID</p>
            <p className="font-mono text-lg font-bold">{order.id}</p>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{formatFullDate(order.created_at)}</p>
        </div>
      </div>

      {/* Screen Header - Frozen Sticky Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 px-4 md:px-8 no-print border-b border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Order Summary</h2>
            <div className="flex flex-col mt-1">
              <span className="font-mono text-sm font-bold text-primary">{order.id}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                <LiveClock />
              </span>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={shareToWhatsApp} className="flex-1 sm:flex-none rounded-full border-2 hover:bg-secondary font-bold h-9 px-6 text-foreground">
              <MessageCircle className="w-4 h-4 mr-2 text-green-500" /> WhatsApp
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none bg-foreground text-background hover:opacity-90 rounded-full shadow-lg transition-all active:scale-95 font-bold h-9 px-6">
              <Printer className="w-4 h-4 mr-2" /> Print PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-8">
        {order.items.map((item) => {
          const design = getDesignById(item.design_id);
          if (!design) return null;

          return (
            <Card key={item.design_id} className="overflow-hidden border-border bg-card shadow-sm print:shadow-none print:border-border rounded-3xl print:rounded-2xl print-avoid-break transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row h-auto">
                  {/* Fixed Aspect Ratio Container (1:1 Square) */}
                  <div className="w-full md:w-32 bg-muted border-r border-border relative aspect-square shrink-0">
                    <Image 
                      src={design.image_url} 
                      alt={design.design_id} 
                      fill 
                      className="object-cover"
                      data-ai-hint="textile pattern"
                    />
                  </div>
                  <div className="flex-1 p-4 md:p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black font-mono tracking-tighter text-foreground">{design.design_id}</h3>
                        <div className="h-1.5 w-12 bg-primary rounded-full" />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemove(item.design_id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 no-print rounded-full h-9 w-9"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-border bg-background/50">
                      <Table>
                        <TableHeader className="bg-muted/50 print:bg-muted border-none">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-full font-bold uppercase tracking-widest text-[10px] text-muted-foreground py-2 h-auto">Size Specs</TableHead>
                            <TableHead className="text-center min-w-[100px] font-bold uppercase tracking-widest text-[10px] text-muted-foreground py-2 h-auto">Quantity</TableHead>
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
                                  <div className="flex justify-center no-print">
                                    <Input 
                                      type="number" 
                                      min="0"
                                      step="1"
                                      value={qty === 0 ? "" : qty}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        onUpdateQty(item.design_id, size.size_id, isNaN(val) ? 0 : val);
                                      }}
                                      className="w-24 text-center h-10 rounded-xl border-2 focus:ring-primary focus:border-primary font-bold text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-background text-foreground"
                                    />
                                  </div>
                                  <span className="hidden print:inline font-black text-2xl text-foreground">{qty}</span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Summary Section - Final Totals */}
        <div className="mt-8 p-4 bg-muted/50 rounded-[2rem] border-2 border-border print:bg-background print:border-foreground print:border-[4px] print:mt-12 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-foreground text-background rounded-xl">
              <Hash className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">Consolidated Summary</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col p-3 bg-card rounded-2xl border-2 border-border shadow-sm print:shadow-none transition-all hover:border-primary/20">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.1em] mb-0.5">Small Scarf Total</span>
              <span className="text-2xl font-black text-foreground">{totals.small}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase">50x50 cm</span>
            </div>
            <div className="flex flex-col p-3 bg-card rounded-2xl border-2 border-border shadow-sm print:shadow-none transition-all hover:border-primary/20">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.1em] mb-0.5">Large Scarf Total</span>
              <span className="text-2xl font-black text-foreground">{totals.large}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase">90x90 cm</span>
            </div>
            <div className="flex flex-col p-3 bg-foreground text-background rounded-2xl shadow-lg shadow-foreground/5 print:bg-foreground print:shadow-none">
              <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.1em] mb-0.5">Net Grand Total</span>
              <span className="text-2xl font-black">{grandTotal}</span>
              <span className="text-[10px] opacity-60 font-bold uppercase">Total Units Requested</span>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Footer */}
      <div className="hidden print:block text-center pt-10 mt-10 border-t-2 border-border px-8 pb-8">
        <p className="font-bold text-xl text-foreground">Thank you for your business.</p>
        <p className="text-muted-foreground text-[10px] mt-1 uppercase tracking-widest font-bold">This is an official order draft generated via Scarf Order Pro</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-foreground rounded-xl" />
          <span className="font-black text-lg tracking-tighter text-foreground">{settings.company_name}</span>
        </div>
      </div>
    </div>
  );
}
