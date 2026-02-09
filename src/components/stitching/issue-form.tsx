
"use client";

import React, { useState, useMemo } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Tag, ChevronDown, Calendar as CalendarIcon, MessageCircle, Share2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SearchableDesignSelect } from './searchable-design-select';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface IssueFormProps {
  designs: Design[];
  allEntries: StitchingEntry[];
  onSave: (entry: StitchingEntry) => void;
}

export function IssueForm({ designs, allEntries, onSave }: IssueFormProps) {
  const { toast } = useToast();
  const [workerName, setWorkerName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [labels, setLabels] = useState({ small: 0, large: 0 });
  const [issueItems, setIssueItems] = useState<{ design_id: string; size_id: 'S-SML' | 'S-LGE'; quantity: number }[]>([
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

  const currentWorkerBalance = useMemo(() => {
    if (!workerName) return { small: 0, large: 0 };
    
    const workerEntries = allEntries.filter(e => e.workerName === workerName);
    let smallBalance = 0;
    let largeBalance = 0;
    
    const sortedEntries = [...workerEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedEntries.forEach(e => {
      if (e.type === 'issue') {
        smallBalance += e.labelsIssued?.small || 0;
        largeBalance += e.labelsIssued?.large || 0;
      } else if (e.type === 'receive') {
        e.items.forEach(i => {
          if (i.size_id === 'S-SML') smallBalance -= i.quantity;
          if (i.size_id === 'S-LGE') largeBalance -= i.quantity;
        });
      } else if (e.type === 'balance-check') {
        smallBalance = e.labelsRemaining?.small || 0;
        largeBalance = e.labelsRemaining?.large || 0;
      }
    });
    
    return { small: smallBalance, large: largeBalance };
  }, [workerName, allEntries]);

  const addItem = (size: 'S-SML' | 'S-LGE') => {
    setIssueItems([...issueItems, { design_id: '', size_id: size, quantity: 0 }]);
  };

  const removeItem = (index: number) => {
    setIssueItems(issueItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...issueItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setIssueItems(newItems);
  };

  const calculateFormTotals = () => {
    return issueItems.reduce((acc, item) => {
      if (item.size_id === 'S-SML') acc.small += item.quantity;
      if (item.size_id === 'S-LGE') acc.large += item.quantity;
      return acc;
    }, { small: 0, large: 0 });
  };

  const generateMessage = (entry: StitchingEntry) => {
    const formattedDate = format(parseISO(entry.date), "dd-MM-yyyy");

    let msg = `📅 Date: ${formattedDate}\n`;
    msg += `👷 *Worker:* ${entry.workerName}\n`;
    msg += `🧣 *Issued for stitching today*\n\n`;
    
    const smalls = entry.items.filter(i => i.size_id === 'S-SML' && i.quantity > 0);
    const larges = entry.items.filter(i => i.size_id === 'S-LGE' && i.quantity > 0);
    
    if (smalls.length > 0) {
      msg += `*Small (50×50 cm)*\n`;
      smalls.forEach(i => msg += `• ${i.design_id}: ${i.quantity} pcs\n`);
    }
    if (larges.length > 0) {
      msg += `\n*Large (90×90 cm)*\n`;
      larges.forEach(i => msg += `• ${i.design_id}: ${i.quantity} pcs\n`);
    }
    
    const formTotals = calculateFormTotals();
    msg += `\nTotal S: ${formTotals.small} | L: ${formTotals.large} pcs\n`;
    msg += `\n*Satin Labels (Issued Today):*\n`;
    msg += `S: ${entry.labelsIssued?.small || 0} | L: ${entry.labelsIssued?.large || 0} pcs\n`;
    msg += `*Closing Balance:* S: ${currentWorkerBalance.small + (entry.labelsIssued?.small || 0)} | L: ${currentWorkerBalance.large + (entry.labelsIssued?.large || 0)}`;
    return msg;
  };

  const handleSubmit = async (platform: 'whatsapp' | 'native') => {
    if (!workerName) {
      toast({ variant: "destructive", title: "Select Worker", description: "Please choose a worker from the list." });
      return;
    }
    const validItems = issueItems.filter(i => i.design_id && i.quantity > 0);
    if (validItems.length === 0 && labels.small === 0 && labels.large === 0) {
      toast({ variant: "destructive", title: "Empty Form", description: "Please add items or issue labels." });
      return;
    }
    const entry: StitchingEntry = {
      id: `st-${Date.now()}`,
      type: 'issue',
      date,
      workerName,
      items: validItems,
      labelsIssued: labels
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
          await navigator.share({ title: `Issue - ${entry.workerName}`, text });
        } catch (err) {}
      } else {
        try {
          await navigator.clipboard.writeText(text);
          toast({ title: "Copied to Clipboard" });
        } catch (err) {}
      }
    }
    
    setIssueItems([{ design_id: '', size_id: 'S-SML', quantity: 0 }, { design_id: '', size_id: 'S-LGE', quantity: 0 }]);
    setLabels({ small: 0, large: 0 });
    setWorkerName('');
    toast({ title: "Issue Entry Saved" });
  };

  const formTotals = calculateFormTotals();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground ml-1">Worker</Label>
          <div className="relative group">
            <select 
              value={workerName} 
              onChange={e => setWorkerName(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all hover:border-primary/50 pr-10"
            >
              <option value="">Select Worker</option>
              {workerNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground ml-1">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex h-12 w-full justify-start rounded-xl border border-border bg-card px-4 py-2 text-left text-sm font-medium shadow-none transition-all hover:border-primary/50",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {date ? format(parseISO(date), "dd MMM yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border bg-popover" align="start">
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

      {workerName && (
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-primary">Labels Balance</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Small:</span>
              <span className="text-sm font-semibold text-foreground">{currentWorkerBalance.small}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Large:</span>
              <span className="text-sm font-semibold text-foreground">{currentWorkerBalance.large}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1 ml-1">
            <div className="w-1 h-3.5 bg-primary rounded-full" />
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Small (50×50 cm)</h3>
          </div>
          <div className="space-y-3">
            {issueItems.map((item, idx) => {
              if (item.size_id !== 'S-SML') return null;
              return (
                <div key={`small-${idx}`} className="flex gap-2">
                  <div className="flex-1">
                    <SearchableDesignSelect 
                      designs={smallDesigns}
                      value={item.design_id}
                      onSelect={(val) => updateItem(idx, 'design_id', val)}
                      placeholder="Select SKU..."
                    />
                  </div>
                  <Input 
                    type="number" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Qty" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="rounded-lg h-10 w-20 bg-background border text-center font-semibold placeholder:text-[10px]"
                  />
                  <Button variant="outline" size="icon" onClick={() => removeItem(idx)} className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground border-border">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => addItem('S-SML')} className="rounded-lg w-full border-dashed h-10 text-[10px] font-medium text-muted-foreground uppercase tracking-wider transition-all">
              <Plus className="w-3 h-3 mr-2" /> Add Small SKU
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1 ml-1">
            <div className="w-1 h-3.5 bg-primary rounded-full" />
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Large (90×90 cm)</h3>
          </div>
          <div className="space-y-3">
            {issueItems.map((item, idx) => {
              if (item.size_id !== 'S-LGE') return null;
              return (
                <div key={`large-${idx}`} className="flex gap-2">
                  <div className="flex-1">
                    <SearchableDesignSelect 
                      designs={largeDesigns}
                      value={item.design_id}
                      onSelect={(val) => updateItem(idx, 'design_id', val)}
                      placeholder="Select SKU..."
                    />
                  </div>
                  <Input 
                    type="number" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Qty" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="rounded-lg h-10 w-20 bg-background border text-center font-semibold placeholder:text-[10px]"
                  />
                  <Button variant="outline" size="icon" onClick={() => removeItem(idx)} className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground border-border">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-lg w-full border-dashed h-10 text-[10px] font-medium text-muted-foreground uppercase tracking-wider transition-all">
              <Plus className="w-3 h-3 mr-2" /> Add Large SKU
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Satin Labels Issued Today</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-medium text-muted-foreground uppercase ml-1">Small Labels</Label>
            <Input 
              type="number" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={labels.small || ''} 
              onChange={e => setLabels({ ...labels, small: parseInt(e.target.value) || 0 })}
              className="rounded-lg h-10 bg-background border text-center font-semibold placeholder:text-[10px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-medium text-muted-foreground uppercase ml-1">Large Labels</Label>
            <Input 
              type="number" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={labels.large || ''} 
              onChange={e => setLabels({ ...labels, large: parseInt(e.target.value) || 0 })}
              className="rounded-lg h-10 bg-background border text-center font-semibold placeholder:text-[10px]"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-muted/10 border border-border/50 rounded-xl flex items-center justify-between gap-4 h-12">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Small:</span>
            <span className="text-sm font-semibold">{formTotals.small}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Large:</span>
            <span className="text-sm font-semibold">{formTotals.large}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Total:</span>
          <span className="text-lg font-semibold text-primary">
            {formTotals.small + formTotals.large} <span className="text-[10px] opacity-60">PCS</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <Button 
          onClick={() => handleSubmit('whatsapp')} 
          className="h-14 rounded-xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-medium shadow-none transition-all"
        >
          <MessageCircle className="w-5 h-5 mr-2" /> WhatsApp
        </Button>
        <Button 
          onClick={() => handleSubmit('native')} 
          variant="outline"
          className="h-14 rounded-xl border-none bg-muted/50 text-foreground hover:bg-muted font-medium shadow-none transition-all"
        >
          <Share2 className="w-5 h-5 mr-2" /> Share More
        </Button>
      </div>
    </div>
  );
}
