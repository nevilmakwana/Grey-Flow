"use client";

import React, { useState, useEffect } from 'react';
import { Order, Design, AppSettings, FabricGroup } from '@/app/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Hash,
  ShoppingBag,
  Plus,
  Layers,
  ChevronRight,
  Target
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

  if (!time) return <span className="opacity-0 text-xs">Loading...</span>;

  const day = time.getDate().toString().padStart(2, '0');
  const month = time.toLocaleString('en-GB', { month: 'short' });
  const year = time.getFullYear();
  let hours = time.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
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
  highlightedDesignId: string | null;
  activeGroupId: string | null;
  onUpdateQty: (groupId: string, designId: string, sizeId: string, qty: number) => void;
  onRemoveItem: (groupId: string, designId: string) => void;
  onAddGroup: (fabricId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onAddDesignToGroup: (groupId: string) => void;
  settings: AppSettings;
}

export function OrderPanel({ 
  order, 
  designs, 
  highlightedDesignId,
  activeGroupId,
  onUpdateQty, 
  onRemoveItem, 
  onAddGroup, 
  onRemoveGroup,
  onAddDesignToGroup,
  settings 
}: OrderPanelProps) {
  
  const getDesignById = (id: string) => designs.find(d => d.design_id === id);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  useEffect(() => {
    if (highlightedDesignId) {
      const element = document.getElementById(`design-card-${highlightedDesignId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [highlightedDesignId]);

  if (order.fabricGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-background">
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-6">
          <Layers className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-xl font-bold mb-2">Build your order</h3>
        <p className="text-muted-foreground mb-8 text-center max-w-sm text-sm">Select a fabric type below to start grouping your textile designs.</p>
        <div className="flex gap-4 w-full max-w-[270px]">
          <Button 
            onClick={() => onAddGroup('Satin')} 
            variant="outline"
            className="flex-1 h-8 rounded-lg bg-card border-border hover:border-primary hover:text-primary transition-all stripe-shadow-hover"
          >
            <span className="text-lg font-bold">Satin</span>
          </Button>
          <Button 
            onClick={() => onAddGroup('Cotton')} 
            variant="outline"
            className="flex-1 h-8 rounded-lg bg-card border-border hover:border-primary hover:text-primary transition-all stripe-shadow-hover"
          >
            <span className="text-lg font-bold">Cotton</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-64 px-4 sm:px-8">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm py-6 no-print border-b border-border/50">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Dashboard</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{order.id}</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Order Request</h2>
            <div className="mt-1">
              <LiveClock />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right border-r pr-4">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Net Quantity</span>
              <span className="text-xl font-bold text-primary">{grandTotal}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-md font-bold text-sm bg-primary text-primary-foreground stripe-shadow">
                  <Plus className="w-4 h-4 mr-2" /> Add Fabric
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1 stripe-shadow">
                <DropdownMenuItem onClick={() => onAddGroup('Satin')} className="rounded-sm cursor-pointer py-2 font-medium">Satin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddGroup('Cotton')} className="rounded-sm cursor-pointer py-2 font-medium">Cotton</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="py-8 space-y-10">
        {order.fabricGroups.map((group) => {
          const isActive = activeGroupId === group.id;
          
          return (
            <div 
              key={group.id} 
              className={cn(
                "space-y-4 rounded-xl border border-border bg-card stripe-shadow transition-all duration-300",
                isActive && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/20 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-md",
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{group.fabric_id}</h3>
                      {isActive && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold h-5 uppercase tracking-wide">
                          Active Group
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{group.items.length} designs included</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onRemoveGroup(group.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4 space-y-4">
                {group.items.map((item) => {
                  const design = getDesignById(item.design_id);
                  if (!design) return null;
                  const isHighlighted = highlightedDesignId === item.design_id;

                  return (
                    <div 
                      key={item.design_id} 
                      id={`design-card-${item.design_id}`}
                      className={cn(
                        "flex flex-row items-stretch border border-border rounded-lg overflow-hidden bg-white hover:border-primary/50 transition-all duration-200 scroll-mt-32",
                        isHighlighted && "animate-highlight ring-1 ring-primary/30"
                      )}
                    >
                      <div className="w-24 h-24 sm:w-32 sm:h-32 relative shrink-0 bg-muted aspect-square border-r border-border/30">
                        <Image 
                          src={design.image_url} 
                          alt={design.design_id} 
                          fill 
                          className="object-cover" 
                          sizes="(max-width: 640px) 96px, 128px" 
                        />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center px-4 py-2 sm:px-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-foreground">{design.design_id}</h3>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onRemoveItem(group.id, item.design_id)} 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-7 w-7"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        
                        <div className="flex gap-4">
                          {design.sizes.map((size) => {
                            const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                            const qty = orderSize?.quantity || 0;
                            return (
                              <div key={size.size_id} className="flex-1 max-w-[120px]">
                                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 truncate">
                                  {size.label.split(' ')[0]}
                                </label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  value={qty || ""} 
                                  onChange={(e) => onUpdateQty(group.id, item.design_id, size.size_id, parseInt(e.target.value) || 0)} 
                                  onKeyDown={handleKeyDown} 
                                  className="h-9 font-bold bg-muted/10 focus:bg-white text-sm" 
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {group.items.length === 0 && (
                  <button 
                    onClick={() => onAddDesignToGroup(group.id)}
                    className={cn(
                      "w-full h-24 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 transition-all group",
                      isActive 
                        ? "bg-primary/5 border-primary/50 text-primary" 
                        : "text-muted-foreground hover:bg-muted/30 hover:border-primary/30"
                    )}
                  >
                    <span className="font-bold text-sm">Add designs for {group.fabric_id}</span>
                    <span className="text-[10px] font-medium opacity-60 uppercase tracking-widest">Select from the sidebar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-16 p-8 bg-card rounded-xl border border-border stripe-shadow">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 text-primary rounded-md">
              <Hash className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold">Consolidated Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-muted/20 border border-border/50 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-2">Small Total</span>
              <span className="text-3xl font-bold">{totals.small}</span>
            </div>
            <div className="p-6 bg-muted/20 border border-border/50 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-2">Large Total</span>
              <span className="text-3xl font-bold">{totals.large}</span>
            </div>
            <div className="p-6 bg-primary text-primary-foreground rounded-lg stripe-shadow">
              <span className="text-[10px] font-bold uppercase opacity-80 tracking-widest block mb-2">Net Grand Total</span>
              <span className="text-3xl font-bold">{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
