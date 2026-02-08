"use client";

import React, { useState, useMemo } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
      toast({ variant: "destructive", title: "Select Worker First", description: "Choose a worker to record the receipt." });
      return;
    }

    const validItems = receiveItems.filter(i => i.design_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "No items received", description: "Add at least one design with a quantity." });
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
    toast({ title: "Receive Entry Saved", description: "Finished goods have been checked into inventory." });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-20">
      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-card overflow-hidden stripe-shadow">
        <CardContent className="p-0">
          <div className="p-8 sm:p-12 space-y-10">
            {/* Header Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-10 border-b border-border/50">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  <User className="w-3.5 h-3.5" /> Worker Name
                </Label>
                <select 
                  value={workerName} 
                  onChange={e => setWorkerName(e.target.value)}
                  className="flex h-14 w-full rounded-2xl border-none bg-muted/30 px-6 py-2 text-lg font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Worker</option>
                  {workerNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Receipt Date
                </Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="rounded-2xl h-14 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium px-6"
                />
              </div>
            </div>

            {/* Receipt Items Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between ml-1">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-green-600">
                  <PackageCheck className="w-4 h-4" /> Finished Goods Received
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase">Quality Check Passed</span>
              </div>
              <div className="space-y-3">
                {receiveItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <Input 
                      placeholder="Design ID" 
                      value={item.design_id} 
                      onChange={e => updateItem(idx, 'design_id', e.target.value.toUpperCase())}
                      className="rounded-2xl h-14 bg-white dark:bg-muted/10 border shadow-sm px-6 font-bold flex-1"
                    />
                    <select 
                      value={item.size_id} 
                      onChange={e => updateItem(idx, 'size_id', e.target.value)}
                      className="h-14 rounded-2xl border bg-white dark:bg-muted/10 shadow-sm px-4 text-xs w-24 font-black appearance-none cursor-pointer text-center"
                    >
                      <option value="S-SML">SMALL</option>
                      <option value="S-LGE">LARGE</option>
                    </select>
                    <Input 
                      type="number" 
                      placeholder="Qty" 
                      value={item.quantity || ''} 
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="rounded-2xl h-14 w-28 bg-white dark:bg-muted/10 border shadow-sm px-4 text-center font-black"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-14 w-14 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-2xl w-full border-dashed border-2 h-14 text-muted-foreground hover:text-green-600 hover:border-green-600/50 transition-all font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Add Finished Design
                </Button>
              </div>
            </div>

            {/* Worker Wallet / Label Balance Section */}
            {workerName && (
              <div className="p-8 bg-muted/20 dark:bg-muted/10 rounded-[2.5rem] space-y-6 animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-2 justify-center">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Label Balance Wallet: {workerName}</h4>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-card p-6 rounded-2xl text-center shadow-sm border border-border/50">
                    <span className="block text-[9px] font-black text-muted-foreground uppercase mb-1">Small Labels</span>
                    <span className={cn(
                      "text-3xl font-black tabular-nums",
                      (labelBalance.small - totals.small) < 0 ? 'text-destructive' : 'text-foreground'
                    )}>
                      {labelBalance.small - totals.small}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-card p-6 rounded-2xl text-center shadow-sm border border-border/50">
                    <span className="block text-[9px] font-black text-muted-foreground uppercase mb-1">Large Labels</span>
                    <span className={cn(
                      "text-3xl font-black tabular-nums",
                      (labelBalance.large - totals.large) < 0 ? 'text-destructive' : 'text-foreground'
                    )}>
                      {labelBalance.large - totals.large}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Received Summary */}
            <div className="bg-green-600 text-white p-6 rounded-[2rem] text-center shadow-lg stripe-shadow">
              <span className="block text-[10px] uppercase font-black opacity-70 mb-1 tracking-widest">Total Received Today</span>
              <span className="text-3xl font-black">{totals.small + totals.large} <span className="text-sm opacity-70 font-bold uppercase">Pcs Verified</span></span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Button onClick={() => handleSubmit(false)} variant="outline" className="h-16 rounded-[1.5rem] border-2 font-black text-lg hover:bg-muted transition-all active:scale-[0.98]">
                <CheckCircle className="w-5 h-5 mr-3" /> Save Ledger
              </Button>
              <Button onClick={() => handleSubmit(true)} className="h-16 rounded-[1.5rem] bg-green-600 hover:bg-green-700 text-white font-black text-lg shadow-xl transition-all active:scale-[0.98]">
                <Send className="w-5 h-5 mr-3" /> Save & Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
