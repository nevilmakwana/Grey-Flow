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
  PlusCircle,
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

  if (!time) return <span className="opacity-0 text-[10px]">Loading...</span>;

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
      <div className="flex flex-col items-center justify-center h-full p-10 bg-background">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-8">
          <Layers className="w-10 h-10 opacity-20" />
        </div>
        <h3 className="text-2xl font-black mb-4 tracking-tight">New Print Order</h3>
        <p className="text-muted-foreground mb-8 text-center max-w-sm">Select a fabric to start building your grouped order.</p>
        <div className="flex gap-4 w-full max-w-md">
          <Button 
            onClick={() => onAddGroup('Satin')} 
            className="flex-1 h-24 rounded-3xl flex flex-col gap-2 bg-muted/40 hover:bg-primary/10 text-muted-foreground hover:text-primary border-2 border-border hover:border-primary/20 transition-all"
          >
            <span className="text-xl font-black">Satin</span>
            <span className="text-[10px] uppercase tracking-widest opacity-70">Premium Fabric</span>
          </Button>
          <Button 
            onClick={() => onAddGroup('Cotton')} 
            className="flex-1 h-24 rounded-3xl flex flex-col gap-2 bg-muted/40 hover:bg-secondary text-muted-foreground hover:text-foreground border-2 border-border transition-all"
          >
            <span className="text-xl font-black">Cotton</span>
            <span className="text-[10px] uppercase tracking-widest opacity-70">Casual Comfort</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-64">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md py-4 px-6 md:px-8 no-print border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Order Request</h2>
            <div className="flex flex-col mt-1">
              <span className="font-mono text-sm font-bold text-primary">{order.id}</span>
              <span className="text-[10px] uppercase tracking-wider mt-0.5"><LiveClock /></span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border">
            <div className="px-3 border-r">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Total Units</span>
              <span className="font-black">{grandTotal}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-xl h-8 text-[10px] uppercase font-bold tracking-widest bg-foreground text-background hover:bg-foreground/90">
                  <Plus className="w-3 h-3 mr-1" /> Add Fabric
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border bg-background/80 backdrop-blur-md shadow-xl p-1 min-w-[120px]">
                <DropdownMenuItem 
                  onClick={() => onAddGroup('Satin')} 
                  className="rounded-xl px-4 py-2 hover:bg-primary/10 transition-colors font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                >
                  Satin
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onAddGroup('Cotton')} 
                  className="rounded-xl px-4 py-2 hover:bg-primary/10 transition-colors font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                >
                  Cotton
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-12">
        {order.fabricGroups.map((group) => {
          const isActive = activeGroupId === group.id;
          
          return (
            <div 
              key={group.id} 
              className={cn(
                "space-y-6 p-1 rounded-[2.5rem] transition-all duration-500",
                isActive && "ring-2 ring-primary ring-offset-8 bg-primary/5 shadow-inner"
              )}
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-2xl border transition-colors",
                    isActive ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-primary/10 text-primary border-primary/20"
                  )}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black tracking-tight">Fabric: {group.fabric_id}</h3>
                      {isActive && (
                        <Badge variant="default" className="bg-primary text-[8px] uppercase font-black px-1.5 h-4 flex items-center gap-1">
                          <Target className="w-2 h-2" /> Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{group.items.length} Designs Selected</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant={isActive ? "default" : "ghost"} 
                    size="sm" 
                    onClick={() => onAddDesignToGroup(group.id)}
                    className={cn(
                      "rounded-xl font-bold text-xs transition-all",
                      isActive ? "bg-primary shadow-md" : "hover:bg-primary/10 text-primary"
                    )}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Design
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onRemoveGroup(group.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {group.items.map((item) => {
                  const design = getDesignById(item.design_id);
                  if (!design) return null;
                  const isHighlighted = highlightedDesignId === item.design_id;

                  return (
                    <Card 
                      key={item.design_id} 
                      id={`design-card-${item.design_id}`}
                      className={cn(
                        "overflow-hidden border-border bg-card shadow-sm rounded-[2rem] transition-all duration-300 hover:shadow-md scroll-mt-32",
                        isHighlighted && "animate-highlight"
                      )}
                    >
                      <CardContent className="p-3 sm:p-0">
                        <div className="flex flex-row items-center sm:items-stretch gap-4 sm:gap-0">
                          <div className="w-20 h-20 sm:w-48 sm:h-48 relative shrink-0 rounded-2xl sm:rounded-none overflow-hidden bg-muted border sm:border-none">
                            <Image src={design.image_url} alt={design.design_id} fill className="object-cover" sizes="(max-width: 640px) 80px, 192px" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center sm:p-6">
                            <div className="flex justify-between items-center mb-2 sm:mb-4">
                              <h3 className="text-base sm:text-xl font-black font-mono tracking-tighter truncate">{design.design_id}</h3>
                              <Button variant="ghost" size="icon" onClick={() => onRemoveItem(group.id, item.design_id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="hidden sm:block rounded-2xl overflow-hidden border border-border bg-background/50">
                              <Table>
                                <TableHeader className="bg-muted/50"><TableRow><TableHead className="font-bold uppercase tracking-widest text-[10px] h-8">Size Specs</TableHead><TableHead className="text-center font-bold uppercase tracking-widest text-[10px] h-8">Quantity</TableHead></TableRow></TableHeader>
                                <TableBody>
                                  {design.sizes.map((size) => {
                                    const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                                    const qty = orderSize?.quantity || 0;
                                    return (
                                      <TableRow key={size.size_id} className="border-border">
                                        <TableCell className="font-bold py-3 text-sm">{size.label}</TableCell>
                                        <TableCell className="text-center py-3">
                                          <Input type="number" min="0" inputMode="numeric" value={qty || ""} onChange={(e) => onUpdateQty(group.id, item.design_id, size.size_id, parseInt(e.target.value) || 0)} onKeyDown={handleKeyDown} className="w-20 mx-auto text-center h-9 rounded-lg border-2 font-bold bg-background text-base sm:text-sm" />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>

                            <div className="flex sm:hidden gap-2">
                              {design.sizes.map((size) => {
                                const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                                const qty = orderSize?.quantity || 0;
                                return (
                                  <div key={size.size_id} className="flex-1 flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase truncate mb-1">{size.label.includes('Small') ? 'Small' : 'Large'}</span>
                                    <Input type="number" min="0" inputMode="numeric" value={qty || ""} onChange={(e) => onUpdateQty(group.id, item.design_id, size.size_id, parseInt(e.target.value) || 0)} onKeyDown={handleKeyDown} className="w-full text-center h-10 rounded-lg border-2 font-bold bg-background text-base" />
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
                {group.items.length === 0 && (
                  <button 
                    onClick={() => onAddDesignToGroup(group.id)}
                    className={cn(
                      "w-full h-32 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all duration-300 group",
                      isActive 
                        ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5" 
                        : "border-border text-muted-foreground hover:bg-muted/30 hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    <PlusCircle className={cn("w-6 h-6 transition-transform group-active:scale-90", isActive ? "opacity-100" : "opacity-40")} />
                    <div className="text-center">
                      <span className="font-bold text-sm block">Tap to add designs for {group.fabric_id}</span>
                      <span className="text-[10px] opacity-60 uppercase tracking-widest font-medium">Select from sidebar or search</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-20 p-8 bg-muted/30 rounded-[3rem] border-2 border-border/50 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-foreground text-background rounded-2xl shadow-lg">
              <Hash className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Consolidated Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col p-6 bg-card rounded-[2rem] border border-border shadow-sm">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Small Scarf Total</span>
              <span className="text-4xl font-black">{totals.small}</span>
            </div>
            <div className="flex flex-col p-6 bg-card rounded-[2rem] border border-border shadow-sm">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Large Scarf Total</span>
              <span className="text-4xl font-black">{totals.large}</span>
            </div>
            <div className="flex flex-col p-6 bg-foreground text-background rounded-[2rem] shadow-2xl shadow-foreground/10">
              <span className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Net Grand Total</span>
              <span className="text-4xl font-black">{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
