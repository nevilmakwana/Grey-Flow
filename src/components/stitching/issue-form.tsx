
"use client";

import React, { useState } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Send, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IssueFormProps {
  designs: Design[];
  onSave: (entry: StitchingEntry) => void;
}

export function IssueForm({ designs, onSave }: IssueFormProps) {
  const { toast } = useToast();
  const [workerName, setWorkerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [labels, setLabels] = useState({ small: 0, large: 0 });
  const [issueItems, setIssueItems] = useState<{ design_id: string; size_id: 'S-SML' | 'S-LGE'; quantity: number }[]>([
    { design_id: '', size_id: 'S-SML', quantity: 0 }
  ]);

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

  const calculateTotals = () => {
    return issueItems.reduce((acc, item) => {
      if (item.size_id === 'S-SML') acc.small += item.quantity;
      if (item.size_id === 'S-LGE') acc.large += item.quantity;
      return acc;
    }, { small: 0, large: 0 });
  };

  const generateMessage = (entry: StitchingEntry) => {
    let msg = `📅 Date: ${entry.date}\n`;
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

    const totals = calculateTotals();
    msg += `\nTotal S: ${totals.small} pcs | L: ${totals.large} pcs\n`;
    msg += `\n*Satin Label (Issued Today):*\n`;
    msg += `S: ${entry.labelsIssued?.small || 0} | L: ${entry.labelsIssued?.large || 0} pcs`;

    return msg;
  };

  const handleSubmit = (withShare = false) => {
    if (!workerName) {
      toast({ variant: "destructive", title: "Missing Worker Name" });
      return;
    }

    const validItems = issueItems.filter(i => i.design_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "No items to issue" });
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
    
    if (withShare) {
      const text = encodeURIComponent(generateMessage(entry));
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }

    setIssueItems([{ design_id: '', size_id: 'S-SML', quantity: 0 }]);
    setLabels({ small: 0, large: 0 });
    toast({ title: "Issue Entry Saved" });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="rounded-[2rem] border-none shadow-sm bg-card">
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Worker Name</Label>
              <Input 
                placeholder="e.g., Ramesh" 
                value={workerName} 
                onChange={e => setWorkerName(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Issue Date</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tighter text-primary">Small (50×50 cm)</h3>
            {issueItems.filter(i => i.size_id === 'S-SML').map((item, idx) => (
              <div key={`small-${idx}`} className="flex gap-2">
                <Input 
                  placeholder="Design ID" 
                  value={item.design_id} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'design_id', e.target.value.toUpperCase())}
                  className="rounded-xl h-12 flex-1"
                />
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={item.quantity || ''} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'quantity', parseInt(e.target.value) || 0)}
                  className="rounded-xl h-12 w-24"
                />
                <Button variant="ghost" size="icon" onClick={() => removeItem(issueItems.indexOf(item))} className="h-12 w-12 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('S-SML')} className="rounded-xl w-full border-dashed border-2 h-12 text-muted-foreground hover:text-primary">
              <Plus className="w-4 h-4 mr-2" /> Add Small Design
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tighter text-primary">Large (90×90 cm)</h3>
            {issueItems.filter(i => i.size_id === 'S-LGE').map((item, idx) => (
              <div key={`large-${idx}`} className="flex gap-2">
                <Input 
                  placeholder="Design ID" 
                  value={item.design_id} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'design_id', e.target.value.toUpperCase())}
                  className="rounded-xl h-12 flex-1"
                />
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={item.quantity || ''} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'quantity', parseInt(e.target.value) || 0)}
                  className="rounded-xl h-12 w-24"
                />
                <Button variant="ghost" size="icon" onClick={() => removeItem(issueItems.indexOf(item))} className="h-12 w-12 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-xl w-full border-dashed border-2 h-12 text-muted-foreground hover:text-primary">
              <Plus className="w-4 h-4 mr-2" /> Add Large Design
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6 bg-muted/30 rounded-2xl">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Labels Issued (Small)</Label>
              <Input 
                type="number" 
                value={labels.small || ''} 
                onChange={e => setLabels({ ...labels, small: parseInt(e.target.value) || 0 })}
                className="rounded-xl h-10 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Labels Issued (Large)</Label>
              <Input 
                type="number" 
                value={labels.large || ''} 
                onChange={e => setLabels({ ...labels, large: parseInt(e.target.value) || 0 })}
                className="rounded-xl h-10 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-primary text-primary-foreground rounded-2xl shadow-lg">
            <div className="text-center flex-1 border-r border-primary-foreground/20">
              <span className="block text-[10px] uppercase font-bold opacity-70">Small Total</span>
              <span className="text-xl font-black">{totals.small}</span>
            </div>
            <div className="text-center flex-1 border-r border-primary-foreground/20">
              <span className="block text-[10px] uppercase font-bold opacity-70">Large Total</span>
              <span className="text-xl font-black">{totals.large}</span>
            </div>
            <div className="text-center flex-1">
              <span className="block text-[10px] uppercase font-bold opacity-70">Net Issued</span>
              <span className="text-xl font-black">{totals.small + totals.large} Pcs</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={() => handleSubmit(false)} variant="outline" className="h-14 rounded-2xl border-2 font-bold hover:bg-muted">
              <Save className="w-5 h-5 mr-2" /> Save Entry
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
