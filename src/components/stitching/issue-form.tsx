
"use client";

import React, { useState } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Send, Save, User, CalendarDays, ClipboardList, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
      toast({ variant: "destructive", title: "Missing Worker Name", description: "Please enter the worker's name." });
      return;
    }
    const validItems = issueItems.filter(i => i.design_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "No items to issue", description: "Please add at least one design with a quantity." });
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
    setWorkerName('');
    toast({ title: "Issue Entry Saved" });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Worker Name</Label>
          <Input 
            placeholder="Worker Name" 
            value={workerName} 
            onChange={e => setWorkerName(e.target.value)}
            className="rounded-lg h-11 bg-muted/20 border-border focus-visible:ring-primary/20 font-medium px-4"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Issue Date</Label>
          <Input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="rounded-lg h-11 bg-muted/20 border-border focus-visible:ring-primary/20 font-medium px-4"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Small (50×50 cm)</h3>
          <div className="space-y-2">
            {issueItems.filter(i => i.size_id === 'S-SML').map((item, idx) => (
              <div key={`small-${idx}`} className="flex gap-2">
                <Input 
                  placeholder="Design SKU" 
                  value={item.design_id} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'design_id', e.target.value.toUpperCase())}
                  className="rounded-lg h-11 bg-background border font-bold flex-1"
                />
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={item.quantity || ''} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'quantity', parseInt(e.target.value) || 0)}
                  className="rounded-lg h-11 w-24 bg-background border text-center font-bold"
                />
                <Button variant="ghost" size="icon" onClick={() => removeItem(issueItems.indexOf(item))} className="h-11 w-11 rounded-lg text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('S-SML')} className="rounded-lg w-full border-dashed h-11 text-xs font-bold text-muted-foreground hover:text-primary">
              <Plus className="w-3 h-3 mr-2" /> Add Small Design
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Large (90×90 cm)</h3>
          <div className="space-y-2">
            {issueItems.filter(i => i.size_id === 'S-LGE').map((item, idx) => (
              <div key={`large-${idx}`} className="flex gap-2">
                <Input 
                  placeholder="Design SKU" 
                  value={item.design_id} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'design_id', e.target.value.toUpperCase())}
                  className="rounded-lg h-11 bg-background border font-bold flex-1"
                />
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={item.quantity || ''} 
                  onChange={e => updateItem(issueItems.indexOf(item), 'quantity', parseInt(e.target.value) || 0)}
                  className="rounded-lg h-11 w-24 bg-background border text-center font-bold"
                />
                <Button variant="ghost" size="icon" onClick={() => removeItem(issueItems.indexOf(item))} className="h-11 w-11 rounded-lg text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-lg w-full border-dashed h-11 text-xs font-bold text-muted-foreground hover:text-primary">
              <Plus className="w-3 h-3 mr-2" /> Add Large Design
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/20 rounded-xl space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Satin Labels</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Small</Label>
            <Input 
              type="number" 
              value={labels.small || ''} 
              onChange={e => setLabels({ ...labels, small: parseInt(e.target.value) || 0 })}
              className="rounded-lg h-10 bg-background border text-center font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Large</Label>
            <Input 
              type="number" 
              value={labels.large || ''} 
              onChange={e => setLabels({ ...labels, large: parseInt(e.target.value) || 0 })}
              className="rounded-lg h-10 bg-background border text-center font-bold"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-xl shadow-sm">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold opacity-70">Small</span>
            <span className="text-lg font-bold">{totals.small}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold opacity-70">Large</span>
            <span className="text-lg font-bold">{totals.large}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[8px] uppercase font-bold opacity-70 block">Total Issued</span>
          <span className="text-2xl font-black">{totals.small + totals.large}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => handleSubmit(false)} variant="outline" className="h-12 rounded-xl font-bold border-border">
          Save Entry
        </Button>
        <Button onClick={() => handleSubmit(true)} className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
          Save & Message
        </Button>
      </div>
    </div>
  );
}
