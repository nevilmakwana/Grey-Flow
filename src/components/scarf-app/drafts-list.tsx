
"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Order } from '@/app/lib/types';
import { Button } from '@/components/ui/button';
import { History, ShoppingCart, Clock } from 'lucide-react';

interface DraftsListProps {
  open: boolean;
  onClose: () => void;
  drafts: Order[];
  onLoad: (order: Order) => void;
}

export function DraftsList({ open, onClose, drafts, onLoad }: DraftsListProps) {
  const formatFullDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date).replace(',', '')
      .replace(/\s(am|pm)/i, (match) => match.toUpperCase())
      .replace(/(\d{4})\s/, '$1 | ');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Saved Drafts
          </DialogTitle>
          <DialogDescription>
            Recently saved order drafts on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-3 my-4">
          {drafts.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p>No drafts saved yet.</p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div 
                key={draft.id} 
                className="p-4 border rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-bold text-slate-800 font-mono text-sm">{draft.id}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <Clock className="w-3 h-3" />
                      {formatFullDate(draft.created_at)}
                    </div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    onLoad(draft);
                    onClose();
                  }}
                  className="rounded-xl border-primary text-primary hover:bg-primary hover:text-white"
                >
                  Load
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
