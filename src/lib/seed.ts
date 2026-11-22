/**
 * WoodBook demo data seeder.
 * Used by Settings > "Load demo data" and by `npm run seed` (scripts/seed.mts).
 *
 * NOTE: keep runtime imports limited to 'firebase/firestore' (no '@/' aliases,
 * no runtime relative imports) so Node can run this file with --experimental-strip-types.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import type {
  Customer,
  Expense,
  Finance,
  Karigar,
  Labour,
  LengthUnit,
  Order,
  Payment,
  PayMode,
  Priority,
  StageDef,
  StatusDoc,
  StockItem,
  StockMove,
  WorkshopSettings,
} from './types';

export interface SeedResult {
  customers: number;
  karigars: number;
  orders: number;
  payments: number;
  labour: number;
  stock: number;
  stockMoves: number;
  expenses: number;
}

const SEED_STAGES: StageDef[] = [
  { name: 'Measurement', percent: 10 },
  { name: 'Design Final', percent: 20 },
  { name: 'Cutting', percent: 40 },
  { name: 'Assembly', percent: 60 },
  { name: 'Polish', percent: 80 },
  { name: 'Ready', percent: 95 },
  { name: 'Delivered', percent: 100 },
];

const SEED_SETTINGS: WorkshopSettings = {
  name: 'Brighton Furniture Workshop',
  tagline: 'Brighton Solution',
  logoUrl: '',
  address: 'Plot 14, Industrial Area, Sector 5, Indore (M.P.)',
  phone: '9876500000',
  gst: '',
  itemTypes: ['Wardrobe', 'Bed', 'Table', 'Sofa', 'Kitchen', 'Door', 'Custom'],
  woodTypes: ['Sheesham', 'Teak', 'Plywood', 'MDF', 'Mango Wood', 'Pine', 'HDHMR', 'Particle Board'],
  stages: SEED_STAGES,
  expenseCategories: ['Wood / Material', 'Hardware', 'Polish', 'Transport', 'Electricity / Rent', 'Tea & Snacks', 'Tools', 'Other'],
  skills: ['Carpenter', 'Polisher', 'Helper', 'Fitter', 'Designer'],
  billTerms: '50% advance with the order. Balance on delivery. Delivery date may change if the design is changed.',
};

/* ------------------------------ helpers (inlined on purpose) ------------------------------ */

function pad4(n: number) {
  return String(n).padStart(4, '0');
}

function dateAt(offsetDays: number): Date {
  const d = new Date();
  d.setHours(11, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function dateStr(offsetDays: number): string {
  const d = dateAt(offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function msAt(offsetDays: number, hour = 11): number {
  const d = dateAt(offsetDays);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d.getTime();
}

function token(len = 22): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(len);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && c.getRandomValues) c.getRandomValues(arr);
  else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 1e9);
  return Array.from(arr, (x) => chars[x % chars.length]).join('');
}

type Data = Record<string, unknown>;
type Op = { ref: DocumentReference; data: Data; merge: boolean };

/* ------------------------------ demo content ------------------------------ */

const CUSTOMERS: Omit<Customer, 'id' | 'deleted' | 'createdAt'>[] = [
  { name: 'Ramesh Sharma', phone: '9826012345', address: '22, Vijay Nagar, Indore', notes: 'Regular customer - 3rd order' },
  { name: 'Sunita Verma', phone: '9893123456', address: 'B-104, Shalimar Township, Indore', notes: '' },
  { name: 'Amit Patel', phone: '9755234567', address: 'Flat 7, Silicon City, Rau', notes: 'New flat - full interior' },
  { name: 'Priya Singh', phone: '9302345678', address: '45, Saket Nagar, Indore', notes: 'Call after 5 PM' },
  { name: 'Mohd. Irfan', phone: '9425456789', address: 'Khajrana Main Road, Indore', notes: '' },
  { name: 'Neha Gupta', phone: '9171567890', address: '12, Scheme 54, Indore', notes: 'Reference: Ramesh Sharma' },
];

const KARIGARS: Omit<Karigar, 'id' | 'deleted' | 'createdAt'>[] = [
  { name: 'Raju Vishwakarma', phone: '9009011111', skill: 'Carpenter', email: null, uid: null, active: true },
  { name: 'Suresh Kumar', phone: '9009022222', skill: 'Polisher', email: null, uid: null, active: true },
  { name: 'Vikram Singh', phone: '9009033333', skill: 'Fitter', email: null, uid: null, active: true },
  { name: 'Pappu Yadav', phone: '9009044444', skill: 'Helper', email: null, uid: null, active: true },
];

interface OrderSpec {
  c: number;
  item: string;
  title: string;
  qty: number;
  naap: [number | null, number | null, number | null, LengthUnit];
  extra?: [string, string][];
  naapNotes?: string;
  wood: string;
  finish: string;
  hardware: string;
  orderOffset: number;
  deliveryOffset: number;
  priority: Priority;
  stage: number;
  k: number[];
  price: number;
  discount?: number;
  pays: [number, PayMode, number][];
  labour: [number, number, number][];
  notes?: string;
  showPrice?: boolean;
}

const ORDERS: OrderSpec[] = [
  {
    c: 0, item: 'Wardrobe', title: '3 door wardrobe with loft', qty: 1, naap: [7, 6, 2, 'ft'],
    extra: [['Loft height', '2 ft'], ['Shelves', '5 + 2 drawers']], naapNotes: 'Left side mirror shutter',
    wood: 'Sheesham', finish: 'Walnut PU (matt)', hardware: 'Hettich soft-close hinges, Godrej lock',
    orderOffset: -20, deliveryOffset: -2, priority: 'high', stage: 4, k: [0, 1], price: 68000,
    pays: [[25000, 'upi', -20], [15000, 'cash', -6]], labour: [[0, 9000, 5000], [1, 3500, 0]],
  },
  {
    c: 1, item: 'Bed', title: 'King size storage bed', qty: 1, naap: [78, 72, 36, 'inch'],
    extra: [['Headboard', 'Cushioned, 42 inch']], wood: 'Teak', finish: 'Natural teak polish',
    hardware: 'Hydraulic lift (2 pcs)', orderOffset: -15, deliveryOffset: 0, priority: 'normal', stage: 5,
    k: [0, 2], price: 54000, pays: [[20000, 'cash', -15], [20000, 'upi', -3]], labour: [[0, 8000, 8000], [2, 2500, 2500]],
    showPrice: true,
  },
  {
    c: 2, item: 'Kitchen', title: 'L-shape modular kitchen', qty: 1, naap: [10, 2, 2.8, 'ft'],
    extra: [['Short side', '7 ft'], ['Upper cabinets', '2 ft depth 1.2 ft']], naapNotes: 'Leave 3 ft space for the chimney',
    wood: 'Plywood', finish: 'Acrylic gloss white + grey', hardware: 'Hettich channels soft-close, tandem baskets',
    orderOffset: -25, deliveryOffset: 3, priority: 'urgent', stage: 3, k: [0, 2, 3], price: 145000, discount: 5000,
    pays: [[50000, 'bank', -25]], labour: [[0, 15000, 7000], [2, 6000, 0], [3, 3000, 3000]],
    notes: 'Granite by a 3rd party - coordinate the date',
  },
  {
    c: 3, item: 'Sofa', title: 'L-shape 5+2 seater', qty: 1, naap: [8, 6, 2.8, 'ft'],
    wood: 'Sheesham', finish: 'Grey velvet fabric', hardware: 'Steel legs (gold)',
    orderOffset: -10, deliveryOffset: 6, priority: 'normal', stage: 2, k: [0, 3], price: 42000,
    pays: [[15000, 'upi', -10]], labour: [[0, 6000, 0]],
  },
  {
    c: 4, item: 'Door', title: 'Main door with frame', qty: 1, naap: [84, 42, 2.5, 'inch'],
    extra: [['Frame', '5 x 3 inch']], wood: 'Teak', finish: 'Dark walnut melamine',
    hardware: 'Godrej mortise lock, tower bolt', orderOffset: -8, deliveryOffset: 12, priority: 'normal', stage: 1,
    k: [0], price: 38000, pays: [[10000, 'cash', -8]], labour: [],
  },
  {
    c: 5, item: 'Table', title: 'Study table with 2 drawers', qty: 1, naap: [4, 2, 2.5, 'ft'],
    wood: 'Sheesham', finish: 'Honey polish', hardware: 'Telescopic channels', orderOffset: -3, deliveryOffset: 18,
    priority: 'low', stage: 0, k: [], price: 16500, pays: [[5000, 'upi', -3]], labour: [],
  },
  {
    c: 0, item: 'Table', title: 'Dining table 6 seater', qty: 1, naap: [6, 3, 2.5, 'ft'],
    wood: 'Sheesham', finish: 'Natural PU', hardware: '-', orderOffset: -40, deliveryOffset: -12, priority: 'normal',
    stage: 6, k: [0, 1], price: 48000, pays: [[20000, 'cash', -40], [28000, 'upi', -12]],
    labour: [[0, 7000, 7000], [1, 3000, 3000]],
  },
  {
    c: 1, item: 'Custom', title: 'TV unit wall panel', qty: 1, naap: [7, 1.5, 1.5, 'ft'],
    wood: 'MDF', finish: 'Off-white matt laminate', hardware: 'Profile LED, push-to-open',
    orderOffset: -30, deliveryOffset: -5, priority: 'normal', stage: 6, k: [2], price: 22000,
    pays: [[10000, 'cash', -30], [8000, 'upi', -5]], labour: [[2, 3500, 3500]],
  },
  {
    c: 2, item: 'Wardrobe', title: 'Sliding wardrobe (bedroom 2)', qty: 1, naap: [8, 6, 2, 'ft'],
    extra: [['Shutters', '2 sliding, 1 mirror']], wood: 'Plywood', finish: 'Laminate - oak',
    hardware: 'Ebco sliding system', orderOffset: -12, deliveryOffset: -1, priority: 'high', stage: 3, k: [2, 3],
    price: 58000, pays: [[20000, 'bank', -12]], labour: [[2, 7000, 2000]],
  },
  {
    c: 3, item: 'Custom', title: 'Shoe rack', qty: 1, naap: [4, 1.2, 3.5, 'ft'],
    wood: 'MDF', finish: 'White PU', hardware: 'Gas lift flaps', orderOffset: -6, deliveryOffset: 2,
    priority: 'normal', stage: 4, k: [1], price: 9500, pays: [[4000, 'cash', -6]], labour: [[1, 1200, 0]],
  },
  {
    c: 4, item: 'Bed', title: 'Single bed (kids room)', qty: 2, naap: [6.5, 3.5, 1.5, 'ft'],
    wood: 'Mango Wood', finish: 'Teak finish polish', hardware: '-', orderOffset: -18, deliveryOffset: 1,
    priority: 'normal', stage: 5, k: [0], price: 26000, pays: [[13000, 'cash', -18]], labour: [[0, 4000, 2000]],
  },
];

interface StockSpec {
  name: string;
  category: string;
  unit: string;
  qty: number;
  minQty: number;
  rate: number;
}

const STOCK: StockSpec[] = [
  { name: 'Sheesham wood', category: 'Wood', unit: 'cft', qty: 19, minQty: 10, rate: 2800 },
  { name: 'Teak wood', category: 'Wood', unit: 'cft', qty: 4, minQty: 5, rate: 4500 },
  { name: 'Plywood 18mm BWP', category: 'Plywood', unit: 'sheet', qty: 22, minQty: 10, rate: 2600 },
  { name: 'MDF 12mm', category: 'Plywood', unit: 'sheet', qty: 3, minQty: 5, rate: 1350 },
  { name: 'Fevicol SH', category: 'Hardware', unit: 'kg', qty: 12, minQty: 5, rate: 320 },
  { name: 'Soft-close hinges', category: 'Hardware', unit: 'pcs', qty: 38, minQty: 50, rate: 95 },
  { name: 'Telescopic channels 18"', category: 'Hardware', unit: 'set', qty: 8, minQty: 6, rate: 380 },
  { name: 'SS handles 8"', category: 'Hardware', unit: 'pcs', qty: 60, minQty: 20, rate: 140 },
  { name: 'Melamine polish', category: 'Polish', unit: 'ltr', qty: 6, minQty: 4, rate: 420 },
];

// [stockIdx, type, qty, dayOffset, orderIdx | null, note]
const MOVES: [number, 'in' | 'out', number, number, number | null, string][] = [
  [0, 'in', 25, -45, null, 'Purchase - Saharanpur timber'],
  [2, 'in', 30, -32, null, 'Purchase - Century ply dealer'],
  [5, 'in', 50, -40, null, 'Purchase'],
  [8, 'in', 10, -35, null, 'Purchase'],
  [0, 'out', 6, -18, 0, 'For the wardrobe'],
  [2, 'out', 8, -20, 2, 'Kitchen cabinets'],
  [1, 'out', 3, -13, 1, 'Bed frame'],
  [5, 'out', 12, -5, 0, ''],
  [6, 'out', 4, -4, 2, 'Kitchen drawers'],
  [3, 'out', 2, -25, 7, 'TV unit panel'],
  [8, 'out', 2, -3, 0, 'Polish coat'],
];

// [dayOffset, categoryIdx, amount, note]
const EXPENSES: [number, number, number, string][] = [
  [-80, 0, 32000, 'Sheesham 12 cft'],
  [-75, 4, 6500, 'Workshop rent + electricity'],
  [-70, 3, 1800, 'Tempo - Vijay Nagar delivery'],
  [-62, 1, 4200, 'Hinges, channels'],
  [-55, 5, 900, 'Tea & snacks (month)'],
  [-45, 0, 70000, 'Sheesham 25 cft'],
  [-44, 4, 6500, 'Workshop rent + electricity'],
  [-40, 1, 4750, 'Hinges 50 pcs'],
  [-35, 2, 4200, 'Melamine polish 10 ltr'],
  [-32, 0, 78000, 'Plywood 18mm 30 sheets'],
  [-20, 6, 3500, 'Router bits + blade'],
  [-14, 4, 6500, 'Workshop rent + electricity'],
  [-12, 3, 1500, 'Tempo - Rau site'],
  [-6, 5, 850, 'Tea & snacks'],
  [-2, 7, 1200, 'Cleaning + misc'],
];

/* ------------------------------ seeder ------------------------------ */

export async function seedDemoData(db: Firestore, opts?: { by?: string }): Promise<SeedResult> {
  const by = opts?.by || 'Demo';
  const ops: Op[] = [];
  const put = (ref: DocumentReference, data: Data, merge = false) => ops.push({ ref, data, merge });

  // Settings: create defaults only if missing
  const settingsRef = doc(db, 'settings', 'workshop');
  const sSnap = await getDoc(settingsRef);
  let settings: WorkshopSettings = SEED_SETTINGS;
  if (!sSnap.exists() || !(sSnap.data() as Partial<WorkshopSettings>).name) {
    put(settingsRef, { ...SEED_SETTINGS, updatedAt: Date.now() }, true);
  } else {
    settings = { ...SEED_SETTINGS, ...(sSnap.data() as Partial<WorkshopSettings>) };
  }
  const stages = settings.stages && settings.stages.length >= 2 ? settings.stages : SEED_STAGES;
  const lastIdx = stages.length - 1;
  const mapStage = (i: number) => {
    // demo specs use the 7 default stages; map proportionally if stages were customised
    if (i >= SEED_STAGES.length - 1) return lastIdx;
    if (i === SEED_STAGES.length - 2) return Math.max(0, lastIdx - 1);
    return Math.min(i, Math.max(0, lastIdx - 2));
  };

  // Counters - continue after existing numbers
  const ocRef = doc(db, 'counters', 'orders');
  const rcRef = doc(db, 'counters', 'receipts');
  const [ocSnap, rcSnap] = await Promise.all([getDoc(ocRef), getDoc(rcRef)]);
  let orderN = (ocSnap.exists() ? Number(ocSnap.data().next) : 1) || 1;
  let receiptN = (rcSnap.exists() ? Number(rcSnap.data().next) : 1) || 1;

  // Customers
  const customers: Customer[] = CUSTOMERS.map((c, i) => {
    const ref = doc(collection(db, 'customers'));
    const data: Omit<Customer, 'id'> = { ...c, deleted: false, createdAt: msAt(-90 + i * 4) };
    put(ref, { ...data, demo: true });
    return { ...data, id: ref.id };
  });

  // Karigars
  const karigars: Karigar[] = KARIGARS.map((k, i) => {
    const ref = doc(collection(db, 'karigars'));
    const data: Omit<Karigar, 'id'> = { ...k, deleted: false, createdAt: msAt(-120 + i) };
    put(ref, { ...data, demo: true });
    return { ...data, id: ref.id };
  });

  // Orders + finance + status + payments + labour
  const orderIds: string[] = [];
  const orderNos: string[] = [];
  let paymentCount = 0;
  let labourCount = 0;
  const now = Date.now();

  ORDERS.forEach((s) => {
    const cust = customers[s.c];
    const orderRef = doc(collection(db, 'orders'));
    const id = orderRef.id;
    const no = `WB-${pad4(orderN++)}`;
    orderIds.push(id);
    orderNos.push(no);
    const stageIndex = mapStage(s.stage);
    const st = stages[stageIndex];
    const created = msAt(s.orderOffset, 10);
    const delivered = stageIndex >= lastIdx;
    const endMs = delivered ? msAt(s.deliveryOffset, 17) : Math.min(now, Math.max(created + 3600_000, now - 2 * 3600_000));
    const history = Array.from({ length: stageIndex + 1 }, (_, i) => ({
      stage: stages[i].name,
      index: i,
      at: stageIndex === 0 ? created : Math.round(created + ((endMs - created) * i) / stageIndex),
      by,
    }));
    const statusToken = token(22);

    const order: Omit<Order, 'id'> = {
      orderNo: no,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerAddress: cust.address || '',
      itemType: s.item,
      title: s.title,
      quantity: s.qty,
      naap: {
        unit: s.naap[3],
        l: s.naap[0],
        w: s.naap[1],
        h: s.naap[2],
        extra: (s.extra || []).map(([label, value]) => ({ label, value })),
        notes: s.naapNotes || '',
      },
      designPhotos: [],
      progressPhotos: [],
      refLink: '',
      wood: s.wood,
      finish: s.finish,
      hardware: s.hardware,
      orderDate: dateStr(s.orderOffset),
      deliveryDate: dateStr(s.deliveryOffset),
      priority: s.priority,
      stage: st.name,
      stageIndex,
      progress: st.percent,
      stageHistory: history,
      karigarIds: s.k.map((i) => karigars[i].id),
      statusToken,
      showPriceOnStatus: !!s.showPrice,
      notes: s.notes || '',
      deliveredAt: delivered ? endMs : null,
      deleted: false,
      createdAt: created,
      updatedAt: endMs,
    };
    put(orderRef, { ...order, demo: true });

    const discount = s.discount || 0;
    const paid = s.pays.reduce((a, p) => a + p[0], 0);
    const fin: Finance = {
      id,
      orderId: id,
      orderNo: no,
      customerId: cust.id,
      customerName: cust.name,
      price: s.price,
      discount,
      paid,
      balance: s.price - discount - paid,
      deleted: false,
      createdAt: created,
    };
    put(doc(db, 'finance', id), { ...fin, demo: true });

    const show = !!s.showPrice;
    const status: StatusDoc = {
      orderId: id,
      orderNo: no,
      customerName: cust.name,
      itemType: s.item,
      title: s.title,
      quantity: s.qty,
      stage: st.name,
      stageIndex,
      progress: st.percent,
      stages,
      deliveryDate: order.deliveryDate,
      photos: [],
      karigarIds: order.karigarIds,
      workshopName: settings.name,
      workshopPhone: settings.phone || '',
      logoUrl: settings.logoUrl || '',
      showPrice: show,
      price: show ? s.price - discount : null,
      paid: show ? paid : null,
      balance: show ? fin.balance : null,
      updatedAt: endMs,
    };
    put(doc(db, 'status', statusToken), { ...status, demo: true });

    s.pays.forEach(([amount, mode, off], i) => {
      const p: Omit<Payment, 'id'> = {
        receiptNo: `RC-${pad4(receiptN++)}`,
        orderId: id,
        orderNo: no,
        customerId: cust.id,
        customerName: cust.name,
        amount,
        mode,
        type: i === 0 ? 'advance' : 'instalment',
        date: dateStr(off),
        note: i === 0 ? 'Advance' : mode === 'upi' ? 'UPI received' : '',
        deleted: false,
        createdAt: msAt(off, 12 + i),
      };
      put(doc(collection(db, 'payments')), { ...p, demo: true });
      paymentCount++;
    });

    s.labour.forEach(([ki, amount, lpaid]) => {
      const k = karigars[ki];
      const l: Omit<Labour, 'id'> = {
        karigarId: k.id,
        karigarName: k.name,
        orderId: id,
        orderNo: no,
        itemType: s.item,
        amount,
        paid: lpaid,
        note: '',
        deleted: false,
        createdAt: created + 3600_000,
      };
      put(doc(collection(db, 'labour')), { ...l, demo: true });
      labourCount++;
    });
  });

  // Stock
  const stockIds: string[] = STOCK.map((s, i) => {
    const ref = doc(collection(db, 'stock'));
    const data: Omit<StockItem, 'id'> = { ...s, deleted: false, createdAt: msAt(-100 + i) };
    put(ref, { ...data, demo: true });
    return ref.id;
  });

  MOVES.forEach(([si, type, qty, off, oi, note]) => {
    const s = STOCK[si];
    const m: Omit<StockMove, 'id'> = {
      itemId: stockIds[si],
      itemName: s.name,
      unit: s.unit,
      type,
      qty,
      orderId: oi === null ? null : orderIds[oi],
      orderNo: oi === null ? null : orderNos[oi],
      date: dateStr(off),
      note,
      createdAt: msAt(off, 15),
    };
    put(doc(collection(db, 'stockMoves')), { ...m, demo: true });
  });

  // Expenses
  const cats = settings.expenseCategories?.length ? settings.expenseCategories : SEED_SETTINGS.expenseCategories;
  EXPENSES.forEach(([off, ci, amount, note]) => {
    const e: Omit<Expense, 'id'> = {
      date: dateStr(off),
      category: cats[ci] || cats[cats.length - 1] || 'Other',
      amount,
      note,
      deleted: false,
      createdAt: msAt(off, 18),
    };
    put(doc(collection(db, 'expenses')), { ...e, demo: true });
  });

  put(ocRef, { next: orderN }, true);
  put(rcRef, { next: receiptN }, true);

  // Commit in chunks (Firestore batch limit is 500 ops)
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    for (const o of ops.slice(i, i + 400)) {
      if (o.merge) b.set(o.ref, o.data, { merge: true });
      else b.set(o.ref, o.data);
    }
    await b.commit();
  }

  return {
    customers: customers.length,
    karigars: karigars.length,
    orders: ORDERS.length,
    payments: paymentCount,
    labour: labourCount,
    stock: STOCK.length,
    stockMoves: MOVES.length,
    expenses: EXPENSES.length,
  };
}

/**
 * Permanently delete every document created by seedDemoData (marked `demo: true`).
 * Status mirrors are removed via the demo orders' tokens (status docs cannot be listed).
 */
export async function removeDemoData(db: Firestore): Promise<number> {
  const cols = ['orders', 'finance', 'payments', 'labour', 'customers', 'karigars', 'stock', 'stockMoves', 'expenses'];
  const refs: DocumentReference[] = [];
  for (const c of cols) {
    const snap = await getDocs(query(collection(db, c), where('demo', '==', true)));
    snap.docs.forEach((d) => {
      refs.push(d.ref);
      if (c === 'orders') {
        const t = (d.data() as { statusToken?: string }).statusToken;
        if (t) refs.push(doc(db, 'status', t));
      }
    });
  }
  for (let i = 0; i < refs.length; i += 400) {
    const b = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => b.delete(r));
    await b.commit();
  }
  return refs.length;
}
