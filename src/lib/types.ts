export type Role = 'owner' | 'karigar';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  karigarId?: string | null;
  active?: boolean;
}

export interface StageDef {
  name: string;
  percent: number;
}

export interface WorkshopSettings {
  name: string;
  tagline?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  gst?: string;
  itemTypes: string[];
  woodTypes: string[];
  stages: StageDef[];
  expenseCategories: string[];
  skills: string[];
  billTerms?: string;
}

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type LengthUnit = 'ft' | 'inch';
export type PayMode = 'cash' | 'upi' | 'bank';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  deleted: boolean;
  createdAt: number;
}

export interface ExtraMeasure {
  label: string;
  value: string;
}

export interface Naap {
  unit: LengthUnit;
  l: number | null;
  w: number | null;
  h: number | null;
  extra: ExtraMeasure[];
  notes?: string;
}

export interface Photo {
  url: string;
  path: string;
  at: number;
  by?: string;
  caption?: string;
}

export type MediaKind = 'photo' | 'video';

/** Photo or video. Videos keep a small poster image for previews. */
export interface Media extends Photo {
  kind: MediaKind;
  mime?: string;
  size?: number;
  /** poster image url (photos stored like other images) */
  poster?: string;
  /** seconds */
  duration?: number;
  /** 'site' = copied from a site visit (file belongs to the site, never delete from the order) */
  source?: 'site' | 'order';
}

/** One measured item / room at a site */
export interface SiteEntry {
  id: string;
  label: string;
  unit: LengthUnit;
  l: number | null;
  w: number | null;
  h: number | null;
  notes?: string;
}

/** Site visit: sizes + site photos/videos recorded at the customer's place (owner only). */
export interface Site {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address?: string;
  title: string;
  visitDate: string; // yyyy-MM-dd
  entries: SiteEntry[];
  media: Media[];
  notes?: string;
  orderIds: string[];
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StageEvent {
  stage: string;
  index: number;
  at: number;
  by?: string;
}

/** Job data - visible to assigned karigars. NO money fields here. */
export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  itemType: string;
  title?: string;
  quantity: number;
  naap: Naap;
  designPhotos: Photo[];
  progressPhotos: Photo[];
  /** site photos + videos (also visible to assigned workers) */
  siteMedia?: Media[];
  /** site visit this order was created from */
  siteId?: string | null;
  refLink?: string;
  wood?: string;
  finish?: string;
  hardware?: string;
  orderDate: string; // yyyy-MM-dd
  deliveryDate: string; // yyyy-MM-dd
  priority: Priority;
  stage: string;
  stageIndex: number;
  progress: number;
  stageHistory: StageEvent[];
  karigarIds: string[];
  statusToken: string;
  showPriceOnStatus: boolean;
  notes?: string;
  deliveredAt?: number | null;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Money data per order - owner only. Doc id == order id. */
export interface Finance {
  id: string;
  orderId: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  price: number;
  discount: number;
  paid: number;
  balance: number;
  deleted: boolean;
  createdAt: number;
}

export interface Payment {
  id: string;
  receiptNo: string;
  orderId: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  mode: PayMode;
  type: 'advance' | 'instalment';
  date: string; // yyyy-MM-dd
  note?: string;
  deleted: boolean;
  createdAt: number;
}

export interface Karigar {
  id: string;
  name: string;
  phone: string;
  skill?: string;
  email?: string | null;
  uid?: string | null;
  active: boolean;
  deleted: boolean;
  createdAt: number;
}

/** Per job labour amount for a karigar */
export interface Labour {
  id: string;
  karigarId: string;
  karigarName: string;
  orderId: string;
  orderNo: string;
  itemType: string;
  amount: number;
  paid: number;
  note?: string;
  deleted: boolean;
  createdAt: number;
}

export interface StockItem {
  id: string;
  name: string;
  category: string; // Lakdi / Ply / Hardware / Polish / Other
  unit: string;
  qty: number;
  minQty: number;
  rate?: number;
  deleted: boolean;
  createdAt: number;
}

export interface StockMove {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  type: 'in' | 'out';
  qty: number;
  orderId?: string | null;
  orderNo?: string | null;
  date: string;
  note?: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note?: string;
  deleted: boolean;
  createdAt: number;
}

/** Public mirror for /status/[token] */
export interface StatusDoc {
  orderId: string;
  orderNo: string;
  customerName: string;
  itemType: string;
  title?: string;
  quantity: number;
  stage: string;
  stageIndex: number;
  progress: number;
  stages: StageDef[];
  deliveryDate: string;
  photos: Photo[];
  karigarIds: string[];
  workshopName: string;
  workshopPhone?: string;
  logoUrl?: string;
  showPrice: boolean;
  price?: number | null;
  paid?: number | null;
  balance?: number | null;
  updatedAt: number;
}
