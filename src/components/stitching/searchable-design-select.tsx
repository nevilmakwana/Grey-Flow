"use client";

import React, { useState, useMemo } from 'react';
import { Design } from '@/app/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Search, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchableDesignSelectProps {
  designs: Design[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableDesignSelect({ 
  designs, 
  value, 
  onSelect, 
  placeholder = "Select SKU...",
  className
}: SearchableDesignSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredDesigns = useMemo(() => {
    return designs.filter(d => 
      d.design_id.toLowerCase().includes(search.toLowerCase())
    );
  }, [designs, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-10 font-bold rounded-lg border bg-background text-left px-3", className)}
        >
          <span className="truncate">{value ? value : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px] rounded-xl shadow-2xl border-border bg-popover" align="start">
        <div className="flex items-center border-b px-3 bg-muted/20">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Filter SKUs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[250px]">
          <div className="p-1">
            {filteredDesigns.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground font-medium uppercase tracking-tight">No design found</div>
            ) : (
              filteredDesigns.map((design) => (
                <button
                  key={design.design_id}
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-2 text-sm font-bold outline-none transition-colors hover:bg-primary/10 hover:text-primary text-left",
                    value === design.design_id && "bg-primary/5 text-primary"
                  )}
                  onClick={() => {
                    onSelect(design.design_id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === design.design_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{design.design_id}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
