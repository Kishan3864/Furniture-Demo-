import type { WorkshopSettings } from './types';

/** Default workshop settings (English). Display code passes these through t() so Hinglish users see translations. */
export const DEFAULT_SETTINGS: WorkshopSettings = {
  name: 'FurniCraft Workshop',
  tagline: 'Brighton Solution',
  logoUrl: '',
  address: '',
  phone: '',
  gst: '',
  itemTypes: ['Wardrobe', 'Bed', 'Table', 'Sofa', 'Kitchen', 'Door', 'Custom'],
  woodTypes: ['Sheesham', 'Teak', 'Plywood', 'MDF', 'Mango Wood', 'Pine', 'HDHMR', 'Particle Board'],
  stages: [
    { name: 'Measurement', percent: 10 },
    { name: 'Design Final', percent: 20 },
    { name: 'Cutting', percent: 40 },
    { name: 'Assembly', percent: 60 },
    { name: 'Polish', percent: 80 },
    { name: 'Ready', percent: 95 },
    { name: 'Delivered', percent: 100 },
  ],
  expenseCategories: ['Wood / Material', 'Hardware', 'Polish', 'Transport', 'Electricity / Rent', 'Tea & Snacks', 'Tools', 'Other'],
  skills: ['Carpenter', 'Polisher', 'Helper', 'Fitter', 'Designer'],
  billTerms: '50% advance with the order. Balance on delivery. Delivery date may change if the design is changed.',
};

export const STOCK_CATEGORIES = ['Wood', 'Plywood', 'Hardware', 'Polish', 'Other'];
export const STOCK_UNITS = ['sheet', 'cft', 'sqft', 'ft', 'pcs', 'kg', 'ltr', 'box', 'set'];
