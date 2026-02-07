
"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Design } from '@/app/lib/types';
import { enhanceCsvDataMatching } from '@/ai/flows/csv-data-matching';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
  designs: Design[];
  onImport: (matchedData: { design_id: string; size_id: string; quantity: number }[]) => void;
}

export function CSVImport({ open, onClose, designs, onImport }: CSVImportProps) {
  const [csvText, setCsvText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [pendingResults, setPendingResults] = useState<{ design_id: string; size_id: string; quantity: number }[]>([]);

  const handleProcess = async () => {
    if (!csvText.trim()) return;

    setIsProcessing(true);
    setReport(null);

    try {
      const result = await enhanceCsvDataMatching({
        csvData: csvText,
        designs: designs.map(d => ({
          design_id: d.design_id,
          design_name: d.design_name,
          sizes: d.sizes.map(s => ({
            size_id: s.size_id,
            label: s.label
          }))
        }))
      });

      setPendingResults(result.matchedData);
      setReport(result.mismatchReport);
    } catch (error) {
      console.error("Import failed:", error);
      alert("AI matching failed. Please ensure CSV format is: design_id, size_id, quantity");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmImport = () => {
    onImport(pendingResults);
    setCsvText("");
    setReport(null);
    setPendingResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[600px] rounded-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Bulk Order Import</DialogTitle>
          <DialogDescription>
            Paste CSV data in format: <code className="bg-slate-100 px-1">design_id, size_id, quantity</code>.
            AI will attempt to match IDs for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <Textarea 
            placeholder="DS-001, S-REG, 10&#10;Azure Waves, Standard, 5" 
            className="min-h-[150px] font-mono text-sm rounded-xl"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />

          {isProcessing && (
            <div className="flex items-center justify-center py-4 text-slate-500 gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Matching data with designs...</span>
            </div>
          )}

          {report && (
            <div className="bg-slate-50 p-4 rounded-xl border max-h-[200px] overflow-y-auto">
              <div className="flex items-center gap-2 mb-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-tight">Mismatch Report</span>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{report}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!report ? (
            <Button onClick={handleProcess} disabled={isProcessing || !csvText.trim()} className="rounded-xl px-8">
              Analyze CSV
            </Button>
          ) : (
            <Button onClick={confirmImport} className="rounded-xl px-8 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" /> Import {pendingResults.length} Matches
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
