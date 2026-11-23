'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Boxes,
  ChartColumn,
  ClipboardList,
  Download,
  FileText,
  Hammer,
  LogIn,
  MessageCircle,
  Plus,
  Ruler,
  Settings,
  Truck,
  Video,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { usePwa } from '@/lib/pwa';
import { Button, Card, PageHeader } from '@/components/ui';
import { TourButton } from '@/components/tour';

interface Guide {
  icon: ReactNode;
  title: string;
  steps: string[];
  href?: string;
  action?: 'install';
}

const OWNER_GUIDES: Guide[] = [
  {
    icon: <Plus className="h-5 w-5" />,
    title: 'Take a new order',
    href: '/orders/new',
    steps: [
      'Tap New Order.',
      'Choose the customer (or add a new one).',
      'Fill item, sizes, photos, price and advance.',
      'Set delivery date, pick workers and Save.',
    ],
  },
  {
    icon: <Ruler className="h-5 w-5" />,
    title: 'Save site sizes, photos & videos',
    href: '/sites',
    steps: [
      'Open Site Visits → New site visit.',
      'Add a size for each room or item (ft / inch).',
      'Tap Take photo or Record video at the site.',
      'Tap Create order on any size – photos and videos go with it.',
    ],
  },
  {
    icon: <Hammer className="h-5 w-5" />,
    title: 'Track work progress',
    href: '/board',
    steps: [
      'Open an order and tap the next stage.',
      'Or open Work Progress and tap Next on a card.',
      'Drag with the mouse or swipe to see all stages.',
    ],
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'Send an update to the customer',
    href: '/orders',
    steps: ['Open the order.', 'Add a progress photo.', 'Tap Send to Customer – it opens WhatsApp with a live status link.'],
  },
  {
    icon: <Wallet className="h-5 w-5" />,
    title: 'Take a payment',
    href: '/payments',
    steps: [
      'Open the order → Take payment.',
      'Enter amount and choose Cash, UPI or Bank.',
      'Print the receipt if needed.',
      'See all dues in Payments → Due and send a WhatsApp reminder.',
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: 'Print a bill or estimate',
    href: '/orders',
    steps: ['Open the order.', 'Tap Bill or Estimate.', 'Tap Print – choose “Save as PDF” to share it.'],
  },
  {
    icon: <Truck className="h-5 w-5" />,
    title: 'Plan deliveries',
    href: '/delivery',
    steps: ['Open Deliveries – nearest date first.', 'Red = overdue, “Today” = due today.', 'Use Calendar to see the month. Tap Delivered when done.'],
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: 'Workers and their login',
    href: '/karigar',
    steps: [
      'Workers → Add worker (name, phone, skill).',
      'Open the worker → Create login → share on WhatsApp.',
      'Add the labour amount per job and record what you paid.',
    ],
  },
  {
    icon: <Boxes className="h-5 w-5" />,
    title: 'Stock and expenses',
    href: '/stock',
    steps: ['Stock → Stock In when material arrives.', 'Stock Out when you use it (link it to an order).', 'Expenses → Add expense for daily costs.'],
  },
  {
    icon: <ChartColumn className="h-5 w-5" />,
    title: 'Reports',
    href: '/reports',
    steps: ['Open Reports and pick the year or month.', 'See orders, income, dues and expenses.', 'Tap CSV to download for Excel.'],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: 'Settings',
    href: '/settings',
    steps: ['Add workshop name, logo, phone and GST for bills.', 'Edit item types, wood types and stages.', 'Change language or load / remove demo data.'],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: 'Install the app',
    action: 'install',
    steps: ['Tap Install app in the menu.', 'iPhone: Safari → Share → Add to Home Screen.', 'Open FurniCraft from your home screen like any app.'],
  },
];

const WORKER_GUIDES: Guide[] = [
  {
    icon: <LogIn className="h-5 w-5" />,
    title: 'Sign in',
    steps: ['Open the login page and choose Worker login.', 'Enter the email and password from your admin.'],
  },
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: 'See your jobs',
    href: '/jobs',
    steps: ['My Jobs shows only your work.', 'Tap a job to see sizes, wood and design photos.'],
  },
  {
    icon: <Hammer className="h-5 w-5" />,
    title: 'Update the stage',
    href: '/jobs',
    steps: ['Open the job.', 'Tap the next stage when a step is done.'],
  },
  {
    icon: <Video className="h-5 w-5" />,
    title: 'Add photos and videos',
    href: '/jobs',
    steps: ['Open the job.', 'Tap Take photo or Record video.', 'Wait until the upload finishes.'],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: 'Install the app',
    action: 'install',
    steps: ['Tap Install app.', 'iPhone: Safari → Share → Add to Home Screen.'],
  },
];

export default function HelpPage() {
  const t = useT();
  const { isOwner } = useAuth();
  const { install, isStandalone } = usePwa();
  const guides = isOwner ? OWNER_GUIDES : WORKER_GUIDES;

  return (
    <div className="space-y-4">
      <PageHeader title={t('How to use')} subtitle={t('Short steps for every task')} actions={<TourButton variant="primary" size="md" />} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((g, gi) => (
          <Card key={g.title} className="flex flex-col p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-wood-100 text-wood-700">{g.icon}</span>
              <h2 className="font-semibold leading-tight text-wood-950">
                <span className="mr-1 text-wood-400">{gi + 1}.</span>
                {t(g.title)}
              </h2>
            </div>
            <ol className="flex-1 space-y-1.5">
              {g.steps.map((s, i) => (
                <li key={s} className="flex gap-2 text-sm text-wood-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-wood-700 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{t(s)}</span>
                </li>
              ))}
            </ol>
            {g.href && (
              <Link href={g.href} className="mt-3 self-start text-sm font-semibold text-wood-700 hover:underline">
                {t('Open')} →
              </Link>
            )}
            {g.action === 'install' && !isStandalone && (
              <Button size="sm" variant="outline" className="mt-3 self-start" icon={<Download className="h-4 w-4" />} onClick={() => void install()}>
                {t('Install app')}
              </Button>
            )}
          </Card>
        ))}
      </div>
      <p className="pt-2 text-center text-[11px] text-wood-500">
        {t('Sample photos and videos in the demo: Wikimedia Commons (CC BY-SA / public domain), shown for demonstration only.')}
      </p>
    </div>
  );
}
