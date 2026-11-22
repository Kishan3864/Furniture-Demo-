'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, doc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { DEFAULT_SETTINGS } from './defaults';
import type {
  Customer,
  Expense,
  Finance,
  Karigar,
  Labour,
  Order,
  Payment,
  Site,
  StockItem,
  StockMove,
  WorkshopSettings,
} from './types';

export interface DataState {
  loading: boolean;
  settings: WorkshopSettings;
  customers: Customer[];
  orders: Order[];
  /** finance keyed by order id (owner only) */
  finance: Record<string, Finance>;
  payments: Payment[];
  karigars: Karigar[];
  labour: Labour[];
  stock: StockItem[];
  stockMoves: StockMove[];
  expenses: Expense[];
  /** site visits (owner only) */
  sites: Site[];
  /** lookups */
  customerById: Record<string, Customer>;
  orderById: Record<string, Order>;
  karigarById: Record<string, Karigar>;
  stockById: Record<string, StockItem>;
}

const empty: DataState = {
  loading: true,
  settings: DEFAULT_SETTINGS,
  customers: [],
  orders: [],
  finance: {},
  payments: [],
  karigars: [],
  labour: [],
  stock: [],
  stockMoves: [],
  expenses: [],
  sites: [],
  customerById: {},
  orderById: {},
  karigarById: {},
  stockById: {},
};

const Ctx = createContext<DataState>(empty);

type Raw = {
  settings: WorkshopSettings;
  customers: Customer[];
  orders: Order[];
  finance: Finance[];
  payments: Payment[];
  karigars: Karigar[];
  labour: Labour[];
  stock: StockItem[];
  stockMoves: StockMove[];
  expenses: Expense[];
  sites: Site[];
};

const initialRaw: Raw = {
  settings: DEFAULT_SETTINGS,
  customers: [],
  orders: [],
  finance: [],
  payments: [],
  karigars: [],
  labour: [],
  stock: [],
  stockMoves: [],
  expenses: [],
  sites: [],
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isOwner, isKarigar } = useAuth();
  const [raw, setRaw] = useState<Raw>(initialRaw);
  const [pending, setPending] = useState<Set<string>>(new Set(['init']));

  useEffect(() => {
    if (!user || (!isOwner && !isKarigar)) {
      setRaw(initialRaw);
      setPending(new Set(['init']));
      return;
    }
    const d = db();
    const unsubs: Unsubscribe[] = [];
    const keys: (keyof Raw)[] = isOwner
      ? ['settings', 'customers', 'orders', 'finance', 'payments', 'karigars', 'labour', 'stock', 'stockMoves', 'expenses', 'sites']
      : ['settings', 'orders'];
    setPending(new Set(keys));
    const done = (k: string) =>
      setPending((p) => {
        if (!p.has(k)) return p;
        const n = new Set(p);
        n.delete(k);
        return n;
      });

    unsubs.push(
      onSnapshot(
        doc(d, 'settings', 'workshop'),
        (s) => {
          setRaw((r) => ({
            ...r,
            settings: s.exists() ? { ...DEFAULT_SETTINGS, ...(s.data() as Partial<WorkshopSettings>) } : DEFAULT_SETTINGS,
          }));
          done('settings');
        },
        () => done('settings'),
      ),
    );

    const listen = <K extends Exclude<keyof Raw, 'settings'>>(key: K, q: ReturnType<typeof query> | ReturnType<typeof collection>) => {
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            const items = snap.docs
              .map((x) => ({ ...(x.data() as object), id: x.id }))
              .filter((x) => !(x as { deleted?: boolean }).deleted) as Raw[K];
            setRaw((r) => ({ ...r, [key]: items }));
            done(key);
          },
          (err) => {
            console.warn(`listen ${key} failed`, err);
            done(key);
          },
        ),
      );
    };

    if (isOwner) {
      listen('customers', collection(d, 'customers'));
      listen('orders', collection(d, 'orders'));
      listen('finance', collection(d, 'finance'));
      listen('payments', collection(d, 'payments'));
      listen('karigars', collection(d, 'karigars'));
      listen('labour', collection(d, 'labour'));
      listen('stock', collection(d, 'stock'));
      listen('stockMoves', collection(d, 'stockMoves'));
      listen('expenses', collection(d, 'expenses'));
      listen('sites', collection(d, 'sites'));
    } else if (user.karigarId) {
      listen('orders', query(collection(d, 'orders'), where('karigarIds', 'array-contains', user.karigarId)));
    } else {
      done('orders');
    }
    return () => unsubs.forEach((u) => u());
  }, [user, isOwner, isKarigar]);

  const value = useMemo<DataState>(() => {
    const byId = <T extends { id: string }>(arr: T[]) => Object.fromEntries(arr.map((x) => [x.id, x])) as Record<string, T>;
    const sortDesc = <T extends { createdAt: number }>(arr: T[]) => [...arr].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return {
      loading: pending.size > 0,
      settings: raw.settings,
      customers: [...raw.customers].sort((a, b) => a.name.localeCompare(b.name)),
      orders: sortDesc(raw.orders),
      finance: Object.fromEntries(raw.finance.map((f) => [f.orderId || f.id, f])),
      payments: [...raw.payments].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt),
      karigars: [...raw.karigars].sort((a, b) => a.name.localeCompare(b.name)),
      labour: sortDesc(raw.labour),
      stock: [...raw.stock].sort((a, b) => a.name.localeCompare(b.name)),
      stockMoves: [...raw.stockMoves].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt),
      expenses: [...raw.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt),
      sites: [...raw.sites].sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || '') || b.createdAt - a.createdAt),
      customerById: byId(raw.customers),
      orderById: byId(raw.orders),
      karigarById: byId(raw.karigars),
      stockById: byId(raw.stock),
    };
  }, [raw, pending]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useData = () => useContext(Ctx);
