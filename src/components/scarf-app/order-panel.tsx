"use client";

import React from 'react';
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
    msg += `Date: ${formatFullDate(order.created_at)}\n\n`;

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

  const formattedDate = formatFullDate(order.created_at);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto print-container">
      <div className="hidden print:flex justify-between items-end mb-8 border-b-2 border-foreground pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight">{settings.company_name}</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Professional Textile Order Draft</p>
        </div>
        <div className="text-right">
          <div className="bg-foreground text-background px-3 py-1.5 rounded-lg inline-block mb-2">
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">Order ID</p>
            <p className="font-mono text-base font-bold">{order.id}</p>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{formattedDate}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 no-print gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Order Summary</h2>
          <div className="flex flex-col mt-1">
            <span className="font-mono text-xs font-bold text-primary">{order.id}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{formattedDate}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={shareToWhatsApp} className="flex-1 sm:flex-none rounded-full border-2 hover:bg-secondary font-bold h-9">
            <MessageCircle className="w-4 h-4 mr-2 text-green-500" /> WhatsApp
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none bg-foreground text-background hover:opacity-90 rounded-full shadow-lg transition-all active:scale-95 font-bold h-9">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => {
          const design = getDesignById(item.design_id);
          if (!design) return null;

          return (
            <Card key={item.design_id} className="overflow-hidden border-border shadow-sm print:shadow-none print:border-border rounded-2xl print:rounded-xl print-avoid-break transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-32 bg-muted border-r border-border relative aspect-square md:aspect-auto">
                    <Image 
                      src={design.image_url} 
                      alt={design.design_id} 
                      fill 
                      className="object-cover"
                      data-ai-hint="textile pattern"
                    />
                  </div>
                  <div className="flex-1 p-3 md:p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-black font-mono tracking-tighter">{design.design_id}</h3>
                        <div className="h-1 w-8 bg-primary mt-1 rounded-full" />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemove(item.design_id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 no-print rounded-full h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Table className="text-xs">
                      <TableHeader className="bg-muted/30 print:bg-muted border-none">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="w-full font-bold uppercase tracking-widest text-[9px] text-muted-foreground py-1 h-auto">Size Specifications</TableHead>
                          <TableHead className="text-center min-w-[80px] font-bold uppercase tracking-widest text-[9px] text-muted-foreground py-1 h-auto">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {design.sizes.map((size) => {
                          const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                          const qty = orderSize?.quantity || 0;
                          
                          return (
                            <TableRow key={size.size_id} className="hover:bg-transparent border-border/50">
                              <TableCell className="font-bold py-2">{size.label}</TableCell>
                              <TableCell className="text-center py-2">
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
                                    className="w-20 text-center h-8 rounded-xl border-2 focus:ring-primary focus:border-primary font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                <span className="hidden print:inline font-black text-lg">{qty}</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-6 md:p-8 bg-muted/50 rounded-[1.5rem] border-2 border-border print:bg-background print:border-foreground print:border-4 print:mt-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-foreground text-background rounded-xl">
            <Hash className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight">Consolidated Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col p-4 bg-background rounded-2xl border-2 border-border shadow-sm print:shadow-none transition-all hover:border-primary/20">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1.5">Small Scarf Total</span>
            <span className="text-2xl font-black">{totals.small}</span>
            <span className="text-[10px] text-muted-foreground font-bold">50x50 cm</span>
          </div>
          <div className="flex flex-col p-4 bg-background rounded-2xl border-2 border-border shadow-sm print:shadow-none transition-all hover:border-primary/20">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1.5">Large Scarf Total</span>
            <span className="text-2xl font-black">{totals.large}</span>
            <span className="text-[10px] text-muted-foreground font-bold">90x90 cm</span>
          </div>
          <div className="flex flex-col p-4 bg-foreground text-background rounded-2xl shadow-xl shadow-foreground/5 print:bg-foreground print:shadow-none">
            <span className="text-[9px] font-black uppercase opacity-60 tracking-[0.2em] mb-1.5">Net Grand Total</span>
            <span className="text-2xl font-black">{grandTotal}</span>
            <span className="text-[10px] opacity-60 font-bold">Total Units Requested</span>
          </div>
        </div>
      </div>

      <div className="hidden print:block text-center pt-8 mt-8 border-t-2 border-border">
        <p className="font-bold text-base">Thank you for your business.</p>
        <p className="text-muted-foreground text-[9px] mt-0.5 uppercase tracking-widest font-bold">This is an official order draft generated via Scarf Order Pro</p>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <div className="w-6 h-6 bg-foreground rounded-md" />
          <span className="font-black text-xs tracking-tighter">{settings.company_name}</span>
        </div>
      </div>
    </div>
  );
}
