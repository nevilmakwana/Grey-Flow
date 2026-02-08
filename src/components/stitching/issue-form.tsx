"use client";

import React, { useState } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Tag, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SearchableDesignSelect } from './searchable-design-select';

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
    { design_id: '', size_id: 'S-SML', quantity: 0 },
    { design_id: '', size_id: 'S-LGE', quantity: 0 }
  ]);

  const smallDesigns = designs.filter(d => d.sizes.some(s => s.size_id === 'S-SML'));
  const largeDesigns = designs.filter(d => d.sizes.some(s => s.size_id === 'S-LGE'));

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
    // Format date to DD-MM-YYYY for Indian standard
    const [y, m, d] = entry.date.split('-');
    const formattedDate = `${d}-${m}-${y}`;

    let msg = `📅 Date: ${formattedDate}\n`;
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
      toast({ variant: "destructive", title: "Select Worker", description: "Please choose a worker from the list." });
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
    setIssueItems([
      { design_id: '', size_id: 'S-SML', quantity: 0 },
      { design_id: '', size_id: 'S-LGE', quantity: 0 }
    ]);
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
          <select 
            value={workerName} 
            onChange={e => setWorkerName(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-border bg-muted/20 px-4 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 appearance-none cursor-pointer"
          >
            <option value="">Select Worker</option>
            <option value="Nayna">Nayna</option>
            <option value="Ramila">Ramila</option>
            <option value="Vilas">Vilas</option>
          </select>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Small (50×50 cm)</h3>
          </div>
          <div className="space-y-2">
            {issueItems.map((item, idx) => {
              if (item.size_id !== 'S-SML') return null;
              return (
                <div key={`small-${idx}`} className="flex gap-2">
                  <div className="flex-1">
                    <SearchableDesignSelect 
                      designs={smallDesigns}
                      value={item.design_id}
                      onSelect={(val) => updateItem(idx, 'design_id', val)}
                      placeholder="Select Small Design..."
                    />
                  </div>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="rounded-lg h-10 w-20 bg-background border text-center font-bold"
                  />
                  <Button variant="outline" size="icon" onClick={() => removeItem(idx)} className="h-10 w-10 rounded-lg text-muted-foreground hover:text-destructive border-border">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => addItem('S-SML')} className="rounded-lg w-full border-dashed h-10 text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-wider">
              <Plus className="w-3 h-3 mr-2" /> Add Small Design
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Large (90×90 cm)</h3>
          </div>
          <div className="space-y-2">
            {issueItems.map((item, idx) => {
              if (item.size_id !== 'S-LGE') return null;
              return (
                <div key={`large-${idx}`} className="flex gap-2">
                  <div className="flex-1">
                    <SearchableDesignSelect 
                      designs={largeDesigns}
                      value={item.design_id}
                      onSelect={(val) => updateItem(idx, 'design_id', val)}
                      placeholder="Select Large Design..."
                    />
                  </div>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="rounded-lg h-10 w-20 bg-background border text-center font-bold"
                  />
                  <Button variant="outline" size="icon" onClick={() => removeItem(idx)} className="h-10 w-10 rounded-lg text-muted-foreground hover:text-destructive border-border">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => addItem('S-LGE')} className="rounded-lg w-full border-dashed h-10 text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-wider">
              <Plus className="w-3 h-3 mr-2" /> Add Large Design
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/10 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-3 h-3 text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Satin Labels Issued Today</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black text-muted-foreground uppercase ml-1">Small Labels</Label>
            <Input 
              type="number" 
              value={labels.small || ''} 
              onChange={e => setLabels({ ...labels, small: parseInt(e.target.value) || 0 })}
              className="rounded-lg h-10 bg-background border text-center font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black text-muted-foreground uppercase ml-1">Large Labels</Label>
            <Input 
              type="number" 
              value={labels.large || ''} 
              onChange={e => setLabels({ ...labels, large: parseInt(e.target.value) || 0 })}
              className="rounded-lg h-10 bg-background border text-center font-bold"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-5 bg-foreground text-background rounded-xl shadow-lg">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-black opacity-50 tracking-widest">Small</span>
            <span className="text-xl font-black">{totals.small}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-black opacity-50 tracking-widest">Large</span>
            <span className="text-xl font-black">{totals.large}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[8px] uppercase font-black opacity-50 tracking-widest block mb-1">Total Issued</span>
          <span className="text-3xl font-black tracking-tighter">{totals.small + totals.large} <span className="text-xs opacity-50">PCS</span></span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => handleSubmit(false)} variant="outline" className="h-14 rounded-xl font-black uppercase tracking-widest border-2 hover:bg-muted transition-all">
          Save Ledger
        </Button>
        <Button onClick={() => handleSubmit(true)} className="h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          Save & Message
        </Button>
      </div>
    </div>
  );
}
