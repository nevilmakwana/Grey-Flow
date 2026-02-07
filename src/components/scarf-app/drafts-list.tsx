
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
                  <div>
                    <p className="font-bold text-slate-800">{draft.id}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(draft.created_at).toLocaleString()}
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
                  Load Order
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
