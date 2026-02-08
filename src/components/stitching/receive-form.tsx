
"use client";

import React, { useState, useMemo } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      toast({ variant: "destructive", title: "Select Worker First" });
      return;
    }

    const validItems = receiveItems.filter(i => i.design_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "No items received" });
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
    toast({ title: "Receive Entry Saved" });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="rounded-[2rem] border-none shadow-sm bg-card">
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Worker Name</Label>
              <select 
                value={workerName} 
                onChange={e => setWorkerName(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select Worker</option>
                {workerNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recd Date</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tighter text-green-600">Finished Items Recd</h3>
            {receiveItems.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input 
                  placeholder="Design ID" 
                  value={item.design_id} 
                  onChange={e => updateItem(idx, 'design_id', e.target.value.toUpperCase())}
                  className="rounded-xl h-12 flex-1"
                />
                <select 
                  value={item.size_id} 
                  onChange={e => updateItem(idx, 'size_id', e.target.value)}
                  className="h-12 rounded-xl border border-input bg-background px-2 text-xs w-20"
                >
                  <option value="S-SML">S</option>
                  <option value="S-LGE">L</option>
                </select>
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={item.quantity || ''} 
                  onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                  className="rounded-xl h-12 w-20"
                />
                <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-12 w-12 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-xl w-full border-dashed border-2 h-12 text-muted-foreground hover:text-green-600">
              <Plus className="w-4 h-4 mr-2" /> Add Design Recd
            </Button>
          </div>

          {workerName && (
            <div className="p-6 bg-muted/30 rounded-2xl space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Label Balance with {workerName}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl text-center border shadow-sm">
                  <span className="block text-[8px] font-bold text-muted-foreground uppercase">Small Balance</span>
                  <span className={`text-xl font-black ${labelBalance.small < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {labelBalance.small - totals.small}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl text-center border shadow-sm">
                  <span className="block text-[8px] font-bold text-muted-foreground uppercase">Large Balance</span>
                  <span className={`text-xl font-black ${labelBalance.large < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {labelBalance.large - totals.large}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={() => handleSubmit(false)} variant="outline" className="h-14 rounded-2xl border-2 font-bold hover:bg-muted">
              <CheckCircle className="w-5 h-5 mr-2" /> Save Entry
            </Button>
            <Button onClick={() => handleSubmit(true)} className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-xl">
              <Send className="w-5 h-5 mr-2" /> Save & Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
