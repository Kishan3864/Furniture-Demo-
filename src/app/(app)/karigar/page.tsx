'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Plus, Wrench } from 'lucide-react';
import { useData } from '@/lib/data';
import { money } from '@/lib/utils';
import type { Karigar } from '@/lib/types';
import { Badge, Button, DataTable, EmptyState, PageHeader, PageLoader, SearchInput, StatCard, Toggle, type Column } from '@/components/ui';
import { KarigarModal } from './karigar-modal';

interface Row extends Karigar {
  activeJobs: number;
  labour: number;
  paid: number;
  due: number;
}

export default function KarigarListPage() {
  const { loading, karigars, orders, labour, settings } = useData();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);

  const lastIdx = settings.stages.length - 1;

  const rows = useMemo<Row[]>(() => {
    return karigars.map((k) => {
      const activeJobs = orders.filter((o) => o.stageIndex < lastIdx && (o.karigarIds || []).includes(k.id)).length;
      const mine = labour.filter((l) => l.karigarId === k.id);
      const total = mine.reduce((a, l) => a + (l.amount || 0), 0);
      const paid = mine.reduce((a, l) => a + (l.paid || 0), 0);
      return { ...k, activeJobs, labour: total, paid, due: Math.max(0, total - paid) };
    });
  }, [karigars, orders, labour, lastIdx]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showInactive && r.active === false) return false;
      if (!s) return true;
      return r.name.toLowerCase().includes(s) || r.phone.includes(s) || (r.skill || '').toLowerCase().includes(s);
    });
  }, [rows, q, showInactive]);

  const totals = useMemo(
    () => ({
      jobs: rows.reduce((a, r) => a + r.activeJobs, 0),
      due: rows.reduce((a, r) => a + r.due, 0),
      active: rows.filter((r) => r.active !== false).length,
    }),
    [rows],
  );

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Naam',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{r.name}</span>
          {r.active === false && <Badge>Inactive</Badge>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (r) => (
        <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-wood-800 hover:underline">
          <Phone className="h-3.5 w-3.5" /> {r.phone}
        </a>
      ),
    },
    { key: 'skill', header: 'Skill', cell: (r) => r.skill || '-' },
    {
      key: 'jobs',
      header: 'Active jobs',
      align: 'center',
      cell: (r) => (r.activeJobs ? <Badge tone="wood">{r.activeJobs}</Badge> : <span className="text-wood-400">0</span>),
    },
    { key: 'labour', header: 'Labour', align: 'right', cell: (r) => money(r.labour) },
    { key: 'paid', header: 'Diya', align: 'right', cell: (r) => <span className="text-emerald-700">{money(r.paid)}</span> },
    {
      key: 'due',
      header: 'Dena baaki',
      align: 'right',
      cell: (r) => (r.due > 0 ? <span className="font-semibold text-red-600">{money(r.due)}</span> : <span className="text-wood-400">-</span>),
    },
    {
      key: 'login',
      header: 'Login',
      cell: (r) => (r.uid ? <Badge tone="green">Login hai</Badge> : <Badge tone="gray">No login</Badge>),
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Karigar"
        subtitle="Team, kaam aur labour ka hisaab"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Naya Karigar
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Active karigar" value={totals.active} />
        <StatCard label="Chalu jobs" value={totals.jobs} tone="blue" />
        <StatCard label="Labour baaki" value={money(totals.due)} tone={totals.due > 0 ? 'red' : 'green'} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Naam, phone ya skill..." className="flex-1" />
        <Toggle checked={showInactive} onChange={setShowInactive} label="Inactive bhi dikhayein" />
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/karigar/${r.id}`)}
        empty={
          <EmptyState
            icon={<Wrench className="h-6 w-6" />}
            title={karigars.length ? 'Koi karigar nahi mila' : 'Abhi koi karigar nahi'}
            description={karigars.length ? 'Search ya filter badlein' : 'Karigar jodein, phir unhe orders assign karein'}
            action={
              !karigars.length && (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
                  Naya Karigar
                </Button>
              )
            }
          />
        }
      />

      <KarigarModal open={open} onClose={() => setOpen(false)} onSaved={(id) => router.push(`/karigar/${id}`)} />
    </div>
  );
}
