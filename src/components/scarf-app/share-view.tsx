
"use client";

import React, { useState } from 'react';
import { Order, Design, AppSettings } from '@/app/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ShareViewProps {
  order: Order;
  designs: Design[];
  settings: AppSettings;
  onBack: () => void;
}

export function ShareView({ order, designs, settings, onBack }: ShareViewProps) {
  const [recipient, setRecipient] = useState("Oseas Print");
  const [preparedBy, setPreparedBy] = useState("Hemil M");

  const getDesignById = (id: string) => designs.find(d => d.design_id === id);

  const formatFullDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).format(date);
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

  return (
    <div className="min-h-screen bg-white text-black p-0 sm:p-8 md:p-12 selection:bg-primary/20">
      {/* Controls - Hidden on Print */}
      <div className="max-w-[1000px] mx-auto mb-8 flex justify-between items-center no-print px-4">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="rounded-xl font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
        </Button>
        <div className="flex gap-3">
          <Button 
            onClick={() => window.print()} 
            className="rounded-xl bg-black text-white hover:bg-black/80 font-medium px-6 shadow-lg"
          >
            <Printer className="w-4 h-4 mr-2" /> Print A4 PDF
          </Button>
        </div>
      </div>

      {/* A4 Content Container */}
      <div className="max-w-[1000px] mx-auto bg-white print:m-0 print:p-0">
        
        {/* Header Section */}
        <header className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 relative opacity-80 shrink-0">
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-gray-300 rounded-sm rotate-45" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400 tracking-wide mb-0.5">Grey Exim</p>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">Fabric Print Order</h1>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">To:</span>
              <div className="relative group min-w-[120px]">
                <Input 
                  value={recipient} 
                  onChange={(e) => setRecipient(e.target.value)} 
                  className="h-6 w-full border-none p-0 text-right font-medium focus:ring-0 bg-transparent no-print inline-block"
                />
                <span className="hidden print:inline font-medium text-sm text-gray-900">{recipient}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Date:</span>
              <span className="font-medium text-sm text-gray-900">{formatFullDate(order.created_at)}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Order No:</span>
              <span className="font-medium text-sm text-gray-900">{order.id}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Prepared by:</span>
              <div className="relative group min-w-[120px]">
                <Input 
                  value={preparedBy} 
                  onChange={(e) => setPreparedBy(e.target.value)} 
                  className="h-6 w-full border-none p-0 text-right font-medium focus:ring-0 bg-transparent no-print inline-block"
                />
                <span className="hidden print:inline font-medium text-sm text-gray-900">{preparedBy}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Orders by Fabric Group */}
        {order.fabricGroups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <section key={group.id} className="mb-12 print-avoid-break">
              <div className="flex items-center gap-3 mb-6 px-4 sm:px-0">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.2em]">Fabric Type:</span>
                <span className="bg-black text-white text-[10px] font-semibold px-4 py-1 rounded-full tracking-wider print:bg-black print:text-white">
                  {group.fabric_id}
                </span>
              </div>

              {/* Grid Layout - 4 columns as per design */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 sm:px-0">
                {group.items.map((item) => {
                  const design = getDesignById(item.design_id);
                  if (!design) return null;
                  
                  return (
                    <div key={item.design_id} className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-4 relative bg-gray-50/20 print:bg-white print:border-gray-200">
                      {/* SKU Badge - High visibility as per design */}
                      <div className="absolute top-6 left-6 z-10">
                        <span className="bg-[#007AFF] text-white text-[8px] font-semibold px-2 py-1 rounded-sm shadow-sm print:bg-[#007AFF] print:text-white">
                          {design.design_id.replace('OG/SCF/', '')}
                        </span>
                      </div>

                      {/* Image Container */}
                      <div className="aspect-square relative rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                        <Image 
                          src={design.image_url} 
                          alt={design.design_id} 
                          fill 
                          className="object-cover" 
                          sizes="(max-width: 640px) 50vw, 250px"
                        />
                      </div>

                      {/* Quantity Rows - Aligned left and right */}
                      <div className="space-y-1.5 px-0.5">
                        {design.sizes.map((size) => {
                          const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                          const qty = orderSize?.quantity || 0;
                          return (
                            <div key={size.size_id} className="flex justify-between items-center text-[10px]">
                              <span className="text-gray-400 font-medium">
                                {size.size_id === 'S-SML' ? '50x50 cm (Small)' : '90x90 cm (Large)'}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {qty > 0 ? `${qty} pcs` : '0 pcs'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Footer Summary - Bottom Left Alignment */}
        <footer className="mt-16 pt-8 border-t border-gray-100 px-4 sm:px-0 print-avoid-break">
          <div className="max-w-xs space-y-2">
            <h3 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">Total Quantity</h3>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-gray-400 font-medium">50x50 cm (Small):</span>
              <span className="font-semibold text-gray-900">{totals.small} pcs</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-gray-400 font-medium">90x90 cm (Large):</span>
              <span className="font-semibold text-gray-900">{totals.large} pcs</span>
            </div>
            <div className="pt-3 border-t border-gray-50 flex justify-between items-center mt-2">
              <span className="text-[11px] font-semibold text-gray-900 uppercase">Net Grand Total:</span>
              <span className="text-lg font-semibold text-gray-900">{totals.small + totals.large} pcs</span>
            </div>
          </div>
        </footer>

        {/* System ID - Print Only */}
        <div className="mt-12 text-center hidden print:block">
          <p className="text-[8px] text-gray-200 font-medium uppercase tracking-[0.5em]">GreyFlow Document System</p>
        </div>
      </div>
    </div>
  );
}
