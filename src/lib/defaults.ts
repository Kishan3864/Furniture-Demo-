import type { WorkshopSettings } from './types';

export const DEFAULT_SETTINGS: WorkshopSettings = {
  name: 'WoodBook Workshop',
  tagline: 'Brighton Solution',
  logoUrl: '',
  address: '',
  phone: '',
  gst: '',
  itemTypes: ['Almaari', 'Bed', 'Table', 'Sofa', 'Kitchen', 'Door', 'Custom'],
  woodTypes: ['Sheesham', 'Teak', 'Ply', 'MDF', 'Mango', 'Pine', 'HDHMR', 'Particle Board'],
  stages: [
    { name: 'Naap liya', percent: 10 },
    { name: 'Design final', percent: 20 },
    { name: 'Cutting', percent: 40 },
    { name: 'Assembly', percent: 60 },
    { name: 'Polish', percent: 80 },
    { name: 'Ready', percent: 95 },
    { name: 'Delivered', percent: 100 },
  ],
  expenseCategories: ['Lakdi / Material', 'Hardware', 'Polish', 'Transport', 'Bijli / Rent', 'Chai-Pani', 'Tools', 'Other'],
  skills: ['Carpenter', 'Polish wala', 'Helper', 'Fitter', 'Designer'],
  billTerms: '50% advance. Balance on delivery. Design change ke baad delivery date badal sakti hai.',
};

export const STOCK_CATEGORIES = ['Lakdi', 'Ply', 'Hardware', 'Polish', 'Other'];
export const STOCK_UNITS = ['sheet', 'cft', 'sqft', 'ft', 'pcs', 'kg', 'ltr', 'box', 'set'];
