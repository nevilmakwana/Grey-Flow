
"use client";

import React, { useState, useEffect } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IssueForm } from './issue-form';
import { ReceiveForm } from './receive-form';
import { WorkerLedger } from './worker-ledger';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scissors, ArrowUpRight, ArrowDownLeft, BookOpen } from 'lucide-react';

interface StitchingModuleProps {
  designs: Design[];
}

export function StitchingModule({ designs }: StitchingModuleProps) {
  const [entries, setEntries] = useState<StitchingEntry[]>([]);
  const [activeTab, setActiveTab] = useState('issue');

  useEffect(() => {
    const saved = localStorage.getItem('greyflow_stitching_entries');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  const saveEntry = (entry: StitchingEntry) => {
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    localStorage.setItem('greyflow_stitching_entries', JSON.stringify(newEntries));
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="max-w-4xl mx-auto w-full px-6 pt-4 pb-32">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-4">
            <Scissors className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-foreground mb-2">Stitching Control</h2>
          <p className="text-sm text-muted-foreground font-medium">Manage scarf production and label balances.</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-16 bg-card border-none rounded-[2rem] p-1.5 shadow-sm mb-12">
            <TabsTrigger value="issue" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all font-bold">
              <ArrowUpRight className="w-4 h-4 mr-2" /> Issue
            </TabsTrigger>
            <TabsTrigger value="receive" className="rounded-[1.5rem] data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all font-bold">
              <ArrowDownLeft className="w-4 h-4 mr-2" /> Receive
            </TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-[1.5rem] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:ring-2 data-[state=active]:ring-primary transition-all font-bold">
              <BookOpen className="w-4 h-4 mr-2" /> Ledger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="issue" className="animate-in fade-in slide-in-from-bottom-4">
            <IssueForm designs={designs} onSave={saveEntry} />
          </TabsContent>

          <TabsContent value="receive" className="animate-in fade-in slide-in-from-bottom-4">
            <ReceiveForm designs={designs} allEntries={entries} onSave={saveEntry} />
          </TabsContent>

          <TabsContent value="ledger" className="animate-in fade-in slide-in-from-bottom-4">
            <WorkerLedger entries={entries} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
