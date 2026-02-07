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
    <div className="p-8 max-w-4xl mx-auto print-container">
      {/* Apple-style Print Header */}
      <div className="hidden print:flex justify-between items-end mb-12 border-b-2 border-slate-900 pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900">{settings.company_name}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Professional Textile Order Draft</p>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block mb-3">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Order ID</p>
            <p className="font-mono text-lg font-bold">{order.id}</p>
          </div>
          <p className="text-sm font-semibold text-slate-600">{formattedDate}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 no-print gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Order Summary</h2>
          <div className="flex flex-col mt-2">
            <span className="font-mono text-sm font-bold text-primary">{order.id}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{formattedDate}</span>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" size="lg" onClick={shareToWhatsApp} className="flex-1 sm:flex-none rounded-full border-2 hover:bg-slate-50 font-bold">
            <MessageCircle className="w-5 h-5 mr-2 text-green-500" /> WhatsApp
          </Button>
          <Button variant="default" size="lg" onClick={handlePrint} className="flex-1 sm:flex-none bg-slate-900 text-white hover:bg-slate-800 rounded-full shadow-xl shadow-slate-200 transition-all active:scale-95 font-bold">
            <Printer className="w-5 h-5 mr-2" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        {order.items.map((item) => {
          const design = getDesignById(item.design_id);
          if (!design) return null;

          return (
            <Card key={item.design_id} className="overflow-hidden border-border shadow-sm print:shadow-none print:border-slate-100 rounded-[2rem] print:rounded-2xl print-avoid-break transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-56 bg-muted border-r border-slate-100 relative aspect-square md:aspect-auto">
                    <Image 
                      src={design.image_url} 
                      alt={design.design_id} 
                      fill 
                      className="object-cover"
                      data-ai-hint="textile pattern"
                    />
                  </div>
                  <div className="flex-1 p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-black font-mono tracking-tighter text-slate-900">{design.design_id}</h3>
                        <div className="h-1 w-12 bg-primary mt-2 rounded-full" />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemove(item.design_id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 no-print rounded-full h-10 w-10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>

                    <Table className="text-sm">
                      <TableHeader className="bg-slate-50/50 print:bg-slate-50 border-none">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="w-full font-bold uppercase tracking-widest text-[10px] text-slate-400 py-4">Size Specifications</TableHead>
                          <TableHead className="text-center min-w-[100px] font-bold uppercase tracking-widest text-[10px] text-slate-400 py-4">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {design.sizes.map((size) => {
                          const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                          const qty = orderSize?.quantity || 0;
                          
                          return (
                            <TableRow key={size.size_id} className="hover:bg-transparent border-slate-100/50">
                              <TableCell className="font-bold text-slate-700 py-5">{size.label}</TableCell>
                              <TableCell className="text-center py-5">
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
                                    className="w-24 text-center h-11 rounded-2xl border-2 focus:ring-primary focus:border-primary font-bold text-lg"
                                  />
                                </div>
                                <span className="hidden print:inline font-black text-xl text-slate-900">{qty}</span>
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

      {/* Totals Summary Section - Apple-inspired Summary */}
      <div className="mt-16 p-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 print:bg-white print:border-slate-900 print:border-4 print:mt-16">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <Hash className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Consolidated Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col p-6 bg-white rounded-3xl border-2 border-slate-100 shadow-sm print:shadow-none transition-all hover:border-primary/20">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Small Scarf Total</span>
            <span className="text-4xl font-black text-slate-900">{totals.small}</span>
            <span className="text-xs text-slate-400 font-bold mt-2">50x50 cm</span>
          </div>
          <div className="flex flex-col p-6 bg-white rounded-3xl border-2 border-slate-100 shadow-sm print:shadow-none transition-all hover:border-primary/20">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Large Scarf Total</span>
            <span className="text-4xl font-black text-slate-900">{totals.large}</span>
            <span className="text-xs text-slate-400 font-bold mt-2">90x90 cm</span>
          </div>
          <div className="flex flex-col p-6 bg-slate-900 text-white rounded-3xl shadow-2xl shadow-slate-200 print:bg-black print:shadow-none">
            <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-3">Net Grand Total</span>
            <span className="text-4xl font-black">{grandTotal}</span>
            <span className="text-xs opacity-60 font-bold mt-2">Total Units Requested</span>
          </div>
        </div>
      </div>

      <div className="hidden print:block text-center pt-16 mt-12 border-t-2 border-slate-100">
        <p className="font-bold text-slate-900 text-lg">Thank you for your business.</p>
        <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">This is an official order draft generated via Scarf Order Pro</p>
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg" />
          <span className="font-black text-sm tracking-tighter">{settings.company_name}</span>
        </div>
      </div>
    </div>
  );
}
