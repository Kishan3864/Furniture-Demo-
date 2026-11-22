import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a valid 10 digit phone number');

const optStr = z.string().trim().optional().or(z.literal(''));
const money = z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date');
const optNum = z
  .union([z.literal(''), z.null(), z.coerce.number()])
  .transform((v) => (v === '' || v === null || Number.isNaN(v) ? null : Number(v)));

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone,
  address: optStr,
  notes: optStr,
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const orderSchema = z
  .object({
    customerId: z.string().min(1, 'Select a customer'),
    itemType: z.string().min(1, 'Select an item type'),
    title: optStr,
    quantity: z.coerce.number().int('Enter a whole number').min(1, 'Minimum 1'),
    naap: z.object({
      unit: z.enum(['ft', 'inch']),
      l: optNum,
      w: optNum,
      h: optNum,
      extra: z.array(z.object({ label: z.string(), value: z.string() })),
      notes: optStr,
    }),
    refLink: z.string().trim().url('Enter a valid link').optional().or(z.literal('')),
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
    message: 'Delivery date cannot be before the order date',
    path: ['deliveryDate'],
  })
  .refine((v) => v.discount <= v.price, { message: 'Discount cannot be more than the price', path: ['discount'] });
export type OrderInput = z.infer<typeof orderSchema>;

export const paymentSchema = z.object({
  orderId: z.string().min(1, 'Select an order'),
  amount: z.coerce.number({ invalid_type_error: 'Enter an amount' }).positive('Amount must be more than 0'),
  mode: z.enum(['cash', 'upi', 'bank']),
  date,
  note: optStr,
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const karigarSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  phone,
  skill: optStr,
  active: z.boolean(),
});
export type KarigarInput = z.infer<typeof karigarSchema>;

export const karigarLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

export const labourSchema = z.object({
  karigarId: z.string().min(1, 'Select a worker'),
  orderId: z.string().min(1, 'Select an order'),
  amount: money.refine((v) => v > 0, 'Enter an amount'),
  paid: money,
  note: optStr,
});
export type LabourInput = z.infer<typeof labourSchema>;

export const stockItemSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  category: z.string().min(1, 'Select a category'),
  unit: z.string().min(1, 'Select a unit'),
  qty: z.coerce.number().min(0, 'Cannot be negative'),
  minQty: z.coerce.number().min(0, 'Cannot be negative'),
  rate: z.coerce.number().min(0).optional(),
});
export type StockItemInput = z.infer<typeof stockItemSchema>;

export const stockMoveSchema = z.object({
  itemId: z.string().min(1, 'Select an item'),
  type: z.enum(['in', 'out']),
  qty: z.coerce.number({ invalid_type_error: 'Enter quantity' }).positive('Quantity must be more than 0'),
  orderId: z.string().optional().or(z.literal('')),
  date,
  note: optStr,
});
export type StockMoveInput = z.infer<typeof stockMoveSchema>;

export const expenseSchema = z.object({
  date,
  category: z.string().min(1, 'Select a category'),
  amount: z.coerce.number({ invalid_type_error: 'Enter an amount' }).positive('Amount must be more than 0'),
  note: optStr,
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Workshop name is required'),
  tagline: optStr,
  address: optStr,
  phone: optStr,
  gst: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[0-9A-Z]{15}$/.test(v.toUpperCase()), 'GSTIN must be 15 characters'),
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
