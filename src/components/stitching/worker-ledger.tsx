
"use client";

import React, { useState, useMemo } from 'react';
import { StitchingEntry } from '@/app/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpRight, ArrowDownLeft, Clock, History as HistoryIcon } from 'lucide-react';

interface WorkerLedgerProps {
  entries: StitchingEntry[];
}

export function WorkerLedger({ entries }: WorkerLedgerProps) {
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    return [...entries]
      .filter(e => e.workerName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, search]);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search by worker name..." 
          className="pl-12 h-14 rounded-2xl border-none bg-card shadow-sm text-lg font-medium"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed">
            <HistoryIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">No entries found yet.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="rounded-[2rem] border-none shadow-sm bg-card overflow-hidden">
              <div className={`h-2 w-full ${entry.type === 'issue' ? 'bg-primary' : 'bg-green-500'}`} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.type === 'issue' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-500'}`}>
                      {entry.type === 'issue' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight">{entry.workerName}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                        <Clock className="w-3 h-3" /> {formatDate(entry.date)}
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${entry.type === 'issue' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-500'}`}>
                    {entry.type}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {entry.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-border/50">
                        <span className="text-sm font-bold text-foreground">{item.design_id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">{item.size_id === 'S-SML' ? 'SMALL' : 'LARGE'}</span>
                          <span className="bg-white px-2 py-0.5 rounded-md font-black text-xs border">{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {entry.type === 'issue' && (entry.labelsIssued?.small || 0 > 0 || entry.labelsIssued?.large || 0 > 0) && (
                    <div className="pt-4 border-t border-border/50 flex gap-4">
                      <div className="flex-1 text-center py-2 bg-primary/5 rounded-xl border border-primary/10">
                        <span className="block text-[8px] font-bold text-muted-foreground uppercase">Labels Issued (S)</span>
                        <span className="text-sm font-black text-primary">{entry.labelsIssued?.small || 0}</span>
                      </div>
                      <div className="flex-1 text-center py-2 bg-primary/5 rounded-xl border border-primary/10">
                        <span className="block text-[8px] font-bold text-muted-foreground uppercase">Labels Issued (L)</span>
                        <span className="text-sm font-black text-primary">{entry.labelsIssued?.large || 0}</span>
                      </div>
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
