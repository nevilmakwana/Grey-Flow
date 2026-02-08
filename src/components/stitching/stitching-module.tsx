"use client";

import React, { useState, useEffect } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IssueForm } from './issue-form';
import { ReceiveForm } from './receive-form';
import { ArrowUpRight, ArrowDownLeft, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-background">
      <div className="max-w-4xl mx-auto w-full px-6 pt-12 pb-32">
        <header className="mb-12 text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-2">
            <Activity className="w-3 h-3" />
            Production Control
          </div>
          <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">Stitching Ledger</h2>
          <p className="text-muted-foreground font-medium max-w-md mx-auto">Manage scarf production work, worker issues, and real-time label inventory.</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-14 bg-white dark:bg-card border shadow-sm rounded-2xl p-1.5 transition-all">
              <TabsTrigger 
                value="issue" 
                className={cn(
                  "rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg",
                  activeTab === 'issue' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" /> Issue
              </TabsTrigger>
              <TabsTrigger 
                value="receive" 
                className={cn(
                  "rounded-xl font-bold transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                  activeTab === 'receive' ? "text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowDownLeft className="w-4 h-4 mr-2" /> Receive
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="issue" className="mt-0 focus-visible:outline-none">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <IssueForm designs={designs} onSave={saveEntry} />
            </div>
          </TabsContent>

          <TabsContent value="receive" className="mt-0 focus-visible:outline-none">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ReceiveForm designs={designs} allEntries={entries} onSave={saveEntry} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
