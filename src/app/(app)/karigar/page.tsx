'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Plus, Wrench } from 'lucide-react';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
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
  const t = useT();
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
      header: t('Name'),
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{r.name}</span>
          {r.active === false && <Badge>{t('Inactive')}</Badge>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: t('Phone'),
      cell: (r) => (
        <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-wood-800 hover:underline">
          <Phone className="h-3.5 w-3.5" /> {r.phone}
        </a>
      ),
    },
    { key: 'skill', header: t('Skill'), cell: (r) => (r.skill ? t(r.skill) : '-') },
    {
      key: 'jobs',
      header: t('Active jobs'),
      align: 'center',
      cell: (r) => (r.activeJobs ? <Badge tone="wood">{r.activeJobs}</Badge> : <span className="text-wood-400">0</span>),
    },
    { key: 'labour', header: t('Labour'), align: 'right', cell: (r) => money(r.labour) },
    { key: 'paid', header: t('Paid out'), align: 'right', cell: (r) => <span className="text-emerald-700">{money(r.paid)}</span> },
    {
      key: 'due',
      header: t('To pay'),
      align: 'right',
      cell: (r) => (r.due > 0 ? <span className="font-semibold text-red-600">{money(r.due)}</span> : <span className="text-wood-400">-</span>),
    },
    {
      key: 'login',
      header: t('Login'),
      cell: (r) => (r.uid ? <Badge tone="green">{t('Has login')}</Badge> : <Badge tone="gray">{t('No login')}</Badge>),
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={t('Workers')}
        subtitle={t('Team, jobs and labour payments')}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            {t('Add Worker')}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label={t('Active workers')} value={totals.active} />
        <StatCard label={t('Jobs in progress')} value={totals.jobs} tone="blue" />
        <StatCard label={t('Labour due')} value={money(totals.due)} tone={totals.due > 0 ? 'red' : 'green'} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder={t('Name, phone or skill...')} className="flex-1" />
        <Toggle checked={showInactive} onChange={setShowInactive} label={t('Show inactive too')} />
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/karigar/${r.id}`)}
        empty={
          <EmptyState
            icon={<Wrench className="h-6 w-6" />}
            title={karigars.length ? t('No workers found') : t('No workers yet')}
            description={karigars.length ? t('Try a different search or filter') : t('Add workers, then assign them to orders')}
            action={
              !karigars.length && (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
                  {t('Add Worker')}
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
