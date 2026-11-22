import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .min(1, 'Phone zaroori hai')
  .refine((v) => v.replace(/\D/g, '').length >= 10, 'Phone number sahi nahi hai (10 digit)');

const optStr = z.string().trim().optional().or(z.literal(''));
const money = z.coerce.number({ invalid_type_error: 'Number daalein' }).min(0, 'Minus nahi ho sakta');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date chunein');
const optNum = z
  .union([z.literal(''), z.null(), z.coerce.number()])
  .transform((v) => (v === '' || v === null || Number.isNaN(v) ? null : Number(v)));

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Naam kam se kam 2 akshar'),
  phone,
  address: optStr,
  notes: optStr,
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const orderSchema = z
  .object({
    customerId: z.string().min(1, 'Grahak chunein'),
    itemType: z.string().min(1, 'Item type chunein'),
    title: optStr,
    quantity: z.coerce.number().int('Poora number').min(1, 'Kam se kam 1'),
    naap: z.object({
      unit: z.enum(['ft', 'inch']),
      l: optNum,
      w: optNum,
      h: optNum,
      extra: z.array(z.object({ label: z.string(), value: z.string() })),
      notes: optStr,
    }),
    refLink: z.string().trim().url('Link sahi nahi hai').optional().or(z.literal('')),
    wood: optStr,
    finish: optStr,
    hardware: optStr,
    price: money,
    discount: money,
    orderDate: date,
    deliveryDate: date,
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    karigarIds: z.array(z.string()),
    showPriceOnStatus: z.boolean(),
    notes: optStr,
  })
  .refine((v) => v.deliveryDate >= v.orderDate, {
    message: 'Delivery date order date se pehle nahi ho sakti',
    path: ['deliveryDate'],
  })
  .refine((v) => v.discount <= v.price, { message: 'Discount price se zyada nahi', path: ['discount'] });
export type OrderInput = z.infer<typeof orderSchema>;

export const paymentSchema = z.object({
  orderId: z.string().min(1, 'Order chunein'),
  amount: z.coerce.number({ invalid_type_error: 'Amount daalein' }).positive('Amount 0 se zyada ho'),
  mode: z.enum(['cash', 'upi', 'bank']),
  date,
  note: optStr,
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const karigarSchema = z.object({
  name: z.string().trim().min(2, 'Naam zaroori hai'),
  phone,
  skill: optStr,
  active: z.boolean(),
});
export type KarigarInput = z.infer<typeof karigarSchema>;

export const karigarLoginSchema = z.object({
  email: z.string().trim().email('Email sahi nahi hai'),
  password: z.string().min(6, 'Kam se kam 6 character'),
});

export const labourSchema = z.object({
  karigarId: z.string().min(1, 'Karigar chunein'),
  orderId: z.string().min(1, 'Order chunein'),
  amount: money.refine((v) => v > 0, 'Amount daalein'),
  paid: money,
  note: optStr,
});
export type LabourInput = z.infer<typeof labourSchema>;

export const stockItemSchema = z.object({
  name: z.string().trim().min(2, 'Naam zaroori hai'),
  category: z.string().min(1, 'Category chunein'),
  unit: z.string().min(1, 'Unit chunein'),
  qty: z.coerce.number().min(0, 'Minus nahi'),
  minQty: z.coerce.number().min(0, 'Minus nahi'),
  rate: z.coerce.number().min(0).optional(),
});
export type StockItemInput = z.infer<typeof stockItemSchema>;

export const stockMoveSchema = z.object({
  itemId: z.string().min(1, 'Item chunein'),
  type: z.enum(['in', 'out']),
  qty: z.coerce.number({ invalid_type_error: 'Qty daalein' }).positive('Qty 0 se zyada ho'),
  orderId: z.string().optional().or(z.literal('')),
  date,
  note: optStr,
});
export type StockMoveInput = z.infer<typeof stockMoveSchema>;

export const expenseSchema = z.object({
  date,
  category: z.string().min(1, 'Category chunein'),
  amount: z.coerce.number({ invalid_type_error: 'Amount daalein' }).positive('Amount 0 se zyada ho'),
  note: optStr,
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Workshop ka naam zaroori hai'),
  tagline: optStr,
  address: optStr,
  phone: optStr,
  gst: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[0-9A-Z]{15}$/.test(v.toUpperCase()), 'GSTIN 15 character ka hota hai'),
  billTerms: optStr,
});

/** Validate with zod and return a flat error map keyed by dotted path. */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): { ok: true; data: z.infer<T>; errors: Record<string, string> } | { ok: false; data: null; errors: Record<string, string> } {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data, errors: {} };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const k = issue.path.join('.');
    if (!errors[k]) errors[k] = issue.message;
  }
  return { ok: false, data: null, errors };
}
