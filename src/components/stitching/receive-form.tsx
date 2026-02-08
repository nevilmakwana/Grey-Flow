
"use client";

import React, { useState, useMemo } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Send, CheckCircle, User, CalendarDays, PackageCheck, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReceiveFormProps {
  designs: Design[];
  allEntries: StitchingEntry[];
  onSave: (entry: StitchingEntry) => void;
}

export function ReceiveForm({ designs, allEntries, onSave }: ReceiveFormProps) {
  const { toast } = useToast();
  const [workerName, setWorkerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveItems, setReceiveItems] = useState<{ design_id: string; size_id: 'S-SML' | 'S-LGE'; quantity: number }[]>([
    { design_id: '', size_id: 'S-LGE', quantity: 0 }
  ]);

  const workerNames = useMemo(() => {
    return Array.from(new Set(allEntries.map(e => e.workerName)));
  }, [allEntries]);

  const labelBalance = useMemo(() => {
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

  const calculateTotals = () => {
    return receiveItems.reduce((acc, item) => {
      if (item.size_id === 'S-SML') acc.small += item.quantity;
      if (item.size_id === 'S-LGE') acc.large += item.quantity;
      return acc;
    }, { small: 0, large: 0 });
  };

  const generateMessage = (entry: StitchingEntry) => {
    let msg = `📅 Date: ${entry.date}\n`;
    msg += `✅ *Ready scarves received today*\n\n`;
    const items = entry.items.filter(i => i.quantity > 0);
    items.forEach(i => msg += `• ${i.design_id} (${i.size_id === 'S-SML' ? 'S' : 'L'}): ${i.quantity} pcs\n`);
    const totals = calculateTotals();
    msg += `\nTotal Recd: ${totals.small + totals.large} pcs\n`;
    msg += `\n*Satin Label Balance:*\n`;
    msg += `S: ${labelBalance.small - totals.small} pcs | L: ${labelBalance.large - totals.large} pcs`;
    return msg;
  };

  const handleSubmit = (withShare = false) => {
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
    if (withShare) {
      const text = encodeURIComponent(generateMessage(entry));
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
    setReceiveItems([{ design_id: '', size_id: 'S-LGE', quantity: 0 }]);
    setWorkerName('');
    toast({ title: "Receive Entry Saved" });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Worker Name</Label>
          <select 
            value={workerName} 
            onChange={e => setWorkerName(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-border bg-muted/20 px-4 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 appearance-none cursor-pointer"
          >
            <option value="">Select Worker</option>
            {workerNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Receipt Date</Label>
          <Input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="rounded-lg h-11 bg-muted/20 border-border focus-visible:ring-primary/20 font-medium px-4"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between ml-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-green-600">Finished Goods</h3>
        </div>
        <div className="space-y-2">
          {receiveItems.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <Input 
                placeholder="Design SKU" 
                value={item.design_id} 
                onChange={e => updateItem(idx, 'design_id', e.target.value.toUpperCase())}
                className="rounded-lg h-11 bg-background border font-bold flex-1"
              />
              <select 
                value={item.size_id} 
                onChange={e => updateItem(idx, 'size_id', e.target.value)}
                className="h-11 rounded-lg border bg-background px-3 text-xs w-24 font-bold appearance-none cursor-pointer text-center"
              >
                <option value="S-SML">S</option>
                <option value="S-LGE">L</option>
              </select>
              <Input 
                type="number" 
                placeholder="Qty" 
                value={item.quantity || ''} 
                onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                className="rounded-lg h-11 w-20 bg-background border text-center font-bold"
              />
              <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-11 w-11 rounded-lg text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-lg w-full border-dashed h-11 text-xs font-bold text-muted-foreground hover:text-green-600">
            <Plus className="w-3 h-3 mr-2" /> Add Finished Design
          </Button>
        </div>
      </div>

      {workerName && (
        <div className="p-4 bg-muted/20 rounded-xl grid grid-cols-2 gap-4">
          <div className="text-center">
            <span className="block text-[8px] font-bold text-muted-foreground uppercase mb-1">Small Labels</span>
            <span className={cn("text-xl font-black", (labelBalance.small - totals.small) < 0 ? 'text-destructive' : 'text-foreground')}>
              {labelBalance.small - totals.small}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-[8px] font-bold text-muted-foreground uppercase mb-1">Large Labels</span>
            <span className={cn("text-xl font-black", (labelBalance.large - totals.large) < 0 ? 'text-destructive' : 'text-foreground')}>
              {labelBalance.large - totals.large}
            </span>
          </div>
        </div>
      )}

      <div className="bg-green-600 text-white p-4 rounded-xl flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold opacity-70">Total Received</span>
        <span className="text-2xl font-black">{totals.small + totals.large} <span className="text-xs opacity-70">PCS</span></span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => handleSubmit(false)} variant="outline" className="h-12 rounded-xl font-bold border-border">
          Save Entry
        </Button>
        <Button onClick={() => handleSubmit(true)} className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold">
          Save & Message
        </Button>
      </div>
    </div>
  );
}
