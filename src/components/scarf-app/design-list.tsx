
"use client";

import React, { useState, useMemo } from 'react';
import { Design } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface DesignListProps {
  designs: Design[];
  onSelect: (id: string) => void;
  selectedIds: string[];
}

export function DesignList({ designs, onSelect, selectedIds }: DesignListProps) {
  const [search, setSearch] = useState("");

  const filteredDesigns = useMemo(() => {
    return designs.filter(d => 
      d.design_name.toLowerCase().includes(search.toLowerCase()) ||
      d.design_id.toLowerCase().includes(search.toLowerCase())
    );
  }, [designs, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search designs..." 
            className="pl-9 rounded-xl border-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredDesigns.map(design => {
          const isSelected = selectedIds.includes(design.design_id);
          return (
            <button
              key={design.design_id}
              onClick={() => onSelect(design.design_id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left",
                isSelected 
                  ? "bg-primary/20 ring-1 ring-primary" 
                  : "bg-white border hover:bg-slate-100 hover:border-slate-300 shadow-sm"
              )}
            >
              <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 border">
                <Image 
                  src={design.image_url} 
                  alt={design.design_name} 
                  fill 
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-slate-800">{design.design_name}</p>
                <p className="text-xs text-slate-500 font-mono">{design.design_id}</p>
              </div>
              <div className="flex-shrink-0">
                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </button>
          );
        })}
        {filteredDesigns.length === 0 && (
          <div className="text-center py-10">
            <p className="text-slate-400 text-sm">No designs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
