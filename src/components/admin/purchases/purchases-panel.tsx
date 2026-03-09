"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { readApiJson, getSessionCache, setSessionCache, cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PurchaseRow = {
  _id: string;
  date: string;
  supplierName: string;
  printingWorkerName?: string;
  challanOrInvoiceNo: string;
  deliveredMeters: number;
  returnMeters: number;
  netMeters: number;
  ratePerMeter: number;
  amount: number;
  cashDiscountPct: number;
  cashDiscountAmount: number;
  amountAfterDiscount: number;
  gstPct: number;
  gstAmount: number;
  finalPayableAmount: number;
  paidDate?: string | null;
  remark?: string;
};

const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PurchasesPanel() {
  const { toast } = useToast();

  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const [dateStr, setDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [supplierName, setSupplierName] = useState("");
  const [printingWorkerName, setPrintingWorkerName] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [deliveredMeters, setDeliveredMeters] = useState<string | number>(0);
  const [returnMeters, setReturnMeters] = useState<string | number>(0);
  const [ratePerMeter, setRatePerMeter] = useState<string | number>(0);
  const [cashDiscountPct, setCashDiscountPct] = useState<string | number>(2);
  const [gstPct, setGstPct] = useState<string | number>(5);
  const [remark, setRemark] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const CACHE_KEY = "PURCHASES_CACHE_V1";

  const netMeters = useMemo(() => {
    const delivered = Math.max(0, Number(deliveredMeters) || 0);
    const returned = Math.max(0, Number(returnMeters) || 0);
    return Math.max(0, delivered - returned);
  }, [deliveredMeters, returnMeters]);

  const amount = useMemo(() => {
    const rate = Math.max(0, Number(ratePerMeter) || 0);
    return Math.round(netMeters * rate * 100) / 100;
  }, [netMeters, ratePerMeter]);

  const cashDiscountAmount = useMemo(() => {
    const pct = Math.max(0, Number(cashDiscountPct) || 0);
    return Math.round(amount * (pct / 100) * 100) / 100;
  }, [amount, cashDiscountPct]);

  const amountAfterDiscount = useMemo(
    () => Math.round((amount - cashDiscountAmount) * 100) / 100,
    [amount, cashDiscountAmount]
  );

  const gstAmount = useMemo(() => {
    const pct = Math.max(0, Number(gstPct) || 0);
    return Math.round(amountAfterDiscount * (pct / 100) * 100) / 100;
  }, [amountAfterDiscount, gstPct]);

  const finalPayableAmount = useMemo(
    () => Math.round((amountAfterDiscount + gstAmount) * 100) / 100,
    [amountAfterDiscount, gstAmount]
  );

  const displayRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(String(b?.date || 0)).getTime() - new Date(String(a?.date || 0)).getTime()
      ),
    [rows]
  );

  const supplierOptions = useMemo(() => {
    const roleMatch = (v: any) => String(v?.role || "").trim().toLowerCase() === "fabric purchase";

    const fromRole = (workers || [])
      .filter((w: any) => w?.active !== false)
      .filter(roleMatch)
      .map((w: any) => String(w?.name || "").trim())
      .filter(Boolean);

    const fromRows = (rows || [])
      .map((r) => String(r?.supplierName || "").trim())
      .filter(Boolean);

    const fromAllWorkers = (workers || [])
      .filter((w: any) => w?.active !== false)
      .map((w: any) => String(w?.name || "").trim())
      .filter(Boolean);

    const merged =
      fromRole.length > 0
        ? [...fromRole, ...fromRows]
        : [...fromRows, ...fromAllWorkers];

    const withSelected =
      supplierName && !merged.includes(supplierName) ? [...merged, supplierName] : merged;

    return Array.from(new Set(withSelected)).sort((a, b) => a.localeCompare(b));
  }, [workers, rows, supplierName]);

  const printingWorkerOptions = useMemo(() => {
    const tokens = ["print", "printing", "printer"];

    const fromRole = (workers || [])
      .filter((w: any) => w?.active !== false)
      .filter((w: any) => {
        const role = String(w?.role || "").trim().toLowerCase();
        return tokens.some((t) => role.includes(t));
      })
      .map((w: any) => String(w?.name || "").trim())
      .filter(Boolean);

    const fromRows = (rows || [])
      .map((r) => String(r?.printingWorkerName || "").trim())
      .filter(Boolean);

    const fromAllWorkers = (workers || [])
      .filter((w: any) => w?.active !== false)
      .map((w: any) => String(w?.name || "").trim())
      .filter(Boolean);

    const merged =
      fromRole.length > 0
        ? [...fromRole, ...fromRows]
        : [...fromRows, ...fromAllWorkers];

    const withSelected =
      printingWorkerName && !merged.includes(printingWorkerName)
        ? [...merged, printingWorkerName]
        : merged;

    return Array.from(new Set(withSelected)).sort((a, b) => a.localeCompare(b));
  }, [workers, rows, printingWorkerName]);

  const money = (n?: number) => CURRENCY.format(Number(n || 0));

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases", { cache: "no-store" });
      const json = await readApiJson(res);
      const payload: any = json.data;
      const list = Array.isArray(payload?.data?.purchases)
        ? payload.data.purchases
        : Array.isArray(payload?.purchases)
          ? payload.purchases
          : [];
      setRows(list as PurchaseRow[]);
      setSessionCache(CACHE_KEY, list);
    } catch {
      toast({ variant: "destructive", title: "Load failed" });
    }
    setLoading(false);
  };

  const loadWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const res = await fetch("/api/workers", { cache: "no-store" });
      const json = await readApiJson(res);
      const payload: any = json.data;
      const list = Array.isArray(payload?.data?.workers)
        ? payload.data.workers
        : Array.isArray(payload?.workers)
          ? payload.workers
          : [];
      setWorkers(list as any[]);
    } catch {}
    setLoadingWorkers(false);
  };

  useEffect(() => {
    const cached = getSessionCache<PurchaseRow[]>(CACHE_KEY, 5 * 60 * 1000);
    if (Array.isArray(cached) && cached.length > 0) {
      setRows(cached);
    }

    load();
    loadWorkers();

    if (typeof window !== "undefined") {
      try {
        const val = window.localStorage.getItem("__purchases_edit");
        if (val) {
          const p = JSON.parse(val || "{}");
          window.localStorage.removeItem("__purchases_edit");
          if (p && p.id) {
            setEditingId(String(p.id));
            if (p.date) setDateStr(format(new Date(String(p.date)), "yyyy-MM-dd"));
            if (p.supplierName) setSupplierName(String(p.supplierName));
            if (p.printingWorkerName) setPrintingWorkerName(String(p.printingWorkerName));
            if (p.challanOrInvoiceNo !== undefined) setChallanNo(String(p.challanOrInvoiceNo || ""));
            if (p.deliveredMeters !== undefined) setDeliveredMeters(Number(p.deliveredMeters || 0));
            if (p.returnMeters !== undefined) setReturnMeters(Number(p.returnMeters || 0));
            if (p.ratePerMeter !== undefined) setRatePerMeter(Number(p.ratePerMeter || 0));
            if (p.cashDiscountPct !== undefined) setCashDiscountPct(Number(p.cashDiscountPct || 0));
            if (p.gstPct !== undefined) setGstPct(Number(p.gstPct || 0));
            if (p.remark !== undefined) setRemark(String(p.remark || ""));
          }
        }
      } catch {}

      const handler = (e: StorageEvent) => {
        if (e.key === "__purchases_refresh") {
          load();
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }
  }, []);

  const resetForm = () => {
    setSupplierName("");
    setPrintingWorkerName("");
    setChallanNo("");
    setDeliveredMeters(0);
    setReturnMeters(0);
    setRatePerMeter(0);
    setCashDiscountPct(2);
    setGstPct(5);
    setRemark("");
    setEditingId(null);
  };

  const buildPayload = () => {
    const date = new Date(dateStr);
    return {
      date: date.toISOString(),
      supplierName,
      printingWorkerName,
      challanOrInvoiceNo: challanNo,
      deliveredMeters: Number(deliveredMeters) || 0,
      returnMeters: Number(returnMeters) || 0,
      netMeters: Number.isFinite(Number(netMeters)) ? Number(netMeters) : undefined,
      ratePerMeter: Number(ratePerMeter) || 0,
      cashDiscountPct: Number(cashDiscountPct) || 0,
      gstPct: Number(gstPct) || 0,
      remark,
    };
  };

  const handleAdd = async () => {
    if (!supplierName) {
      toast({ variant: "destructive", title: "Supplier required" });
      return;
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      toast({ variant: "destructive", title: "Invalid date" });
      return;
    }

    try {
      const endpoint = "/api/purchases";
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...buildPayload() } : buildPayload();
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await readApiJson(res);
      if (!json.ok) {
        toast({
          variant: "destructive",
          title: editingId ? "Update failed" : "Save failed",
          description: String(json.error?.message || "Request failed"),
        });
        return;
      }
      toast({ title: editingId ? "Purchase updated" : "Purchase added" });
      resetForm();
      load();
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("__purchases_refresh", String(Date.now()));
        }
      } catch {}
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    }
  };

  const handleStartEdit = (r: PurchaseRow) => {
    setEditingId(r._id);
    setDateStr(format(new Date(r.date), "yyyy-MM-dd"));
    setSupplierName(r.supplierName);
    setPrintingWorkerName(String(r.printingWorkerName || ""));
    setChallanNo(r.challanOrInvoiceNo);
    setDeliveredMeters(r.deliveredMeters);
    setReturnMeters(r.returnMeters);
    setRatePerMeter(r.ratePerMeter);
    setCashDiscountPct(r.cashDiscountPct);
    setGstPct(r.gstPct);
    setRemark(r.remark || "");
  };

  const handleDelete = async (id: string) => {
    const step1 = typeof window !== "undefined" ? window.confirm("Delete this purchase entry?") : true;
    if (!step1) return;
    const step2 =
      typeof window !== "undefined"
        ? window.confirm("Final confirmation: This action cannot be undone. Delete?")
        : true;
    if (!step2) return;
    try {
      const res = await fetch(`/api/purchases?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await readApiJson(res);
      if (!json.ok) {
        toast({ variant: "destructive", title: "Delete failed" });
        return;
      }
      toast({ title: "Deleted" });
      load();
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("__purchases_refresh", String(Date.now()));
        }
      } catch {}
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <Card className="rounded-[24px] border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Raw Fabric Purchase Tracking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Excel jaisa purchase ledger: discount/GST with final payable.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={load}
            disabled={loading}
            className="h-11 rounded-2xl border-border/60 bg-background/30 px-6 text-base font-semibold"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </Card>

      <Card className="rounded-[24px] border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-3">
              <Label className="text-base font-semibold text-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-start rounded-2xl border-border/60 bg-background/30 px-4 text-left text-2xl font-semibold"
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                    {dateStr}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(dateStr)}
                    onSelect={(d) => setDateStr(format(d || new Date(), "yyyy-MM-dd"))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label className="text-base font-semibold text-foreground">Supplier Name</Label>
              <Select value={supplierName} onValueChange={setSupplierName} disabled={loadingWorkers}>
                <SelectTrigger className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold">
                  <SelectValue placeholder={loadingWorkers ? "Loading..." : "Select supplier"} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {supplierOptions.length > 0 ? (
                    supplierOptions.map((name) => (
                      <SelectItem key={name} value={name} className="font-medium">
                        {name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_supplier__" disabled>
                      No suppliers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label className="text-base font-semibold text-foreground">Challan/Invoice</Label>
              <Input
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                placeholder="74/1X7"
                className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold"
              />
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label className="text-base font-semibold text-foreground">Delivered meters</Label>
              <Input
                value={deliveredMeters}
                onChange={(e) => setDeliveredMeters(e.target.value)}
                type="number"
                className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-4">
              <Label className="text-base font-semibold text-foreground">Printing worker</Label>
              <Select value={printingWorkerName} onValueChange={setPrintingWorkerName} disabled={loadingWorkers}>
                <SelectTrigger className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold">
                  <SelectValue placeholder={loadingWorkers ? "Loading..." : "Select worker"} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {printingWorkerOptions.length > 0 ? (
                    printingWorkerOptions.map((name) => (
                      <SelectItem key={name} value={name} className="font-medium">
                        {name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_print_worker__" disabled>
                      No workers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-4">
              <Label className="text-base font-semibold text-foreground">Return meters</Label>
              <Input
                value={returnMeters}
                onChange={(e) => setReturnMeters(e.target.value)}
                type="number"
                className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold"
              />
            </div>

            <div className="space-y-2 lg:col-span-4">
              <Label className="text-base font-semibold text-foreground">Rate per meter</Label>
              <Input
                value={ratePerMeter}
                onChange={(e) => setRatePerMeter(e.target.value)}
                type="number"
                className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label className="text-base font-semibold text-foreground">Cash Discount %</Label>
              <Input
                value={cashDiscountPct}
                onChange={(e) => setCashDiscountPct(e.target.value)}
                type="number"
                className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label className="text-base font-semibold text-foreground">GST %</Label>
              <Input
                value={gstPct}
                onChange={(e) => setGstPct(e.target.value)}
                type="number"
                className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold text-foreground">Remark</Label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Notes"
              className="h-12 rounded-2xl border-border/60 bg-background/30 px-4 text-base font-medium"
            />
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/30 p-4">
            <div className="grid gap-6 md:grid-cols-4">
              <div className="space-y-2">
                <div className="text-base font-semibold text-foreground">Net meters: {netMeters}</div>
                <div className="text-base font-semibold text-foreground">GST: {money(gstAmount)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-base font-semibold text-foreground">Amount: {money(amount)}</div>
                <div className="text-base font-semibold text-foreground">Final payable: {money(finalPayableAmount)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-base font-semibold text-foreground">Cash Discount: {money(cashDiscountAmount)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-base font-semibold text-foreground">Amount after discount: {money(amountAfterDiscount)}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleAdd}
              className="h-12 rounded-2xl bg-primary px-7 text-base font-semibold text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              {editingId ? "Update Purchase" : "Add Purchase"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-[24px] border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-[1820px] w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground">
                {[
                  "Date",
                  "Supplier",
                  "Printing Worker",
                  "Challan/Invoice",
                  "Delivered",
                  "Return",
                  "Net",
                  "Rate/m",
                  "Amount",
                  "Discount %",
                  "Discount",
                  "Amount after disc",
                  "GST %",
                  "GST",
                  "Final payable",
                  "Paid Date",
                  "Remark",
                  "Actions",
                  "Paid",
                ].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-lg font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length > 0 ? (
                displayRows.map((r) => {
                  const isPaid = Boolean(r.paidDate);
                  return (
                    <tr key={r._id} className="border-b border-border/20">
                      <td className="px-3 py-3 text-base">{format(new Date(r.date), "EEE, dd MMM yyyy")}</td>
                      <td className="px-3 py-3 text-base font-medium">{r.supplierName || "-"}</td>
                      <td className="px-3 py-3 text-base">{r.printingWorkerName || "-"}</td>
                      <td className="px-3 py-3 text-base">{r.challanOrInvoiceNo || "-"}</td>
                      <td className="px-3 py-3 text-base">{Number(r.deliveredMeters || 0)}</td>
                      <td className="px-3 py-3 text-base">{Number(r.returnMeters || 0)}</td>
                      <td className="px-3 py-3 text-base">{Number(r.netMeters || 0)}</td>
                      <td className="px-3 py-3 text-base">{money(r.ratePerMeter)}</td>
                      <td className="px-3 py-3 text-base">{money(r.amount)}</td>
                      <td className="px-3 py-3 text-base">{Number(r.cashDiscountPct || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-base">{money(r.cashDiscountAmount)}</td>
                      <td className="px-3 py-3 text-base">{money(r.amountAfterDiscount)}</td>
                      <td className="px-3 py-3 text-base">{Number(r.gstPct || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-base">{money(r.gstAmount)}</td>
                      <td className="px-3 py-3 text-base font-semibold">{money(r.finalPayableAmount)}</td>
                      <td className="px-3 py-3 text-base">{r.paidDate ? format(new Date(r.paidDate), "EEE, dd MMM yyyy") : "-"}</td>
                      <td className="px-3 py-3 text-base">{r.remark || "-"}</td>
                      <td className="px-3 py-3">
                        {isPaid ? (
                          "-"
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-10 rounded-full bg-muted/70"
                              onClick={() => handleStartEdit(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-10 rounded-full"
                              onClick={() => handleDelete(r._id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isPaid ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                            Paid
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-10 text-center text-base text-muted-foreground" colSpan={19}>
                    No purchase entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
