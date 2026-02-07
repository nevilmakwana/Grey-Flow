
"use client";

import React, { useState } from 'react';
import { useOrder } from './lib/store';
import { DesignList } from '@/components/scarf-app/design-list';
import { OrderPanel } from '@/components/scarf-app/order-panel';
import { CSVImport } from '@/components/scarf-app/csv-import';
import { DraftsList } from '@/components/scarf-app/drafts-list';
import { Button } from '@/components/ui/button';
import { 
  FileUp, 
  History, 
  Trash2, 
  Settings as SettingsIcon,
  Printer,
  Plus
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

export default function ScarfOrderApp() {
  const { 
    currentOrder, 
    addItem, 
    removeItem, 
    updateQuantity, 
    saveAsDraft, 
    drafts, 
    loadDraft,
    clearOrder,
    DESIGNS,
    settings
  } = useOrder();

  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Navigation Header */}
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl">
            S
          </div>
          <h1 className="font-headline font-bold text-xl tracking-tight text-slate-800">Scarf Order Pro</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsDraftsOpen(true)} className="gap-2">
            <History className="w-4 h-4" /> Drafts
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsCsvOpen(true)} className="gap-2">
            <FileUp className="w-4 h-4" /> Bulk Import
          </Button>
          <div className="h-6 w-px bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={clearOrder} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
          <Button variant="default" size="sm" onClick={saveAsDraft} className="bg-primary hover:bg-primary/90">
            Save Draft
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane - Searchable Design List */}
        <aside className="w-80 border-r bg-slate-50 flex flex-col no-print">
          <DesignList designs={DESIGNS} onSelect={addItem} selectedIds={currentOrder.items.map(i => i.design_id)} />
        </aside>

        {/* Right Pane - Order Panel */}
        <section className="flex-1 overflow-y-auto bg-white">
          <OrderPanel 
            order={currentOrder} 
            designs={DESIGNS} 
            onUpdateQty={updateQuantity} 
            onRemove={removeItem}
            settings={settings}
          />
        </section>
      </main>

      {/* Dialogs */}
      <CSVImport 
        open={isCsvOpen} 
        onClose={() => setIsCsvOpen(false)} 
        designs={DESIGNS} 
        onImport={(matchedData) => {
          matchedData.forEach(m => {
            addItem(m.design_id);
            updateQuantity(m.design_id, m.size_id, m.quantity);
          });
          setIsCsvOpen(false);
        }}
      />
      
      <DraftsList 
        open={isDraftsOpen} 
        onClose={() => setIsDraftsOpen(false)} 
        drafts={drafts} 
        onLoad={loadDraft} 
      />

      <Toaster />
    </div>
  );
}
