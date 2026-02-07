
"use client";

import React from 'react';
import { Order, Design, AppSettings } from '@/app/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Hash, Calendar, Clock, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ShareViewProps {
  order: Order;
  designs: Design[];
  settings: AppSettings;
  onBack: () => void;
}

export function ShareView({ order, designs, settings, onBack }: ShareViewProps) {
  const getDesignById = (id: string) => designs.find(d => d.design_id === id);

  const formatFullDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date).toUpperCase();
  };

  const totals = order.fabricGroups.reduce((acc, group) => {
    group.items.forEach(item => {
      item.sizes.forEach(s => {
        if (s.size_id === 'S-SML') acc.small += s.quantity;
        if (s.size_id === 'S-LGE') acc.large += s.quantity;
      });
    });
    return acc;
  }, { small: 0, large: 0 });

  const grandTotal = totals.small + totals.large;

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-12 no-print">
        <Button variant="ghost" onClick={onBack} className="rounded-full hover:bg-muted"><ArrowLeft className="w-4 h-4 mr-2" /> Workspace</Button>
        <Button onClick={() => window.print()} className="rounded-full bg-foreground text-background shadow-lg"><Share2 className="w-4 h-4 mr-2" /> Save PDF</Button>
      </div>

      <div className="space-y-16">
        <div className="text-center space-y-4">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Print Order Request</span>
          <h1 className="text-5xl font-black tracking-tighter">Order Summary</h1>
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-xl font-bold text-primary">{order.id}</span>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatFullDate(order.created_at)}</span>
              <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(order.created_at)}</span>
            </div>
          </div>
        </div>

        {order.fabricGroups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.id} className="space-y-8">
              <div className="flex items-center gap-3 border-b-2 pb-4 border-foreground/5">
                <Layers className="w-6 h-6 text-primary" />
                <h2 className="text-3xl font-black tracking-tight">Fabric: {group.fabric_id}</h2>
              </div>
              <div className="space-y-6">
                {group.items.map((item) => {
                  const design = getDesignById(item.design_id);
                  if (!design) return null;
                  return (
                    <Card key={item.design_id} className="overflow-hidden border-border bg-card shadow-sm rounded-[2rem]">
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                          <div className="w-full sm:w-40 aspect-square relative shrink-0 overflow-hidden bg-muted">
                            <Image src={design.image_url} alt={design.design_id} fill className="object-cover" sizes="(max-width: 640px) 100vw, 160px" />
                          </div>
                          <div className="flex-1 p-8 flex flex-col justify-center">
                            <h3 className="text-2xl font-black font-mono tracking-tighter mb-4">{design.design_id}</h3>
                            <div className="space-y-3">
                              {design.sizes.map((size) => {
                                const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                                const qty = orderSize?.quantity || 0;
                                if (qty === 0) return null;
                                return (
                                  <div key={size.size_id} className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">{size.label}</span>
                                    <span className="font-black text-foreground">{(qty).toLocaleString()} pcs</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="pt-16 border-t border-border">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <div className="p-3 bg-foreground text-background rounded-2xl"><Hash className="w-5 h-5" /></div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Consolidated Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-8 bg-muted/20 rounded-[2.5rem] border border-border">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Small Scarf Total</span>
              <span className="text-4xl font-black">{totals.small}</span>
            </div>
            <div className="flex flex-col items-center p-8 bg-muted/20 rounded-[2.5rem] border border-border">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Large Scarf Total</span>
              <span className="text-4xl font-black">{totals.large}</span>
            </div>
            <div className="flex flex-col items-center p-8 bg-foreground text-background rounded-[2.5rem] shadow-2xl">
              <span className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Net Grand Total</span>
              <span className="text-4xl font-black">{grandTotal}</span>
            </div>
          </div>
        </div>

        <div className="pt-16 text-center border-t border-border/10">
          <p className="text-[10px] text-muted-foreground font-light tracking-[0.4em] uppercase">GreyFlow Document System</p>
        </div>
      </div>
    </div>
  );
}
