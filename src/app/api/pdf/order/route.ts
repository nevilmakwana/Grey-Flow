import { withApiHandler, parseJson, ApiError } from "@/lib/server/api";
import { generateOrderPdf } from "@/lib/pdf/templates/generateOrderPdf";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DesignSchema = z.object({
  designCode: z.string().min(1),
  qty50: z.number().nonnegative().optional().default(0),
  qty90: z.number().nonnegative().optional().default(0),
  imageUrl: z.string().optional().default(""),
});

const GroupSchema = z.object({
  fabricType: z.string().min(1),
  designs: z.array(DesignSchema).min(1),
});

const RequestSchema = z.object({
  recipient: z.string().min(1).max(120),
  preparedBy: z.string().max(120).optional().default("Hemil M"),
  challanNumber: z.string().max(120).optional().default(""),
  orderNumber: z.string().max(120).optional().default(""),
  date: z.string().optional().default(""),
  companyName: z.string().optional().default("Grey Exim"),
  groups: z.array(GroupSchema).min(1),
});

export const POST = withApiHandler(async (req) => {
  const body = await parseJson(req);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid request", "INVALID_ORDER_PDF", parsed.error?.errors);
  }
  const payload = {
    ...parsed.data,
    date: parsed.data.date || new Date().toISOString(),
  };
  const pdfBuffer = await generateOrderPdf({ data: payload });
  const filename = `Fabric-Order-${String(parsed.data.orderNumber || "order")}.pdf`;

  return new Response(Buffer.from(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
