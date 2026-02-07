
export interface Size {
  size_id: string;
  label: string;
  pieces_per_unit: number;
  rate_per_piece: number;
}

export interface Design {
  design_id: string;
  design_name?: string;
  image_url: string;
  sizes: Size[];
  default_note: string;
}

export interface OrderItemSize {
  size_id: string;
  quantity: number;
}

export interface OrderItem {
  design_id: string;
  sizes: OrderItemSize[];
  note?: string;
}

export interface FabricGroup {
  id: string;
  fabric_id: 'Satin' | 'Cotton' | string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  fabricGroups: FabricGroup[];
  created_at: string;
  status: 'draft' | 'saved';
  tax_percent: number;
  currency: string;
}

export interface AppSettings {
  company_name: string;
  currency: string;
  tax_percent: number;
}
