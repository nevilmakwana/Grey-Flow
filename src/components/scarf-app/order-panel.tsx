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
  Hash
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

  // Calculate Totals
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
      msg += `*SKU: ${design.design_id}*\n`;
      let hasQty = false;
      item.sizes.forEach(s => {
        if (s.quantity > 0) {
          const sizeDef = design.sizes.find(sd => sd.size_id === s.size_id);
          msg += `• ${sizeDef?.label}: ${s.quantity}\n`;
          hasQty = true;
        }
      });
      if (hasQty) msg += `\n`;
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
          <Printer className="w-10 h-10 opacity-20" />
        </div>
        <h3 className="text-xl font-medium mb-2">No items in order</h3>
        <p className="max-w-xs text-center">Select SKUs from the left panel to start building your order request.</p>
      </div>
    );
  }

  const formattedDate = formatFullDate(order.created_at);

  return (
    <div className="p-8 max-w-4xl mx-auto print-container">
      {/* Print-only header */}
      <div className="hidden print:block mb-10 border-b-2 border-primary pb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">{settings.company_name}</h1>
            <p className="text-slate-500 font-medium uppercase tracking-wider text-xs">Professional Textile Enterprise</p>
          </div>
          <div className="text-right text-slate-900">
            <p className="font-bold text-lg font-mono text-primary">{order.id}</p>
            <p className="text-sm font-medium">{formattedDate}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 no-print gap-4">
        <div>
          <h2 className="text-2xl font-bold">Order Summary</h2>
          <div className="flex flex-col mt-1">
            <span className="font-mono text-sm font-bold text-primary">{order.id}</span>
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Button variant="outline" size="sm" onClick={shareToWhatsApp} className="whitespace-nowrap rounded-full">
            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} className="bg-foreground text-background hover:bg-foreground/90 whitespace-nowrap rounded-full shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="space-y-6 md:space-y-10">
        {order.items.map((item) => {
          const design = getDesignById(item.design_id);
          if (!design) return null;

          return (
            <Card key={item.design_id} className="overflow-hidden border-border shadow-sm print:shadow-none print:border-slate-200 rounded-3xl print:rounded-2xl print-avoid-break">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-48 bg-muted border-r relative aspect-square md:aspect-auto">
                    <Image 
                      src={design.image_url} 
                      alt={design.design_id} 
                      fill 
                      className="object-cover"
                      data-ai-hint="textile pattern"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-mono tracking-tight">{design.design_id}</h3>
                        <p className="text-[10px] uppercase font-bold text-primary tracking-widest mt-1">Design Specifications</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemove(item.design_id)}
                        className="text-muted-foreground hover:text-destructive no-print rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Table className="text-sm">
                      <TableHeader className="bg-muted/50 print:bg-slate-100">
                        <TableRow>
                          <TableHead className="w-full">Size/Label</TableHead>
                          <TableHead className="text-center min-w-[100px]">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {design.sizes.map((size) => {
                          const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                          const qty = orderSize?.quantity || 0;
                          
                          return (
                            <TableRow key={size.size_id} className="print:border-slate-100">
                              <TableCell className="font-medium">{size.label}</TableCell>
                              <TableCell className="text-center">
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
                                    className="w-20 text-center h-9 rounded-xl focus:ring-primary"
                                  />
                                </div>
                                <span className="hidden print:inline font-bold text-base">{qty}</span>
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

      {/* Totals Summary Section */}
      <div className="mt-12 p-8 bg-muted/30 rounded-3xl border border-dashed border-border print:bg-white print:border-slate-300 print:mt-10">
        <div className="flex items-center gap-2 mb-6">
          <Hash className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold uppercase tracking-tight">Order Totals</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col p-4 bg-background rounded-2xl border shadow-sm print:shadow-none">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Small Total</span>
            <span className="text-2xl font-black">{totals.small}</span>
            <span className="text-[10px] text-muted-foreground">50x50 cm</span>
          </div>
          <div className="flex flex-col p-4 bg-background rounded-2xl border shadow-sm print:shadow-none">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Large Total</span>
            <span className="text-2xl font-black">{totals.large}</span>
            <span className="text-[10px] text-muted-foreground">120x120 cm</span>
          </div>
          <div className="flex flex-col p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 print:bg-slate-900 print:shadow-none">
            <span className="text-[10px] font-bold uppercase opacity-80 tracking-widest mb-1">Grand Total</span>
            <span className="text-2xl font-black">{grandTotal}</span>
            <span className="text-[10px] opacity-80 font-medium">Total Quantity</span>
          </div>
        </div>
      </div>

      <div className="hidden print:block text-center text-sm text-slate-400 pt-10 border-t mt-12">
        <p className="font-medium text-slate-600">Thank you for your business. This is an automatically generated order draft.</p>
        <p className="mt-1">{settings.company_name} • Scarf Order Pro System</p>
      </div>
    </div>
  );
}
