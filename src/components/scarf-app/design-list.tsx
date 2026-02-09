"use client";

import React, { useState, useMemo } from 'react';
import { Design } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, Plus } from 'lucide-react';
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
      d.design_id.toLowerCase().includes(search.toLowerCase())
    );
  }, [designs, search]);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b bg-muted/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search SKUs..." 
            className="pl-9 h-10 rounded-md border-border bg-white focus:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredDesigns.map(design => {
          const isSelected = selectedIds.includes(design.design_id);
          return (
            <button
              key={design.design_id}
              onClick={() => onSelect(design.design_id)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-md transition-all text-left group",
                isSelected 
                  ? "bg-primary/5 ring-1 ring-primary/20" 
                  : "hover:bg-muted/50"
              )}
            >
              <div className="relative w-12 h-12 rounded border border-border/50 overflow-hidden flex-shrink-0 bg-muted">
                <Image 
                  src={design.image_url} 
                  alt={design.design_id} 
                  fill 
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate tracking-tight text-foreground">{design.design_id}</p>
              </div>
              <div className="flex-shrink-0 pr-1">
                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50" />
                )}
              </div>
            </button>
          );
        })}
        {filteredDesigns.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-xs font-medium">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}