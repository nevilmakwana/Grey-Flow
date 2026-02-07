# **App Name**: Scarf Order Pro

## Core Features:

- Design Listing and Selection: Display a searchable list/grid of scarf designs with thumbnails, names, and IDs. Clicking a design adds it to the order panel.
- Order Panel: Display selected design details, including an image, ID, and a table of sizes with quantity inputs, pieces per unit, rate per piece, and calculated size totals.
- Order Totals Calculation: Automatically calculate and display design totals, order subtotal, grand total (including tax), and update in real-time as quantities are changed. Validate the correctness of design IDs and handle cases where design or size ids may be wrong.
- Bulk Import via CSV: Provide a textarea for pasting CSV data (design_id, size_id, quantity) to quickly populate order quantities.  The AI tool attempts to match the CSV rows to existing ids, providing a detailed mismatch report when design_id/size_id combinations cannot be found.
- PDF Export: Generate a printable A4 PDF document containing company header/logo, date, order ID, design details (thumbnail, sizes table), and order totals.
- WhatsApp Sharing: Create a WhatsApp-friendly text message containing design IDs, size-wise quantities, and order totals, then either allow copying it, or let the user directly open the pre-filled message on WhatsApp Web.
- Draft Order Management: Persist current order drafts to localStorage. The UI enables the user to review previous drafts.

## Style Guidelines:

- Primary color: Sky blue (#87CEEB) to give a sense of calm and professionalism, like well-produced textiles.
- Background color: Very light blue (#F0F8FF), a desaturated version of the primary for a soft, unobtrusive background.
- Accent color: Soft lavender (#E6E6FA), analogous to sky blue, to provide gentle contrast on buttons and selected items.
- Font: 'Inter', a grotesque-style sans-serif, for both headlines and body text. Its clean and modern appearance is ideal for UI elements and textual clarity.
- Use simple, clear icons sourced from a consistent set (e.g. Font Awesome or Material Design Icons) to represent actions like 'Add,' 'Delete,' 'Export,' and 'Share.'
- Implement a clean, split-pane layout with the design list on the left and the order panel on the right. Use iOS 26 style elements to achieve a clean look.
- Incorporate subtle transition animations (e.g., fade-in, slide-in) when designs are selected or quantities are updated, enhancing the user experience without being distracting.