'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useData } from '@/lib/data';
import { deleteStockMove, moveStock, saveStockItem, softDelete } from '@/lib/actions';
import { STOCK_CATEGORIES, STOCK_UNITS } from '@/lib/defaults';
import { stockItemSchema, stockMoveSchema, validate } from '@/lib/schemas';
import type { StockItem, StockMove } from '@/lib/types';
import { errMsg, fmtDate, money, num, todayStr } from '@/lib/utils';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  SearchInput,
  Segmented,
  Select,
  Textarea,
  useConfirm,
  type Column,
} from '@/components/ui';

type Tab = 'items' | 'history';

const isLow = (s: StockItem) => (s.minQty || 0) > 0 && (s.qty || 0) <= (s.minQty || 0);

export default function StockPage() {
  const { loading, stock, stockMoves } = useData();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('items');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [itemModal, setItemModal] = useState<{ open: boolean; item: StockItem | null }>({ open: false, item: null });
  const [moveModal, setMoveModal] = useState<{ item: StockItem | null; type: 'in' | 'out' } | null>(null);
  const [histItem, setHistItem] = useState('');

  const low = useMemo(() => stock.filter(isLow), [stock]);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return stock.filter((x) => {
      if (cat && x.category !== cat) return false;
      if (onlyLow && !isLow(x)) return false;
      return !s || x.name.toLowerCase().includes(s) || x.category.toLowerCase().includes(s);
    });
  }, [stock, q, cat, onlyLow]);

  const moves = useMemo(() => {
    const s = q.trim().toLowerCase();
    return stockMoves.filter((m) => {
      if (histItem && m.itemId !== histItem) return false;
      return !s || m.itemName.toLowerCase().includes(s) || (m.orderNo || '').toLowerCase().includes(s) || (m.note || '').toLowerCase().includes(s);
    });
  }, [stockMoves, q, histItem]);

  const stockValue = useMemo(() => stock.reduce((a, s) => a + (s.qty || 0) * (s.rate || 0), 0), [stock]);

  const onDeleteItem = async (s: StockItem) => {
    const ok = await confirm({ title: 'Item delete karein?', message: `"${s.name}" stock list se hat jayega.`, danger: true, confirmText: 'Delete' });
    if (!ok) return;
    try {
      await softDelete('stock', s.id);
      toast.success('Item delete ho gaya');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const onDeleteMove = async (m: StockMove) => {
    const ok = await confirm({
      title: 'Entry delete karein?',
      message: `${m.type === 'in' ? 'Stock In' : 'Stock Out'} ${num(m.qty)} ${m.unit} (${m.itemName}) hatayi jayegi aur stock qty wapas adjust hogi.`,
      danger: true,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteStockMove(m.id, m);
      toast.success('Entry delete ho gayi');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const itemColumns: Column<StockItem>[] = [
    {
      key: 'name',
      header: 'Naam',
      cell: (s) => (
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{s.name}</span>
          {isLow(s) && <Badge tone="red">Kam stock</Badge>}
        </div>
      ),
    },
    { key: 'cat', header: 'Category', cell: (s) => <Badge tone="wood">{s.category}</Badge> },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      cell: (s) => (
        <span className={isLow(s) ? 'font-bold text-red-600' : 'font-semibold'}>
          {num(s.qty)} {s.unit}
        </span>
      ),
    },
    { key: 'min', header: 'Min', align: 'right', cell: (s) => <span className="text-wood-600">{num(s.minQty)} {s.unit}</span> },
    { key: 'rate', header: 'Rate', align: 'right', hideOnMobile: true, cell: (s) => (s.rate ? `${money(s.rate)}/${s.unit}` : '-') },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (s) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="success" icon={<ArrowDownToLine className="h-4 w-4" />} onClick={() => setMoveModal({ item: s, type: 'in' })}>
            In
          </Button>
          <Button size="sm" variant="secondary" icon={<ArrowUpFromLine className="h-4 w-4" />} onClick={() => setMoveModal({ item: s, type: 'out' })}>
            Out
          </Button>
          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setItemModal({ open: true, item: s })}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete" className="text-red-600 hover:bg-red-50" onClick={() => onDeleteItem(s)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const moveColumns: Column<StockMove>[] = [
    {
      key: 'item',
      header: 'Item',
      cell: (m) => (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{m.itemName}</span>
          <span className={m.type === 'in' ? 'font-bold text-emerald-700 md:hidden' : 'font-bold text-red-600 md:hidden'}>
            {m.type === 'in' ? '+' : '-'}
            {num(m.qty)} {m.unit}
          </span>
        </div>
      ),
    },
    { key: 'date', header: 'Date', cell: (m) => fmtDate(m.date) },
    { key: 'type', header: 'Type', cell: (m) => (m.type === 'in' ? <Badge tone="green">Stock In</Badge> : <Badge tone="red">Stock Out</Badge>) },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      hideOnMobile: true,
      cell: (m) => (
        <span className={m.type === 'in' ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
          {m.type === 'in' ? '+' : '-'}
          {num(m.qty)} {m.unit}
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      cell: (m) =>
        m.orderId ? (
          <Link href={`/orders/${m.orderId}`} className="font-medium text-wood-700 underline">
            {m.orderNo}
          </Link>
        ) : (
          <span className="text-wood-400">-</span>
        ),
    },
    { key: 'note', header: 'Note', cell: (m) => <span className="text-wood-700">{m.note || '-'}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (m) => (
        <Button size="icon" variant="ghost" aria-label="Delete" className="text-red-600 hover:bg-red-50" onClick={() => onDeleteMove(m)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle={`${stock.length} items${stockValue > 0 ? ` · Value approx ${money(stockValue)}` : ''}`}
        actions={
          <>
            <Button variant="outline" icon={<ArrowUpFromLine className="h-4 w-4" />} onClick={() => setMoveModal({ item: null, type: 'out' })} disabled={!stock.length}>
              Material use
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setItemModal({ open: true, item: null })}>
              Naya Item
            </Button>
          </>
        }
      />

      {low.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setTab('items');
            setOnlyLow(true);
          }}
          className="mb-4 flex w-full items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <b>{low.length} item ka stock kam hai:</b> {low.slice(0, 5).map((s) => `${s.name} (${num(s.qty)} ${s.unit})`).join(', ')}
            {low.length > 5 ? '...' : ''}
          </span>
        </button>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: 'items', label: 'Items' },
          { value: 'history', label: 'In-Out history' },
        ]}
      />

      {tab === 'items' ? (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Item dhoondein..." className="flex-1" />
            <div className="flex gap-2">
              <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto" options={[{ value: '', label: 'Sab category' }, ...STOCK_CATEGORIES]} />
              <Button variant={onlyLow ? 'danger' : 'outline'} onClick={() => setOnlyLow((v) => !v)}>
                Kam stock
              </Button>
            </div>
          </div>
          <DataTable
            rows={items}
            columns={itemColumns}
            rowKey={(s) => s.id}
            rowClassName={(s) => (isLow(s) ? 'bg-red-50/40' : undefined)}
            empty={
              <EmptyState
                icon={<Boxes className="h-6 w-6" />}
                title={stock.length ? 'Koi item nahi mila' : 'Stock khali hai'}
                description={stock.length ? 'Search ya filter badlein' : 'Lakdi, ply, hardware jaise items jodein'}
                action={
                  !stock.length && (
                    <Button icon={<Plus className="h-4 w-4" />} onClick={() => setItemModal({ open: true, item: null })}>
                      Naya Item
                    </Button>
                  )
                }
              />
            }
          />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Item, order no ya note..." className="flex-1" />
            <Select
              value={histItem}
              onChange={(e) => setHistItem(e.target.value)}
              className="sm:w-56"
              options={[{ value: '', label: 'Sab items' }, ...stock.map((s) => ({ value: s.id, label: s.name }))]}
            />
          </div>
          <DataTable
            rows={moves}
            columns={moveColumns}
            rowKey={(m) => m.id}
            empty={<EmptyState icon={<Boxes className="h-6 w-6" />} title="Koi in/out entry nahi" />}
          />
        </>
      )}

      <ItemModal open={itemModal.open} item={itemModal.item} onClose={() => setItemModal({ open: false, item: null })} />
      <MoveModal state={moveModal} onClose={() => setMoveModal(null)} />
    </div>
  );
}

/* ------------------------------ Item modal ------------------------------ */

function ItemModal({ open, item, onClose }: { open: boolean; item: StockItem | null; onClose: () => void }) {
  const [f, setF] = useState({ name: '', category: 'Lakdi', unit: 'pcs', qty: '0', minQty: '0', rate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({
        name: item?.name || '',
        category: item?.category || 'Lakdi',
        unit: item?.unit || 'pcs',
        qty: item ? String(item.qty) : '0',
        minQty: item ? String(item.minQty || 0) : '0',
        rate: item?.rate ? String(item.rate) : '',
      });
      setErrors({});
    }
  }, [open, item]);

  const save = async () => {
    const v = validate(stockItemSchema, { ...f, rate: f.rate === '' ? 0 : f.rate });
    if (!v.ok) return setErrors(v.errors);
    setSaving(true);
    try {
      await saveStockItem(v.data, item?.id);
      toast.success(item ? 'Item update ho gaya' : 'Item jud gaya');
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const units = STOCK_UNITS.includes(f.unit) ? STOCK_UNITS : [...STOCK_UNITS, f.unit];
  const cats = STOCK_CATEGORIES.includes(f.category) ? STOCK_CATEGORIES : [...STOCK_CATEGORIES, f.category];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Item edit' : 'Naya stock item'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Naam" required error={errors.name}>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} placeholder="Sheesham patti 2x1, 18mm Ply..." autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required error={errors.category}>
            <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={cats} />
          </Field>
          <Field label="Unit" required error={errors.unit}>
            <Select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} options={units} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Abhi qty" error={errors.qty} hint={item ? 'In/Out se badlein' : undefined}>
            <Input type="number" inputMode="decimal" value={f.qty} disabled={!!item} onChange={(e) => setF({ ...f, qty: e.target.value })} invalid={!!errors.qty} />
          </Field>
          <Field label="Min qty" error={errors.minQty} hint="Alert ke liye">
            <Input type="number" inputMode="decimal" value={f.minQty} onChange={(e) => setF({ ...f, minQty: e.target.value })} invalid={!!errors.minQty} />
          </Field>
          <Field label="Rate (₹)" error={errors.rate}>
            <Input type="number" inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} placeholder="Optional" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------ Move modal ------------------------------ */

function MoveModal({ state, onClose }: { state: { item: StockItem | null; type: 'in' | 'out' } | null; onClose: () => void }) {
  const { stock, stockById, orders, orderById, settings } = useData();
  const [f, setF] = useState({ itemId: '', type: 'in' as 'in' | 'out', qty: '', orderId: '', date: todayStr(), note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state) {
      setF({ itemId: state.item?.id || '', type: state.type, qty: '', orderId: '', date: todayStr(), note: '' });
      setErrors({});
    }
  }, [state]);

  const item = f.itemId ? stockById[f.itemId] : undefined;
  const lastIdx = settings.stages.length - 1;
  const orderOptions = useMemo(
    () =>
      [...orders]
        .sort((a, b) => Number(a.stageIndex >= lastIdx) - Number(b.stageIndex >= lastIdx))
        .map((o) => ({ value: o.id, label: `${o.orderNo} · ${o.itemType} · ${o.customerName}` })),
    [orders, lastIdx],
  );

  const save = async () => {
    const v = validate(stockMoveSchema, f);
    if (!v.ok) return setErrors(v.errors);
    const it = stockById[v.data.itemId];
    if (!it) return setErrors({ itemId: 'Item nahi mila' });
    if (v.data.type === 'out' && v.data.qty > (it.qty || 0)) {
      return setErrors({ qty: `Sirf ${num(it.qty)} ${it.unit} bacha hai` });
    }
    setSaving(true);
    try {
      await moveStock(v.data, it, v.data.type === 'out' && v.data.orderId ? orderById[v.data.orderId] : null);
      toast.success(`${v.data.type === 'in' ? 'Stock In' : 'Stock Out'}: ${num(v.data.qty)} ${it.unit} ${it.name}`);
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={f.type === 'in' ? 'Stock In (maal aaya)' : 'Stock Out (maal use hua)'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={f.type === 'in' ? 'success' : 'primary'} onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Segmented
          value={f.type}
          onChange={(v) => setF({ ...f, type: v })}
          options={[
            { value: 'in', label: 'Stock In' },
            { value: 'out', label: 'Stock Out' },
          ]}
        />
        <Field label="Item" required error={errors.itemId}>
          <Select
            value={f.itemId}
            onChange={(e) => setF({ ...f, itemId: e.target.value })}
            invalid={!!errors.itemId}
            placeholder="Item chunein"
            options={stock.map((s) => ({ value: s.id, label: `${s.name} (${num(s.qty)} ${s.unit})` }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Qty${item ? ` (${item.unit})` : ''}`} required error={errors.qty}>
            <Input type="number" inputMode="decimal" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} invalid={!!errors.qty} autoFocus />
          </Field>
          <Field label="Date" required error={errors.date}>
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
        </div>
        {item && (
          <p className="text-xs text-wood-600">
            Abhi: <b>{num(item.qty)} {item.unit}</b>
            {f.qty && !Number.isNaN(Number(f.qty)) && (
              <>
                {' '}
                → baad mein{' '}
                <b>
                  {num(f.type === 'in' ? item.qty + Number(f.qty) : item.qty - Number(f.qty))} {item.unit}
                </b>
              </>
            )}
          </p>
        )}
        {f.type === 'out' && (
          <Field label="Kis order mein use hua?" hint="Material used per order - optional">
            <Select value={f.orderId} onChange={(e) => setF({ ...f, orderId: e.target.value })} placeholder="Koi order nahi" options={orderOptions} />
          </Field>
        )}
        <Field label="Note">
          <Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={f.type === 'in' ? 'Supplier, bill no...' : 'Kis kaam mein...'} />
        </Field>
      </div>
    </Modal>
  );
}
