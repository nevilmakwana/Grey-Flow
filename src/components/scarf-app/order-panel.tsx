
"use client";

import React from 'react';
import { Order, Design, AppSettings } from '@/app/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Share2, 
  Copy, 
  Printer, 
  MessageCircle,
  AlertCircle 
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

  const calculateSubtotal = () => {
    return order.items.reduce((total, item) => {
      const design = getDesignById(item.design_id);
      if (!design) return total;
      
      const designSum = item.sizes.reduce((sum, s) => {
        const sizeDef = design.sizes.find(sd => sd.size_id === s.size_id);
        if (!sizeDef) return sum;
        return sum + (s.quantity * sizeDef.pieces_per_unit * sizeDef.rate_per_piece);
      }, 0);
      
      return total + designSum;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = (subtotal * order.tax_percent) / 100;
  const grandTotal = subtotal + taxAmount;

  const handlePrint = () => {
    window.print();
  };

  const generateWhatsAppMessage = () => {
    let msg = `*Order Request - ${settings.company_name}*\n`;
    msg += `Order ID: ${order.id}\n`;
    msg += `Date: ${new Date(order.created_at).toLocaleDateString()}\n\n`;

    order.items.forEach(item => {
      const design = getDesignById(item.design_id);
      if (!design) return;
      msg += `*${design.design_name} (${design.design_id})*\n`;
      item.sizes.forEach(s => {
        if (s.quantity > 0) {
          const sizeDef = design.sizes.find(sd => sd.size_id === s.size_id);
          msg += `• ${sizeDef?.label}: ${s.quantity} units\n`;
        }
      });
      msg += `\n`;
    });

    msg += `*Grand Total: ${settings.currency} ${grandTotal.toLocaleString()}*`;
    return msg;
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    alert("Message copied to clipboard!");
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
        <h3 className="text-xl font-medium mb-2">No designs in order</h3>
        <p className="max-w-xs text-center">Select designs from the left panel to start building your order request.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Print-only header */}
      <div className="hidden print:block mb-10 border-b pb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{settings.company_name}</h1>
            <p className="text-slate-500">Professional Textile Manufacturer</p>
          </div>
          <div className="text-right text-slate-900">
            <p className="font-bold">Order ID: {order.id}</p>
            <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 no-print gap-4">
        <div>
          <h2 className="text-2xl font-bold">Order Summary</h2>
          <p className="text-sm text-muted-foreground">{order.id} • {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Button variant="outline" size="sm" onClick={copyMessage} className="whitespace-nowrap">
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={shareToWhatsApp} className="whitespace-nowrap">
            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} className="bg-foreground text-background hover:bg-foreground/90 whitespace-nowrap">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {order.items.map((item) => {
          const design = getDesignById(item.design_id);
          if (!design) return null;

          const itemTotal = item.sizes.reduce((sum, s) => {
            const sizeDef = design.sizes.find(sd => sd.size_id === s.size_id);
            if (!sizeDef) return sum;
            return sum + (s.quantity * sizeDef.pieces_per_unit * sizeDef.rate_per_piece);
          }, 0);

          return (
            <Card key={item.design_id} className="overflow-hidden border-border shadow-sm print:shadow-none print:border-slate-300">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-48 bg-muted border-r relative aspect-square md:aspect-auto">
                    <Image 
                      src={design.image_url} 
                      alt={design.design_name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{design.design_name}</h3>
                        <p className="text-sm font-mono text-muted-foreground">{design.design_id}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemove(item.design_id)}
                        className="text-muted-foreground hover:text-destructive no-print"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Table className="text-sm">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-48">Size/Label</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Rate/Pc</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {design.sizes.map((size) => {
                          const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                          const qty = orderSize?.quantity || 0;
                          const lineTotal = qty * size.pieces_per_unit * size.rate_per_piece;
                          
                          return (
                            <TableRow key={size.size_id}>
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
                                    className="w-16 text-center h-8"
                                  />
                                </div>
                                <span className="hidden print:inline">{qty}</span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">{settings.currency} {size.rate_per_piece}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {settings.currency} {lineTotal.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    
                    <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <p className="text-sm text-muted-foreground italic">
                        {item.note || design.default_note}
                      </p>
                      <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                        <span className="text-xs uppercase tracking-wider font-bold text-primary mr-3">Design Total</span>
                        <span className="text-lg font-bold">{settings.currency} {itemTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Totals Summary Card */}
      <div className="mt-12 mb-20 bg-primary text-primary-foreground rounded-3xl p-8 shadow-xl print:shadow-none print:border print:text-black print:bg-white print:rounded-none">
        <div className="max-w-sm ml-auto space-y-4">
          <div className="flex justify-between opacity-80 print:text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium">{settings.currency} {subtotal.toLocaleString()}</span>
          </div>
          {order.tax_percent > 0 && (
            <div className="flex justify-between opacity-80 print:text-slate-600">
              <span>Tax ({order.tax_percent}%)</span>
              <span className="font-medium">{settings.currency} {taxAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="h-px bg-primary-foreground/20 print:bg-slate-200" />
          <div className="flex justify-between items-center pt-2">
            <span className="text-xl font-bold">Grand Total</span>
            <span className="text-3xl font-bold">{settings.currency} {grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="hidden print:block text-center text-sm text-slate-400 pt-10 border-t">
        <p>Thank you for your business. This is an automatically generated order draft.</p>
        <p>{settings.company_name} • Scarf Order Pro System</p>
      </div>
    </div>
  );
}
