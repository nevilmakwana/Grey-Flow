"use client";

import React, { useState, useMemo } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, PackageCheck, ChevronDown, Calendar as CalendarIcon, MessageCircle, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SearchableDesignSelect } from './searchable-design-select';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ReceiveFormProps {
  designs: Design[];
  allEntries: StitchingEntry[];
  onSave: (entry: StitchingEntry) => void;
}

export function ReceiveForm({ designs, allEntries, onSave }: ReceiveFormProps) {
  const { toast } = useToast();
  const [workerName, setWorkerName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receiveItems, setReceiveItems] = useState<{ design_id: string; size_id: 'S-SML' | 'S-LGE'; quantity: number }[]>([
    { design_id: '', size_id: 'S-SML', quantity: 0 },
    { design_id: '', size_id: 'S-LGE', quantity: 0 }
  ]);

  const smallDesigns = designs.filter(d => d.sizes.some(s => s.size_id === 'S-SML'));
  const largeDesigns = designs.filter(d => d.sizes.some(s => s.size_id === 'S-LGE'));

  const workerNames = useMemo(() => {
    const existing = allEntries.map(e => e.workerName);
    const defaults = ["Nayna", "Ramila", "Vilas"];
    return Array.from(new Set([...defaults, ...existing]));
  }, [allEntries]);

  const historicalBalance = useMemo(() => {
    if (!workerName) return { small: 0, large: 0 };
    
    const workerEntries = allEntries.filter(e => e.workerName === workerName);
    let smallIssued = 0, largeIssued = 0, smallReceived = 0, largeReceived = 0;
    
    workerEntries.forEach(e => {
      if (e.type === 'issue') {
        smallIssued += e.labelsIssued?.small || 0;
        largeIssued += e.labelsIssued?.large || 0;
      } else {
        e.items.forEach(i => {
          if (i.size_id === 'S-SML') smallReceived += i.quantity;
          if (i.size_id === 'S-LGE') largeReceived += i.quantity;
        });
      }
    });
    
    return {
      small: smallIssued - smallReceived,
      large: largeIssued - largeReceived
    };
  }, [workerName, allEntries]);

  const addItem = (size: 'S-SML' | 'S-LGE') => {
    setReceiveItems([...receiveItems, { design_id: '', size_id: size, quantity: 0 }]);
  };

  const removeItem = (index: number) => {
    setReceiveItems(receiveItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...receiveItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setReceiveItems(newItems);
  };

  const currentFormTotals = useMemo(() => {
    return receiveItems.reduce((acc, item) => {
      if (item.size_id === 'S-SML') acc.small += item.quantity;
      if (item.size_id === 'S-LGE') acc.large += item.quantity;
      return acc;
    }, { small: 0, large: 0 });
  }, [receiveItems]);

  const projectedBalance = {
    small: historicalBalance.small - currentFormTotals.small,
    large: historicalBalance.large - currentFormTotals.large
  };

  const generateMessage = (entry: StitchingEntry) => {
    const dateObj = parseISO(entry.date);
    const formattedDate = format(dateObj, "dd-MM-yyyy");

    let msg = `📅 Date: ${formattedDate}\n`;
    msg += `👷 *Worker:* ${entry.workerName}\n`;
    msg += `✅ *Ready scarves received today*\n\n`;
    const items = entry.items.filter(i => i.quantity > 0);
    items.forEach(i => msg += `• ${i.design_id} (${i.size_id === 'S-SML' ? 'S' : 'L'}): ${i.quantity} pcs\n`);
    msg += `\nTotal Recd: ${currentFormTotals.small + currentFormTotals.large} pcs\n`;
    msg += `\n*Satin Label Balance:*\n`;
    msg += `S: ${projectedBalance.small} pcs | L: ${projectedBalance.large} pcs`;
    return msg;
  };

  const handleSubmit = async (platform: 'whatsapp' | 'native') => {
    if (!workerName) {
      toast({ variant: "destructive", title: "Select Worker", description: "Choose a worker to continue." });
      return;
    }
    const validItems = receiveItems.filter(i => i.design_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Add items to receive." });
      return;
    }
    const entry: StitchingEntry = {
      id: `st-${Date.now()}`,
      type: 'receive',
      date,
      workerName,
      items: validItems
    };
    onSave(entry);
    
    const text = generateMessage(entry);

    if (platform === 'whatsapp') {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      const isMobileDevice = typeof navigator !== 'undefined' && 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobileDevice) {
        window.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, '_blank');
      }
    } else {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `Receive - ${entry.workerName}`,
            text: text,
          });
        } catch (err) {}
      } else {
        try {
          await navigator.clipboard.writeText(text);
          toast({ title: "Copied to Clipboard" });
        } catch (err) {}
      }
    }
    
    setReceiveItems([
      { design_id: '', size_id: 'S-SML', quantity: 0 },
      { design_id: '', size_id: 'S-LGE', quantity: 0 }
    ]);
    setWorkerName('');
    toast({ title: "Receive Entry Saved" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Worker Selection</Label>
          <div className="relative group">
            <select 
              value={workerName} 
              onChange={e => setWorkerName(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer transition-all hover:border-primary/50 pr-10"
            >
              <option value="">Select Worker</option>
              {workerNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Receive Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex h-12 w-full justify-start rounded-xl border border-border bg-card px-4 py-2 text-left text-sm font-semibold shadow-sm transition-all hover:border-primary/50",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                {date ? format(parseISO(date), "dd MMM yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border bg-popover" align="start">
              <Calendar
                mode="single"
                selected={date ? parseISO(date) : undefined}
                onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2 ml-1">
            <div className="w-1.5 h-4 bg-green-600 rounded-full" />
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-foreground">Received Small (50×50)</h3>
          </div>
          <div className="space-y-3">
            {receiveItems.map((item, idx) => {
              if (item.size_id !== 'S-SML') return null;
              return (
                <div key={`small-rc-${idx}`} className="flex gap-2">
                  <div className="flex-1">
                    <SearchableDesignSelect 
                      designs={smallDesigns}
                      value={item.design_id}
                      onSelect={(val) => updateItem(idx, 'design_id', val)}
                      placeholder="Select..."
                    />
                  </div>
                  <Input 
                    type="number" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Qty" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="rounded-lg h-10 w-20 bg-background border text-center font-semibold"
                  />
                  <Button variant="outline" size="icon" onClick={() => removeItem(idx)} className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-destructive border-border">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => addItem('S-SML')} className="rounded-lg w-full border-dashed h-10 text-[10px] font-semibold text-muted-foreground hover:text-green-600 uppercase tracking-wider">
              <Plus className="w-3 h-3 mr-2" /> Add Finished Small
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2 ml-1">
            <div className="w-1.5 h-4 bg-green-600 rounded-full" />
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-foreground">Received Large (90×90)</h3>
          </div>
          <div className="space-y-3">
            {receiveItems.map((item, idx) => {
              if (item.size_id !== 'S-LGE') return null;
              return (
                <div key={`large-rc-${idx}`} className="flex gap-2">
                  <div className="flex-1">
                    <SearchableDesignSelect 
                      designs={largeDesigns}
                      value={item.design_id}
                      onSelect={(val) => updateItem(idx, 'design_id', val)}
                      placeholder="Select..."
                    />
                  </div>
                  <Input 
                    type="number" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Qty" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="rounded-lg h-10 w-20 bg-background border text-center font-semibold"
                  />
                  <Button variant="outline" size="icon" onClick={() => removeItem(idx)} className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-destructive border-border">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-lg w-full border-dashed h-10 text-[10px] font-semibold text-muted-foreground hover:text-green-600 uppercase tracking-wider">
              <Plus className="w-3 h-3 mr-2" /> Add Finished Large
            </Button>
          </div>
        </div>
      </div>

      {workerName && (
        <div className="p-5 bg-muted/10 rounded-xl border border-border/50 stripe-shadow">
          <div className="flex items-center gap-2 mb-4">
            <PackageCheck className="w-4 h-4 text-green-600" />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Satin Label Balance Inventory</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Small Balance</span>
                <span className="text-[9px] font-medium text-muted-foreground/50">{historicalBalance.small} issued</span>
              </div>
              <div className={cn(
                "flex items-center justify-center h-14 rounded-xl border transition-all",
                projectedBalance.small < 0 ? "bg-destructive/5 border-destructive/20 text-destructive" : "bg-background border-border/50 text-foreground"
              )}>
                <span className="text-2xl font-semibold tracking-tighter">{projectedBalance.small} <span className="text-[10px] opacity-50 ml-1">PCS</span></span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Large Balance</span>
                <span className="text-[9px] font-medium text-muted-foreground/50">{historicalBalance.large} issued</span>
              </div>
              <div className={cn(
                "flex items-center justify-center h-14 rounded-xl border transition-all",
                projectedBalance.large < 0 ? "bg-destructive/5 border-destructive/20 text-destructive" : "bg-background border-border/50 text-foreground"
              )}>
                <span className="text-2xl font-semibold tracking-tighter">{projectedBalance.large} <span className="text-[10px] opacity-50 ml-1">PCS</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border border-border/50 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-border/50 pr-4">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Small</span>
            <span className="text-sm font-semibold text-foreground">{currentFormTotals.small}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Large</span>
            <span className="text-sm font-semibold text-foreground">{currentFormTotals.large}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Total</span>
          <span className="text-lg font-semibold text-green-600 tracking-tight">
            {currentFormTotals.small + currentFormTotals.large} <span className="text-[10px] opacity-60">PCS</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <Button 
          onClick={() => handleSubmit('whatsapp')} 
          className="h-14 rounded-xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-semibold shadow-none active:scale-95 transition-all"
        >
          <MessageCircle className="w-5 h-5 mr-2" /> WhatsApp
        </Button>
        <Button 
          onClick={() => handleSubmit('native')} 
          variant="outline"
          className="h-14 rounded-xl border-none bg-muted/50 text-foreground hover:bg-muted font-semibold shadow-none active:scale-95 transition-all"
        >
          <Share2 className="w-5 h-5 mr-2" /> Share More
        </Button>
      </div>
    </div>
  );
}