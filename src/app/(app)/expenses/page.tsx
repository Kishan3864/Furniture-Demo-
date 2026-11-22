'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { useData } from '@/lib/data';
import { saveExpense, softDelete } from '@/lib/actions';
import { expenseSchema, validate } from '@/lib/schemas';
import type { Expense } from '@/lib/types';
import { cn, downloadCSV, errMsg, fmtDate, money, todayStr } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  SearchInput,
  Select,
  Textarea,
  useConfirm,
  type Column,
} from '@/components/ui';

export default function ExpensesPage() {
  const { loading, expenses } = useData();
  const confirm = useConfirm();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [allTime, setAllTime] = useState(false);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; item: Expense | null }>({ open: false, item: null });

  const inPeriod = useMemo(
    () => expenses.filter((e) => allTime || !month || (e.date || '').startsWith(month)),
    [expenses, allTime, month],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return inPeriod.filter((e) => {
      if (cat && e.category !== cat) return false;
      return !s || e.category.toLowerCase().includes(s) || (e.note || '').toLowerCase().includes(s);
    });
  }, [inPeriod, cat, q]);

  const total = filtered.reduce((a, e) => a + (e.amount || 0), 0);

  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of inPeriod) m[e.category] = (m[e.category] || 0) + (e.amount || 0);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [inPeriod]);
  const periodTotal = byCat.reduce((a, [, v]) => a + v, 0);

  const onDelete = async (e: Expense) => {
    const ok = await confirm({
      title: 'Kharcha delete karein?',
      message: `${fmtDate(e.date)} · ${e.category} · ${money(e.amount)}`,
      danger: true,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await softDelete('expenses', e.id);
      toast.success('Kharcha delete ho gaya');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const exportCSV = () => {
    downloadCSV(`kharcha-${allTime ? 'all' : month}.csv`, [
      ['Date', 'Category', 'Amount', 'Note'],
      ...filtered.map((e) => [e.date, e.category, e.amount, e.note || '']),
      [],
      ['Total', '', total, ''],
    ]);
  };

  const columns: Column<Expense>[] = [
    {
      key: 'cat',
      header: 'Category',
      cell: (e) => (
        <div className="flex items-center justify-between gap-2">
          <Badge tone="wood">{e.category}</Badge>
          <span className="font-bold text-wood-950 md:hidden">{money(e.amount)}</span>
        </div>
      ),
    },
    { key: 'date', header: 'Date', cell: (e) => fmtDate(e.date) },
    { key: 'amount', header: 'Amount', align: 'right', hideOnMobile: true, cell: (e) => <span className="font-semibold">{money(e.amount)}</span> },
    { key: 'note', header: 'Note', cell: (e) => <span className="text-wood-700">{e.note || '-'}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (e) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setModal({ open: true, item: e })}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(e)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Kharcha (Expenses)"
        subtitle="Workshop ke rozana kharche"
        actions={
          <>
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportCSV} disabled={!filtered.length}>
              CSV
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({ open: true, item: null })}>
              Kharcha jodein
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setAllTime(false);
          }}
          disabled={allTime}
          className="w-auto"
        />
        <Button variant={allTime ? 'primary' : 'outline'} onClick={() => setAllTime((v) => !v)}>
          Sab
        </Button>
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-wood-600">{allTime ? 'Kul kharcha' : 'Is period ka kharcha'}</p>
            <p className="text-2xl font-bold text-wood-950">{money(periodTotal)}</p>
          </div>
          {cat && (
            <p className="text-sm text-wood-700">
              {cat}: <b>{money(total)}</b>
            </p>
          )}
        </div>
        {byCat.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCat('')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                !cat ? 'bg-wood-700 text-white' : 'bg-wood-100 text-wood-800 hover:bg-wood-200',
              )}
            >
              Sab
            </button>
            {byCat.map(([c, v]) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(cat === c ? '' : c)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  cat === c ? 'bg-wood-700 text-white' : 'bg-wood-100 text-wood-800 hover:bg-wood-200',
                )}
              >
                {c} · {money(v)}
              </button>
            ))}
          </div>
        )}
      </Card>

      <SearchInput value={q} onChange={setQ} placeholder="Note ya category dhoondein..." className="mb-4" />

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(e) => e.id}
        empty={
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Koi kharcha nahi"
            description={allTime ? 'Pehla kharcha jodein' : 'Is mahine koi kharcha nahi - "Sab" dabakar purane dekhein'}
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({ open: true, item: null })}>
                Kharcha jodein
              </Button>
            }
          />
        }
      />

      <ExpenseModal open={modal.open} item={modal.item} onClose={() => setModal({ open: false, item: null })} />
    </div>
  );
}

function ExpenseModal({ open, item, onClose }: { open: boolean; item: Expense | null; onClose: () => void }) {
  const { settings } = useData();
  const [f, setF] = useState({ date: todayStr(), category: '', amount: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({
        date: item?.date || todayStr(),
        category: item?.category || '',
        amount: item ? String(item.amount) : '',
        note: item?.note || '',
      });
      setErrors({});
    }
  }, [open, item]);

  const cats = settings.expenseCategories || [];
  const options = f.category && !cats.includes(f.category) ? [...cats, f.category] : cats;

  const save = async () => {
    const v = validate(expenseSchema, f);
    if (!v.ok) return setErrors(v.errors);
    setSaving(true);
    try {
      await saveExpense(v.data, item?.id);
      toast.success(item ? 'Kharcha update ho gaya' : 'Kharcha jud gaya');
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Kharcha edit' : 'Naya kharcha'}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required error={errors.date}>
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} invalid={!!errors.date} />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount}>
            <Input
              type="number"
              inputMode="decimal"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
              invalid={!!errors.amount}
              autoFocus
            />
          </Field>
        </div>
        <Field label="Category" required error={errors.category}>
          <Select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            invalid={!!errors.category}
            placeholder="Category chunein"
            options={options}
          />
        </Field>
        <Field label="Note">
          <Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Kya liya, kisko diya..." />
        </Field>
      </div>
    </Modal>
  );
}
