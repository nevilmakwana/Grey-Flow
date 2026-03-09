import mongoose from "mongoose";

const OrderPdfDesignSchema = new mongoose.Schema(
  {
    designCode: { type: String, trim: true, default: "" },
    qty50: { type: Number, default: 0 },
    qty90: { type: Number, default: 0 },
  },
  { _id: false }
);

const OrderPdfGroupSchema = new mongoose.Schema(
  {
    fabricType: { type: String, trim: true, default: "Satin" },
    designs: { type: [OrderPdfDesignSchema], default: [] },
  },
  { _id: false }
);

const OrderPDFSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    recipient: { type: String, default: "", trim: true },
    printingWorkerName: { type: String, default: "", trim: true, index: true },
    challanNo: { type: String, default: "", trim: true, index: true },
    preparedBy: { type: String, default: "", trim: true },
    pdfType: {
      type: String,
      enum: ["SINGLE", "MULTI"],
      required: true,
    },
    fabrics: {
      type: [String],
      default: [],
    },
    designs: {
      type: [OrderPdfDesignSchema],
      default: [],
    },
    groups: {
      type: [OrderPdfGroupSchema],
      default: [],
    },
    pdfUrl: {
      type: String,
      default: "",
      trim: true,
    },
    publicId: { type: String, default: "", trim: true },
    storage: { type: String, default: "", trim: true },
    sizeBytes: { type: Number, default: 0 },
    pdfFilename: { type: String, default: "", trim: true },
    pdfMimeType: { type: String, default: "application/pdf", trim: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.OrderPDF || mongoose.model("OrderPDF", OrderPDFSchema);

