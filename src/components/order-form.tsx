'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { addDays } from 'date-fns';
import { toast } from 'sonner';
import { ImagePlus, Phone, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { createOrder, newId, updateOrder } from '@/lib/actions';
import { deleteImage, uploadOrderPhotos } from '@/lib/upload';
import { orderSchema, validate } from '@/lib/schemas';
import type { ExtraMeasure, LengthUnit, Order, PayMode, Photo, Priority } from '@/lib/types';
import { cn, convertLen, errMsg, money, toDateStr, todayStr } from '@/lib/utils';
import {
  Button,
  Card,
  CardHeader,
  Field,
  FilePreviewGrid,
  ImagePickButton,
  Input,
  PhotoGrid,
  Segmented,
  Select,
  Textarea,
  Toggle,
} from './ui';
import { CustomerModal } from './order-bits';

const OTHER = '__other__';

interface FormState {
  customerId: string;
  itemType: string;
  title: string;
  quantity: string;
  unit: LengthUnit;
  l: string;
  w: string;
  h: string;
  extra: ExtraMeasure[];
  naapNotes: string;
  refLink: string;
  woodChoice: string;
  woodOther: string;
  finish: string;
  hardware: string;
  price: string;
  discount: string;
  advance: string;
  advanceMode: PayMode;
  orderDate: string;
  deliveryDate: string;
  priority: Priority;
  karigarIds: string[];
  showPriceOnStatus: boolean;
  notes: string;
}

const numStr = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '' : String(v));

function initState(woodTypes: string[], order?: Order, customerId?: string, price?: number, discount?: number): FormState {
  const wood = order?.wood || '';
  const woodKnown = !wood || woodTypes.includes(wood);
  return {
    customerId: order?.customerId || customerId || '',
    itemType: order?.itemType || '',
    title: order?.title || '',
    quantity: String(order?.quantity ?? 1),
    unit: order?.naap?.unit || 'ft',
    l: numStr(order?.naap?.l),
    w: numStr(order?.naap?.w),
    h: numStr(order?.naap?.h),
    extra: order?.naap?.extra?.length ? order.naap.extra.map((e) => ({ ...e })) : [],
    naapNotes: order?.naap?.notes || '',
    refLink: order?.refLink || '',
    woodChoice: woodKnown ? wood : OTHER,
    woodOther: woodKnown ? '' : wood,
    finish: order?.finish || '',
    hardware: order?.hardware || '',
    price: price !== undefined ? String(price) : '',
    discount: discount ? String(discount) : '',
    advance: '',
    advanceMode: 'cash',
    orderDate: order?.orderDate || todayStr(),
    deliveryDate: order?.deliveryDate || toDateStr(addDays(new Date(), 15)),
    priority: order?.priority || 'normal',
    karigarIds: order?.karigarIds ? [...order.karigarIds] : [],
    showPriceOnStatus: order?.showPriceOnStatus ?? false,
    notes: order?.notes || '',
  };
}

function Section({ title, children, action, tour }: { title: ReactNode; children: ReactNode; action?: ReactNode; tour?: string }) {
  return (
    <Card tour={tour}>
      <CardHeader title={title} action={action} />
      <div className="space-y-3 p-4">{children}</div>
    </Card>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-2 text-sm font-medium transition',
        active ? 'border-wood-700 bg-wood-700 text-white' : 'border-wood-200 bg-white text-wood-800 hover:border-wood-400',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------ Customer picker ------------------------------ */

function CustomerPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const t = useT();
  const { customers, customerById } = useData();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const selected = value ? customerById[value] : undefined;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    const r = s
      ? customers.filter(
          (c) => c.name.toLowerCase().includes(s) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)),
        )
      : customers;
    return r.slice(0, 8);
  }, [q, customers]);

  return (
    <div>
      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-wood-200 bg-wood-50 p-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-wood-950">{selected.name}</p>
            <p className="flex items-center gap-1 truncate text-sm text-wood-700">
              <Phone className="h-3.5 w-3.5" /> {selected.phone}
              {selected.address ? ` · ${selected.address}` : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange('');
              setQ('');
              setOpen(true);
            }}
          >
            {t('Change')}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wood-400" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={t('Customer name or phone...')}
              className="pl-9"
              invalid={!!error}
            />
            {open && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-wood-100 bg-white p-1 shadow-lg">
                {list.length ? (
                  list.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
                      className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-wood-50"
                    >
                      <span className="font-medium text-wood-950">{c.name}</span>
                      <span className="text-xs text-wood-600">{c.phone}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-wood-600">{t('No customer found')}</div>
                )}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    setModal(true);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-wood-100 px-3 py-2 text-left text-sm font-medium text-wood-700 hover:bg-wood-50"
                >
                  <UserPlus className="h-4 w-4" /> {q.trim() ? t('Add "{name}" as new customer', { name: q.trim() }) : t('Add new customer')}
                </button>
              </div>
            )}
          </div>
          <Button variant="outline" icon={<UserPlus className="h-4 w-4" />} onClick={() => setModal(true)}>
            <span className="hidden sm:inline">{t('New customer')}</span>
          </Button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{t(error)}</p>}
      <CustomerModal
        open={modal}
        onClose={() => setModal(false)}
        initialName={/\d{5,}/.test(q) ? '' : q.trim()}
        onSaved={(id) => {
          onChange(id);
          setQ('');
        }}
      />
    </div>
  );
}

/* ------------------------------ Order form ------------------------------ */

export default function OrderForm({ order, initialCustomerId }: { order?: Order; initialCustomerId?: string }) {
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const { settings, karigars, customerById, finance } = useData();
  const fin = order ? finance[order.id] : undefined;
  const isEdit = !!order;

  const [f, setF] = useState<FormState>(() =>
    initState(settings.woodTypes, order, initialCustomerId, fin?.price, fin?.discount),
  );
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>(order?.designPhotos || []);
  const [removedPhotos, setRemovedPhotos] = useState<Photo[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const idRef = useRef<string | null>(order?.id || null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const changeUnit = (unit: LengthUnit) => {
    if (unit === f.unit) return;
    const conv = (s: string) => {
      if (!s.trim()) return s;
      const n = Number(s);
      return Number.isNaN(n) ? s : numStr(convertLen(n, f.unit, unit));
    };
    setF((p) => ({ ...p, unit, l: conv(p.l), w: conv(p.w), h: conv(p.h) }));
  };

  const itemTypes = useMemo(() => {
    const list = [...settings.itemTypes];
    if (f.itemType && !list.includes(f.itemType)) list.push(f.itemType);
    return list;
  }, [settings.itemTypes, f.itemType]);

  const karigarOptions = useMemo(
    () => karigars.filter((k) => k.active || f.karigarIds.includes(k.id)),
    [karigars, f.karigarIds],
  );

  const priceN = Number(f.price) || 0;
  const discountN = Number(f.discount) || 0;
  const advanceN = Number(f.advance) || 0;
  const total = Math.max(0, priceN - discountN);
  const paidSoFar = isEdit ? fin?.paid || 0 : advanceN;
  const balance = total - paidSoFar;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    const wood = f.woodChoice === OTHER ? f.woodOther.trim() : f.woodChoice;
    const payload = {
      customerId: f.customerId,
      itemType: f.itemType,
      title: f.title,
      quantity: f.quantity,
      naap: {
        unit: f.unit,
        l: f.l.trim() === '' ? null : f.l,
        w: f.w.trim() === '' ? null : f.w,
        h: f.h.trim() === '' ? null : f.h,
        extra: f.extra.map((x) => ({ label: x.label.trim(), value: x.value.trim() })).filter((x) => x.label || x.value),
        notes: f.naapNotes,
      },
      refLink: f.refLink.trim(),
      wood,
      finish: f.finish,
      hardware: f.hardware,
      price: f.price.trim() === '' ? 0 : f.price,
      discount: f.discount.trim() === '' ? 0 : f.discount,
      orderDate: f.orderDate,
      deliveryDate: f.deliveryDate,
      priority: f.priority,
      karigarIds: f.karigarIds,
      showPriceOnStatus: f.showPriceOnStatus,
      notes: f.notes,
    };
    const v = validate(orderSchema, payload);
    const errs: Record<string, string> = { ...v.errors };

    const parseLen = (s: string): number | null => (s.trim() === '' ? null : Number(s));
    (['l', 'w', 'h'] as const).forEach((k) => {
      const s = f[k].trim();
      if (s && (Number.isNaN(Number(s)) || Number(s) < 0)) errs[`naap.${k}`] = 'Enter a valid number';
      else delete errs[`naap.${k}`];
    });
    if (!isEdit) {
      if (f.advance.trim() && (Number.isNaN(Number(f.advance)) || Number(f.advance) < 0)) errs.advance = 'Enter a valid amount';
      else if (advanceN > total) errs.advance = 'Advance cannot be more than the total';
    } else if (fin && total < (fin.paid || 0)) {
      errs.price = t('{amount} is already paid - total cannot be less than this', { amount: money(fin.paid) });
    }
    if (f.woodChoice === OTHER && !f.woodOther.trim()) errs.wood = 'Enter the wood name';

    if (!v.ok || Object.keys(errs).length) {
      setErrors(errs);
      toast.error(t('Please fix the fields marked in red'));
      return;
    }
    setErrors({});
    const data = { ...v.data, naap: { ...v.data.naap, l: parseLen(f.l), w: parseLen(f.w), h: parseLen(f.h) } };
    const customer = customerById[data.customerId];
    if (!customer) {
      setErrors({ customerId: 'Customer not found' });
      return;
    }

    setSaving(true);
    try {
      if (!idRef.current) idRef.current = newId('orders');
      const id = idRef.current;
      let photos = existingPhotos;
      if (newFiles.length) {
        setUploadMsg(t('Uploading photos {done}/{total}', { done: 0, total: newFiles.length }));
        const uploaded = await uploadOrderPhotos(id, 'design', newFiles, user?.name, (d, n) => setUploadMsg(t('Uploading photos {done}/{total}', { done: d, total: n })));
        photos = [...existingPhotos, ...uploaded];
        // keep uploaded photos if a later step fails so retry does not upload again
        setExistingPhotos(photos);
        setNewFiles([]);
      }
      setUploadMsg(t('Saving...'));
      if (order) {
        await updateOrder(order, data, settings, { designPhotos: photos, customer, fin });
        removedPhotos.forEach((p) => void deleteImage(p.path));
        toast.success(t('Order updated'));
        router.push(`/orders/${order.id}`);
      } else {
        const r = await createOrder(data, settings, {
          id,
          designPhotos: photos,
          customer,
          advance: advanceN,
          advanceMode: f.advanceMode,
          createdBy: user?.name,
        });
        toast.success(t('Order {no} created', { no: r.orderNo }));
        router.push(`/orders/${id}`);
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
      setUploadMsg('');
    }
  };

  const unitSign = f.unit === 'ft' ? 'ft' : 'inch';

  return (
    <form id="order-form" onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title={t('Customer')} tour="of-customer">
            <CustomerPicker value={f.customerId} onChange={(id) => set('customerId', id)} error={errors.customerId} />
          </Section>

          <Section title={t('Item')} tour="of-item">
            <Field label={t('Item type')} required error={errors.itemType}>
              <div className="flex flex-wrap gap-2">
                {itemTypes.map((it) => (
                  <Chip key={it} active={f.itemType === it} onClick={() => set('itemType', it)}>
                    {t(it)}
                  </Chip>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t('Title / detail')} className="col-span-2" error={errors.title}>
                <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={t('e.g. 3 door sliding')} />
              </Field>
              <Field label={t('Quantity')} required error={errors.quantity}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={f.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  invalid={!!errors.quantity}
                />
              </Field>
            </div>
          </Section>

          <Section
            tour="of-naap"
            title={t('Measurements')}
            action={
              <Segmented
                size="sm"
                value={f.unit}
                onChange={changeUnit}
                options={[
                  { value: 'ft', label: t('Feet') },
                  { value: 'inch', label: t('Inch') },
                ]}
              />
            }
          >
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ['l', 'Length (L)'],
                  ['w', 'Width (W)'],
                  ['h', 'Height (H)'],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={t(label)} error={errors[`naap.${k}`]} hint={unitSign}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={f[k]}
                    onChange={(e) => set(k, e.target.value)}
                    invalid={!!errors[`naap.${k}`]}
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
            <div className="space-y-2">
              {f.extra.map((x, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={x.label}
                    onChange={(e) => {
                      const extra = [...f.extra];
                      extra[i] = { ...extra[i], label: e.target.value };
                      set('extra', extra);
                    }}
                    placeholder={t('e.g. Shelf gap')}
                    className="flex-1"
                  />
                  <Input
                    value={x.value}
                    onChange={(e) => {
                      const extra = [...f.extra];
                      extra[i] = { ...extra[i], value: e.target.value };
                      set('extra', extra);
                    }}
                    placeholder={t('e.g. 14 {unit}', { unit: unitSign })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('Remove')}
                    onClick={() => set('extra', f.extra.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => set('extra', [...f.extra, { label: '', value: '' }])}
              >
                {t('Add measurement')}
              </Button>
            </div>
            <Field label={t('Measurement notes')}>
              <Textarea value={f.naapNotes} rows={2} onChange={(e) => set('naapNotes', e.target.value)} placeholder={t('Wall, switch board, corners to keep in mind...')} />
            </Field>
          </Section>

          <Section title={t('Design')} tour="of-photos">
            <PhotoGrid
              photos={existingPhotos}
              onRemove={(i) => {
                const p = existingPhotos[i];
                setExistingPhotos(existingPhotos.filter((_, j) => j !== i));
                if (order?.designPhotos?.some((x) => x.path === p.path)) setRemovedPhotos((r) => [...r, p]);
                else void deleteImage(p.path);
              }}
            />
            <FilePreviewGrid files={newFiles} onRemove={(i) => setNewFiles(newFiles.filter((_, j) => j !== i))} />
            <ImagePickButton onPick={(files) => setNewFiles((p) => [...p, ...files])} icon={<ImagePlus className="h-4 w-4" />}>
              {t('Add design photos')}
            </ImagePickButton>
            <p className="text-xs text-wood-600">{t('Photos are compressed and uploaded when you save.')}</p>
            <Field label={t('Reference link')} error={errors.refLink}>
              <Input
                type="url"
                inputMode="url"
                value={f.refLink}
                onChange={(e) => set('refLink', e.target.value)}
                placeholder="https://pinterest.com/..."
                invalid={!!errors.refLink}
              />
            </Field>
          </Section>

          <Section title={t('Wood / Material')} tour="of-material">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('Wood type')} error={errors.wood}>
                <Select
                  value={f.woodChoice}
                  onChange={(e) => set('woodChoice', e.target.value)}
                  placeholder={t('Select')}
                  options={[...settings.woodTypes.map((w) => ({ value: w, label: t(w) })), { value: OTHER, label: t('Other (type it)') }]}
                />
              </Field>
              {f.woodChoice === OTHER && (
                <Field label={t('Wood name')} error={errors.wood}>
                  <Input value={f.woodOther} onChange={(e) => set('woodOther', e.target.value)} invalid={!!errors.wood} />
                </Field>
              )}
              <Field label={t('Finish / Polish colour')}>
                <Input value={f.finish} onChange={(e) => set('finish', e.target.value)} placeholder={t('e.g. Walnut matt PU')} />
              </Field>
            </div>
            <Field label={t('Hardware notes')}>
              <Textarea value={f.hardware} rows={2} onChange={(e) => set('hardware', e.target.value)} placeholder={t('Hinges, channels, handles, lock...')} />
            </Field>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title={t('Payment')} tour="of-price">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Price (₹)')} required error={errors.price} className="col-span-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={f.price}
                  onChange={(e) => set('price', e.target.value)}
                  invalid={!!errors.price}
                  placeholder="0"
                />
              </Field>
              <Field label={t('Discount (₹)')} error={errors.discount} className={isEdit ? 'col-span-2' : ''}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={f.discount}
                  onChange={(e) => set('discount', e.target.value)}
                  invalid={!!errors.discount}
                  placeholder="0"
                />
              </Field>
              {!isEdit && (
                <Field label={t('Advance (₹)')} error={errors.advance}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={f.advance}
                    onChange={(e) => set('advance', e.target.value)}
                    invalid={!!errors.advance}
                    placeholder="0"
                  />
                </Field>
              )}
            </div>
            {!isEdit && advanceN > 0 && (
              <Field label={t('Advance mode')}>
                <Segmented
                  value={f.advanceMode}
                  onChange={(v) => set('advanceMode', v)}
                  options={[
                    { value: 'cash', label: t('Cash') },
                    { value: 'upi', label: t('UPI') },
                    { value: 'bank', label: t('Bank') },
                  ]}
                />
              </Field>
            )}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-wood-50 p-3 text-center text-sm">
              <div>
                <p className="text-[11px] uppercase text-wood-500">{t('Total')}</p>
                <p className="font-semibold">{money(total)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-wood-500">{isEdit ? t('Paid') : t('Advance')}</p>
                <p className="font-semibold text-emerald-700">{money(paidSoFar)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-wood-500">{t('Balance')}</p>
                <p className={cn('font-semibold', balance > 0 ? 'text-red-600' : 'text-emerald-700')}>{money(balance)}</p>
              </div>
            </div>
            {isEdit && <p className="text-xs text-wood-600">{t('Add new payments from the order page using "Receive payment".')}</p>}
          </Section>

          <Section title={t('Dates & Priority')} tour="of-dates">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Order date')} required error={errors.orderDate}>
                <Input type="date" value={f.orderDate} onChange={(e) => set('orderDate', e.target.value)} invalid={!!errors.orderDate} />
              </Field>
              <Field label={t('Delivery date')} required error={errors.deliveryDate}>
                <Input
                  type="date"
                  value={f.deliveryDate}
                  min={f.orderDate}
                  onChange={(e) => set('deliveryDate', e.target.value)}
                  invalid={!!errors.deliveryDate}
                />
              </Field>
            </div>
            <Field label={t('Priority')}>
              <Segmented
                value={f.priority}
                onChange={(v) => set('priority', v)}
                size="sm"
                options={[
                  { value: 'low', label: t('Low') },
                  { value: 'normal', label: t('Normal') },
                  { value: 'high', label: t('High') },
                  { value: 'urgent', label: t('Urgent') },
                ]}
              />
            </Field>
          </Section>

          <Section title={t('Workers')} tour="of-workers">
            {karigarOptions.length ? (
              <div className="flex flex-wrap gap-2">
                {karigarOptions.map((k) => {
                  const on = f.karigarIds.includes(k.id);
                  return (
                    <Chip
                      key={k.id}
                      active={on}
                      onClick={() =>
                        set('karigarIds', on ? f.karigarIds.filter((x) => x !== k.id) : [...f.karigarIds, k.id])
                      }
                    >
                      {k.name}
                      {k.skill ? <span className={cn('ml-1 text-xs', on ? 'text-wood-100' : 'text-wood-500')}>({t(k.skill)})</span> : null}
                    </Chip>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-wood-600">{t('No workers yet. Add them from the Workers page.')}</p>
            )}
          </Section>

          <Section title={t('Status page & Notes')}>
            <Toggle
              checked={f.showPriceOnStatus}
              onChange={(v) => set('showPriceOnStatus', v)}
              label={t('Show price / balance on the customer status page')}
            />
            <Field label={t('Notes')}>
              <Textarea value={f.notes} rows={3} onChange={(e) => set('notes', e.target.value)} placeholder={t('Anything special...')} />
            </Field>
          </Section>
        </div>
      </div>

      <div className="sticky bottom-[84px] z-10 lg:bottom-4">
        <Card className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold text-wood-950">
              {f.itemType ? t(f.itemType) : t('Item')} · {money(total)}
            </p>
            <p className="truncate text-xs text-wood-600">{uploadMsg || t('Balance {amount}', { amount: money(balance) })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()} disabled={saving}>
              {t('Cancel')}
            </Button>
            <Button type="submit" loading={saving} data-tour="of-save">
              {isEdit ? t('Update order') : t('Save order')}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
