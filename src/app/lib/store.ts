
"use client";

import { useState, useEffect } from 'react';
import { Order, OrderItem, AppSettings, Design, FabricGroup } from './types';
import designData from '../data/designs.json';

const DESIGNS = designData as Design[];

const DEFAULT_SETTINGS: AppSettings = {
  company_name: "Grey Exim",
  currency: "INR",
  tax_percent: 0,
};

function generateOrderId() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO-${yy}${mm}${dd}-${random}`;
}

export function useOrder() {
  const [currentOrder, setCurrentOrder] = useState<Order>({
    id: generateOrderId(),
    fabricGroups: [],
    created_at: new Date().toISOString(),
    status: 'draft',
    tax_percent: DEFAULT_SETTINGS.tax_percent,
    currency: DEFAULT_SETTINGS.currency,
  });

  const [drafts, setDrafts] = useState<Order[]>([]);

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

  const addFabricGroup = (fabricId: string) => {
    const newGroup: FabricGroup = {
      id: `group-${Date.now()}`,
      fabric_id: fabricId,
      items: []
    };
    setCurrentOrder(prev => ({
      ...prev,
      fabricGroups: [...prev.fabricGroups, newGroup]
    }));
    return newGroup.id;
  };

  const removeFabricGroup = (groupId: string) => {
    setCurrentOrder(prev => ({
      ...prev,
      fabricGroups: prev.fabricGroups.filter(g => g.id !== groupId)
    }));
  };

  const addItemToGroup = (groupId: string, designId: string) => {
    const design = DESIGNS.find(d => d.design_id === designId);
    if (!design) return;

    setCurrentOrder(prev => ({
      ...prev,
      fabricGroups: prev.fabricGroups.map(group => {
        if (group.id === groupId) {
          if (group.items.find(item => item.design_id === designId)) return group;
          return {
            ...group,
            items: [...group.items, {
              design_id: designId,
              sizes: design.sizes.map(s => ({ size_id: s.size_id, quantity: 0 })),
              note: design.default_note
            }]
          };
        }
        return group;
      })
    }));
  };

  const removeItemFromGroup = (groupId: string, designId: string) => {
    setCurrentOrder(prev => ({
      ...prev,
      fabricGroups: prev.fabricGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            items: group.items.filter(item => item.design_id !== designId)
          };
        }
        return group;
      })
    }));
  };

  const updateQuantity = (groupId: string, designId: string, sizeId: string, quantity: number) => {
    setCurrentOrder(prev => ({
      ...prev,
      fabricGroups: prev.fabricGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            items: group.items.map(item => {
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
          };
        }
        return group;
      })
    }));
  };

  const saveAsDraft = () => {
    const updatedDrafts = [currentOrder, ...drafts.filter(d => d.id !== currentOrder.id)];
    saveToLocalStorage(updatedDrafts);
  };

  const loadDraft = (order: Order) => {
    setCurrentOrder(order);
  };

  const clearOrder = () => {
    setCurrentOrder({
      id: generateOrderId(),
      fabricGroups: [],
      created_at: new Date().toISOString(),
      status: 'draft',
      tax_percent: DEFAULT_SETTINGS.tax_percent,
      currency: DEFAULT_SETTINGS.currency,
    });
  };

  return {
    currentOrder,
    addFabricGroup,
    removeFabricGroup,
    addItemToGroup,
    removeItemFromGroup,
    updateQuantity,
    saveAsDraft,
    drafts,
    loadDraft,
    clearOrder,
    DESIGNS,
    settings: DEFAULT_SETTINGS
  };
}
