
"use client";

import { useState, useEffect } from 'react';
import { Order, OrderItem, AppSettings, Design } from './types';
import designData from '../data/designs.json';

const DESIGNS = designData as Design[];

const DEFAULT_SETTINGS: AppSettings = {
  company_name: "Grey Exim",
  currency: "INR",
  tax_percent: 0,
};

export function useOrder() {
  const [currentOrder, setCurrentOrder] = useState<Order>({
    id: `ORD-${Date.now()}`,
    items: [],
    created_at: new Date().toISOString(),
    status: 'draft',
    tax_percent: DEFAULT_SETTINGS.tax_percent,
    currency: DEFAULT_SETTINGS.currency,
  });

  const [drafts, setDrafts] = useState<Order[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedDrafts = localStorage.getItem('scarf_order_drafts');
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
  }, []);

  const saveToLocalStorage = (newDrafts: Order[]) => {
    localStorage.setItem('scarf_order_drafts', JSON.stringify(newDrafts));
    setDrafts(newDrafts);
  };

  const addItem = (designId: string) => {
    if (currentOrder.items.find(item => item.design_id === designId)) {
      return; // Already in cart
    }
    
    const design = DESIGNS.find(d => d.design_id === designId);
    if (!design) return;

    const newItem: OrderItem = {
      design_id: designId,
      sizes: design.sizes.map(s => ({ size_id: s.size_id, quantity: 0 })),
      note: design.default_note
    };

    setCurrentOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (designId: string) => {
    setCurrentOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => item.design_id !== designId)
    }));
  };

  const updateQuantity = (designId: string, sizeId: string, quantity: number) => {
    setCurrentOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.design_id === designId) {
          return {
            ...item,
            sizes: item.sizes.map(s => 
              s.size_id === sizeId ? { ...s, quantity } : s
            )
          };
        }
        return item;
      })
    }));
  };

  const saveAsDraft = () => {
    const updatedDrafts = [currentOrder, ...drafts.filter(d => d.id !== currentOrder.id)];
    saveToLocalStorage(updatedDrafts);
    alert("Order saved as draft!");
  };

  const loadDraft = (order: Order) => {
    setCurrentOrder(order);
  };

  const clearOrder = () => {
    setCurrentOrder({
      id: `ORD-${Date.now()}`,
      items: [],
      created_at: new Date().toISOString(),
      status: 'draft',
      tax_percent: DEFAULT_SETTINGS.tax_percent,
      currency: DEFAULT_SETTINGS.currency,
    });
  };

  return {
    currentOrder,
    addItem,
    removeItem,
    updateQuantity,
    saveAsDraft,
    drafts,
    loadDraft,
    clearOrder,
    DESIGNS,
    settings: DEFAULT_SETTINGS
  };
}
