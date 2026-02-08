"use client";

import React, { useState } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
    toast({ title: "Issue Entry Saved", description: "The stitching issue has been recorded successfully." });
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
                <Input 
                  placeholder="e.g., Ramesh" 
                  value={workerName} 
                  onChange={e => setWorkerName(e.target.value)}
                  className="rounded-2xl h-14 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium px-6"
                />
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Issue Date
                </Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="rounded-2xl h-14 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium px-6"
                />
              </div>
            </div>

            {/* Designs Sections */}
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between ml-1">
                  <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
                    <ClipboardList className="w-4 h-4" /> Small (50×50 cm)
                  </h3>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase">Material Issue</span>
                </div>
                <div className="space-y-3">
                  {issueItems.filter(i => i.size_id === 'S-SML').map((item, idx) => (
                    <div key={`small-${idx}`} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <Input 
                        placeholder="Design ID" 
                        value={item.design_id} 
                        onChange={e => updateItem(issueItems.indexOf(item), 'design_id', e.target.value.toUpperCase())}
                        className="rounded-2xl h-14 bg-white dark:bg-muted/10 border shadow-sm px-6 font-bold"
                      />
                      <Input 
                        type="number" 
                        placeholder="Qty" 
                        value={item.quantity || ''} 
                        onChange={e => updateItem(issueItems.indexOf(item), 'quantity', parseInt(e.target.value) || 0)}
                        className="rounded-2xl h-14 w-28 bg-white dark:bg-muted/10 border shadow-sm px-4 text-center font-black"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(issueItems.indexOf(item))} className="h-14 w-14 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem('S-SML')} className="rounded-2xl w-full border-dashed border-2 h-14 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Add Small Design
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between ml-1">
                  <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
                    <ClipboardList className="w-4 h-4" /> Large (90×90 cm)
                  </h3>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase">Material Issue</span>
                </div>
                <div className="space-y-3">
                  {issueItems.filter(i => i.size_id === 'S-LGE').map((item, idx) => (
                    <div key={`large-${idx}`} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <Input 
                        placeholder="Design ID" 
                        value={item.design_id} 
                        onChange={e => updateItem(issueItems.indexOf(item), 'design_id', e.target.value.toUpperCase())}
                        className="rounded-2xl h-14 bg-white dark:bg-muted/10 border shadow-sm px-6 font-bold"
                      />
                      <Input 
                        type="number" 
                        placeholder="Qty" 
                        value={item.quantity || ''} 
                        onChange={e => updateItem(issueItems.indexOf(item), 'quantity', parseInt(e.target.value) || 0)}
                        className="rounded-2xl h-14 w-28 bg-white dark:bg-muted/10 border shadow-sm px-4 text-center font-black"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(issueItems.indexOf(item))} className="h-14 w-14 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-2xl w-full border-dashed border-2 h-14 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Add Large Design
                  </Button>
                </div>
              </div>
            </div>

            {/* Labels Section */}
            <div className="p-8 bg-muted/20 dark:bg-muted/10 rounded-[2rem] space-y-6">
              <div className="flex items-center gap-2 ml-1">
                <Tag className="w-4 h-4 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Satin Labels Issued Today</h4>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Small Labels</Label>
                  <Input 
                    type="number" 
                    value={labels.small || ''} 
                    onChange={e => setLabels({ ...labels, small: parseInt(e.target.value) || 0 })}
                    className="rounded-2xl h-12 bg-white dark:bg-card border-none shadow-sm text-center font-black"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Large Labels</Label>
                  <Input 
                    type="number" 
                    value={labels.large || ''} 
                    onChange={e => setLabels({ ...labels, large: parseInt(e.target.value) || 0 })}
                    className="rounded-2xl h-12 bg-white dark:bg-card border-none shadow-sm text-center font-black"
                  />
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/30 rounded-[2.5rem] overflow-hidden">
              <div className="bg-white dark:bg-card/40 p-6 text-center">
                <span className="block text-[9px] uppercase font-black opacity-50 mb-1">Small Total</span>
                <span className="text-2xl font-black text-primary">{totals.small}</span>
              </div>
              <div className="bg-white dark:bg-card/40 p-6 text-center">
                <span className="block text-[9px] uppercase font-black opacity-50 mb-1">Large Total</span>
                <span className="text-2xl font-black text-primary">{totals.large}</span>
              </div>
              <div className="bg-primary text-primary-foreground p-6 text-center flex flex-col justify-center">
                <span className="block text-[9px] uppercase font-black opacity-70 mb-1">Total Issued</span>
                <span className="text-2xl font-black">{totals.small + totals.large} <span className="text-xs opacity-70 font-bold uppercase">Pcs</span></span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Button onClick={() => handleSubmit(false)} variant="outline" className="h-16 rounded-[1.5rem] border-2 font-black text-lg hover:bg-muted transition-all active:scale-[0.98]">
                <Save className="w-5 h-5 mr-3" /> Save Ledger
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
