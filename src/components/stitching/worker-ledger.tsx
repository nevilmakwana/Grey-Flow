
"use client";

import React, { useState, useMemo } from 'react';
import { StitchingEntry } from '@/app/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpRight, ArrowDownLeft, Clock, History as HistoryIcon, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkerLedgerProps {
  entries: StitchingEntry[];
}

export function WorkerLedger({ entries }: WorkerLedgerProps) {
  const [search, setSearch] = useState('');

  const workers = useMemo(() => {
    const names = Array.from(new Set(entries.map(e => e.workerName)));
    return names.map(name => {
      const workerEntries = entries.filter(e => e.workerName === name);
      let smallBalance = 0;
      let largeBalance = 0;
      
      const sorted = [...workerEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sorted.forEach(e => {
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

      return { name, smallBalance, largeBalance };
    });
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return [...entries]
      .filter(e => e.workerName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, search]);

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd MMM yyyy");
  };

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by worker name..." 
          className="pl-10 h-12 rounded-xl border-border bg-card shadow-none text-sm font-medium"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase())).map(worker => (
          <Card key={worker.name} className="rounded-2xl border border-border bg-card shadow-none">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-base font-semibold tracking-tight">{worker.name}</h4>
                <div className="p-1.5 bg-muted rounded-lg">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-xl text-center">
                  <span className="block text-[9px] font-medium text-muted-foreground uppercase mb-1">Small Balance</span>
                  <span className={cn("text-lg font-semibold", worker.smallBalance < 0 ? "text-destructive" : "text-foreground")}>
                    {worker.smallBalance}
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl text-center">
                  <span className="block text-[9px] font-medium text-muted-foreground uppercase mb-1">Large Balance</span>
                  <span className={cn("text-lg font-semibold", worker.largeBalance < 0 ? "text-destructive" : "text-foreground")}>
                    {worker.largeBalance}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Transaction History</h3>
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 bg-muted/5 rounded-3xl border border-dashed">
            <HistoryIcon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No activity recorded yet.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="rounded-2xl border border-border bg-card shadow-none overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      entry.type === 'issue' ? 'bg-primary/10 text-primary' : 
                      entry.type === 'receive' ? 'bg-green-600/10 text-green-600' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {entry.type === 'issue' ? <ArrowUpRight className="w-5 h-5" /> : 
                       entry.type === 'receive' ? <ArrowDownLeft className="w-5 h-5" /> :
                       <Tag className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold tracking-tight">{entry.workerName}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase">
                        <Clock className="w-3 h-3" /> {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider",
                    entry.type === 'issue' ? 'bg-primary/10 text-primary' : 
                    entry.type === 'receive' ? 'bg-green-600/10 text-green-600' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {entry.type}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {entry.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-muted/20 p-2 rounded-lg text-[11px] font-medium">
                        <span className="text-foreground">{item.design_id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[9px]">{item.size_id === 'S-SML' ? 'SM' : 'LG'}</span>
                          <span className="font-semibold">{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {entry.type === 'issue' && (entry.labelsIssued?.small || 0 > 0 || entry.labelsIssued?.large || 0 > 0) && (
                    <div className="flex gap-4 pt-2 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">Labels Issued:</span>
                      <span className="text-[10px] font-semibold text-primary">S: {entry.labelsIssued?.small} | L: {entry.labelsIssued?.large}</span>
                    </div>
                  )}

                  {entry.type === 'balance-check' && (
                    <div className="flex gap-4 pt-2 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">Reported Balance:</span>
                      <span className="text-[10px] font-semibold text-foreground">S: {entry.labelsRemaining?.small} | L: {entry.labelsRemaining?.large}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

import { format, parseISO } from 'date-fns';
