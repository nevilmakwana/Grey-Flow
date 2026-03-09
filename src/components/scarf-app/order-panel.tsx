"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, Design, AppSettings } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Trash2, 
  Hash,
  Plus,
  Layers,
  ChevronRight,
  RotateCcw,
  ChevronDown,
  Calculator,
  MessageCircle,
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Save
} from 'lucide-react';
import Image from 'next/image';
import { cn, readApiJson, setSessionCache, clearSessionCache, getSessionCache } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon } from 'lucide-react';
import { SearchableDesignSelect } from '@/components/stitching/searchable-design-select';
import { WorkerLedger } from '@/components/cut-work/worker-ledger';

import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CUTWORK_ENTRIES_CACHE_KEY = "cache:cutwork-entries:payload";
const ORDER_SHARE_META_KEY = "orders:share:meta";
const ORDER_SHARE_META_TTL = 5 * 60 * 1000;

function toCloudinaryThumbUrl(url: string, transform: string) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  const marker = "/image/upload/";
  const idx = raw.indexOf(marker);
  if (idx < 0) return raw;
  const prefix = raw.slice(0, idx + marker.length);
  const suffix = raw.slice(idx + marker.length);
  const first = suffix.split("/")[0] || "";
  const isVersion = first.startsWith("v") && /^\d+$/.test(first.slice(1));
  if (!isVersion) return raw;
  return `${prefix}${transform}/${suffix}`;
}



function normalizePhone(raw: string) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) {
    return `+${trimmed.replace(/[^\d]/g, "")}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("0")) return `+${digits.replace(/^0+/, "")}`;
  return `+${digits}`;
}

function toWaNumber(raw: string) {
  return normalizePhone(raw).replace(/\D/g, "");
}

function formatDateTime(value: string | Date) {
  try {
    const date = new Date(value);
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return formatter.format(date);
  } catch {
    return String(value);
  }
}

interface OrderPanelProps {
  order: Order;
  designs: Design[];
  highlightedItem: { groupId: string; designId: string } | null;
  activeGroupId: string | null;
  onUpdateQty: (groupId: string, designId: string, sizeId: string, qty: number) => void;
  onRemoveItem: (groupId: string, designId: string) => void;
  onAddGroup: (fabricId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onAddDesignToGroup: (groupId: string) => void;
  onNewOrder: () => void;
  settings: AppSettings;
}

export function OrderPanel({ 
  order, 
  designs, 
  highlightedItem,
  activeGroupId,
  onUpdateQty, 
  onRemoveItem, 
  onAddGroup, 
  onRemoveGroup,
  onAddDesignToGroup,
  onNewOrder,
  settings 
}: OrderPanelProps) {
  
  const getDesignById = (id: string) => designs.find(d => d.design_id === id);
  const getDesignCardId = (groupId: string, designId: string) =>
    `design-card-${groupId}-${encodeURIComponent(designId)}`;
  const { toast } = useToast();

  const totals = order.fabricGroups.reduce((acc, group) => {
    group.items.forEach(item => {
      item.sizes.forEach(s => {
        if (s.size_id === 'S-SML') acc.small += s.quantity;
        if (s.size_id === 'S-LGE') acc.large += s.quantity;
      });
    });
    return acc;
  }, { small: 0, large: 0 });

  const grandTotal = totals.small + totals.large;
  const selectedFabrics = new Set(order.fabricGroups.map(g => String(g.fabric_id || '').trim()));
  const availableFabrics = ['Satin', 'Cotton'].filter(f => !selectedFabrics.has(f));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  const [printIssue, setPrintIssue] = useState<any | null>(null);
  const [printTab, setPrintTab] = useState<"receive" | "adjust" | "history">("receive");
  const [mainTab, setMainTab] = useState<"order" | "receive" | "adjust" | "history" | "jobwork" | "jobworkDamage" | "usage">("order");
  const [historyToDate, setHistoryToDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [historyRangeDays, setHistoryRangeDays] = useState(30);
  const [printSummary, setPrintSummary] = useState<any | null>(null);
  const [printEntries, setPrintEntries] = useState<any[]>([]);
  const [allPrintEntries, setAllPrintEntries] = useState<any[]>([]);
  const [workerIssueEntries, setWorkerIssueEntries] = useState<any[]>([]);
  const [pendingInputs, setPendingInputs] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState("");
  const [fillMax, setFillMax] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustAction, setAdjustAction] = useState<"hold" | "reject" | "adjust">("reject");
  const [resetSignal, setResetSignal] = useState(0);
  const [sessionItems, setSessionItems] = useState<Array<{ key: string; design_id: string; fabricType: string; size_id: "S-SML" | "S-LGE"; pending: number; quantity: number }>>([]);
  const [adjustItems, setAdjustItems] = useState<Array<{ design_id: string; fabricType: string; size_id: "S-SML" | "S-LGE"; quantity: number }>>([]);
  const [selectedOutstandingKey, setSelectedOutstandingKey] = useState<string>("");
  const [workers, setWorkers] = useState<Array<{ _id: string; name: string; phone: string; role?: string; active?: boolean }>>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [draftDesignId, setDraftDesignId] = useState<string>("");
  const [draftFabricType, setDraftFabricType] = useState<string>("");
  const [draftSmallQty, setDraftSmallQty] = useState<number>(0);
  const [draftLargeQty, setDraftLargeQty] = useState<number>(0);
  const [autoSelectFabric, setAutoSelectFabric] = useState<boolean>(true);
  const [adjustDraftDesignId, setAdjustDraftDesignId] = useState<string>("");
  const [adjustDraftFabricType, setAdjustDraftFabricType] = useState<string>("");
  const [adjustDraftSmallQty, setAdjustDraftSmallQty] = useState<number>(0);
  const [adjustDraftLargeQty, setAdjustDraftLargeQty] = useState<number>(0);
  const [adjustAutoSelectFabric, setAdjustAutoSelectFabric] = useState<boolean>(true);
  const [savedEntry, setSavedEntry] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [adjustConfirmOpen, setAdjustConfirmOpen] = useState(false);
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [editWorker, setEditWorker] = useState<string>("");
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editNote, setEditNote] = useState<string>("");
  const [editItems, setEditItems] = useState<Array<{ fabricType: string; design_id: string; size_id: "S-SML" | "S-LGE"; quantity: number }>>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<any | null>(null);
  const [canAddFabric, setCanAddFabric] = useState(false);
  const [newOrderStarted, setNewOrderStarted] = useState(false);
  const [headerPrintingWorker, setHeaderPrintingWorker] = useState<string>("");
  const [headerChallan, setHeaderChallan] = useState<string>("");
  const [effectiveOrderNumber, setEffectiveOrderNumber] = useState<string>(() => {
    return String((order as any)?.orderNumber || order?.id || "").trim();
  });
  const [purchases, setPurchases] = useState<any[]>([]);
  const [jobworkInputs, setJobworkInputs] = useState<Record<string, { qty?: number; rate?: number; gstPct?: number; printingChallanNo?: string; receivedDate?: string; receivedBy?: string; paidDate?: string; remark?: string }>>({});
  const [jobworkSelectedPurchaseId, setJobworkSelectedPurchaseId] = useState<string>("");
  const [usageInputs, setUsageInputs] = useState<Record<string, number>>({});
  const [usageByPurchase, setUsageByPurchase] = useState<Record<string, any>>({});
  const [printUsageEntries, setPrintUsageEntries] = useState<any[]>([]);
  const [usageEditOpen, setUsageEditOpen] = useState(false);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [usageEditEntry, setUsageEditEntry] = useState<any | null>(null);
  const [usageEditQty, setUsageEditQty] = useState<number>(0);
  const [usageEditRate, setUsageEditRate] = useState<number>(0);
  const [usageEditReceivedDate, setUsageEditReceivedDate] = useState<string>("");
  const [usageEditReceivedBy, setUsageEditReceivedBy] = useState<string>("");
  const [usageEditPaid, setUsageEditPaid] = useState<boolean>(false);
  const [usageEditPaidDate, setUsageEditPaidDate] = useState<string>("");
  const [usageEditRemark, setUsageEditRemark] = useState<string>("");
  const [usageEditOriginalQty, setUsageEditOriginalQty] = useState<number>(0);
  const printingChallanInUse = useCallback(
    (challan: string, excludeUsageId?: string) => {
      const target = String(challan || "").trim();
      if (!target) return false;
      return printUsageEntries.some((u: any) => {
        const uid = String(u?._id || u?.id || "");
        if (excludeUsageId && uid === excludeUsageId) return false;
        const val = String(
          (u as any)?.printingChallanNo ||
          (u as any)?.printingChallan ||
          (u as any)?.printing_challan_no ||
          (u as any)?.printChallanNo ||
          (u as any)?.printChallan ||
          ""
        ).trim();
        return val && val === target;
      });
    },
    [printUsageEntries]
  );
  const [usageEditGstPct, setUsageEditGstPct] = useState<number>(5);
  const [usageEditPrintingChallan, setUsageEditPrintingChallan] = useState<string>("");
  const [deleteSecondConfirm, setDeleteSecondConfirm] = useState(false);
  const [damageDraftDesignId, setDamageDraftDesignId] = useState<string>("");
  const [damageDraftFabricType, setDamageDraftFabricType] = useState<string>("");
  const [damageDraftSmallQty, setDamageDraftSmallQty] = useState<number>(0);
  const [damageDraftLargeQty, setDamageDraftLargeQty] = useState<number>(0);
  const [damageItems, setDamageItems] = useState<Array<{ design_id: string; fabricType: string; size_id: "S-SML" | "S-LGE"; quantity: number }>>([]);
  const [damageNote, setDamageNote] = useState<string>("");
  const [damageConfirmOpen, setDamageConfirmOpen] = useState(false);

  const usedMetersByPurchase = useMemo(() => {
    const map = new Map<string, number>();
    (printUsageEntries || []).forEach((u: any) => {
      const pid = String(u?.purchaseId || "");
      const used = Number(u?.usedMeters || 0);
      if (!pid || !Number.isFinite(used)) return;
      map.set(pid, Math.max(0, (map.get(pid) || 0) + used));
    });
    return map;
  }, [printUsageEntries]);

  const deliveredByPurchase = useMemo(() => {
    const map = new Map<string, number>();
    purchases.forEach((p) => {
      const pid = String(p?._id || "");
      if (!pid) return;
      const delivered = Number(
        p?.netMeters ?? (Number(p?.deliveredMeters || 0) - Number(p?.returnMeters || 0))
      );
      if (Number.isFinite(delivered)) map.set(pid, delivered);
    });
    return map;
  }, [purchases]);

  const getRemainingMeters = useCallback(
    (pid: string, excludeUsageId?: string) => {
      const delivered = deliveredByPurchase.get(pid) || 0;
      let used = 0;
      printUsageEntries.forEach((u: any) => {
        const uid = String(u?._id || u?.id || "");
        if (excludeUsageId && uid === excludeUsageId) return;
        if (String(u?.purchaseId || "") === pid) {
          used += Number(u?.usedMeters || u?.qty || 0) || 0;
        }
      });
      const remaining = Math.max(0, Math.round((delivered - used) * 100) / 100);
      return remaining;
    },
    [deliveredByPurchase, printUsageEntries]
  );

  const remainingForOrder = useMemo(() => {
    if (!headerPrintingWorker) return null;
    const map: Record<string, { id: string; delivered: number }> = {};
    purchases.forEach((p) => {
      const id = String(p?._id || "");
      const delivered = Number(p?.netMeters || p?.deliveredMeters || 0) - Number(p?.returnMeters || 0);
      map[String(p?.challanOrInvoiceNo || "")] = { id, delivered };
    });
    const target = map[String(headerChallan || "")] || null;
    if (!target) return null;
    const used = usedMetersByPurchase.get(target.id) || 0;
    const remaining = Math.max(0, Math.round((target.delivered - used) * 100) / 100);
    return { delivered: target.delivered, used, remaining, challan: String(headerChallan || "") };
  }, [headerPrintingWorker, headerChallan, purchases, usedMetersByPurchase]);

  useEffect(() => {
    setPrintIssue(null);
    setPrintSummary(null);
    setPrintEntries([]);
    setPendingInputs({});
    setSearchText("");
    setFillMax(false);
    setSelectedDate(new Date());
    setAdjustNote("");
    setAdjustAction("reject");
    setResetSignal((v) => v + 1);
    setSessionItems([]);
    setAdjustItems([]);
    setSelectedOutstandingKey("");
    setSelectedWorker("");
    setDraftDesignId("");
    setDraftFabricType("");
    setDraftSmallQty(0);
    setDraftLargeQty(0);
    setAutoSelectFabric(true);
    setAdjustDraftDesignId("");
    setAdjustDraftFabricType("");
    setAdjustDraftSmallQty(0);
    setAdjustDraftLargeQty(0);
    setAdjustAutoSelectFabric(true);
    setSavedEntry(null);
    setAdjustConfirmOpen(false);
    setReceiveConfirmOpen(false);
    setMainTab("order");
  }, [order?.id]);

  useEffect(() => {
    const enabled = Boolean(newOrderStarted) && Boolean(String(headerPrintingWorker || "").trim());
    setCanAddFabric(enabled);
  }, [newOrderStarted, headerPrintingWorker]);

  // Auto-pick first challan when worker purchases load
  useEffect(() => {
    if (!newOrderStarted) return;
    if (headerChallan) return;
    if (!purchases?.length) return;
    const first = purchases.find((p: any) =>
      String(p?.challanOrInvoiceNo || p?.challan || p?.invoiceNo || p?.invoice || "").trim()
    );
    const next = String(
      (first as any)?.challanOrInvoiceNo ||
      (first as any)?.challan ||
      (first as any)?.invoiceNo ||
      (first as any)?.invoice ||
      ""
    ).trim();
    if (next) setHeaderChallan(next);
  }, [purchases, headerChallan, newOrderStarted]);

  useEffect(() => {
    try {
      const recipient = String(headerPrintingWorker || "").trim();
      const orderNumber = String(headerChallan || "").trim();
      if (!recipient && !orderNumber) return;
      setSessionCache('orders:share:meta', { recipient, orderNumber });
    } catch {}
  }, [headerPrintingWorker, headerChallan]);
  useEffect(() => {
    const name = String(headerPrintingWorker || "").trim();
    if (name) setSelectedWorker(name);
  }, [headerPrintingWorker]);
  useEffect(() => {
    const fallback = String((order as any)?.orderNumber || order?.id || "").trim();
    setEffectiveOrderNumber(fallback);
  }, [order?.id, (order as any)?.orderNumber]);
  const resetOrderRequest = () => {
    if (!order?.fabricGroups?.length) return;
    order.fabricGroups.forEach((group) => {
      onRemoveGroup(group.id);
    });
    setPrintIssue(null);
  };

  const historyEntries = useMemo(() => {
    const normalized = (printEntries || []).map((e) => {
      const items = Array.isArray(e?.items)
        ? e.items.map((it: any) => ({
            ...it,
            fabric: String(it?.fabric || it?.fabricType || "").trim() || undefined,
            fabricType: String(it?.fabricType || it?.fabric || "").trim() || undefined,
          }))
        : [];
      return { ...e, items };
    });
    const groups: any[] = Array.isArray(printIssue?.groups) ? printIssue.groups : [];
    let finalEntries = normalized;
    if (printIssue && groups.length > 0) {
      const issuedItems = groups.flatMap((g) => {
        const fabric = String(g?.fabricType || "").trim();
        const items: any[] = Array.isArray(g?.items) ? g.items : [];
        return items.map((it) => ({
          ...it,
          fabric,
          fabricType: fabric,
        }));
      });
      const issueEntry = {
        _id: String(printIssue?._id || "issue"),
        id: String(printIssue?._id || "issue"),
        type: "issue",
        date: String(printIssue?.createdAt || printIssue?.updatedAt || new Date().toISOString()),
        workerName: String(printIssue?.preparedBy || "System"),
        orderNumber: String(order?.id || ""),
        challanNo: String(headerChallan || ""),
        sourceOrderNumber: String(headerChallan || ""),
        items: issuedItems,
      };
      const allowedLeft = new Map<string, number>();
      for (const g of groups) {
        const fabric = String(g?.fabricType || "").trim();
        const items: any[] = Array.isArray(g?.items) ? g.items : [];
        for (const it of items) {
          const designId = String(it?.design_id || "").trim();
          const sizeId = String(it?.size_id || "").trim();
          const qty = Number(it?.quantity || 0);
          const key = `${fabric}||${designId}||${sizeId}`;
          allowedLeft.set(key, (allowedLeft.get(key) || 0) + (Number.isFinite(qty) ? qty : 0));
        }
      }
      const sortedAsc = [...normalized].sort((a, b) => {
        const da = new Date(a?.date || 0).getTime();
        const db = new Date(b?.date || 0).getTime();
        return da - db;
      });
      const filteredAsc: any[] = [];
      for (const e of sortedAsc) {
        const items: any[] = Array.isArray(e?.items) ? e.items : [];
        const nextItems: any[] = [];
        for (const it of items) {
          const fabric = String(it?.fabricType || it?.fabric || "").trim();
          const designId = String(it?.design_id || "").trim();
          const sizeId = String(it?.size_id || "").trim();
          const qty = Number(it?.quantity || 0);
          const key = `${fabric}||${designId}||${sizeId}`;
          if (String(e?.type || "") === "receive") {
            const remaining = allowedLeft.get(key) || 0;
            allowedLeft.set(key, Math.max(0, remaining - Math.max(0, qty)));
            if (qty > 0) nextItems.push(it);
          } else if (String(e?.type || "") === "adjust") {
            allowedLeft.set(key, (allowedLeft.get(key) || 0) + Math.max(0, qty));
            if (qty > 0) nextItems.push(it);
          } else {
            if (qty > 0) nextItems.push(it);
          }
        }
        const snapshot: Array<{ design_id: string; size_id: string; fabric: string; quantity: number }> = [];
        allowedLeft.forEach((qty, k) => {
          const [fabric, design_id, size_id] = String(k || "").split("||");
          const quantity = Math.max(0, Number(qty || 0));
          if (!design_id || !size_id || quantity <= 0) return;
          snapshot.push({ design_id, size_id, fabric: String(fabric || "Satin").trim() || "Satin", quantity });
        });
        snapshot.sort((a, b) => {
          const byDesign = String(a.design_id).localeCompare(String(b.design_id));
          if (byDesign !== 0) return byDesign;
          return String(a.size_id).localeCompare(String(b.size_id));
        });
        if (nextItems.length > 0 || snapshot.length > 0) {
          filteredAsc.push({ ...e, items: nextItems, pendingItemsSnapshot: snapshot });
        }
      }
      const filteredDesc = filteredAsc.sort((a, b) => {
        const da = new Date(a?.date || 0).getTime();
        const db = new Date(b?.date || 0).getTime();
        return db - da;
      });
      finalEntries = [issueEntry, ...filteredDesc];
    }
    const usageNormalized = (printUsageEntries || []).map((u: any) => ({
      _id: String(u?._id || ""),
      id: String(u?._id || ""),
      type: "usage",
      date: String(u?.date || new Date().toISOString()),
      workerName: String(u?.workerName || headerPrintingWorker || "").trim(),
      challanNo: String(u?.challanOrInvoiceNo || "").trim(),
      printingChallanNo: String(
        (u as any)?.printingChallanNo ||
        (u as any)?.printingChallan ||
        (u as any)?.printing_challan_no ||
        ""
      ).trim(),
      qty: Number(u?.usedMeters || 0),
      ratePerUnit: Number(u?.ratePerUnit || 0),
      amount: Number(u?.amount || 0),
      gstPct: Number(u?.gstPct ?? 5),
      gstAmount: Number(u?.gstAmount || 0),
      finalPayableAmount: Number(u?.finalPayableAmount || 0),
      receivedDate: u?.receivedDate ? String(u.receivedDate) : "",
      receivedBy: String(u?.receivedBy || ""),
      paid: Boolean(u?.paid),
      paidDate: u?.paidDate ? String(u.paidDate) : "",
      remark: String(u?.remark || ""),
      items: [],
    }));
    return [...usageNormalized, ...finalEntries];
  }, [printEntries, printIssue, printUsageEntries, headerPrintingWorker, order?.id]);

  const jobworkUsageEntries = useMemo(() => {
    return (historyEntries || []).filter((e: any) => String(e?.type || "") === "usage");
  }, [historyEntries]);

  const refreshHistory = async () => {
    setIsRefreshingHistory(true);
    const num = String(effectiveOrderNumber || "").trim();
    try {
      if (num) {
        const res = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(num)}`, { cache: 'no-store' });
        const json = await res.json();
        setPrintSummary(json?.data?.summary || null);
        setPrintEntries(json?.data?.entries || []);
        try {
          const issueRes = await fetch(`/api/print-design-issues?orderNumber=${encodeURIComponent(num)}`, { cache: 'no-store' });
          const issueJson = await issueRes.json();
          setPrintIssue(issueJson?.data?.issue || null);
        } catch {}
      }
      if (headerPrintingWorker) {
        const toKey = String(historyToDate || "").trim();
        const toDate = toKey ? new Date(`${toKey}T00:00:00`) : new Date();
        const fromDate = new Date(toDate);
        fromDate.setDate(fromDate.getDate() - Math.max(0, Number(historyRangeDays || 1) - 1));
        const fromKey = format(fromDate, "yyyy-MM-dd");
        const toParam =
          `${toKey || format(toDate, "yyyy-MM-dd")}T23:59:59.999Z`;
        const fromParam = `${fromKey}T00:00:00.000Z`;
        const params = new URLSearchParams({
          workerName: headerPrintingWorker,
          fromDate: fromParam,
          toDate: toParam,
          limit: String(500),
        });
        try {
          const peRes = await fetch(`/api/print-order-entries?${params.toString()}`, { cache: 'no-store' });
          const peJson = await peRes.json();
          const rows: any[] = Array.isArray(peJson?.data?.entries) ? peJson.data.entries : [];
          if (rows.length > 0) {
            setAllPrintEntries(rows);
          } else {
            const altParams = new URLSearchParams({
              fromDate: fromParam,
              toDate: toParam,
              limit: String(500),
            });
            const altRes = await fetch(`/api/print-order-entries?${altParams.toString()}`, { cache: 'no-store' });
            const altJson = await altRes.json();
            const altRows: any[] = Array.isArray(altJson?.data?.entries) ? altJson.data.entries : [];
            const normalized = String(headerPrintingWorker || "").trim().toLowerCase();
            const filtered = altRows.filter((e) => String(e?.workerName || "").trim().toLowerCase() === normalized);
            setAllPrintEntries(filtered);
          }
        } catch {}
      }
      if (headerPrintingWorker) {
        try {
          const usageRes = await fetch(`/api/printing-usage?workerName=${encodeURIComponent(headerPrintingWorker)}`, { cache: 'no-store' });
          const { ok, data } = await readApiJson(usageRes);
          const rows: any[] = ok && Array.isArray((data as any)?.usages) ? (data as any).usages : [];
          const usages = [...rows].sort((a, b) => new Date(String(b?.date || 0)).getTime() - new Date(String(a?.date || 0)).getTime());
          setPrintUsageEntries(usages);
        } catch {}
      }
    } catch {} finally {
      setIsRefreshingHistory(false);
    }
  };
  const buildIssueEntryForSummary = (summary: any) => {
    const issueDoc: any = summary?.summary?.issue || summary?.data?.summary?.issue || null;
    if (!issueDoc) return null;
    const orderNum = String(issueDoc?.orderNumber || "");
    const issuedItems = (Array.isArray(issueDoc?.groups) ? issueDoc.groups : []).flatMap((g: any) => {
      const fabric = String(g?.fabricType || "").trim();
      const items: any[] = Array.isArray(g?.items) ? g.items : [];
      return items.map((it: any) => ({
        ...it,
        fabric,
        fabricType: fabric,
      }));
    });
    if (issuedItems.length === 0 || issuedItems.reduce((s: number, it: any) => s + Number(it?.quantity || 0), 0) === 0) {
      return null;
    }
    const outstanding: any[] = Array.isArray(summary?.summary?.outstanding)
      ? summary.summary.outstanding
      : Array.isArray(summary?.data?.summary?.outstanding)
      ? summary.data.summary.outstanding
      : [];
    const snapshot: Array<{ design_id: string; size_id: string; fabric: string; quantity: number }> = [];
    for (const o of outstanding) {
      const qty = Number(o?.pending || 0);
      if (qty > 0) {
        snapshot.push({
          design_id: String(o?.design_id || ""),
          size_id: String(o?.size_id || ""),
          fabric: String(o?.fabricType || "Satin").trim() || "Satin",
          quantity: qty,
        });
      }
    }
    return {
      _id: String(issueDoc?._id || `issue:${orderNum}`),
      id: String(issueDoc?._id || `issue:${orderNum}`),
      type: "issue",
      date: String(issueDoc?.createdAt || issueDoc?.updatedAt || new Date().toISOString()),
      workerName: String(issueDoc?.preparedBy || "System"),
      orderNumber: orderNum,
      items: issuedItems,
      pendingItemsSnapshot: snapshot,
    };
  };
  const printHistoryEntries = useMemo(() => {
    return historyEntries;
  }, [historyEntries]);

  const historyCombinedEntries = useMemo(() => {
    const map = new Map<string, any>();
    const pushAll = (list: any[]) => {
      list.forEach((e: any) => {
        const id = String(e?._id || e?.id || "").trim();
        const key = id || `${String(e?.type || "")}:${String(e?.orderNumber || "")}:${String(e?.date || "")}`;
        if (!map.has(key)) map.set(key, e);
      });
    };
    pushAll(workerIssueEntries || []);
    pushAll(allPrintEntries || []);
    pushAll(printHistoryEntries || []);
    const list = Array.from(map.values()).filter((e: any) => {
      if (String(e?.type || "") === "issue") {
        const items: any[] = Array.isArray(e?.items) ? e.items : [];
        const total = items.reduce((s, it) => s + Number(it?.quantity || 0), 0);
        return total > 0;
      }
      return true;
    });
    list.sort((a: any, b: any) => new Date(String(b?.date || 0)).getTime() - new Date(String(a?.date || 0)).getTime());
    return list;
  }, [workerIssueEntries, allPrintEntries, printHistoryEntries]);

 

  useEffect(() => {
    let cancelled = false;
    const candidate = String(effectiveOrderNumber || "").trim();
    const fallback = String(order?.id || "").trim();
    if (!candidate && !fallback) return;
    const fetchIssue = async (orderNumber: string) => {
      if (!orderNumber) return null;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      try {
        const res = await fetch(`/api/print-design-issues?orderNumber=${encodeURIComponent(orderNumber)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json?.ok === false) return null;
        return json?.data?.issue || null;
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    };
    const run = async () => {
      let issue = await fetchIssue(candidate);
      if (!issue && fallback && fallback !== candidate) {
        const fallbackIssue = await fetchIssue(fallback);
        if (fallbackIssue) {
          if (!cancelled) setEffectiveOrderNumber(fallback);
          issue = fallbackIssue;
        }
      }
      if (!cancelled) setPrintIssue(issue);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [effectiveOrderNumber, order?.id, mainTab]);

  useEffect(() => {
    let cancelled = false;

    const fetchWorkers = async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch('/api/workers', {
            cache: 'no-store',
            signal: controller.signal,
          });
          if (!res.ok) continue;
          const json = await res.json();
          const rows: any[] = Array.isArray(json?.data?.workers)
            ? json.data.workers
            : Array.isArray(json?.workers)
              ? json.workers
              : [];

          const normalized = rows
            .map((w) => ({
              _id: String(w?._id || ""),
              name: String(w?.name || "").trim(),
              phone: String(w?.phone || "").trim(),
              role: String(w?.role || "").trim(),
              active: w?.active !== false,
            }))
            .filter((w) => w._id && w.name);

          const printing = normalized.filter((w) => {
            const role = String(w.role || "").toLowerCase();
            return role === "printing" || role.includes("print");
          });
          const finalWorkers = printing.length > 0
            ? printing
            : normalized.filter((w) => w.active !== false);

          if (!cancelled) setWorkers(finalWorkers);
          return;
        } catch {
          if (attempt === 1 && !cancelled) {
            setWorkers([]);
          }
          await new Promise((resolve) => setTimeout(resolve, 350));
        } finally {
          clearTimeout(timeout);
        }
      }
    };

    fetchWorkers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mainTab !== "history") return;
    const name = String(headerPrintingWorker || "").trim();
    if (!name) {
      setAllPrintEntries([]);
      setWorkerIssueEntries([]);
      return;
    }
    const run = async () => {
      const toKey = String(historyToDate || "").trim();
      const toDate = toKey ? new Date(`${toKey}T00:00:00`) : new Date();
      const fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - Math.max(0, Number(historyRangeDays || 1) - 1));
      const fromKey = format(fromDate, "yyyy-MM-dd");
      const toParam =
        `${toKey || format(toDate, "yyyy-MM-dd")}T23:59:59.999Z`;
      const fromParam = `${fromKey}T00:00:00.000Z`;
      const params = new URLSearchParams({
        workerName: name,
        fromDate: fromParam,
        toDate: toParam,
        limit: String(500),
      });
      try {
        const res = await fetch(`/api/print-order-entries?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        const rows: any[] = Array.isArray(json?.data?.entries) ? json.data.entries : [];
        let sourceRows: any[] = rows;
        if (rows.length > 0) {
          setAllPrintEntries(rows);
        } else {
          const altParams = new URLSearchParams({
            fromDate: fromParam,
            toDate: toParam,
            limit: String(500),
          });
          const altRes = await fetch(`/api/print-order-entries?${altParams.toString()}`, { cache: 'no-store' });
          const altJson = await altRes.json();
          const altRows: any[] = Array.isArray(altJson?.data?.entries) ? altJson.data.entries : [];
          const normalized = String(name || "").trim().toLowerCase();
          const filtered = altRows.filter((e) => String(e?.workerName || "").trim().toLowerCase() === normalized);
          setAllPrintEntries(filtered);
          sourceRows = filtered;
        }
        const orderNums = Array.from(new Set(sourceRows.map((e: any) => String(e?.orderNumber || "").trim()).filter(Boolean)));
        if (orderNums.length > 0) {
          const issuePromises = orderNums.map(async (ord) => {
            try {
              const sres = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(String(ord))}`, { cache: "no-store" });
              const sj = await sres.json();
              return buildIssueEntryForSummary(sj);
            } catch {
              return null;
            }
          });
          const issues = (await Promise.all(issuePromises)).filter(Boolean) as any[];
          setWorkerIssueEntries(issues);
        } else {
          // Fallback: list all issues created for this date range (worker-agnostic)
          try {
            const listParams = new URLSearchParams({
              fromDate: fromParam,
              toDate: toParam,
            });
            const lres = await fetch(`/api/print-design-issues/list?${listParams.toString()}`, { cache: "no-store" });
            const lj = await lres.json();
            const docs: any[] = Array.isArray(lj?.data?.issues) ? lj.data.issues : Array.isArray(lj?.issues) ? lj.issues : [];
            const orders = Array.from(new Set(docs.map((d: any) => String(d?.orderNumber || "").trim()).filter(Boolean)));
            if (orders.length > 0) {
              const issuePromises = orders.map(async (ord) => {
                try {
                  const sres = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(String(ord))}`, { cache: "no-store" });
                  const sj = await sres.json();
                  return buildIssueEntryForSummary(sj);
                } catch {
                  return null;
                }
              });
              const issues = (await Promise.all(issuePromises)).filter(Boolean) as any[];
              setWorkerIssueEntries(issues);
            } else {
              setWorkerIssueEntries([]);
            }
          } catch {
            setWorkerIssueEntries([]);
          }
        }
      } catch {
        setAllPrintEntries([]);
        setWorkerIssueEntries([]);
      }
    };
    run();
  }, [mainTab, headerPrintingWorker, historyToDate, historyRangeDays]);

  useEffect(() => {
    const loadPurchasesForWorker = async () => {
      const name = String(headerPrintingWorker || "").trim();
      if (!name) {
        setHeaderChallan("");
        setPurchases([]);
        setUsageByPurchase({});
        setJobworkInputs({});
        return;
      }
      try {
        const res = await fetch("/api/purchases", { cache: "no-store" });
        const json = await readApiJson(res);
        const payload: any = json.data;
        const list: any[] = Array.isArray(payload?.data?.purchases)
          ? payload.data.purchases
          : Array.isArray(payload?.purchases)
            ? payload.purchases
            : [];
        const normalizedWorker = String(name || "").trim().toLowerCase();
        const filtered = list
          .filter((p) => String(p?.printingWorkerName || "").trim().toLowerCase() === normalizedWorker)
          .sort((a, b) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime());
        const latest = filtered[0];
        setHeaderChallan(String(latest?.challanOrInvoiceNo || ""));
        setPurchases(filtered);
        try {
          const usageRes = await fetch(`/api/printing-usage?workerName=${encodeURIComponent(name)}`, { cache: "no-store" });
          const usageJson = await readApiJson(usageRes);
          const usagePayload: any = usageJson.data;
          const usagesRaw: any[] = Array.isArray(usagePayload?.data?.usages)
            ? usagePayload.data.usages
            : Array.isArray(usagePayload?.usages)
              ? usagePayload.usages
              : [];
      const usages = [...usagesRaw]
        .map((u) => ({
          ...u,
          printingChallanNo: String(
            (u as any)?.printingChallanNo ||
            (u as any)?.printingChallan ||
            (u as any)?.printing_challan_no ||
            (u as any)?.printChallanNo ||
            (u as any)?.printChallan ||
            ""
          ).trim(),
        }))
            .sort((a, b) => new Date(String(b?.date || 0)).getTime() - new Date(String(a?.date || 0)).getTime());
          const byPurchase: Record<string, any> = {};
          const inputs: Record<string, any> = {};
          usages.forEach((u) => {
            const pid = String(u?.purchaseId || "");
            if (!pid) return;
            if (!byPurchase[pid]) byPurchase[pid] = u;
          });
          setPrintUsageEntries(usages);
          const top = usages[0];
          filtered.forEach((p) => {
          const pid = String(p?._id || "");
          const u = byPurchase[pid];
          if (u) {
            inputs[pid] = {
              qty: 0,
              rate: Number(u.ratePerUnit || 0),
              gstPct: Number((u as any)?.gstPct ?? 5),
              printingChallanNo: String(
                (u as any)?.printingChallanNo ||
                (u as any)?.printingChallan ||
                (u as any)?.printing_challan_no ||
                ""
              ),
              receivedDate: "",
              receivedBy: "",
              paidDate: "",
              remark: "",
            };
            }
          });
          setUsageByPurchase(byPurchase);
          setJobworkInputs(inputs);
        } catch {
          setUsageByPurchase({});
          setPrintUsageEntries([]);
        }
      } catch {
        setHeaderChallan("");
        setPurchases([]);
        setUsageByPurchase({});
        setPrintUsageEntries([]);
      }
    };
    loadPurchasesForWorker();
  }, [headerPrintingWorker]);

  const printingWorkerOptions = React.useMemo(() => {
    const tokens = ["print", "printing", "printer"];
    const filtered = (workers || []).filter((w: any) => {
      const role = String(w?.role || "").trim().toLowerCase();
      if (w?.active === false) return false;
      return tokens.some((t) => role.includes(t));
    });
    const base = filtered.length > 0 ? filtered : (workers || []).filter((w: any) => w?.active !== false);
    const names = base.map((w: any) => String(w?.name || "").trim()).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [workers]);

  const [nowText, setNowText] = useState<string>("");
  useEffect(() => {
    setNowText(format(new Date(), "dd MMM yyyy | h:mm a"));
  }, []);
  const hasWorker = Boolean(String(headerPrintingWorker || "").trim());
  const hasChallan = Boolean(String(headerChallan || "").trim());
  const showAddFabric = newOrderStarted;
  const showNewOrder = !newOrderStarted;
  const challanOptions = React.useMemo(
    () =>
      (purchases || [])
        .map((p: any, idx: number) => {
          const pid = String(p?._id || p?.id || "");
          const deliveredRaw = Number(
            p?.netMeters ?? (Number(p?.deliveredMeters || 0) - Number(p?.returnMeters || 0))
          );
          const delivered = Number.isFinite(deliveredRaw) ? deliveredRaw : 0;
          const used = pid ? usedMetersByPurchase.get(pid) || 0 : 0;
          const remaining = delivered - used;
          return {
            id: String(p?._id || p?.id || p?.challanOrInvoiceNo || p?.invoiceNo || `row-${idx}`),
            value: String(
              p?.challanOrInvoiceNo ||
                p?.challan ||
                p?.invoiceNo ||
                p?.invoice ||
                ""
            ).trim(),
            remaining,
          };
        })
        .filter((c) => c.value && c.remaining > 0.0001),
    [purchases, usedMetersByPurchase]
  );

  const handleStartNewOrder = () => {
    setNewOrderStarted(true);
    setHeaderPrintingWorker("");
    setHeaderChallan("");
    onNewOrder();
  };

  const handleAddFabric = () => {
    if (!newOrderStarted) {
      toast({ variant: "destructive", title: "Click New Order first" });
      return;
    }
    if (!hasWorker) {
      toast({ variant: "destructive", title: "Select worker first" });
      return;
    }
    if (!hasChallan) {
      toast({ variant: "destructive", title: "Select challan first" });
      return;
    }
    if (availableFabrics.length === 0) {
      toast({ variant: "destructive", title: "No fabric left to add" });
      return;
    }
    const target = availableFabrics[0] || "Satin";
    onAddGroup(target);
  };

  const resetOrderHeader = () => {
    setHeaderPrintingWorker("");
    setHeaderChallan("");
    setNewOrderStarted(false);
    setCanAddFabric(false);
    onNewOrder();
  };

  const addDamageToList = () => {
    const designId = String(damageDraftDesignId || "").trim();
    if (!designId) {
      toast({ variant: "destructive", title: "Select SKU", description: "Choose a design to add." });
      return;
    }
    const fabric = damageFabricsForDesign.length > 0 ? String(damageDraftFabricType || "").trim() : "Satin";
    if (damageFabricsForDesign.length > 0 && !fabric) {
      toast({ variant: "destructive", title: "Select Fabric", description: "Fabric चुनें." });
      return;
    }
    const s = Math.max(0, Number(damageDraftSmallQty || 0));
    const l = Math.max(0, Number(damageDraftLargeQty || 0));
    if (s === 0 && l === 0) {
      toast({ variant: "destructive", title: "Add quantity", description: "Small या Large में quantity डालें." });
      return;
    }
    setDamageItems((prev) => {
      const next = prev.filter((i) => !(String(i.design_id || "") === designId && String(i.fabricType || "") === fabric));
      if (s > 0) next.push({ design_id: designId, fabricType: fabric, size_id: "S-SML", quantity: s });
      if (l > 0) next.push({ design_id: designId, fabricType: fabric, size_id: "S-LGE", quantity: l });
      return next;
    });
    setDamageDraftDesignId("");
    setDamageDraftFabricType("");
    setDamageDraftSmallQty(0);
    setDamageDraftLargeQty(0);
  };

  const removeDamageItem = (idx: number) => {
    setDamageItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const damageTotals = React.useMemo(() => {
    let small = 0;
    let large = 0;
    damageItems.forEach((it) => {
      if (it.size_id === "S-SML") small += Number(it.quantity || 0);
      if (it.size_id === "S-LGE") large += Number(it.quantity || 0);
    });
    return { small, large, total: small + large };
  }, [damageItems]);

  const confirmDamageSave = async () => {
    if (!headerPrintingWorker) {
      toast({ variant: "destructive", title: "Select Worker", description: "Printing worker select karo." });
      return;
    }
    if (!damageNote.trim()) {
      toast({ variant: "destructive", title: "Reason required", description: "Damage ki reason/note darj karo." });
      return;
    }
    const items = damageItems
      .map((it) => ({
        fabricType: String(it.fabricType || "Satin").trim() || "Satin",
        design_id: String(it.design_id || "").trim(),
        size_id: it.size_id,
        quantity: Math.max(0, Number(it.quantity || 0)),
      }))
      .filter((it) => it.design_id && it.quantity > 0);
    if (items.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Items add karo." });
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/print-order-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: "adjust",
          action: "damage",
          orderNumber: effectiveOrderNumber,
          date: new Date(),
          note: damageNote,
          workerName: headerPrintingWorker,
          items,
        }),
      });
      const result = await readApiJson(res);
      if (!result.ok) {
        const message = String(result.error?.message || "Could not save entry.");
        toast({ variant: "destructive", title: "Failed", description: message });
        return;
      }
      const refresh = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(effectiveOrderNumber)}`, { cache: 'no-store' });
      const json = await refresh.json();
      setPrintSummary(json?.data?.summary || null);
      setPrintEntries(json?.data?.entries || []);
      setDamageItems([]);
      setDamageNote("");
      setDamageDraftDesignId("");
      setDamageDraftFabricType("");
      setDamageDraftSmallQty(0);
      setDamageDraftLargeQty(0);
      setDamageConfirmOpen(false);
      toast({ title: "Damage saved", description: "Entry recorded." });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const saveJobworkRow = async (p: any) => {
    const pid = String(p?._id || "");
    if (!pid) return;
    const entry = jobworkInputs[pid] || {};
    const usedMeters = Number(entry.qty || 0);
    if (usedMeters <= 0) {
      toast({ variant: "destructive", title: "Enter quantity", description: "Quantity 0 se badi honi chahiye." });
      return;
    }
    const ratePerUnit = Number(entry.rate ?? usageByPurchase[pid]?.ratePerUnit ?? 20);
    const gstPct = Number(entry.gstPct ?? 5);
    const receivedDate = entry.receivedDate ? String(entry.receivedDate) : undefined;
    const receivedBy = entry.receivedBy ? String(entry.receivedBy) : undefined;
    const paidDate = entry.paidDate ? String(entry.paidDate) : undefined;
    const remark = entry.remark ? String(entry.remark) : undefined;
    const printingChallanNo = entry.printingChallanNo ? String(entry.printingChallanNo) : undefined;
    const purchaseChallan = String(p?.challanOrInvoiceNo || "").trim();
    const printingChallanClean = String(printingChallanNo || "").trim();
    if (!printingChallanClean) {
      toast({ variant: "destructive", title: "Printing challan required", description: "Print challan no. डालो (purchase challan से अलग)." });
      return;
    }
    if (printingChallanClean === purchaseChallan) {
      toast({ variant: "destructive", title: "Invalid print challan", description: "Printing challan purchase challan से अलग होना चाहिए." });
      return;
    }
    if (printingChallanInUse(printingChallanClean)) {
      toast({ variant: "destructive", title: "Duplicate print challan", description: "यह print challan पहले से इस्तेमाल हुआ है." });
      return;
    }
    const remaining = getRemainingMeters(pid);
    if (usedMeters > remaining) {
      const capped = Math.max(0, remaining);
      setJobworkInputs((prev) => ({ ...prev, [pid]: { ...prev[pid], qty: capped } }));
      toast({ variant: "destructive", title: "Quantity too high", description: `Max you can add is ${remaining} m.` });
      return;
    }
    try {
      const body = {
        purchaseId: pid,
        workerName: String(headerPrintingWorker || ""),
        challanOrInvoiceNo: String(p?.challanOrInvoiceNo || ""),
        printingChallanNo,
        // send legacy key too so backend stores correctly
        printingChallan: printingChallanNo,
        usedMeters,
        ratePerUnit,
        gstPct: Number.isFinite(gstPct) ? gstPct : 5,
        date: new Date().toISOString(),
        receivedDate,
        receivedBy,
        paid: Boolean(paidDate),
        paidDate,
        remark,
      };
      const res = await fetch("/api/printing-usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const { ok, data } = await readApiJson(res);
      if (ok && data?.usage) {
        const usageWithChallan = {
          ...data.usage,
          printingChallanNo: String(
            (data.usage as any)?.printingChallanNo ||
            (data.usage as any)?.printingChallan ||
            (data.usage as any)?.printing_challan_no ||
            (data.usage as any)?.printChallanNo ||
            (data.usage as any)?.printChallan ||
            printingChallanNo ||
            ""
          ).trim(),
        };
        setUsageByPurchase((prev) => ({ ...prev, [pid]: usageWithChallan }));
        setPrintUsageEntries((prev) => [...prev, usageWithChallan]);
        setJobworkInputs((prev) => ({
          ...prev,
          [pid]: {
            ...prev[pid],
            qty: 0,
            receivedDate: "",
            receivedBy: "",
            paidDate: "",
            remark: "",
          },
        }));
      }
      toast({ title: "Saved", description: "Job-work row saved. History updated below." });
      try {
        const today = new Date();
        setHistoryToDate(format(today, "yyyy-MM-dd"));
        setHistoryRangeDays(1);
        const el = document.getElementById("history-panel");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    } catch {
      toast({ variant: "destructive", title: "Save failed", description: "Network or server error." });
    }
  };

  const formatInr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(
      Number.isFinite(n) ? n : 0
    );

  const visiblePurchases = React.useMemo(() => {
    return purchases.filter((p) => {
      const pid = String(p?._id || "");
      if (!pid) return true;
      const deliveredRaw = Number(
        p?.netMeters ?? (Number(p?.deliveredMeters || 0) - Number(p?.returnMeters || 0))
      );
      const delivered = Number.isFinite(deliveredRaw) ? deliveredRaw : 0;
      const used = usedMetersByPurchase.get(pid) || 0;
      return delivered - used > 0.0001;
    });
  }, [purchases, usedMetersByPurchase]);

  // Auto-reset headerChallan if it's no longer in visiblePurchases (remaining became 0)
  useEffect(() => {
    if (!headerChallan) return;
    const isStillAvailable = visiblePurchases.some(
      (p: any) => String(p?.challanOrInvoiceNo || "") === headerChallan
    );
    if (!isStillAvailable) {
      // Set to first available challan if any, else empty
      const first = visiblePurchases[0];
      setHeaderChallan(first ? String(first?.challanOrInvoiceNo || "") : "");
    }
  }, [visiblePurchases, headerChallan]);

  const jobworkTotals = React.useMemo(() => {
    let qty = 0;
    let amount = 0;
    let gst = 0;
    let final = 0;
    visiblePurchases.forEach((p) => {
      const id = String(p?._id || "");
      const e = jobworkInputs[id] || {};
      const q = Number(e.qty || 0);
      const r = Number(e.rate || 0);
      const gstPct = Number(e.gstPct ?? 5);
      const a = Math.round(q * r * 100) / 100;
      const g = Math.round(a * (Math.max(0, gstPct) / 100) * 100) / 100;
      qty += q;
      amount += a;
      gst += g;
      final += a + g;
    });
    return {
      qty: Math.round(qty * 100) / 100,
      amount: Math.round(amount * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      final: Math.round(final * 100) / 100,
    };
  }, [purchases, jobworkInputs]);

  const formatMeters = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
  const usageTotals = React.useMemo(() => {
    let delivered = 0;
    let used = 0;
    let remaining = 0;
    purchases.forEach((p) => {
      const id = String(p?._id || p?.challanOrInvoiceNo || "");
      const d = Number(p?.netMeters || p?.deliveredMeters || 0) - Number(p?.returnMeters || 0);
      const u = Number(usageInputs[id] || 0);
      const r = Math.max(0, Math.round((d - u) * 100) / 100);
      delivered += d;
      used += u;
      remaining += r;
    });
    return {
      delivered: Math.round(delivered * 100) / 100,
      used: Math.round(used * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
    };
  }, [purchases, usageInputs]);

  // moved below outstandingList declaration

  useEffect(() => {
    let cancelled = false;
    const candidate = String(effectiveOrderNumber || "").trim();
    const fallback = String(order?.id || "").trim();
    if (!candidate && !fallback) return;
    const fetchSummary = async (orderNumber: string) => {
      if (!orderNumber) return null;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      try {
        const res = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(orderNumber)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json?.ok === false) return null;
        return {
          summary: json?.data?.summary || null,
          entries: json?.data?.entries || [],
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    };
    const run = async () => {
      let result = await fetchSummary(candidate);
      if ((!result || (result.entries?.length || 0) === 0) && fallback && fallback !== candidate) {
        const fallbackResult = await fetchSummary(fallback);
        if (fallbackResult && ((fallbackResult.entries?.length || 0) > 0 || fallbackResult.summary)) {
          if (!cancelled) setEffectiveOrderNumber(fallback);
          result = fallbackResult;
        }
      }
      const summary = result?.summary || null;
      const entries = result?.entries || [];
      if (cancelled) return;
      setPrintSummary(summary);
      setPrintEntries(entries);
      const next: Record<string, number> = {};
      const outstanding: any[] = summary?.outstanding || [];
      outstanding.forEach((o) => {
        if (Number(o?.pending || 0) > 0) {
          const key = `${o.fabricType}||${o.design_id}||${o.size_id}`;
          next[key] = Number(o.pending || 0);
        }
      });
      setPendingInputs(next);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [effectiveOrderNumber, order?.id, mainTab, headerPrintingWorker]);

  useEffect(() => {
    if (mainTab === "adjust") {
      setSelectedDate(new Date());
    }
  }, [mainTab]);

  const issueTotals = (() => {
    const base = { small: 0, large: 0 };
    const groups: any[] = Array.isArray(printIssue?.groups) ? printIssue.groups : [];
    for (const g of groups) {
      const items: any[] = Array.isArray(g?.items) ? g.items : [];
      for (const it of items) {
        const qty = Number(it?.quantity || 0);
        const sizeId = String(it?.size_id || '').trim();
        if (!Number.isFinite(qty) || qty <= 0) continue;
        if (sizeId === 'S-SML') base.small += qty;
        else if (sizeId === 'S-LGE') base.large += qty;
      }
    }
    return base;
  })();

  const outstandingList = useMemo(() => {
    let raw: any[] = Array.isArray(printSummary?.outstanding) ? printSummary.outstanding : [];
    if (raw.length === 0) {
      const groups: any[] = Array.isArray(printIssue?.groups) ? printIssue.groups : [];
      const fallback: any[] = [];
      groups.forEach((g) => {
        const fabric = String(g?.fabricType || "").trim();
        const items: any[] = Array.isArray(g?.items) ? g.items : [];
        items.forEach((it) => {
          const designId = String(it?.design_id || "").trim();
          const sizeId = String(it?.size_id || "").trim();
          const qty = Number(it?.quantity || 0);
          if (!designId || !sizeId || qty <= 0) return;
          fallback.push({ fabricType: fabric, design_id: designId, size_id: sizeId, pending: qty });
        });
      });
      raw = fallback;
    }
    const filtered = raw.filter((o) => {
      if (!Number(o?.pending || 0)) return false;
      const q = searchText.trim().toLowerCase();
      if (!q) return true;
      const code = String(o?.design_id || "").toLowerCase();
      const fab = String(o?.fabricType || "").toLowerCase();
      return code.includes(q) || fab.includes(q);
    });
    filtered.sort((a, b) => {
      const fa = String(a.fabricType || "").localeCompare(String(b.fabricType || ""));
      if (fa !== 0) return fa;
      const da = String(a.design_id || "").localeCompare(String(b.design_id || ""));
      if (da !== 0) return da;
      return String(a.size_id || "").localeCompare(String(b.size_id || ""));
    });
    return filtered;
  }, [printSummary?.outstanding, printIssue?.groups, searchText]);

  const openSmall = useMemo(() => {
    const match = (outstandingList || []).filter(
      (o: any) =>
        String(o?.design_id || "").trim() === draftDesignId &&
        String(o?.fabricType || "").trim().toLowerCase() === String(draftFabricType || "").trim().toLowerCase() &&
        String(o?.size_id || "") === "S-SML"
    );
    return match.reduce((t: number, o: any) => t + Number(o?.pending || 0), 0);
  }, [outstandingList, draftDesignId, draftFabricType]);

  const openLarge = useMemo(() => {
    const match = (outstandingList || []).filter(
      (o: any) =>
        String(o?.design_id || "").trim() === draftDesignId &&
        String(o?.fabricType || "").trim().toLowerCase() === String(draftFabricType || "").trim().toLowerCase() &&
        String(o?.size_id || "") === "S-LGE"
    );
    return match.reduce((t: number, o: any) => t + Number(o?.pending || 0), 0);
  }, [outstandingList, draftDesignId, draftFabricType]);

  const sizesLabel = useMemo(() => {
    const s = openSmall > 0;
    const l = openLarge > 0;
    if (s && l) return "Small & Large";
    if (s && !l) return "Small Only";
    if (!s && l) return "Large Only";
    return "No sizes";
  }, [openSmall, openLarge]);

  const pendingDraftSizes = useMemo(() => {
    const sizes: Array<"S-SML" | "S-LGE"> = [];
    if (openSmall > 0) sizes.push("S-SML");
    if (openLarge > 0) sizes.push("S-LGE");
    return sizes;
  }, [openSmall, openLarge]);

  const issuedFabricsByDesign = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const groups: any[] = Array.isArray(printIssue?.groups) ? printIssue.groups : [];
    groups.forEach((g) => {
      const fabric = String(g?.fabricType || "").trim();
      const items: any[] = Array.isArray(g?.items) ? g.items : [];
      items.forEach((it) => {
        const id = String(it?.design_id || "").trim();
        if (!id) return;
        if (!map.has(id)) map.set(id, new Set());
        if (fabric) map.get(id)!.add(fabric);
      });
    });
    return map;
  }, [printIssue?.groups]);

  const damageFabricsForDesign = useMemo(() => {
    if (!damageDraftDesignId) return [];
    const set = Array.from((issuedFabricsByDesign.get(damageDraftDesignId) || new Set<string>()).values());
    return set.length > 0 ? set.sort((a, b) => a.localeCompare(b)) : [];
  }, [damageDraftDesignId, issuedFabricsByDesign]);

  const selectedFabricsByDesign = useMemo(() => {
    const map = new Map<string, Set<string>>();
    sessionItems.forEach((i) => {
      const id = String(i.design_id || "").trim();
      if (!id) return;
      const fabric = String(i.fabricType || "").trim();
      if (!map.has(id)) map.set(id, new Set());
      if (fabric) map.get(id)!.add(fabric);
    });
    return map;
  }, [sessionItems]);

  const availableReceiveDesigns = useMemo(() => {
    const set = new Set((outstandingList || []).map((o: any) => String(o?.design_id || "").trim()).filter(Boolean));
    const current = String(draftDesignId || "").trim();
    const list = designs.filter((d) => {
      const id = String(d.design_id || "").trim();
      if (!set.has(id)) return false;
      const issued = issuedFabricsByDesign.get(id);
      if (!issued || issued.size === 0) return true;
      const selected = selectedFabricsByDesign.get(id);
      if (!selected || selected.size === 0) return true;
      if (id === current) return true;
      return Array.from(issued).some((fab) => !selected.has(fab));
    });
    list.sort((a, b) => String(a.design_id || "").localeCompare(String(b.design_id || "")));
    return list;
  }, [outstandingList, designs, draftDesignId, issuedFabricsByDesign, selectedFabricsByDesign]);

  const adjustReceivedByKey = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedWorker) return map;
    (printEntries || []).forEach((entry: any) => {
      if (String(entry?.type || "") !== "receive") return;
      if (String(entry?.workerName || "").trim() !== selectedWorker) return;
      const items: any[] = Array.isArray(entry?.items) ? entry.items : [];
      items.forEach((it) => {
        const designId = String(it?.design_id || "").trim();
        const sizeId = String(it?.size_id || "").trim();
        const fabric = String(it?.fabricType || "Satin").trim() || "Satin";
        const qty = Number(it?.quantity || 0);
        if (!designId || !sizeId || !Number.isFinite(qty) || qty <= 0) return;
        const key = `${designId}||${sizeId}||${fabric}`;
        map.set(key, (map.get(key) || 0) + qty);
      });
    });
    return map;
  }, [printEntries, selectedWorker]);

  const adjustReducedByKey = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedWorker) return map;
    (printEntries || []).forEach((entry: any) => {
      if (String(entry?.type || "") !== "adjust") return;
      if (String(entry?.workerName || "").trim() !== selectedWorker) return;
      const items: any[] = Array.isArray(entry?.items) ? entry.items : [];
      items.forEach((it) => {
        const designId = String(it?.design_id || "").trim();
        const sizeId = String(it?.size_id || "").trim();
        const fabric = String(it?.fabricType || "Satin").trim() || "Satin";
        const qty = Number(it?.quantity || 0);
        if (!designId || !sizeId || !Number.isFinite(qty) || qty <= 0) return;
        const key = `${designId}||${sizeId}||${fabric}`;
        map.set(key, (map.get(key) || 0) + qty);
      });
    });
    return map;
  }, [printEntries, selectedWorker]);

  const adjustNetByKey = useMemo(() => {
    const map = new Map<string, number>();
    adjustReceivedByKey.forEach((qty, key) => {
      const reduced = adjustReducedByKey.get(key) || 0;
      map.set(key, Math.max(0, Number(qty || 0) - Number(reduced || 0)));
    });
    return map;
  }, [adjustReceivedByKey, adjustReducedByKey]);

  const availableAdjustDesigns = useMemo(() => {
    const designIds = new Set<string>();
    adjustNetByKey.forEach((qty, key) => {
      if (qty <= 0) return;
      const [design] = String(key || "").split("||");
      const id = String(design || "").trim();
      if (id) designIds.add(id);
    });
    const adjustSelectedFabricsByDesign = new Map<string, Set<string>>();
    adjustItems.forEach((i) => {
      const id = String(i.design_id || "").trim();
      if (!id) return;
      const fabric = String(i.fabricType || "").trim();
      if (!adjustSelectedFabricsByDesign.has(id)) adjustSelectedFabricsByDesign.set(id, new Set());
      if (fabric) adjustSelectedFabricsByDesign.get(id)!.add(fabric);
    });
    const remainingFabricsByDesign = new Map<string, Set<string>>();
    adjustNetByKey.forEach((qty, key) => {
      if (qty <= 0) return;
      const [design, , fabric] = String(key || "").split("||");
      const id = String(design || "").trim();
      const fab = String(fabric || "").trim();
      if (!id || !fab) return;
      if (!remainingFabricsByDesign.has(id)) remainingFabricsByDesign.set(id, new Set());
      remainingFabricsByDesign.get(id)!.add(fab);
    });
    const current = String(adjustDraftDesignId || "").trim();
    const list = designs.filter((d) => {
      const id = String(d.design_id || "").trim();
      if (!designIds.has(id)) return false;
      const usedFabrics = adjustSelectedFabricsByDesign.get(id);
      const remainingFabrics = remainingFabricsByDesign.get(id);
      const hasUnselected =
        remainingFabrics && usedFabrics
          ? Array.from(remainingFabrics).some((f) => !usedFabrics.has(f))
          : !(usedFabrics && usedFabrics.size > 0);
      if (usedFabrics && usedFabrics.size > 0 && id !== current && !hasUnselected) return false;
      return true;
    });
    list.sort((a, b) => String(a.design_id || "").localeCompare(String(b.design_id || "")));
    return list;
  }, [adjustNetByKey, designs, adjustItems, adjustDraftDesignId]);

  const draftFabrics = useMemo(() => {
    if (!draftDesignId) return [];
    const fromOutstanding = Array.from(
      new Set(
        (outstandingList || [])
          .filter((o: any) => String(o?.design_id || "").trim() === draftDesignId)
          .map((o: any) => String(o?.fabricType || "").trim())
          .filter(Boolean)
      )
    );
    const fromIssue = Array.from(issuedFabricsByDesign.get(draftDesignId) || []);
    const fabrics = (fromOutstanding.length ? fromOutstanding : fromIssue).filter(Boolean);
    const used = selectedFabricsByDesign.get(draftDesignId);
    const filtered = used && used.size > 0 ? fabrics.filter((f) => !used.has(f)) : fabrics;
    return filtered.sort((a, b) => a.localeCompare(b));
  }, [outstandingList, draftDesignId, issuedFabricsByDesign, selectedFabricsByDesign]);

  const adjustDraftFabrics = useMemo(() => {
    if (!adjustDraftDesignId) return [];
    const set = new Set<string>();
    adjustNetByKey.forEach((qty, key) => {
      if (qty <= 0) return;
      const [design, , fabric] = String(key || "").split("||");
      if (String(design || "").trim() !== adjustDraftDesignId) return;
      const cleanFabric = String(fabric || "").trim();
      if (cleanFabric) set.add(cleanFabric);
    });
    const fabrics = Array.from(set);
    fabrics.sort((a, b) => a.localeCompare(b));
    return fabrics;
  }, [adjustNetByKey, adjustDraftDesignId]);

  useEffect(() => {
    if (!draftDesignId) {
      setDraftFabricType("");
      setAutoSelectFabric(true);
      return;
    }
    if (draftFabrics.length === 1 && autoSelectFabric) {
      setDraftFabricType(draftFabrics[0]);
      return;
    }
    if (draftFabricType && !draftFabrics.includes(draftFabricType)) {
      setDraftFabricType("");
    }
  }, [draftDesignId, draftFabrics, autoSelectFabric, draftFabricType]);

  useEffect(() => {
    if (!adjustDraftDesignId) {
      setAdjustDraftFabricType("");
      setAdjustAutoSelectFabric(true);
      return;
    }
    if (adjustDraftFabrics.length === 1 && adjustAutoSelectFabric) {
      setAdjustDraftFabricType(adjustDraftFabrics[0]);
      return;
    }
    if (adjustDraftFabricType && !adjustDraftFabrics.includes(adjustDraftFabricType)) {
      setAdjustDraftFabricType("");
    }
  }, [adjustDraftDesignId, adjustDraftFabrics, adjustAutoSelectFabric, adjustDraftFabricType]);

  const adjustOpenSmall = useMemo(() => {
    const match = (outstandingList || []).filter(
      (o: any) =>
        String(o?.design_id || "").trim() === adjustDraftDesignId &&
        String(o?.fabricType || "").trim().toLowerCase() === String(adjustDraftFabricType || "").trim().toLowerCase() &&
        String(o?.size_id || "") === "S-SML"
    );
    return match.reduce((t: number, o: any) => t + Number(o?.pending || 0), 0);
  }, [outstandingList, adjustDraftDesignId, adjustDraftFabricType]);

  const adjustOpenLarge = useMemo(() => {
    const match = (outstandingList || []).filter(
      (o: any) =>
        String(o?.design_id || "").trim() === adjustDraftDesignId &&
        String(o?.fabricType || "").trim().toLowerCase() === String(adjustDraftFabricType || "").trim().toLowerCase() &&
        String(o?.size_id || "") === "S-LGE"
    );
    return match.reduce((t: number, o: any) => t + Number(o?.pending || 0), 0);
  }, [outstandingList, adjustDraftDesignId, adjustDraftFabricType]);

  const adjustReceivedSmall = useMemo(() => {
    if (!adjustDraftDesignId || !adjustDraftFabricType) return 0;
    const key = `${adjustDraftDesignId}||S-SML||${String(adjustDraftFabricType || "").trim()}`;
    return adjustReceivedByKey.get(key) || 0;
  }, [adjustReceivedByKey, adjustDraftDesignId, adjustDraftFabricType]);

  const adjustReceivedLarge = useMemo(() => {
    if (!adjustDraftDesignId || !adjustDraftFabricType) return 0;
    const key = `${adjustDraftDesignId}||S-LGE||${String(adjustDraftFabricType || "").trim()}`;
    return adjustReceivedByKey.get(key) || 0;
  }, [adjustReceivedByKey, adjustDraftDesignId, adjustDraftFabricType]);

  const adjustNetSmall = useMemo(() => {
    if (!adjustDraftDesignId || !adjustDraftFabricType) return 0;
    const key = `${adjustDraftDesignId}||S-SML||${String(adjustDraftFabricType || "").trim()}`;
    return adjustNetByKey.get(key) || 0;
  }, [adjustNetByKey, adjustDraftDesignId, adjustDraftFabricType]);

  const adjustNetLarge = useMemo(() => {
    if (!adjustDraftDesignId || !adjustDraftFabricType) return 0;
    const key = `${adjustDraftDesignId}||S-LGE||${String(adjustDraftFabricType || "").trim()}`;
    return adjustNetByKey.get(key) || 0;
  }, [adjustNetByKey, adjustDraftDesignId, adjustDraftFabricType]);

  const adjustAvailableSmall = adjustNetSmall;
  const adjustAvailableLarge = adjustNetLarge;

  const adjustPendingDraftSizes = useMemo(() => {
    const sizes: Array<"S-SML" | "S-LGE"> = [];
    if (adjustAvailableSmall > 0) sizes.push("S-SML");
    if (adjustAvailableLarge > 0) sizes.push("S-LGE");
    return sizes;
  }, [adjustAvailableSmall, adjustAvailableLarge]);

  const groupedReceiveItems = useMemo(() => {
    const map = new Map<string, { designId: string; fabric: string; small: number; large: number }>();
    sessionItems.forEach((i) => {
      const id = String(i.design_id || "").trim();
      if (!id) return;
      const fabric = String(i.fabricType || "").trim();
      const key = `${id}||${fabric}`;
      const current = map.get(key) || { designId: id, fabric, small: 0, large: 0 };
      if (i.size_id === "S-SML") current.small += Number(i.quantity || 0);
      if (i.size_id === "S-LGE") current.large += Number(i.quantity || 0);
      map.set(key, current);
    });
    return Array.from(map.values()).filter((g) => g.small + g.large > 0);
  }, [sessionItems]);

  const workerPhoneByName = useMemo(() => {
    const map: Record<string, string> = {};
    workers.forEach((w) => {
      const name = String(w?.name || "").trim();
      if (!name) return;
      const phone = String(w?.phone || "").trim();
      if (!map[name] && phone) map[name] = phone;
    });
    return map;
  }, [workers]);

  const markDirty = () => {
    if (savedEntry) setSavedEntry(null);
  };

  const addDesignToSession = () => {
    if (!selectedWorker) {
      toast({ variant: "destructive", title: "Select Worker", description: "Choose a worker first." });
      return;
    }
    const designId = String(draftDesignId || "").trim();
    if (!designId) {
      toast({ variant: "destructive", title: "Select SKU", description: "Choose a design to add." });
      return;
    }
    const fabric = draftFabrics.length > 0 ? String(draftFabricType || "").trim() : "";
    if (!fabric) {
      toast({ variant: "destructive", title: "Select Fabric", description: "Fabric चुनें." });
      return;
    }
    if (openSmall <= 0 && openLarge <= 0) {
      toast({ variant: "destructive", title: "Not issued", description: "Is SKU ka open quantity nahi hai." });
      return;
    }
    const smallQtyRaw = Math.max(0, Number(draftSmallQty) || 0);
    const largeQtyRaw = Math.max(0, Number(draftLargeQty) || 0);
    const smallQty = openSmall > 0 ? Math.min(smallQtyRaw, openSmall || 0) : 0;
    const largeQty = openLarge > 0 ? Math.min(largeQtyRaw, openLarge || 0) : 0;
    if (smallQty === 0 && largeQty === 0) {
      toast({ variant: "destructive", title: "Add quantity", description: "Small या Large में quantity डालें." });
      return;
    }
    markDirty();
    setSessionItems((prev) => {
      const next = prev.filter((i) => {
        const id = String(i.design_id || "").trim();
        const fab = String(i.fabricType || "").trim();
        return !(id === designId && fab === fabric);
      });
      if (smallQty > 0) next.push({ key: `${fabric}||${designId}||S-SML`, design_id: designId, fabricType: fabric, size_id: "S-SML", pending: openSmall, quantity: smallQty });
      if (largeQty > 0) next.push({ key: `${fabric}||${designId}||S-LGE`, design_id: designId, fabricType: fabric, size_id: "S-LGE", pending: openLarge, quantity: largeQty });
      return next;
    });
    setDraftDesignId("");
    setDraftFabricType("");
    setDraftSmallQty(0);
    setDraftLargeQty(0);
    setAutoSelectFabric(false);
  };

  const removeDesignFromSession = (designId: string, fabric?: string) => {
    const fab = String(fabric || "").trim();
    markDirty();
    setSessionItems((prev) =>
      prev.filter((i) => {
        const id = String(i.design_id || "").trim();
        const f = String(i.fabricType || "").trim();
        return !(id === designId && f === fab);
      })
    );
  };

  const addAdjustToList = () => {
    if (!selectedWorker) {
      toast({ variant: "destructive", title: "Select Worker", description: "Choose a worker first." });
      return;
    }
    const designId = String(adjustDraftDesignId || "").trim();
    if (!designId) {
      toast({ variant: "destructive", title: "Select SKU", description: "Choose a design to add." });
      return;
    }
    const fabric = adjustDraftFabrics.length > 0 ? String(adjustDraftFabricType || "").trim() : "Satin";
    if (adjustDraftFabrics.length > 0 && !fabric) {
      toast({ variant: "destructive", title: "Select Fabric", description: "Fabric चुनें." });
      return;
    }
    if (adjustAvailableSmall <= 0 && adjustAvailableLarge <= 0) {
      toast({ variant: "destructive", title: "No available qty", description: "Is SKU ki quantity available nahi hai." });
      return;
    }
    const smallQtyRaw = Math.max(0, Number(adjustDraftSmallQty) || 0);
    const largeQtyRaw = Math.max(0, Number(adjustDraftLargeQty) || 0);
    const smallQty = adjustAvailableSmall > 0 ? Math.min(smallQtyRaw, adjustAvailableSmall || 0) : 0;
    const largeQty = adjustAvailableLarge > 0 ? Math.min(largeQtyRaw, adjustAvailableLarge || 0) : 0;
    if (smallQty === 0 && largeQty === 0) {
      toast({ variant: "destructive", title: "Add quantity", description: "Small या Large में quantity डालें." });
      return;
    }
    setAdjustItems((prev) => {
      const next = prev.filter((i) => {
        const id = String(i.design_id || "").trim();
        const fab = String(i.fabricType || "").trim();
        return !(id === designId && fab === fabric);
      });
      if (smallQty > 0) next.push({ design_id: designId, fabricType: fabric, size_id: "S-SML", quantity: smallQty });
      if (largeQty > 0) next.push({ design_id: designId, fabricType: fabric, size_id: "S-LGE", quantity: largeQty });
      return next;
    });
    setAdjustDraftDesignId("");
    setAdjustDraftFabricType("");
    setAdjustDraftSmallQty(0);
    setAdjustDraftLargeQty(0);
    setAdjustAutoSelectFabric(true);
  };

  const removeAdjustItem = (idx: number) => {
    setAdjustItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const validSessionItems = useMemo(
    () => sessionItems.filter((s) => Number(s.quantity || 0) > 0),
    [sessionItems]
  );

  const adjustValidItems = useMemo(
    () =>
      adjustItems
        .map((it) => ({
          design_id: String(it.design_id || "").trim(),
          size_id: it.size_id,
          quantity: Math.max(0, Number(it.quantity || 0)),
          fabricType: String(it.fabricType || "Satin").trim() || "Satin",
        }))
        .filter((it) => it.design_id && it.quantity > 0),
    [adjustItems]
  );

  const adjustTotals = useMemo(() => {
    let small = 0;
    let large = 0;
    adjustValidItems.forEach((it) => {
      if (it.size_id === "S-SML") small += it.quantity;
      if (it.size_id === "S-LGE") large += it.quantity;
    });
    return { small, large, total: small + large };
  }, [adjustValidItems]);

  const receiveTotals = useMemo(() => {
    let small = 0;
    let large = 0;
    validSessionItems.forEach((it) => {
      if (it.size_id === "S-SML") small += Number(it.quantity || 0);
      if (it.size_id === "S-LGE") large += Number(it.quantity || 0);
    });
    return { small, large, total: small + large };
  }, [validSessionItems]);

  const canSubmit = !!selectedWorker && validSessionItems.length > 0 && !isSaving;
  const canShare = !!savedEntry && !isSaving;

  const buildShareMessage = (entry: any) => {
    const items: any[] = Array.isArray(entry?.items) ? entry.items : [];
    const formatShareDate = (value: any) => {
      const date = new Date(value || Date.now());
      if (Number.isNaN(date.getTime())) return "";
      const parts = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).formatToParts(date);
      const day = parts.find((p) => p.type === "day")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const year = parts.find((p) => p.type === "year")?.value || "";
      const time = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(date);
      return `${day} ${month}, ${year} | ${time}`;
    };
    const formatPendingDate = (value: any) => {
      const date = new Date(value || Date.now());
      if (Number.isNaN(date.getTime())) return "";
      const parts = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).formatToParts(date);
      const day = parts.find((p) => p.type === "day")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const year = parts.find((p) => p.type === "year")?.value || "";
      const hour = parts.find((p) => p.type === "hour")?.value || "";
      const minute = parts.find((p) => p.type === "minute")?.value || "";
      const period = (parts.find((p) => p.type === "dayPeriod")?.value || "").toUpperCase();
      return `${day}, ${month} ${year} | ${hour}:${minute} ${period}`.trim();
    };
    const fabricOrder: string[] = [];
    const byFabric = new Map<string, { small: Array<{ id: string; qty: number }>; large: Array<{ id: string; qty: number }> }>();
    let totalSmall = 0;
    let totalLarge = 0;
    items.forEach((it) => {
      const fabric = String(it?.fabricType || "Satin").trim() || "Satin";
      const designId = String(it?.design_id || "").trim();
      const qty = Number(it?.quantity || 0);
      if (!designId || qty <= 0) return;
      if (!byFabric.has(fabric)) {
        byFabric.set(fabric, { small: [], large: [] });
        fabricOrder.push(fabric);
      }
      const bucket = byFabric.get(fabric)!;
      if (String(it?.size_id || "") === "S-SML") {
        bucket.small.push({ id: designId, qty });
        totalSmall += qty;
      } else {
        bucket.large.push({ id: designId, qty });
        totalLarge += qty;
      }
    });
    const blocks = fabricOrder.map((fabric) => {
      const data = byFabric.get(fabric);
      if (!data) return "";
      const parts: string[] = [`\`\`\`Fabric type: ${fabric}\`\`\``];
      if (data.small.length > 0) {
        parts.push(
          `\n\n*Small (50×50 cm)*\n` +
            data.small.map((d) => `•⁠  ⁠${d.id}: ${d.qty} pcs`).join("\n")
        );
      }
      if (data.large.length > 0) {
        parts.push(
          `\n\n*Large (90×90 cm)*\n` +
            data.large.map((d) => `•⁠  ⁠${d.id}: ${d.qty} pcs`).join("\n")
        );
      }
      return parts.join("");
    });
    const header =
      `📅 *Date*: ${formatShareDate(entry?.date)}\n` +
      `👷 *Worker*: ${entry?.workerName || "-"}` +
      `\n✅ *Printing scarves received today*` +
      `\n📦 *Order*: ${entry?.orderNumber || order?.id || ""}\n\n`;
    const body = `${blocks.join("\n\n")}\n\n` + `Total S: ${totalSmall} | L: ${totalLarge} pcs`;
    const pendingItems = Array.isArray(outstandingList) ? outstandingList.filter((o) => Number(o?.pending || 0) > 0) : [];
    if (pendingItems.length === 0) {
      return header + body;
    }
    const pendingByFabric = new Map<string, Array<{ id: string; qty: number }>>();
    pendingItems.forEach((o: any) => {
      const fabric = String(o?.fabricType || "Satin").trim() || "Satin";
      const id = String(o?.design_id || "").trim();
      const qty = Number(o?.pending || 0);
      if (!id || qty <= 0) return;
      if (!pendingByFabric.has(fabric)) pendingByFabric.set(fabric, []);
      pendingByFabric.get(fabric)!.push({ id, qty });
    });
    const pendingBlocks = Array.from(pendingByFabric.entries()).map(([fabric, list]) => {
      const lines = list.map((d) => `•⁠  ⁠${d.id}: ${d.qty} pcs${printIssue?.createdAt ? ` (${formatPendingDate(printIssue.createdAt)})` : ""}`).join("\n");
      return `\`\`\`Fabric type: ${fabric}\`\`\`\n${lines}`;
    });
    const pendingSection = `\n\n📋 *Pending Material Alert*:\n\n${pendingBlocks.join("\n\n")}\n`;
    return header + body + pendingSection;
  };

  const handleShare = async (platform: 'whatsapp' | 'native') => {
    if (isSaving) return;
    if (!savedEntry) {
      toast({ variant: "destructive", title: "Finalize required", description: "Please finalize & save before sharing." });
      return;
    }
    const text = buildShareMessage(savedEntry);
    try {
      if (platform === 'whatsapp') {
        const phoneRaw = workerPhoneByName?.[savedEntry.workerName] || "";
        const waNumber = toWaNumber(phoneRaw);
        if (!waNumber || waNumber.length < 8) {
          toast({ variant: "destructive", title: "Phone missing", description: "Worker phone number not found." });
          return;
        }
        const enc = encodeURIComponent(text);
        const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = `https://wa.me/${waNumber}?text=${enc}`;
        } else {
          try {
            window.location.href = `whatsapp://send?phone=${waNumber}&text=${enc}`;
          } catch {}
          setTimeout(() => {
            window.open(`https://web.whatsapp.com/send?phone=${waNumber}&text=${enc}`, '_blank');
          }, 700);
        }
      } else {
        const shareData = { text };
        const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
        if (canNativeShare) {
          try {
            await navigator.share(shareData);
          } catch {}
        } else {
          try {
            await navigator.clipboard.writeText(text);
            toast({ title: "Copied to Clipboard" });
          } catch {}
          const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
          window.open(dataUrl, '_blank');
        }
      }
      toast({ title: "Entry Shared Successfully" });
    } catch {}
  };

  const buildEditShareMessage = () => {
    if (!editEntry) return "";
    const type = String(editEntry.type || "").trim();
    const items: any[] = Array.isArray(editItems) ? editItems : [];
    const formatShareDate = (value: any) => {
      const date = new Date(value || Date.now());
      if (Number.isNaN(date.getTime())) return "";
      const parts = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).formatToParts(date);
      const day = parts.find((p) => p.type === "day")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const year = parts.find((p) => p.type === "year")?.value || "";
      const time = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(date);
      return `${day} ${month}, ${year} | ${time}`;
    };
    const actionLabel =
      type === "receive" ? "Printing Received" :
      type === "issue" ? "Printing Issue" :
      type === "hold" ? "Printing Held" :
      type === "reject" ? "Printing Rejected" :
      "Printing Adjusted";
    const fabricOrder: string[] = [];
    const byFabric = new Map<string, { small: Array<{ id: string; qty: number }>; large: Array<{ id: string; qty: number }> }>();
    let totalSmall = 0;
    let totalLarge = 0;
    items.forEach((it) => {
      const fabric = String(it?.fabricType || "Satin").trim() || "Satin";
      const designId = String(it?.design_id || "").trim();
      const qty = Number(it?.quantity || 0);
      if (!designId || qty <= 0) return;
      if (!byFabric.has(fabric)) {
        byFabric.set(fabric, { small: [], large: [] });
        fabricOrder.push(fabric);
      }
      const bucket = byFabric.get(fabric)!;
      if (String(it?.size_id || "") === "S-SML") {
        bucket.small.push({ id: designId, qty });
        totalSmall += qty;
      } else {
        bucket.large.push({ id: designId, qty });
        totalLarge += qty;
      }
    });
    const blocks = fabricOrder.map((fabric) => {
      const data = byFabric.get(fabric);
      if (!data) return "";
      const parts: string[] = [`\`\`\`Fabric type: ${fabric}\`\`\``];
      if (data.small.length > 0) {
        parts.push(`\n\n*Small (50×50 cm)*\n` + data.small.map((d) => `•⁠  ⁠${d.id}: ${d.qty} pcs`).join("\n"));
      }
      if (data.large.length > 0) {
        parts.push(`\n\n*Large (90×90 cm)*\n` + data.large.map((d) => `•⁠  ⁠${d.id}: ${d.qty} pcs`).join("\n"));
      }
      return parts.join("");
    });
    const header =
      `📅 *Date*: ${formatShareDate(editDate || editEntry.date)}\n` +
      `👷 *Worker*: ${String(editWorker || editEntry.workerName || "-")}` +
      `\n✏️ *Updated ${actionLabel}*\n` +
      `\n📦 *Order*: ${order?.id || ""}\n\n`;
    const body = `${blocks.join("\n\n")}\n\n` + `Total S: ${totalSmall} | L: ${totalLarge} pcs`;
    return header + body;
  };

  const handleEditShare = async (platform: 'whatsapp' | 'native') => {
    if (!editEntry) return;
    const text = buildEditShareMessage();
    try {
      if (platform === 'whatsapp') {
        const phoneRaw = workerPhoneByName?.[String(editWorker || editEntry.workerName || "")] || "";
        const waNumber = toWaNumber(phoneRaw);
        if (!waNumber || waNumber.length < 8) {
          toast({ variant: "destructive", title: "Phone missing", description: "Worker phone number not found." });
          return;
        }
        const enc = encodeURIComponent(text);
        const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = `https://wa.me/${waNumber}?text=${enc}`;
        } else {
          try {
            window.location.href = `whatsapp://send?phone=${waNumber}&text=${enc}`;
          } catch {}
          setTimeout(() => {
            window.open(`https://web.whatsapp.com/send?phone=${waNumber}&text=${enc}`, '_blank');
          }, 700);
        }
      } else {
        const shareData = { text };
        const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
        if (canNativeShare) {
          try {
            await navigator.share(shareData);
          } catch {}
        } else {
          try {
            await navigator.clipboard.writeText(text);
            toast({ title: "Copied to Clipboard" });
          } catch {}
          const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
          window.open(dataUrl, '_blank');
        }
      }
      toast({ title: "Updated entry ready to share" });
    } catch {}
  };

  const adjustTheme = (value: "hold" | "reject" | "adjust") => {
    if (value === "reject") return { chip: "bg-destructive/15 text-destructive", button: "bg-destructive hover:bg-destructive/90 text-white" };
    if (value === "hold") return { chip: "bg-amber-500/15 text-amber-500", button: "bg-amber-600 hover:bg-amber-600/90 text-white" };
    return { chip: "bg-violet-500/15 text-violet-400", button: "bg-violet-600 hover:bg-violet-600/90 text-white" };
  };

  const adjustThemeStyle = adjustTheme(adjustAction);
  const canSubmitAdjust = !!selectedWorker && adjustValidItems.length > 0 && !!adjustNote.trim() && !isSaving;

  const openAdjustConfirm = () => {
    if (!selectedWorker) {
      toast({ variant: "destructive", title: "Select Worker", description: "Choose a worker first." });
      return;
    }
    if (!adjustNote.trim()) {
      toast({ variant: "destructive", title: "Reason required", description: "Reason / note is required for Hold/Reject/Adjust." });
      return;
    }
    if (adjustValidItems.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Add items to save." });
      return;
    }
    setAdjustConfirmOpen(true);
  };

  const confirmAdjustSave = async () => {
    if (isSaving) return;
    const items: any[] = adjustValidItems.map((s) => ({
      fabricType: s.fabricType,
      design_id: s.design_id,
      size_id: s.size_id,
      quantity: Number(s.quantity || 0),
    }));
    if (items.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Add items to save." });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/print-order/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: "adjust",
          action: adjustAction,
          orderNumber: effectiveOrderNumber,
          date: new Date(),
          note: adjustNote,
          workerName: selectedWorker,
          challanNo: String(headerChallan || ""),
          items,
        }),
      });
      const result = await readApiJson(res);
      if (!result.ok) {
        const message = String(result.error?.message || "Could not save entry.");
        toast({ variant: "destructive", title: "Failed", description: message });
        return;
      }
      const refresh = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(effectiveOrderNumber)}`, { cache: 'no-store' });
      const json = await refresh.json();
      setPrintSummary(json?.data?.summary || null);
      setPrintEntries(json?.data?.entries || []);
      setPendingInputs({});
      setAdjustItems([]);
      setAdjustNote("");
      setAdjustDraftDesignId("");
      setAdjustDraftFabricType("");
      setAdjustDraftSmallQty(0);
      setAdjustDraftLargeQty(0);
      setAdjustAutoSelectFabric(true);
      setAdjustConfirmOpen(false);
      toast({ title: "Adjusted", description: "Entry recorded." });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const finalizeAndSave = async () => {
    if (isSaving) return;
    if (!selectedWorker) {
      toast({ variant: "destructive", title: "Select Worker", description: "Choose a worker to continue." });
      return false;
    }
    const items: any[] = validSessionItems.map((s) => {
      const pending = pendingForItem(s.design_id, s.fabricType, s.size_id);
      const qty = Math.min(Number(s.quantity || 0), Math.max(0, pending));
      return {
        fabricType: s.fabricType,
        design_id: s.design_id,
        size_id: s.size_id,
        quantity: qty,
      };
    }).filter((s) => s.quantity > 0);
    if (items.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Add items to receive." });
      return false;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/print-order/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mainTab === 'order' ? 'receive' : mainTab,
          orderNumber: effectiveOrderNumber,
          date: selectedDate,
          note: mainTab === 'adjust' ? adjustNote : undefined,
          workerName: selectedWorker,
          challanNo: String(headerChallan || ""),
          items,
        }),
      });
      const result = await readApiJson(res);
      if (!result.ok) {
        const message = String(result.error?.message || "Could not save entry.");
        toast({ variant: "destructive", title: "Failed", description: message });
        return false;
      }
      const entry = result.data?.entry || null;
      setSavedEntry(entry);
      const refresh = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(effectiveOrderNumber)}`, { cache: 'no-store' });
      const json = await refresh.json();
      setPrintSummary(json?.data?.summary || null);
      setPrintEntries(json?.data?.entries || []);
      setPendingInputs({});
      setSessionItems([]);
      setAdjustNote("");
      try {
        const cutworkItems = items.map((s) => ({
          design_id: String(s?.design_id || "").trim(),
          size_id: String(s?.size_id || ""),
          quantity: Number(s?.quantity || 0),
          fabric: String(s?.fabricType || "Satin").trim() || "Satin",
        })).filter((i) => i.design_id && i.size_id && i.quantity > 0);
        if (cutworkItems.length > 0) {
          const sourceOrderNumber = String(effectiveOrderNumber || "").trim();
          const normalizedOrderNumber = sourceOrderNumber;
          setSessionCache('cutwork:prefill:receive', { workerName: '', items: cutworkItems, sourceOrderNumber, orderNumber: normalizedOrderNumber });
          const draftPayload = {
            workerName: '',
            date: new Date().toISOString().slice(0, 10),
            receiveItems: cutworkItems,
            allowedItems: cutworkItems,
            sourceOrderNumber,
            orderNumber: normalizedOrderNumber,
            draftFabric: '',
            draftDesignId: '',
            draftSmallQty: 0,
            draftLargeQty: 0,
          };
          await fetch('/api/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'cutwork-receive-draft', key: 'default', payload: draftPayload })
          }).catch(() => {});
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('__printing_usage_refresh', Date.now().toString());
            }
          } catch {}
        }
      } catch {}
      toast({ title: mainTab === 'receive' ? 'Received' : 'Adjusted', description: 'Entry recorded.' });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const openReceiveConfirm = () => {
    if (isSaving) return;
    if (!selectedWorker) {
      toast({ variant: "destructive", title: "Select Worker", description: "Choose a worker to continue." });
      return;
    }
    // Clamp session items to current pending before showing confirm
    const prev = Array.isArray(sessionItems) ? sessionItems : [];
    const clamped = prev.map((s) => {
      const pending = pendingForItem(s.design_id, s.fabricType, s.size_id);
      const qty = Math.min(Number(s.quantity || 0), Math.max(0, pending));
      return { ...s, quantity: qty };
    }).filter((s) => s.quantity > 0);
    const removedCount = prev.length - clamped.length + prev.reduce((n, s, i) => n + (clamped[i] && clamped[i].quantity < s.quantity ? 1 : 0), 0);
    if (removedCount > 0) {
      toast({ title: "Quantities adjusted", description: "Some items were reduced to match open pending." });
    }
    setSessionItems(clamped);
    if (clamped.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Add items to receive." });
      return;
    }
    setReceiveConfirmOpen(true);
  };

  const confirmReceiveSave = async () => {
    const ok = await finalizeAndSave();
    if (ok) setReceiveConfirmOpen(false);
  };

  useEffect(() => {
    if (!fillMax) return;
    const next: Record<string, number> = {};
    for (const o of outstandingList) {
      const key = `${o.fabricType}||${o.design_id}||${o.size_id}`;
      next[key] = Number(o.pending || 0);
    }
    setPendingInputs(next);
  }, [fillMax]); 

  useEffect(() => {
    if (!highlightedItem) return;

    const element = document.getElementById(
      getDesignCardId(highlightedItem.groupId, highlightedItem.designId)
    );
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const topPadding = 140;
    const bottomPadding = 120;
    const isAbove = rect.top < topPadding;
    const isBelow = rect.bottom > window.innerHeight - bottomPadding;

    if (isAbove || isBelow) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedItem]);

  

  const openEditForEntry = (entry: any) => {
    const t = String(entry?.type || "").trim().toLowerCase();
    const isUsage =
      t === "usage" ||
      typeof (entry as any)?.ratePerUnit !== "undefined" ||
      typeof (entry as any)?.gstPct !== "undefined" ||
      typeof (entry as any)?.finalPayableAmount !== "undefined";
    if (isUsage) {
      setUsageEditEntry(entry);
      const baseQty = Number((entry as any)?.qty || (entry as any)?.usedMeters || 0);
      setUsageEditQty(baseQty);
      setUsageEditOriginalQty(baseQty);
      setUsageEditRate(Number((entry as any)?.ratePerUnit || 0));
      setUsageEditReceivedDate(String((entry as any)?.receivedDate || "").slice(0, 10));
      setUsageEditReceivedBy(String((entry as any)?.receivedBy || ""));
      setUsageEditPaid(Boolean((entry as any)?.paid));
      setUsageEditPaidDate(String((entry as any)?.paidDate || "").slice(0, 10));
      setUsageEditRemark(String((entry as any)?.remark || ""));
      setUsageEditGstPct(Number((entry as any)?.gstPct ?? 5));
      setUsageEditPrintingChallan(String((entry as any)?.printingChallanNo || ""));
      setUsageEditOpen(true);
      return;
    }
    const items = Array.isArray(entry?.items)
      ? entry.items.map((it: any) => ({
          fabricType: String(it?.fabricType || it?.fabric || "").trim(),
          design_id: String(it?.design_id || "").trim(),
          size_id: String(it?.size_id || "").trim() as "S-SML" | "S-LGE",
          quantity: Number(it?.quantity || 0),
        }))
      : [];
    setEditEntry(entry);
    setEditWorker(String(entry?.workerName || "").trim());
    setEditDate(entry?.date ? new Date(entry.date) : new Date());
    setEditNote(String(entry?.note || "").trim());
    setEditItems(items);
    setEditOpen(true);
  };

  const openDeleteForEntry = (entry: any) => {
    setDeleteEntry(entry);
    setDeleteOpen(true);
    setDeleteSecondConfirm(false);
  };

  const confirmDelete = async () => {
    if (!deleteEntry) return;
    try {
      const id = String((deleteEntry as any)?.id || (deleteEntry as any)?._id || "").trim();
      if (!id) {
        toast({ variant: "destructive", title: "Missing id", description: "Could not identify entry." });
        return;
      }
      const isIssue = String(deleteEntry?.type || "") === "issue";
      const isUsage = String(deleteEntry?.type || "") === "usage";
      const result = isIssue
        ? await readApiJson(
            await fetch(`/api/print-design-issues`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber: effectiveOrderNumber, all: true }),
            })
          )
        : isUsage
        ? await readApiJson(
            await fetch(`/api/printing-usage?id=${encodeURIComponent(id)}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
            })
          )
        : await readApiJson(
            await fetch(`/api/print-order/entries`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id,
                orderNumber: effectiveOrderNumber,
                workerName: String(deleteEntry?.workerName || ""),
                type: String(deleteEntry?.type || ""),
                date: String(deleteEntry?.date || ""),
              }),
            })
          );
      if (!result.ok) {
        toast({ variant: "destructive", title: "Delete failed", description: String(result.error?.message || "Could not delete.") });
        return;
      }
      if (isUsage) {
        setPrintUsageEntries((prev) => prev.filter((u) => String(u?._id || u?.id || "") !== id));
        setUsageByPurchase((prev) => {
          const next: Record<string, any> = { ...prev };
          for (const key of Object.keys(prev)) {
            const usageId = String(prev[key]?._id || prev[key]?.id || "");
            if (usageId === id) {
              delete next[key];
              break;
            }
          }
          return next;
        });
        setJobworkInputs((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(prev)) {
            const usageId = String((usageByPurchase[key] || {})?._id || (usageByPurchase[key] || {})?.id || "");
            if (usageId === id) {
              delete next[key];
              break;
            }
          }
          return next;
        });
      } else {
        // Optimistically update combined worker history so the row disappears immediately
        if (isIssue) {
          setAllPrintEntries((prev) => prev.filter((e) => String(e?.orderNumber || "") !== String(effectiveOrderNumber || "")));
          setWorkerIssueEntries((prev) => prev.filter((e) => String(e?.orderNumber || "") !== String(effectiveOrderNumber || "")));
        } else {
          setAllPrintEntries((prev) => prev.filter((e) => String(e?._id || e?.id || "") !== id));
        }
        try {
          const refreshIssue = await fetch(`/api/print-design-issues?orderNumber=${encodeURIComponent(effectiveOrderNumber)}`, { cache: 'no-store' });
          const issueJson = await refreshIssue.json();
          setPrintIssue(issueJson?.data?.issue || null);
        } catch {}
        const refresh = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(effectiveOrderNumber)}`, { cache: 'no-store' });
        const data = await refresh.json();
        setPrintSummary(data?.data?.summary || null);
        setPrintEntries(data?.data?.entries || []);
        clearSessionCache(CUTWORK_ENTRIES_CACHE_KEY);
      }
      setDeleteOpen(false);
      setDeleteEntry(null);
      toast({ title: "Deleted", description: "Entry removed from history." });
      try { if (typeof window !== 'undefined') window.localStorage.setItem('__printing_usage_refresh', Date.now().toString()); } catch {}
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
    }
  };
  const pendingForItem = (designId: string, fabric: string, sizeId: "S-SML" | "S-LGE") => {
    const list: any[] = Array.isArray(outstandingList) ? outstandingList : [];
    return list
      .filter(
        (o: any) =>
          String(o?.design_id || "").trim() === String(designId || "").trim() &&
          String(o?.size_id || "").trim() === String(sizeId || "").trim() &&
          String(o?.fabricType || "").trim().toLowerCase() === String(fabric || "").trim().toLowerCase()
      )
      .reduce((t: number, o: any) => t + Number(o?.pending || 0), 0);
  };
  const existingQtyForItem = (designId: string, fabric: string, sizeId: "S-SML" | "S-LGE") => {
    const arr: any[] = Array.isArray(editEntry?.items) ? editEntry!.items : [];
    return arr
      .filter(
        (it: any) =>
          String(it?.design_id || "").trim() === String(designId || "").trim() &&
          String(it?.size_id || "").trim() === String(sizeId || "").trim() &&
          String((it?.fabricType || it?.fabric) || "").trim().toLowerCase() === String(fabric || "").trim().toLowerCase()
      )
      .reduce((t: number, it: any) => t + Number(it?.quantity || 0), 0);
  };
  const maxAllowedForEditItem = (it: { design_id: string; fabricType: string; size_id: "S-SML" | "S-LGE" }) => {
    if (!editEntry || String(editEntry?.type || "") !== "receive") return Number.MAX_SAFE_INTEGER;
    const pending = pendingForItem(it.design_id, it.fabricType, it.size_id);
    const existing = existingQtyForItem(it.design_id, it.fabricType, it.size_id);
    return Math.max(0, pending + existing);
  };
  const updateEditItemQty = (idx: number, nextQty: number) => {
    setEditItems((prev) => {
      const arr = [...prev];
      const it = arr[idx];
      const clean = Math.max(0, Math.floor(nextQty || 0));
      const max = maxAllowedForEditItem(it);
      arr[idx] = { ...it, quantity: Math.min(clean, max) };
      return arr;
    });
  };

  const removeEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveEdit = async () => {
    if (!editEntry || isUpdating) return;
    const id = String((editEntry as any)?.id || (editEntry as any)?._id || "").trim();
    if (!id && String(editEntry?.type || "") !== "issue") return;
    if (!editWorker.trim()) {
      toast({ variant: "destructive", title: "Select Worker", description: "Choose a worker to continue." });
      return;
    }
    const cleanItems = editItems.filter((it) => it.quantity > 0);
    if (cleanItems.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Adjust quantities to save." });
      return;
    }
    setIsUpdating(true);
    try {
      const type = String(editEntry?.type || "").trim();
      if (type === "issue") {
        const res = await fetch('/api/print-design-issues', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: effectiveOrderNumber,
            workerName: editWorker,
            items: cleanItems,
          }),
        });
        const result = await readApiJson(res);
        if (!result.ok) {
          const message = String(result.error?.message || "Could not update issue.");
          toast({ variant: "destructive", title: "Failed", description: message });
          return;
        }
        try { if (typeof window !== 'undefined') window.localStorage.setItem('__printing_usage_refresh', Date.now().toString()); } catch {}
        try {
          const refreshIssue = await fetch(`/api/print-design-issues?orderNumber=${encodeURIComponent(effectiveOrderNumber)}`, { cache: 'no-store' });
          const issueJson = await refreshIssue.json();
          setPrintIssue(issueJson?.data?.issue || null);
        } catch {}
      } else {
        const res = await fetch('/api/print-order/entries', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            type,
            orderNumber: effectiveOrderNumber,
            workerName: editWorker,
            date: editDate || new Date(),
            note: editNote,
            challanNo: String(headerChallan || ""),
            items: cleanItems,
          }),
        });
        const result = await readApiJson(res);
        if (!result.ok) {
          const message = String(result.error?.message || "Could not update entry.");
          toast({ variant: "destructive", title: "Failed", description: message });
          return;
        }
        try { if (typeof window !== 'undefined') window.localStorage.setItem('__printing_usage_refresh', Date.now().toString()); } catch {}
      }
      const refresh = await fetch(`/api/print-order/entries?orderNumber=${encodeURIComponent(effectiveOrderNumber)}`, { cache: 'no-store' });
      const json = await refresh.json();
      setPrintSummary(json?.data?.summary || null);
      setPrintEntries(json?.data?.entries || []);
      clearSessionCache(CUTWORK_ENTRIES_CACHE_KEY);
      setEditOpen(false);
      setEditEntry(null);
      toast({ title: "Updated", description: "Entry changes saved." });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
    } finally {
      setIsUpdating(false);
    }
  };

  const saveUsageEdit = async () => {
    if (!usageEditEntry) return;
    const id = String((usageEditEntry as any)?.id || (usageEditEntry as any)?._id || "").trim();
    if (!id) {
      toast({ variant: "destructive", title: "Missing id", description: "Could not identify usage entry." });
      return;
    }
    try {
      const purchaseChallan = String((usageEditEntry as any)?.challanOrInvoiceNo || "").trim();
      const printingChallanClean = String(usageEditPrintingChallan || "").trim();
      if (!printingChallanClean) {
        toast({ variant: "destructive", title: "Printing challan required", description: "Print challan no. डालो (purchase challan से अलग)." });
        return;
      }
      if (printingChallanClean === purchaseChallan) {
        toast({ variant: "destructive", title: "Invalid print challan", description: "Printing challan purchase challan से अलग होना चाहिए." });
        return;
      }
      const usageId = String((usageEditEntry as any)?._id || (usageEditEntry as any)?.id || "");
      if (printingChallanInUse(printingChallanClean, usageId)) {
        toast({ variant: "destructive", title: "Duplicate print challan", description: "यह print challan पहले से इस्तेमाल हुआ है." });
        return;
      }
      const pid = String((usageEditEntry as any)?.purchaseId || "");
      const remaining = pid ? getRemainingMeters(pid, usageId) : Number.MAX_SAFE_INTEGER;
      const maxAllowed = remaining + usageEditOriginalQty;
      if (usageEditQty > maxAllowed) {
        const capped = Math.max(0, maxAllowed);
        setUsageEditQty(capped);
        toast({ variant: "destructive", title: "Quantity too high", description: `Max allowed is ${maxAllowed} m.` });
        return;
      }
      const res = await fetch('/api/printing-usage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          usedMeters: usageEditQty,
          ratePerUnit: usageEditRate,
          gstPct: Number(usageEditGstPct ?? 5),
          printingChallanNo: usageEditPrintingChallan || undefined,
          printingChallan: usageEditPrintingChallan || undefined,
          receivedDate: usageEditReceivedDate || undefined,
          receivedBy: usageEditReceivedBy || undefined,
          paid: Boolean(usageEditPaidDate),
          paidDate: usageEditPaidDate || undefined,
          remark: usageEditRemark || undefined,
        }),
      });
      const { ok, data, error } = await readApiJson(res);
      if (!ok) {
        toast({ variant: "destructive", title: "Failed", description: String(error?.message || "Could not update usage.") });
        return;
      }
      const next = data?.usage;
      setPrintUsageEntries((prev) => {
        const normalized = next
          ? {
              ...next,
              printingChallanNo: String(
                (next as any)?.printingChallanNo ||
                (next as any)?.printingChallan ||
                (next as any)?.printing_challan_no ||
                (next as any)?.printChallanNo ||
                (next as any)?.printChallan ||
                usageEditPrintingChallan ||
                ""
              ).trim(),
            }
          : null;
        const others = prev.filter((u) => String(u?._id || u?.id || "") !== id);
        return normalized ? [...others, normalized] : others;
      });
      if (next && next.purchaseId) {
        const normalized = {
          ...next,
          printingChallanNo: String(
            (next as any)?.printingChallanNo ||
            (next as any)?.printingChallan ||
            (next as any)?.printing_challan_no ||
            (next as any)?.printChallanNo ||
            (next as any)?.printChallan ||
            usageEditPrintingChallan ||
            ""
          ).trim(),
        };
        const pid = String(next.purchaseId || "");
        setUsageByPurchase((prev) => ({ ...prev, [pid]: normalized }));
        setJobworkInputs((prev) => ({
          ...prev,
          [pid]: {
            qty: 0,
            rate: Number(normalized.ratePerUnit || 0),
            gstPct: Number(normalized.gstPct ?? 5),
            printingChallanNo: normalized.printingChallanNo,
            receivedDate: "",
            receivedBy: "",
            paidDate: "",
            remark: "",
          },
        }));
      }
      setUsageEditOpen(false);
      setUsageEditEntry(null);
      toast({ title: "Updated", description: "Usage entry changes saved." });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-8 pb-32">
      {mainTab === "order" && (
        <div className="mb-8 rounded-2xl bg-background/70 border border-border/60 shadow-xl px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <span>Dashboard</span>
              <ChevronRight className="w-3 h-3" />
              <span>Order:</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">{effectiveOrderNumber || "New Order"}</span>
              <div className="ml-2 inline-flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">Challan:</span>
                <Select
                  value={headerChallan}
                  onValueChange={setHeaderChallan}
                  disabled={!newOrderStarted || !hasWorker || challanOptions.length === 0}
                >
                  <SelectTrigger className="h-8 w-[132px] rounded-lg border-border/60 bg-card/70 px-2 normal-case tracking-normal text-xs">
                    <SelectValue
                      placeholder={
                        newOrderStarted
                          ? !hasWorker
                            ? "Select worker first"
                            : challanOptions.length
                              ? "Select challan"
                              : "No challans"
                          : "Click New Order first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {challanOptions.map((c) => (
                      <SelectItem key={c.id} value={c.value}>
                        {c.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <h2 className="text-4xl font-black text-foreground tracking-tight">Order Request</h2>
            <p className="text-2xl font-medium text-muted-foreground mt-1">{nowText}</p>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr),auto] gap-4 items-end">
            <div className="space-y-2 max-w-md">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Printing Worker</Label>
              <Select value={headerPrintingWorker} onValueChange={setHeaderPrintingWorker} disabled={!newOrderStarted}>
                <SelectTrigger className="h-11 rounded-xl bg-card border-border/60">
                  <SelectValue placeholder={newOrderStarted ? "Select worker" : "Click New Order first"} />
                </SelectTrigger>
                <SelectContent>
                  {printingWorkerOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border/50 bg-card/30 px-3 py-3">
              <div className="px-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Remaining Fabric (m)</p>
                <p className="text-4xl font-black text-foreground leading-tight mt-1">{Number(remainingForOrder?.remaining || 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Received {Number(remainingForOrder?.delivered || 0)} - Used {Number(remainingForOrder?.used || 0)}
                </p>
              </div>
              <div className="h-14 w-px bg-border/70" />
              <div className="px-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Net Quantity</p>
                <p className="text-4xl font-black text-primary leading-tight mt-1">{grandTotal}</p>
              </div>
              {showNewOrder && (
                <Button onClick={handleStartNewOrder} size="lg" className="h-11 rounded-xl font-semibold px-4">
                  <Plus className="w-4 h-4 mr-2" /> New Order
                </Button>
              )}
              {showAddFabric && (
                <Button
                  onClick={handleAddFabric}
                  size="lg"
                  className="h-11 rounded-xl font-semibold px-4"
                  disabled={!newOrderStarted || !hasWorker || !hasChallan}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Fabric
                </Button>
              )}
              <Button onClick={resetOrderHeader} variant="ghost" size="icon" className="h-11 w-11 rounded-xl border border-border/50 bg-card/50">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {(mainTab === "history" || mainTab === "jobwork") && (
        <div className="mb-8 rounded-2xl bg-background/70 border border-border/60 shadow-xl px-4 sm:px-6 py-5">
          <div className="max-w-md space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Printing Worker</Label>
            <Select value={headerPrintingWorker} onValueChange={setHeaderPrintingWorker}>
              <SelectTrigger className="h-11 rounded-xl bg-card border-border/60">
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {printingWorkerOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <Tabs value={mainTab} onValueChange={(v) => {
          if (['order', 'history', 'jobwork', 'jobworkDamage'].includes(v)) {
            setMainTab(v as any);
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-11 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="order" className="rounded-lg text-xs font-semibold">Order Request</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">Print Order History</TabsTrigger>
            <TabsTrigger value="jobwork" className="rounded-lg text-xs font-semibold">Print Order Job-work Tracking</TabsTrigger>
            <TabsTrigger value="jobworkDamage" className="rounded-lg text-xs font-semibold">Adjust (Damage)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="py-2 sm:py-6 sm:py-8 space-y-4 sm:space-y-10">
        {mainTab === "jobwork" && (
          <div className="space-y-2 sm:space-y-6">
            <div className="rounded-2xl border border-border/50 bg-card/60 p-5 sm:p-6">
              <h3 className="text-3xl font-black tracking-tight text-foreground">Print Order Job-work Tracking</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Worker ke purchases se date/challan. Quantity aur rate editable.
              </p>

              {!headerPrintingWorker ? (
                <div className="mt-5 p-16 rounded-xl border border-dashed border-border/40 bg-muted/5 text-center text-muted-foreground">
                  Select worker first.
                </div>
              ) : purchases.length === 0 ? (
                <div className="mt-5 p-16 rounded-xl border border-dashed border-border/40 bg-muted/5 text-center text-muted-foreground">
                  No purchases found for selected worker.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[1400px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground">
                        <th className="px-3 py-3 text-left font-semibold">Date</th>
                        <th className="px-3 py-3 text-left font-semibold">Worker Name</th>
                        <th className="px-3 py-3 text-left font-semibold">Purchase Challan</th>
                        <th className="px-3 py-3 text-left font-semibold">Printing Challan</th>
                        <th className="px-3 py-3 text-right font-semibold">Remaining (m)</th>
                        <th className="px-3 py-3 text-right font-semibold">Quantity</th>
                        <th className="px-3 py-3 text-right font-semibold">Rate per unit</th>
                        <th className="px-3 py-3 text-right font-semibold">Amount</th>
                        <th className="px-3 py-3 text-right font-semibold">GST %</th>
                        <th className="px-3 py-3 text-right font-semibold">Final payable</th>
                        <th className="px-3 py-3 text-left font-semibold">Received date</th>
                        <th className="px-3 py-3 text-center font-semibold">Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePurchases.map((p: any) => {
                        const pid = String(p?._id || "");
                        const entry = jobworkInputs[pid] || {};
                        const remaining = getRemainingMeters(pid);
                        const qtyRaw = Number(entry.qty || 0);
                        const qty = Math.min(Math.max(0, qtyRaw), remaining || 0);
                        const rate = Number(entry.rate ?? usageByPurchase[pid]?.ratePerUnit ?? 20);
                        const gstPct = Number(entry.gstPct ?? usageByPurchase[pid]?.gstPct ?? 5);
                        const amount = Math.round(qty * rate * 100) / 100;
                        const gstAmount = Math.round(amount * (Math.max(0, gstPct) / 100) * 100) / 100;
                        const finalPayable = Math.round((amount + gstAmount) * 100) / 100;
                        const dateText = p?.date ? format(new Date(String(p.date)), "EEE, d MMM yyyy") : "-";
                        return (
                          <tr key={pid} className="border-b border-border/20">
                            <td className="px-3 py-3 font-semibold">{dateText}</td>
                            <td className="px-3 py-3 font-semibold">{String(p?.printingWorkerName || headerPrintingWorker || "-")}</td>
                            <td className="px-3 py-3 font-semibold">{String(p?.challanOrInvoiceNo || "-")}</td>
                            <td className="px-3 py-3">
                              <Input
                                value={String(entry.printingChallanNo || "")}
                                onChange={(e) =>
                                  setJobworkInputs((prev) => ({
                                    ...prev,
                                    [pid]: { ...prev[pid], printingChallanNo: e.target.value },
                                  }))
                                }
                                placeholder="Printing challan"
                                className="h-10 rounded-xl border-border/60 bg-background/30 px-3 font-semibold"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-black">{formatMeters(remaining)}</td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                value={String(entry.qty ?? 0)}
                                onChange={(e) => {
                                  const next = Math.max(0, Number(e.target.value || 0));
                                  const capped = Math.min(next, getRemainingMeters(pid));
                                  setJobworkInputs((prev) => ({
                                    ...prev,
                                    [pid]: { ...prev[pid], qty: capped },
                                  }));
                                }}
                                className="h-10 rounded-xl border-border/60 bg-background/30 px-3 text-right font-black"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                value={String(rate)}
                                onChange={(e) =>
                                  setJobworkInputs((prev) => ({
                                    ...prev,
                                    [pid]: { ...prev[pid], rate: Math.max(0, Number(e.target.value || 0)) },
                                  }))
                                }
                                className="h-10 rounded-xl border-border/60 bg-background/30 px-3 text-right font-black"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-black">{formatInr(amount)}</td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                value={String(gstPct)}
                                onChange={(e) =>
                                  setJobworkInputs((prev) => ({
                                    ...prev,
                                    [pid]: { ...prev[pid], gstPct: Math.max(0, Number(e.target.value || 0)) },
                                  }))
                                }
                                className="h-10 rounded-xl border-border/60 bg-background/30 px-3 text-right font-black"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-black">{formatInr(finalPayable)}</td>
                            <td className="px-3 py-3">
                              <Input
                                type="date"
                                value={String(entry.receivedDate || "")}
                                onChange={(e) =>
                                  setJobworkInputs((prev) => ({
                                    ...prev,
                                    [pid]: { ...prev[pid], receivedDate: e.target.value },
                                  }))
                                }
                                className="h-10 rounded-xl border-border/60 bg-background/30 px-3 font-semibold"
                              />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Button
                                size="icon"
                                onClick={() => saveJobworkRow(p)}
                                className="h-10 w-10 rounded-xl"
                                disabled={remaining <= 0}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/20">
                        <td className="px-3 py-3 font-black" colSpan={5}>Totals</td>
                        <td className="px-3 py-3 text-right font-black">{formatMeters(jobworkTotals.qty)}</td>
                        <td className="px-3 py-3 text-right font-black">-</td>
                        <td className="px-3 py-3 text-right font-black">{formatInr(jobworkTotals.amount)}</td>
                        <td className="px-3 py-3 text-right font-black">{formatInr(jobworkTotals.gst)}</td>
                        <td className="px-3 py-3 text-right font-black">{formatInr(jobworkTotals.final)}</td>
                        <td className="px-3 py-3" />
                        <td className="px-3 py-3" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {mainTab === "jobworkDamage" && (
          <div className="space-y-2 sm:space-y-6">
            <div className="flex items-center justify-between p-2 sm:p-6 bg-card rounded-2xl border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl sm:rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Damage Reporting</h3>
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">Inventory Loss & Quality Issues</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Responsible Operator</Label>
                <div className="flex h-14 w-full items-center rounded-2xl border border-border/40 bg-muted/20 px-4 text-sm font-black text-foreground">
                   {headerPrintingWorker || "None Selected"}
                   <span className="ml-auto text-[8px] uppercase tracking-widest opacity-40">Auto-sourced</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Incident Date</Label>
                <div className="flex h-14 w-full items-center rounded-2xl border border-border/40 bg-muted/20 px-4 text-sm font-black text-foreground">
                   <CalendarIcon className="mr-3 h-4 w-4 text-destructive/40" />
                   {new Date().toLocaleDateString('en-GB')}
                   <span className="ml-auto text-[8px] uppercase tracking-widest opacity-40">Live UTC</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Incident Report / Remarks (Required)</Label>
              <Textarea 
                value={damageNote} 
                onChange={(e) => setDamageNote(e.target.value)} 
                placeholder="Describe what happened? (e.g. Printer malfunction, Fabric tear during handling, etc.)"
                className="min-h-[100px] rounded-[2rem] border-border/40 bg-muted/10 p-2 sm:p-6 text-sm font-black focus:ring-4 focus:ring-destructive/5 transition-all"
              />
            </div>

            <div className="space-y-2 sm:space-y-6">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1 h-3 rounded-full bg-destructive" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Stage Damaged SKU</span>
              </div>
              <div className="p-3 sm:p-8 rounded-[3rem] border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl shadow-black/5 space-y-2 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:p-6">
                   <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Product SKU</Label>
                      <SearchableDesignSelect
                        designs={designs}
                        value={damageDraftDesignId}
                        onSelect={(val) => {
                          setDamageDraftDesignId(val);
                          setDamageDraftFabricType("");
                          setDamageDraftSmallQty(0);
                          setDamageDraftLargeQty(0);
                        }}
                        placeholder={designs.length === 0 ? "No SKUs available" : "Select SKU to report..."}
                        className="h-14 rounded-2xl border-border/40 bg-muted/10 font-black focus:ring-4 focus:ring-destructive/5"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Material</Label>
                      <div className="relative group">
                        <select
                          value={damageDraftFabricType}
                          onChange={(e) => setDamageDraftFabricType(e.target.value)}
                          disabled={!damageDraftDesignId || damageFabricsForDesign.length <= 1}
                          className="flex h-14 w-full rounded-2xl border border-border/40 bg-muted/10 px-4 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-destructive/5 appearance-none cursor-pointer transition-all pr-10"
                        >
                          <option value="">{damageFabricsForDesign.length > 1 ? "Select Variant" : "Standard Material"}</option>
                          {(damageFabricsForDesign.length > 0 ? damageFabricsForDesign : ["Satin"]).map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:p-6">
                   <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 text-center block">Small Variant</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={damageDraftSmallQty || ''}
                        onChange={(e) => setDamageDraftSmallQty(Math.max(0, Number(e.target.value || 0)))}
                        className="h-14 rounded-2xl bg-muted/10 border-border/40 text-center font-black text-lg focus:ring-4 focus:ring-destructive/5"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 text-center block">Large Variant</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={damageDraftLargeQty || ''}
                        onChange={(e) => setDamageDraftLargeQty(Math.max(0, Number(e.target.value || 0)))}
                        className="h-14 rounded-2xl bg-muted/10 border-border/40 text-center font-black text-lg focus:ring-4 focus:ring-destructive/5"
                      />
                   </div>
                </div>

                <Button 
                  type="button" 
                  className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 hover:scale-[1.02] transition-all disabled:opacity-40" 
                  onClick={addDamageToList}
                  disabled={!damageDraftDesignId || (!damageDraftSmallQty && !damageDraftLargeQty)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add SKU to Report
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Staged Damage Reports</span>
                 </div>
                 <Badge variant="outline" className="rounded-full bg-destructive/5 border-destructive/20 font-black text-[9px] px-2">{damageItems.length} SKUs</Badge>
              </div>

              {damageItems.length === 0 ? (
                 <div className="p-4 sm:p-10 rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/5 flex flex-col items-center justify-center text-center opacity-40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No damage items added yet</p>
                 </div>
              ) : (
                 <div className="space-y-3">
                    {damageItems.map((it, idx) => (
                       <div key={`${it.design_id}-${it.size_id}-${it.fabricType}-${idx}`} className="group flex items-center justify-between bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl sm:rounded-3xl p-4 sm:p-5 transition-all hover:border-destructive/40 hover:shadow-xl hover:shadow-black/5">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-destructive/5 flex items-center justify-center text-destructive font-black text-xs">
                                {it.design_id.slice(0, 2).toUpperCase()}
                             </div>
                             <div className="space-y-0.5">
                                <div className="text-xs font-black uppercase tracking-widest text-foreground">{it.design_id}</div>
                                <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">
                                   {it.size_id === "S-SML" ? "50cm" : "90cm"} · {String(it.fabricType || "Satin").trim() || "Satin"}
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3 sm:p-8">
                             <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-destructive/30 uppercase tracking-widest mb-1">Loss</span>
                                <span className="text-sm font-black text-foreground">{it.quantity} <span className="text-[10px] opacity-40">Pcs</span></span>
                             </div>
                             <Button
                               type="button"
                               variant="ghost"
                               size="icon"
                               className="h-9 w-9 rounded-xl text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
                               onClick={() => removeDamageItem(idx)}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
            </div>

            <div className="pt-6">
              <Button 
                type="button" 
                className="w-full h-16 rounded-[2rem] bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-destructive/20 transition-all hover:scale-[1.01] disabled:opacity-40" 
                onClick={() => setDamageConfirmOpen(true)} 
                disabled={!headerPrintingWorker || damageItems.length === 0 || !damageNote.trim() || isSaving}
              >
                <AlertTriangle className="w-6 h-6 mr-3" /> Finalize Damage Report
              </Button>
            </div>

            <Dialog open={damageConfirmOpen} onOpenChange={(open) => !isSaving && setDamageConfirmOpen(open)}>
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl backdrop-blur-3xl bg-background/90 p-3 sm:p-8 sm:max-w-[440px]">
                <DialogHeader className="items-center text-center">
                  <div className="w-16 h-16 rounded-xl sm:rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Confirm Damage</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 italic">
                    Reported loss will be deducted from active ledger
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-8 space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Operator</span>
                      <span className="font-black text-sm">{headerPrintingWorker || "—"}</span>
                   </div>
                   <div className="p-5 rounded-xl sm:rounded-3xl bg-destructive text-destructive-foreground flex flex-col gap-1 items-center justify-center text-center">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Loss Recorded</span>
                      <span className="text-3xl font-black tracking-tighter">{damageTotals.total} Units</span>
                   </div>
                </div>
                <DialogFooter className="mt-8 grid grid-cols-2 gap-3 sm:flex-row sm:justify-center">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive" 
                    disabled={isSaving} 
                    onClick={() => setDamageConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    className="h-14 rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-black text-xs uppercase tracking-widest shadow-lg shadow-destructive/20" 
                    disabled={isSaving} 
                    onClick={confirmDamageSave}
                  >
                    {isSaving ? "Saving..." : "Confirm Report"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {(mainTab === "jobwork" || mainTab === "usage") && (
          <div id="history-panel" className="mt-10 space-y-2 sm:space-y-6">
            <div className="flex items-center justify-between p-2 sm:p-6 bg-card rounded-2xl border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl sm:rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                  <RefreshCw className={cn("w-6 h-6", isRefreshingHistory && "animate-spin")} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Transaction History</h3>
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">Ledger Logs & Audit Trail</p>
                </div>
              </div>
              <Button
                onClick={refreshHistory}
                disabled={isRefreshingHistory}
                variant="ghost"
                className="h-12 w-12 rounded-2xl hover:bg-primary/5 text-primary/40 hover:text-primary transition-all"
              >
                <RefreshCw className={cn("h-5 w-5", isRefreshingHistory && "animate-spin")} />
              </Button>
            </div>

            <div className="p-1 rounded-[3rem] bg-muted/5 border border-border/20">
              <WorkerLedger
                entries={(mainTab === "jobwork" ? (jobworkUsageEntries as any) : (historyEntries as any))}
                toDate={historyToDate}
                onToDateChange={setHistoryToDate}
                rangeDays={historyRangeDays}
                onRangeDaysChange={setHistoryRangeDays}
                showBalances={false}
                onEditEntry={(e) => openEditForEntry(e)}
                onDeleteEntry={(e) => openDeleteForEntry(e)}
              />
            </div>
            
            <Dialog open={usageEditOpen} onOpenChange={setUsageEditOpen}>
              <DialogContent className="rounded-[3rem] sm:max-w-[720px] lg:max-w-[860px] border-none shadow-2xl backdrop-blur-3xl bg-background/90 p-3 sm:p-8">
                <DialogHeader className="mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Ledger Transaction</DialogTitle>
                      <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 italic">Modify existing jobwork or usage record</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                {!usageEditEntry ? (
                  <div className="space-y-4">
                    <Skeleton className="h-14 rounded-2xl" />
                    <Skeleton className="h-40 rounded-[2rem]" />
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:p-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Quantity</Label>
                        <Input type="number" className="h-14 rounded-2xl bg-muted/10 border-border/40 font-black text-lg focus:ring-4 focus:ring-primary/5" value={String(usageEditQty)} onChange={(e) => setUsageEditQty(Number(e.target.value || 0))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Rate per unit</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-black">₹</span>
                          <Input type="number" className="h-14 rounded-2xl bg-muted/10 border-border/40 font-black text-lg pl-10 focus:ring-4 focus:ring-primary/5" value={String(usageEditRate)} onChange={(e) => setUsageEditRate(Number(e.target.value || 0))} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">GST %</Label>
                        <Input
                          type="number"
                          className="h-14 rounded-2xl bg-muted/10 border-border/40 font-black text-lg focus:ring-4 focus:ring-primary/5"
                          value={String(usageEditGstPct)}
                          onChange={(e) => setUsageEditGstPct(Number(e.target.value || 0))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:p-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Printing Challan</Label>
                        <Input
                          className="h-14 rounded-2xl bg-muted/10 border-border/40 font-black text-sm focus:ring-4 focus:ring-primary/5"
                          placeholder="Challan #"
                          value={usageEditPrintingChallan}
                          onChange={(e) => setUsageEditPrintingChallan(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Received Date</Label>
                        <Input type="date" className="h-14 rounded-2xl bg-muted/10 border-border/40 font-black text-sm focus:ring-4 focus:ring-primary/5" value={usageEditReceivedDate} onChange={(e) => setUsageEditReceivedDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Received By</Label>
                        <Input className="h-14 rounded-2xl bg-muted/10 border-border/40 font-black text-sm focus:ring-4 focus:ring-primary/5" value={usageEditReceivedBy} onChange={(e) => setUsageEditReceivedBy(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:p-6">
                       <div className="p-2 sm:p-6 rounded-xl sm:rounded-3xl bg-muted/10 border border-border/40 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Base Amount</span>
                          <div className="text-xl font-black text-foreground">
                             {formatInr(Math.round(Number(usageEditQty || 0) * Number(usageEditRate || 0) * 100) / 100)}
                          </div>
                       </div>
                       <div className="p-2 sm:p-6 rounded-xl sm:rounded-3xl bg-muted/10 border border-border/40 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">GST Component</span>
                          <div className="text-xl font-black text-foreground">
                             {(() => {
                               const amt = Math.round(Number(usageEditQty || 0) * Number(usageEditRate || 0) * 100) / 100;
                               const pct = Number(usageEditGstPct ?? 5);
                               const gst = Math.round(amt * (pct / 100) * 100) / 100;
                               return formatInr(gst);
                             })()}
                          </div>
                       </div>
                       <div className="p-2 sm:p-6 rounded-[2rem] bg-primary text-primary-foreground shadow-xl shadow-primary/20 space-y-1 text-center flex flex-col items-center justify-center">
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Final Payout</span>
                          <div className="text-2xl font-black tracking-tighter">
                             {(() => {
                               const amt = Math.round(Number(usageEditQty || 0) * Number(usageEditRate || 0) * 100) / 100;
                               const pct = Number(usageEditGstPct ?? 5);
                               const gst = Math.round(amt * (pct / 100) * 100) / 100;
                               const final = Math.round((amt + gst) * 100) / 100;
                               return formatInr(final);
                             })()}
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:p-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Paid Date</Label>
                        <Input type="date" className="h-14 rounded-2xl bg-muted/10 border-border/40 font-black text-sm focus:ring-4 focus:ring-primary/5" value={usageEditPaidDate} onChange={(e) => setUsageEditPaidDate(e.target.value)} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Remark</Label>
                        <Textarea className="rounded-2xl bg-muted/10 border-border/40 p-4 font-bold text-sm min-h-[56px] focus:ring-4 focus:ring-primary/5" rows={1} value={usageEditRemark} onChange={(e) => setUsageEditRemark(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="mt-8 gap-3 sm:justify-end">
                  <Button type="button" variant="ghost" className="h-14 px-3 sm:px-8 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => setUsageEditOpen(false)}>
                    Discard
                  </Button>
                  <Button type="button" className="h-14 px-4 sm:px-10 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all" onClick={saveUsageEdit}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {mainTab === "order" && printIssue && (
          <div className="p-4 sm:p-6 bg-card rounded-2xl border border-border mt-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:p-6">
              <div className="flex items-center gap-5">
                 <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <Layers className="w-8 h-8" />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-lg font-black tracking-tight uppercase">Linked Design Issues</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Auto‑synchronized with this order</p>
                 </div>
              </div>
              <div className="p-4 px-2 sm:px-6 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 text-center">
                 <span className="block text-[9px] font-black uppercase tracking-widest opacity-60">Cumulative Issued</span>
                 <span className="text-2xl font-black tracking-tighter">{issueTotals.small + issueTotals.large} <span className="text-[10px] opacity-40 uppercase">Pcs</span></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-2 sm:p-6 rounded-xl sm:rounded-3xl bg-background/40 border border-border/40 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Fabric Groups</span>
                <div className="text-xl font-black text-foreground">{Array.isArray(printIssue?.groups) ? printIssue.groups.length : 0}</div>
              </div>
              <div className="p-2 sm:p-6 rounded-xl sm:rounded-3xl bg-background/40 border border-border/40 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">50cm (Small)</span>
                <div className="text-xl font-black text-foreground">{issueTotals.small} pcs</div>
              </div>
              <div className="p-2 sm:p-6 rounded-xl sm:rounded-3xl bg-background/40 border border-border/40 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">90cm (Large)</span>
                <div className="text-xl font-black text-foreground">{issueTotals.large} pcs</div>
              </div>
            </div>
          </div>
        )}
        {mainTab === "order" && order.fabricGroups.map((group) => {
          const isActive = activeGroupId === group.id;
          
          return (
            <div 
              key={group.id} 
              className={cn(
                "mt-6 rounded-xl sm:rounded-3xl border border-border/40 bg-background/40 backdrop-blur-md overflow-hidden transition-all duration-500",
                isActive ? "ring-2 ring-primary/40 shadow-2xl shadow-primary/5 scale-[1.01]" : "hover:border-primary/20"
              )}
            >
              {/* Group Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 bg-muted/20 border-b border-border/40">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                    isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 rotate-0" : "bg-primary/10 text-primary rotate-3"
                  )}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg tracking-tight uppercase tracking-widest">{group.fabric_id}</h3>
                      {isActive && (
                        <div className="bg-emerald-500/10 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.2em] border border-emerald-500/20">
                          Editing
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">{group.items.length} Unique Designs</p>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                      <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Premium Quality</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onRemoveGroup(group.id)}
                  className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </Button>
              </div>

              {/* Items Grid */}
              <div className="p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map((item) => {
                  const design = getDesignById(item.design_id);
                  if (!design) return null;
                  const isHighlighted =
                    highlightedItem?.groupId === group.id &&
                    highlightedItem?.designId === item.design_id;

                  return (
                    <div 
                      key={item.design_id} 
                      id={getDesignCardId(group.id, item.design_id)}
                      className={cn(
                        "group flex flex-row items-stretch border border-border/40 rounded-[2rem] overflow-hidden bg-background/60 backdrop-blur-xl hover:border-primary/40 transition-all duration-500 scroll-mt-32 shadow-sm hover:shadow-xl hover:shadow-black/5",
                        isHighlighted && "animate-highlight ring-2 ring-primary/40 border-primary/40"
                      )}
                    >
                      {/* Image Thumbnail */}
                      <div className="w-28 h-28 sm:w-32 sm:h-32 relative shrink-0 bg-muted overflow-hidden border-r border-border/20">
                        <Image 
                          src={toCloudinaryThumbUrl(design.image_url, "c_fill,g_auto,w_256,h_256,q_75,f_auto")} 
                          alt={design.design_id} 
                          fill 
                          className="object-cover group-hover:scale-110 transition-transform duration-700" 
                          sizes="(max-width: 640px) 112px, 128px" 
                          unoptimized
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent h-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      {/* Item Content */}
                      <div className="flex-1 flex flex-col justify-center px-4 py-3 sm:px-6 relative">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-0.5">
                            <h3 className="text-xs font-black text-foreground tracking-widest uppercase truncate max-w-[140px]">{design.design_id}</h3>
                            <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">Procurement Ready</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onRemoveItem(group.id, item.design_id)} 
                            className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        
                        <div className="flex gap-3">
                          {design.sizes.map((size) => {
                            const orderSize = item.sizes.find(s => s.size_id === size.size_id);
                            const qty = orderSize?.quantity || 0;
                            return (
                              <div key={size.size_id} className="flex-1 min-w-0">
                                <label className="block text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.1em] mb-1.5 truncate">
                                  {size.label.split(' ')[0]} Units
                                </label>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min="0" 
                                    value={qty || ""} 
                                    onChange={(e) => onUpdateQty(group.id, item.design_id, size.size_id, parseInt(e.target.value) || 0)} 
                                    onKeyDown={handleKeyDown} 
                                    className="h-10 font-black bg-muted/30 border-border/40 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all text-sm px-3 rounded-xl stripe-shadow" 
                                  />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                    <Hash className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button 
                  onClick={() => onAddDesignToGroup(group.id)}
                  className="flex items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-[2rem] transition-all duration-500 group h-28 bg-muted/5 hover:bg-primary/5 hover:border-primary/40 text-muted-foreground/40 hover:text-primary no-print"
                >
                  <div className="w-10 h-10 rounded-2xl bg-muted/10 group-hover:bg-primary/10 flex items-center justify-center transition-all duration-500 group-hover:rotate-90">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add New SKU</span>
                </button>
              </div>
            </div>
          );
        })}

        {mainTab === "order" && (
        <div className="mt-10 p-4 sm:p-6 bg-card rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">Production Summary</h3>
              <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">Final Batch Calculations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-muted/20 border border-border/40 rounded-xl sm:rounded-3xl group hover:bg-background/40 transition-all duration-500">
              <span className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] block mb-2">Small Variants</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tighter text-foreground">{totals.small}</span>
                <span className="text-[10px] font-bold text-muted-foreground/30 uppercase">Pcs</span>
              </div>
            </div>
            <div className="p-5 bg-muted/20 border border-border/40 rounded-xl sm:rounded-3xl group hover:bg-background/40 transition-all duration-500">
              <span className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] block mb-2">Large Variants</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tighter text-foreground">{totals.large}</span>
                <span className="text-[10px] font-bold text-muted-foreground/30 uppercase">Pcs</span>
              </div>
            </div>
            <div className="p-5 bg-primary text-primary-foreground rounded-xl sm:rounded-3xl shadow-xl shadow-primary/20 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-3xl" />
              <span className="text-[9px] font-black uppercase opacity-60 tracking-[0.2em] block mb-2">Grand Total</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tighter">{grandTotal}</span>
                <span className="text-[10px] font-black opacity-40 uppercase">Pcs</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {(mainTab === "receive" || mainTab === "adjust" || mainTab === "history") && (
          <div className="mt-10 p-4 sm:p-6 bg-card rounded-2xl border border-border">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl sm:rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                   {mainTab === 'history' ? <RotateCcw className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter">
                    {mainTab === "receive" ? "Unit Reception" : mainTab === "adjust" ? "Inventory Adjustment" : "Material History"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">
                    {mainTab === 'history' ? "Full transaction logs" : "Real-time ledger updates"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {mainTab !== 'history' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-muted/20 hover:bg-destructive/10 hover:text-destructive transition-all group"
                        onClick={() => {
                          setResetSignal((v) => v + 1);
                          setPendingInputs({});
                          setSessionItems([]);
                          setAdjustNote("");
                          setAdjustAction("reject");
                          setAdjustItems([]);
                          setAdjustDraftDesignId("");
                          setAdjustDraftFabricType("");
                          setAdjustDraftSmallQty(0);
                          setAdjustDraftLargeQty(0);
                          setAdjustAutoSelectFabric(true);
                          setAdjustConfirmOpen(false);
                          setSelectedOutstandingKey("");
                          setSavedEntry(null);
                        }}
                      >
                        <RotateCcw className="h-5 w-5 group-hover:rotate-[-180deg] transition-transform duration-500" />
                      </Button>
                )}
                {mainTab === 'history' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                    onClick={refreshHistory}
                    disabled={isRefreshingHistory}
                  >
                    <RefreshCw className={cn("h-5 w-5", isRefreshingHistory && "animate-spin")} />
                  </Button>
                )}
              </div>
            </div>
            {mainTab !== 'history' ? (
              <div className="space-y-2 sm:space-y-6">
                {mainTab === "receive" && (
                  <div className="space-y-2 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Assigned Worker</Label>
                        <div className="relative group">
                          <select
                            value={selectedWorker}
                            onChange={(e) => {
                              setSelectedWorker(e.target.value);
                              setDraftDesignId("");
                              setDraftFabricType("");
                              setDraftSmallQty(0);
                              setDraftLargeQty(0);
                              setAutoSelectFabric(true);
                              setSavedEntry(null);
                            }}
                            className="flex h-14 w-full rounded-2xl border border-border/40 bg-muted/20 px-4 py-2 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer transition-all hover:bg-background/40 hover:border-primary/40 pr-10"
                          >
                            <option value="" className="font-bold">Select Operator</option>
                            {workers.map((w) => (
                              <option key={w._id} value={w.name} className="font-bold">{w.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-primary transition-colors opacity-40">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Receipt Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "flex h-14 w-full justify-start rounded-2xl border border-border/40 bg-muted/20 px-4 py-2 text-left text-sm font-black shadow-none transition-all hover:bg-background/40 hover:border-primary/40 focus:ring-4 focus:ring-primary/10",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                              {selectedDate ? selectedDate.toLocaleDateString('en-GB') : <span>Select Date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-[2rem] shadow-2xl border-border/40 bg-background/80 backdrop-blur-2xl" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(d) => {
                                if (!d) return;
                                setSelectedDate(d);
                                setSavedEntry(null);
                              }}
                              initialFocus
                              className="p-3"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-6">
                      <div className="flex items-center gap-2 ml-1">
                        <div className="w-1 h-3 rounded-full bg-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Stage Design for Receipt</span>
                      </div>
                      <div className="p-2 sm:p-6 rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl shadow-black/5 space-y-5">
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Product SKU</Label>
                           <SearchableDesignSelect
                            designs={selectedWorker ? availableReceiveDesigns : []}
                            value={draftDesignId}
                            onSelect={(val) => {
                              setDraftDesignId(val);
                              setDraftFabricType("");
                              setDraftSmallQty(0);
                              setDraftLargeQty(0);
                              setAutoSelectFabric(true);
                            }}
                            placeholder={
                              !selectedWorker
                                ? "Assign worker first"
                                : availableReceiveDesigns.length === 0
                                  ? "No active units found"
                                  : "Search SKUs..."
                            }
                            disabled={!selectedWorker}
                            className={cn(
                              "h-14 rounded-2xl border-border/40 bg-muted/10 font-black focus:ring-4 focus:ring-primary/10 transition-all",
                              !selectedWorker && "opacity-40"
                            )}
                          />
                        </div>
                        {draftFabrics.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Material Selection</Label>
                            <div className="relative group">
                              <select
                                value={draftFabricType}
                                onChange={(e) => {
                                  setDraftFabricType(e.target.value);
                                  setDraftSmallQty(0);
                                  setDraftLargeQty(0);
                                  setAutoSelectFabric(false);
                                }}
                                disabled={!selectedWorker || !draftDesignId || draftFabrics.length === 1}
                                className={cn(
                                  "flex h-12 w-full rounded-2xl border border-border/40 bg-muted/10 px-4 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer transition-all hover:bg-background/40 hover:border-primary/40 pr-10",
                                  (!selectedWorker || !draftDesignId) && "opacity-40"
                                )}
                              >
                                <option value="" className="font-bold">{draftFabrics.length > 1 ? "Select Material" : "Fabric"}</option>
                                {draftFabrics.map((f) => (
                                  <option key={f} value={f} className="font-bold">{f}</option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {draftDesignId && (
                          <div className="px-2 py-1 bg-primary/5 rounded-lg border border-primary/20 w-fit">
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Open for Edit: {sizesLabel}</span>
                          </div>
                        )}

                        <div className={cn("grid grid-cols-1 gap-4", pendingDraftSizes.length > 1 ? "sm:grid-cols-2" : "grid-cols-1")}>
                          {pendingDraftSizes.includes('S-SML') && (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center px-1">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">50cm Variant</Label>
                                <span className="text-[9px] font-black text-primary/60 uppercase">Max: {openSmall}</span>
                              </div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                  value={draftSmallQty || ''}
                                  max={openSmall || undefined}
                                  onChange={(e) => {
                                    const raw = parseInt(e.target.value) || 0;
                                    setDraftSmallQty(Math.min(Math.max(0, raw), openSmall || 0));
                                  }}
                                  disabled={!selectedWorker || !draftDesignId || openSmall <= 0}
                                  className={cn("h-12 rounded-xl bg-muted/10 border-border/40 text-center font-black transition-all focus:ring-4 focus:ring-primary/10", (!selectedWorker || !draftDesignId) && "opacity-40")}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20"><Hash className="w-3.5 h-3.5" /></div>
                              </div>
                            </div>
                          )}
                          {pendingDraftSizes.includes('S-LGE') && (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center px-1">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">90cm Variant</Label>
                                <span className="text-[9px] font-black text-primary/60 uppercase">Max: {openLarge}</span>
                              </div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                  value={draftLargeQty || ''}
                                  max={openLarge || undefined}
                                  onChange={(e) => {
                                    const raw = parseInt(e.target.value) || 0;
                                    setDraftLargeQty(Math.min(Math.max(0, raw), openLarge || 0));
                                  }}
                                  disabled={!selectedWorker || !draftDesignId || openLarge <= 0}
                                  className={cn("h-12 rounded-xl bg-muted/10 border-border/40 text-center font-black transition-all focus:ring-4 focus:ring-primary/10", (!selectedWorker || !draftDesignId) && "opacity-40")}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20"><Hash className="w-3.5 h-3.5" /></div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={addDesignToSession}
                          disabled={!selectedWorker || (!draftSmallQty && !draftLargeQty)}
                          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-40"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add to Session List
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Live Receipt Staging</span>
                        </div>
                        <Badge variant="outline" className="rounded-full bg-primary/5 border-primary/20 font-black text-[9px] px-2">{groupedReceiveItems.length} SKUs</Badge>
                      </div>
                      
                      <div className="space-y-3">
                        {groupedReceiveItems.length === 0 ? (
                          <div className="p-4 sm:p-10 rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/5 flex flex-col items-center justify-center text-center">
                            <Layers className="w-10 h-10 text-muted-foreground/20 mb-3" />
                            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">No items staged for receipt</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {groupedReceiveItems.map((item) => (
                              <div
                                key={`${item.designId}||${item.fabric}`}
                                className="group flex items-center justify-between bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl sm:rounded-3xl p-4 sm:p-5 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-black/5"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-primary font-black text-xs">
                                    {item.designId.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-xs font-black uppercase tracking-widest text-foreground">{item.designId}</div>
                                    <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">{item.fabric || "Premium Fabric"}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 sm:p-6 sm:gap-4 sm:p-10">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">Small</span>
                                    <span className="text-sm font-black text-foreground">{item.small}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">Large</span>
                                    <span className="text-sm font-black text-foreground">{item.large}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
                                    onClick={() => removeDesignFromSession(item.designId, item.fabric)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedWorker && (
                      <div className="p-2 sm:p-6 bg-primary/5 rounded-[2rem] border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:p-6 overflow-hidden relative">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                              <Calculator className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Worker Ledger Summary</span>
                              <span className="text-xs font-bold text-muted-foreground/60">{selectedWorker} · Current Session</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-3 sm:p-8">
                            <div className="space-y-1">
                               <span className="block text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest">Pending Small</span>
                               <span className="text-xl font-black text-foreground tracking-tighter">{Number(printSummary?.totals?.pendingSmall || 0)} <span className="text-[10px]">Pcs</span></span>
                            </div>
                            <div className="space-y-1">
                               <span className="block text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest">Pending Large</span>
                               <span className="text-xl font-black text-foreground tracking-tighter">{Number(printSummary?.totals?.pendingLarge || 0)} <span className="text-[10px]">Pcs</span></span>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => handleShare('whatsapp')}
                        disabled={!canShare}
                        className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.02]"
                      >
                        <MessageCircle className="w-5 h-5 mr-3" /> WhatsApp
                      </Button>
                      <Button
                        onClick={() => handleShare('native')}
                        variant="secondary"
                        disabled={!canShare}
                        className="h-14 rounded-2xl bg-background border border-border/40 text-foreground font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-black/5 transition-all hover:scale-[1.02]"
                      >
                        <Share2 className="w-5 h-5 mr-3" /> Share Ledger
                      </Button>
                    </div>

                    <Button
                      onClick={openReceiveConfirm}
                      disabled={!canSubmit || !!savedEntry}
                      className="w-full h-16 rounded-[2rem] bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.01] disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-6 h-6 mr-3" /> Finalize Production Entry
                    </Button>

                    {/* CONFIRM DIALOG */}
                    <Dialog open={receiveConfirmOpen} onOpenChange={(open) => !isSaving && setReceiveConfirmOpen(open)}>
                      <DialogContent className="rounded-[2.5rem] border-none shadow-2xl backdrop-blur-3xl bg-background/90 p-3 sm:p-8 sm:max-w-[440px]">
                        <DialogHeader className="items-center text-center">
                          <div className="w-16 h-16 rounded-xl sm:rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Confirm Entry</DialogTitle>
                          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 italic">
                            Commit production data to permanent ledger
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-8 space-y-4">
                           <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Operator</span>
                              <span className="font-black text-sm">{selectedWorker || "—"}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 rounded-2xl bg-muted/30 text-center">
                                <span className="block text-[9px] font-black uppercase text-muted-foreground/40 mb-1">Small</span>
                                <span className="text-xl font-black">{receiveTotals.small}</span>
                              </div>
                              <div className="p-4 rounded-2xl bg-muted/30 text-center">
                                <span className="block text-[9px] font-black uppercase text-muted-foreground/40 mb-1">Large</span>
                                <span className="text-xl font-black">{receiveTotals.large}</span>
                              </div>
                           </div>
                           <div className="p-5 rounded-xl sm:rounded-3xl bg-primary text-primary-foreground flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Yield</span>
                              <span className="text-2xl font-black tracking-tighter">{receiveTotals.total} Units</span>
                           </div>
                        </div>
                        <DialogFooter className="mt-8 grid grid-cols-2 gap-3 sm:flex-row sm:justify-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive" 
                            disabled={isSaving} 
                            onClick={() => setReceiveConfirmOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="button" 
                            className="h-14 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20" 
                            disabled={isSaving} 
                            onClick={confirmReceiveSave}
                          >
                            {isSaving ? "Saving..." : "Confirm"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {mainTab === "adjust" && (
                  <div className="space-y-3 sm:space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Assigned Worker</Label>
                        <div className="relative group">
                          <select
                            value={selectedWorker}
                            onChange={(e) => {
                              setSelectedWorker(e.target.value);
                              setAdjustItems([]);
                              setAdjustDraftDesignId("");
                              setAdjustDraftFabricType("");
                              setAdjustDraftSmallQty(0);
                              setAdjustDraftLargeQty(0);
                              setAdjustAutoSelectFabric(true);
                            }}
                            className="flex h-14 w-full rounded-2xl border border-border/40 bg-muted/20 px-4 py-2 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer transition-all hover:bg-background/40 hover:border-primary/40 pr-10"
                          >
                            <option value="" className="font-bold">Select Operator</option>
                            {workers.map((w) => (
                              <option key={w._id} value={w.name} className="font-bold">{w.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Adjustment Date</Label>
                        <div className="flex h-14 w-full items-center rounded-2xl border border-border/40 bg-muted/20 px-4 text-sm font-black text-muted-foreground/40">
                           <CalendarIcon className="mr-3 h-4 w-4" />
                           {new Date().toLocaleDateString('en-GB')}
                           <span className="ml-auto text-[8px] uppercase tracking-widest opacity-60">Locked: Live Only</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2 sm:col-span-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Adjustment Type</Label>
                        <div className="relative group">
                          <select
                            value={adjustAction}
                            onChange={(e) => setAdjustAction(e.target.value as any)}
                            className="flex h-12 w-full rounded-2xl border border-border/40 bg-muted/10 px-4 py-2 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer transition-all hover:bg-background/40 hover:border-primary/40 pr-10"
                          >
                            <option value="reject" className="text-destructive">Reject (Loss)</option>
                            <option value="hold" className="text-amber-500">Hold (Pending)</option>
                            <option value="adjust" className="text-primary">Adjust (Manual)</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Reason / Note (Required)</Label>
                        <Textarea
                          value={adjustNote}
                          onChange={(e) => setAdjustNote(e.target.value)}
                          placeholder="e.g. Damage in printing / Missing pieces / Extra cutting / Quality check fail..."
                          className="min-h-[48px] rounded-2xl border-border/40 bg-muted/10 px-4 py-3 text-sm font-black focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                      </div>
                    </div>

                    {selectedWorker && printSummary && (
                      <div className="p-2 sm:p-6 bg-muted/20 rounded-[2rem] border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:p-6">
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Available for Adjustment</span>
                          <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-1">Pending balance from latest issue</span>
                        </div>
                        <div className="flex items-center gap-3 sm:p-8">
                          <div className="space-y-1">
                            <span className="block text-[9px] font-black uppercase text-muted-foreground/30 tracking-widest">Sml Pending</span>
                            <span className="text-lg font-black text-foreground">{Number(printSummary?.totals?.pendingSmall || 0)}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[9px] font-black uppercase text-muted-foreground/30 tracking-widest">Lge Pending</span>
                            <span className="text-lg font-black text-foreground">{Number(printSummary?.totals?.pendingLarge || 0)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 sm:space-y-6">
                      <div className="flex items-center gap-2 ml-1">
                        <div className="w-1 h-3 rounded-full bg-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Identify Adjustment SKU</span>
                      </div>
                      <div className="p-2 sm:p-6 rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl shadow-black/5 space-y-2 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Product SKU</Label>
                            <SearchableDesignSelect
                              designs={selectedWorker ? availableAdjustDesigns : []}
                              value={adjustDraftDesignId}
                              onSelect={(val) => {
                                setAdjustDraftDesignId(val);
                                setAdjustDraftFabricType("");
                                setAdjustDraftSmallQty(0);
                                setAdjustDraftLargeQty(0);
                                setAdjustAutoSelectFabric(true);
                              }}
                              placeholder={!selectedWorker ? "Assign worker first" : "Search SKUs..."}
                              disabled={!selectedWorker}
                              className="h-12 rounded-2xl border-border/40 bg-muted/10 font-black focus:ring-4 focus:ring-primary/10"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Material</Label>
                            <div className="relative group">
                              <select
                                value={adjustDraftFabricType || ""}
                                onChange={(e) => setAdjustDraftFabricType(e.target.value)}
                                disabled={!selectedWorker || !adjustDraftDesignId || adjustDraftFabrics.length <= 1}
                                className="flex h-12 w-full rounded-2xl border border-border/40 bg-muted/10 px-4 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer transition-all pr-10"
                              >
                                <option value="" className="font-bold">Select Fabric</option>
                                {adjustDraftFabrics.map((f) => (
                                  <option key={f} value={f} className="font-bold">{f}</option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <div className="flex justify-between items-center px-1">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Small Variant</Label>
                                <span className="text-[9px] font-black text-primary/60 uppercase">Max: {adjustAvailableSmall}</span>
                              </div>
                            <Input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              value={adjustDraftSmallQty || ""}
                              onChange={(e) => {
                                const raw = Number(e.target.value || 0) || 0;
                                setAdjustDraftSmallQty(Math.min(Math.max(0, raw), adjustAvailableSmall || 0));
                              }}
                              disabled={!selectedWorker || !adjustDraftDesignId || !adjustDraftFabricType || adjustAvailableSmall <= 0}
                              className="h-12 rounded-xl bg-muted/10 border-border/40 text-center font-black focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                             <div className="flex justify-between items-center px-1">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Large Variant</Label>
                                <span className="text-[9px] font-black text-primary/60 uppercase">Max: {adjustAvailableLarge}</span>
                              </div>
                            <Input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              value={adjustDraftLargeQty || ""}
                              onChange={(e) => {
                                const raw = Number(e.target.value || 0) || 0;
                                setAdjustDraftLargeQty(Math.min(Math.max(0, raw), adjustAvailableLarge || 0));
                              }}
                              disabled={!selectedWorker || !adjustDraftDesignId || !adjustDraftFabricType || adjustAvailableLarge <= 0}
                              className="h-12 rounded-xl bg-muted/10 border-border/40 text-center font-black focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                          </div>
                        </div>

                        <Button 
                          type="button" 
                          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-40" 
                          disabled={!selectedWorker || !adjustDraftDesignId || (!adjustDraftSmallQty && !adjustDraftLargeQty)} 
                          onClick={addAdjustToList}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Stage for Adjustment
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Staged Adjustments</span>
                        </div>
                        <Badge variant="outline" className="rounded-full bg-primary/5 border-primary/20 font-black text-[9px] px-2">{adjustValidItems.length} SKUs</Badge>
                      </div>

                      {adjustValidItems.length === 0 ? (
                        <div className="p-4 sm:p-10 rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/5 flex flex-col items-center justify-center text-center">
                          <AlertTriangle className="w-10 h-10 text-muted-foreground/20 mb-3" />
                          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">No manual adjustments staged</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {adjustValidItems.map((it, idx) => (
                            <div key={`${it.design_id}-${it.size_id}-${it.fabricType}-${idx}`} className="group flex items-center justify-between bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl sm:rounded-3xl p-4 sm:p-5 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-black/5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-primary font-black text-xs">
                                  {it.design_id.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-xs font-black uppercase tracking-widest text-foreground">{it.design_id}</div>
                                  <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">
                                    {it.size_id === "S-SML" ? "50cm" : "90cm"} · {String(it.fabricType || "Satin").trim() || "Satin"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:p-6 sm:gap-4 sm:p-10">
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">Value</span>
                                  <span className="text-sm font-black text-foreground">{it.quantity} <span className="text-[10px] opacity-40">Pcs</span></span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-xl text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
                                  onClick={() => removeAdjustItem(idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button 
                      type="button" 
                      className={cn("w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-xl transition-all hover:scale-[1.01] disabled:opacity-40", adjustThemeStyle.button.replace('h-10 px-4', ''))} 
                      disabled={!canSubmitAdjust} 
                      onClick={openAdjustConfirm}
                    >
                      <Save className="w-6 h-6 mr-3" /> Save {adjustAction === "adjust" ? "Adjustment" : adjustAction === "hold" ? "Hold" : "Reject"}
                    </Button>

                    <Dialog open={adjustConfirmOpen} onOpenChange={(open) => !isSaving && setAdjustConfirmOpen(open)}>
                      <DialogContent className="rounded-[2.5rem] border-border/40 bg-background/80 backdrop-blur-3xl shadow-2xl p-3 sm:p-8 sm:max-w-[440px]">
                        <DialogHeader className="items-center text-center">
                          <div className={cn("w-16 h-16 rounded-xl sm:rounded-3xl flex items-center justify-center mb-4 bg-primary/10 text-primary")}>
                            <Save className="w-8 h-8" />
                          </div>
                          <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Confirm {adjustAction === "adjust" ? "Adjustment" : adjustAction === "hold" ? "Hold" : "Rejection"}</DialogTitle>
                          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 italic">
                            {adjustAction === "adjust" ? "Manual balancing of ledger units" : "Permanent exclusion from production pool"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-8 space-y-4">
                           <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Operator</span>
                              <span className="font-black text-sm">{selectedWorker || "—"}</span>
                           </div>
                           <div className="p-5 rounded-xl sm:rounded-3xl bg-primary text-primary-foreground flex flex-col gap-1 items-center justify-center text-center">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Items</span>
                              <span className="text-3xl font-black tracking-tighter">{adjustItems.reduce((s, it) => s + it.quantity, 0)} Units</span>
                           </div>
                        </div>
                        <DialogFooter className="mt-8 grid grid-cols-2 gap-3 sm:flex-row sm:justify-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive" 
                            disabled={isSaving} 
                            onClick={() => setAdjustConfirmOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="button" 
                            className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20" 
                            disabled={isSaving} 
                            onClick={confirmAdjustSave}
                          >
                            {isSaving ? "Saving..." : "Confirm & Save"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            ) : mainTab === "history" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <WorkerLedger
                  entries={historyCombinedEntries as any}
                  toDate={historyToDate}
                  onToDateChange={setHistoryToDate}
                  rangeDays={historyRangeDays}
                  onRangeDaysChange={setHistoryRangeDays}
                  showBalances={false}
                  onEditEntry={(e) => openEditForEntry(e)}
                  onDeleteEntry={(e) => openDeleteForEntry(e)}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
      <Dialog open={editOpen} onOpenChange={(open) => !isUpdating && setEditOpen(open)}>
        <DialogContent className="rounded-xl sm:rounded-3xl sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Edit Print Order Entry</DialogTitle>
            <DialogDescription>
              Update {String(editEntry?.type || "").trim() || "print"} details.
            </DialogDescription>
          </DialogHeader>
          {!editEntry ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Worker</Label>
                  <div className="relative group">
                    <select
                      value={editWorker}
                      onChange={(e) => setEditWorker(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all hover:border-primary/50 pr-8"
                    >
                      <option value="">{workers.length === 0 ? "Loading..." : "Select Worker"}</option>
                      {workers.map((w) => (
                        <option key={`edit-worker-${w._id}`} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Date</Label>
                  <Input
                    type="date"
                    className="h-10 rounded-xl"
                    value={editDate ? format(editDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const next = String(e.target.value || "").trim();
                      setEditDate(next ? new Date(`${next}T00:00:00`) : null);
                    }}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Note</Label>
                  <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} className="h-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Items</Label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editItems.map((it, idx) => (
                    <div key={`${it.design_id}-${it.size_id}-${it.fabricType}-${idx}`} className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded-md bg-background text-foreground text-[10px] font-semibold">{it.design_id}</span>
                        <span className="text-[9px] uppercase text-muted-foreground">
                          {it.size_id === "S-SML" ? "Small" : "Large"} · {it.fabricType || "Satin"}
                        </span>
                      </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={it.quantity}
                      onChange={(e) => updateEditItemQty(idx, Number(e.target.value))}
                      className="h-8 w-24 rounded-lg text-right"
                      min={0}
                      max={String(editEntry?.type || "") === "receive" ? maxAllowedForEditItem(it) : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => removeEditItem(idx)}
                      aria-label="Delete item"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isUpdating} className="rounded-xl">Cancel</Button>
                <Button onClick={saveEdit} disabled={isUpdating} className="rounded-xl">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={(open) => setDeleteOpen(open)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{String(deleteEntry?.type || "") === "issue" ? "Delete issue" : "Delete entry"}</DialogTitle>
            <DialogDescription>
              {String(deleteEntry?.type || "") === "issue"
                ? "Issuance ko delete karoge to is order ke sare related receive/adjust entries bhi remove ho jayenge."
                : "Is entry ko history se remove karna hai? Ye action irreversible hai."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Worker</span>
              <span className="font-semibold">{String(deleteEntry?.workerName || "-")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground capitalize">Type</span>
              <span className="font-semibold uppercase">{String(deleteEntry?.type || "-")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span className="font-semibold">
                {Array.isArray(deleteEntry?.items) ? deleteEntry.items.reduce((s: number, it: any) => s + (it?.quantity || 0), 0) : 0} pcs
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            {!deleteSecondConfirm ? (
              <Button type="button" className="rounded-xl" onClick={() => setDeleteSecondConfirm(true)}>
                Confirm
              </Button>
            ) : (
              <Button type="button" className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
                Delete Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

