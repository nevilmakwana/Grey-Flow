"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Order, Design, AppSettings } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSessionCache, readApiJson } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ShareViewProps {
  order: Order;
  designs: Design[];
  settings: AppSettings;
  onBack: () => void;
}

const ORDER_SHARE_META_KEY = "orders:share:meta";

function formatFullDate(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getQty(item: any, sizeId: "S-SML" | "S-LGE") {
  const size = Array.isArray(item?.sizes)
    ? item.sizes.find((s: any) => String(s?.size_id || "") === sizeId)
    : null;
  return Number(size?.quantity || 0);
}

export function ShareView({ order, designs, settings, onBack }: ShareViewProps) {
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [preparedBy, setPreparedBy] = useState("Hemil M");
  const [challanNo, setChallanNo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const meta = getSessionCache(ORDER_SHARE_META_KEY);
    const recipientFromMeta = String(meta?.recipient || "").trim();
    const challanFromMeta = String(meta?.challanNo || meta?.orderNumber || "").trim();
    if (recipientFromMeta) setRecipient(recipientFromMeta);
    if (challanFromMeta) setChallanNo(challanFromMeta);
  }, []);

  const orderGroups = useMemo(() => {
    return (order.fabricGroups || [])
      .map((group) => {
        const mappedDesigns = (group.items || [])
          .map((item) => {
            const qty50 = getQty(item, "S-SML");
            const qty90 = getQty(item, "S-LGE");
            return {
              designCode: String(item?.design_id || "").trim(),
              qty50,
              qty90,
            };
          })
          .filter((d) => d.designCode && (d.qty50 > 0 || d.qty90 > 0));
        return {
          id: String(group.id || ""),
          fabricType: String(group.fabric_id || "").trim() || "Satin",
          designs: mappedDesigns,
        };
      })
      .filter((g) => g.designs.length > 0);
  }, [order.fabricGroups]);

  const totals = useMemo(() => {
    let small = 0;
    let large = 0;
    orderGroups.forEach((g) => {
      g.designs.forEach((d) => {
        small += Number(d.qty50 || 0);
        large += Number(d.qty90 || 0);
      });
    });
    return { small, large, grand: small + large };
  }, [orderGroups]);

  const byFabricForRender = useMemo(() => {
    return orderGroups.map((group) => ({
      ...group,
      items: group.designs
        .map((row) => {
          const design = designs.find((d) => String(d.design_id || "") === row.designCode);
          return {
            ...row,
            imageUrl: String(design?.image_url || ""),
          };
        })
        .filter((d) => d.qty50 > 0 || d.qty90 > 0),
    }));
  }, [orderGroups, designs]);

  const handleFinalizeAndSave = async () => {
    if (!recipient.trim()) {
      toast({ variant: "destructive", title: "Recipient required", description: "To field fill karo." });
      return;
    }
    if (orderGroups.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Order me quantity wali designs add karo." });
      return;
    }

    setIsSaving(true);
    try {
      const body = {
        orderNumber: String(order.id || "").trim(),
        recipient: recipient.trim(),
        workerName: recipient.trim(),
        preparedBy: preparedBy.trim(),
        challanNo: challanNo.trim(),
        groups: orderGroups.map((g) => ({
          fabricType: g.fabricType,
          designs: g.designs.map((d) => ({
            designCode: d.designCode,
            qty50: Number(d.qty50 || 0),
            qty90: Number(d.qty90 || 0),
          })),
        })),
      };
      const res = await fetch("/api/order-pdf/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const { ok, data, error } = await readApiJson(res);
      if (!ok) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: String(error || data?.error || "Could not save order entry."),
        });
        return;
      }

      const id = String(data?.order?._id || "");
      setSavedId(id);
      setIsSaved(true);
      toast({ title: "Saved", description: "Entry saved to database. PDF button is now enabled." });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!isSaved || isGeneratingPdf) return;
    if (!recipient.trim()) {
      toast({ variant: "destructive", title: "Recipient required", description: "To field fill karo." });
      return;
    }
    if (orderGroups.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Order me quantity wali designs add karo." });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const body = {
        recipient: recipient.trim(),
        preparedBy: preparedBy.trim(),
        challanNumber: challanNo.trim(),
        orderNumber: String(order.id || "").trim(),
        date: String(order.created_at || ""),
        companyName: settings.company_name || "Grey Exim",
        groups: byFabricForRender.map((g) => ({
          fabricType: g.fabricType,
          designs: g.items.map((d) => ({
            designCode: d.designCode,
            qty50: Number(d.qty50 || 0),
            qty90: Number(d.qty90 || 0),
            imageUrl: String(d.imageUrl || ""),
          })),
        })),
      };

      const res = await fetch("/api/pdf/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let message = "Could not generate PDF.";
        try {
          const json = await res.json();
          message = String(json?.error?.message || json?.message || message);
        } catch {}
        toast({ variant: "destructive", title: "PDF failed", description: message });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fabric-Order-${String(order.id || "order")}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04060b] text-slate-100 px-4 sm:px-8 lg:px-12 py-8 print:p-0 print:bg-white print:text-black">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-8 flex items-center justify-between gap-4 no-print">
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-10 rounded-xl px-3 text-slate-300 hover:text-white hover:bg-slate-800/60"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
          </Button>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleFinalizeAndSave}
              disabled={isSaving}
              className="h-11 rounded-xl bg-blue-600/70 hover:bg-blue-600 text-white px-6 disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Finalize &amp; Save Entry
            </Button>
            <Button
              onClick={handleGeneratePdf}
              disabled={!isSaved || isGeneratingPdf}
              className="h-11 rounded-xl bg-blue-500 hover:bg-blue-400 text-white px-6 disabled:opacity-45"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Generate PDF
            </Button>
          </div>
        </div>

        <div className="border-t border-b border-slate-800/70 py-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,360px] gap-8">
            <div>
              <div className="text-sm text-slate-400">{settings.company_name || "Grey Exim"}</div>
              <h1 className="mt-1 text-5xl font-black tracking-tight leading-none text-white">Fabric Print Order</h1>
            </div>
            <div className="space-y-2 text-right">
              <div className="flex items-center justify-end gap-3">
                <span className="text-[11px] tracking-[0.2em] uppercase text-slate-400">To:</span>
                <Input
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setIsSaved(false);
                  }}
                  className="h-7 w-44 border-0 bg-transparent text-right text-2xl font-semibold text-white px-0 focus-visible:ring-0"
                />
              </div>
              <div className="text-[28px] font-medium text-slate-300">{formatFullDate(order.created_at)}</div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-[11px] tracking-[0.2em] uppercase text-slate-400">Order No:</span>
                <span className="text-3xl font-black text-white">{order.id}</span>
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-[11px] tracking-[0.2em] uppercase text-slate-400">Challan No:</span>
                <Input
                  value={challanNo}
                  onChange={(e) => {
                    setChallanNo(e.target.value);
                    setIsSaved(false);
                  }}
                  className="h-7 w-44 border-0 bg-transparent text-right text-xl font-semibold text-white px-0 focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-[11px] tracking-[0.2em] uppercase text-slate-400">Prepared By:</span>
                <Input
                  value={preparedBy}
                  onChange={(e) => {
                    setPreparedBy(e.target.value);
                    setIsSaved(false);
                  }}
                  className="h-7 w-44 border-0 bg-transparent text-right text-2xl font-semibold text-white px-0 focus-visible:ring-0"
                />
              </div>
              {savedId ? <div className="text-xs text-emerald-400">Saved ID: {savedId}</div> : null}
            </div>
          </div>
        </div>

        {byFabricForRender.map((group) => (
          <section key={group.id} className="pt-10 pb-16 border-b border-slate-800/70">
            <div className="mb-6 flex items-center gap-3">
              <span className="text-[14px] tracking-[0.24em] uppercase text-slate-400">Fabric Type:</span>
              <span className="rounded-full bg-slate-700/70 px-5 py-1 text-sm font-semibold text-white">{group.fabricType}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {group.items.map((item) => (
                <article key={`${group.id}-${item.designCode}`} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
                  <div className="mb-3 inline-flex rounded-md bg-blue-500 px-2 py-1 text-[10px] font-semibold text-white">
                    {item.designCode.replace("OG/SCF/", "")}
                  </div>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.designCode}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">50x50 cm (Small)</span>
                      <span className="font-bold text-white">{item.qty50} pcs</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">90x90 cm (Large)</span>
                      <span className="font-bold text-white">{item.qty90} pcs</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className="pt-10 pb-16">
          <div className="max-w-md space-y-2">
            <h3 className="text-[16px] tracking-[0.24em] uppercase text-slate-300">Total Quantity</h3>
            <div className="flex items-center justify-between text-2xl">
              <span className="text-slate-300">50x50 cm (Small):</span>
              <span className="font-black text-white">{totals.small} pcs</span>
            </div>
            <div className="flex items-center justify-between text-2xl">
              <span className="text-slate-300">90x90 cm (Large):</span>
              <span className="font-black text-white">{totals.large} pcs</span>
            </div>
            <div className="mt-4 border-t border-slate-700 pt-4 flex items-center justify-between">
              <span className="text-[30px] font-black uppercase text-white">Net Grand Total:</span>
              <span className="text-[42px] font-black text-white">{totals.grand} pcs</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

