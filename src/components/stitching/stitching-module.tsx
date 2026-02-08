"use client";

import React, { useState, useEffect } from 'react';
import { Design, StitchingEntry } from '@/app/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IssueForm } from './issue-form';
import { ReceiveForm } from './receive-form';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-background overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 pb-32">
        <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Stitching Ledger</h2>
            <p className="text-xs text-muted-foreground font-medium">Manage production issues and receipts.</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid w-full md:w-64 grid-cols-2 h-11 bg-muted/50 rounded-xl p-1">
              <TabsTrigger 
                value="issue" 
                className={cn(
                  "rounded-lg text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  activeTab === 'issue' ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                Issue
              </TabsTrigger>
              <TabsTrigger 
                value="receive" 
                className={cn(
                  "rounded-lg text-xs font-bold transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white",
                  activeTab === 'receive' ? "text-white" : "text-muted-foreground"
                )}
              >
                Receive
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="issue" className="mt-0 focus-visible:outline-none">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <IssueForm designs={designs} onSave={saveEntry} />
            </div>
          </TabsContent>

          <TabsContent value="receive" className="mt-0 focus-visible:outline-none">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ReceiveForm designs={designs} allEntries={entries} onSave={saveEntry} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}