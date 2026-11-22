/**
 * Guided product tour content. Text is English (also the i18n key); Hinglish lives in src/i18n/hi-tour.ts.
 * `target` = value of a data-tour="..." attribute. Missing targets show the step centred.
 * `route` may be a function; returning null skips the step (e.g. no orders yet).
 */
export interface TourContext {
  firstOrderId: string | null;
  userName: string;
}

export interface TourStep {
  id: string;
  route?: string | ((c: TourContext) => string | null);
  target?: string;
  title: string;
  body: string;
}

const orderDetail = (c: TourContext) => (c.firstOrderId ? `/orders/${c.firstOrderId}` : null);
const jobDetail = (c: TourContext) => (c.firstOrderId ? `/jobs/${c.firstOrderId}` : null);

export const OWNER_TOUR: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to WoodBook',
    body: 'This short tour shows the full workflow of your workshop:\nNew order → measurements → work stages → delivery → payment.\n\nUse Next and Back, or press Skip anytime. You can restart the tour from the menu.',
  },
  {
    id: 'dash',
    route: '/',
    target: 'dash-stats',
    title: 'Your day at a glance',
    body: "Today's and this week's deliveries, overdue jobs (in red), work in progress, ready-to-deliver orders and total pending payments. Tap any box to open that list.",
  },
  {
    id: 'new-order',
    route: '/',
    target: 'new-order',
    title: 'Take a new order',
    body: 'Every job starts here. Tap New Order whenever a customer gives you work.',
  },
  {
    id: 'search',
    route: '/',
    target: 'search',
    title: 'Find anything fast',
    body: 'Search by customer name, phone number or order number (for example WB-0012).',
  },
  {
    id: 'customers',
    route: '/customers',
    target: 'page-actions',
    title: 'Customers',
    body: 'Add a customer with name, phone and address. Each customer keeps their full order history, total paid and balance due.\nTip: you can also add a new customer directly while creating an order.',
  },
  {
    id: 'of-customer',
    route: '/orders/new',
    target: 'of-customer',
    title: 'Step 1 – Choose the customer',
    body: 'Pick an existing customer, or tap New customer to add their name and phone right here.',
  },
  {
    id: 'of-item',
    route: '/orders/new',
    target: 'of-item',
    title: 'Step 2 – What to make',
    body: 'Choose the item type (Wardrobe, Bed, Sofa, Kitchen…), add a short title and set the quantity.',
  },
  {
    id: 'of-naap',
    route: '/orders/new',
    target: 'of-naap',
    title: 'Step 3 – Measurements',
    body: 'Enter Length × Width × Height. Switch between feet and inches anytime – values convert automatically. Add extra measurements and notes when needed.',
  },
  {
    id: 'of-photos',
    route: '/orders/new',
    target: 'of-photos',
    title: 'Step 4 – Design photos',
    body: 'Add design or reference photos (they are compressed automatically) and paste a reference link if the customer sent one.',
  },
  {
    id: 'of-material',
    route: '/orders/new',
    target: 'of-material',
    title: 'Step 5 – Wood & finish',
    body: 'Select the wood type, polish colour and hardware notes so workers know exactly what to use.',
  },
  {
    id: 'of-price',
    route: '/orders/new',
    target: 'of-price',
    title: 'Step 6 – Price & advance',
    body: 'Enter the price, any discount and the advance received. The balance is calculated automatically and a receipt is created for the advance.',
  },
  {
    id: 'of-dates',
    route: '/orders/new',
    target: 'of-dates',
    title: 'Step 7 – Delivery date & priority',
    body: 'Set the promised delivery date and priority. WoodBook counts down the days and warns you before a job is late.',
  },
  {
    id: 'of-workers',
    route: '/orders/new',
    target: 'of-workers',
    title: 'Step 8 – Assign workers',
    body: 'Assign one or more workers. They see this job on their phone – without any prices.',
  },
  {
    id: 'of-save',
    route: '/orders/new',
    target: 'of-save',
    title: 'Save the order',
    body: 'Save to create the order with an automatic number like WB-0001. The job starts at the first stage.',
  },
  {
    id: 'orders',
    route: '/orders',
    target: 'orders-filters',
    title: 'All orders',
    body: 'Search and filter orders by status, stage, item, worker or balance due. Tap any order to open it.',
  },
  {
    id: 'od-stages',
    route: orderDetail,
    target: 'od-stages',
    title: 'Track every stage',
    body: 'Move the job through Measurement → Design → Cutting → Assembly → Polish → Ready → Delivered. Every change is saved with date and time.',
  },
  {
    id: 'od-photos',
    route: orderDetail,
    target: 'od-photos',
    title: 'Progress photos & WhatsApp',
    body: 'Upload progress photos, then tap Send to Customer to share a live status page on WhatsApp. Prices stay hidden unless you allow them.',
  },
  {
    id: 'od-payments',
    route: orderDetail,
    target: 'od-payments',
    title: 'Payments for this order',
    body: 'Record the advance and later instalments in Cash, UPI or Bank. The balance updates automatically and every payment has a printable receipt.',
  },
  {
    id: 'od-print',
    route: orderDetail,
    target: 'od-print',
    title: 'Bill & estimate',
    body: 'Print or save as PDF a bill or an estimate with your workshop name, logo and GST number.',
  },
  {
    id: 'board',
    route: '/board',
    target: 'board',
    title: 'Work progress board',
    body: 'Every active job, grouped by stage or by worker. Drag sideways with the mouse or swipe on the phone to see all columns, and use Next to move a job forward.',
  },
  {
    id: 'delivery',
    route: '/delivery',
    target: 'page-header',
    title: 'Deliveries',
    body: 'Nearest deliveries first, with countdown badges (Today, 3 DAYS, Overdue). Switch to Calendar to plan the whole month.',
  },
  {
    id: 'payments',
    route: '/payments',
    target: 'page-header',
    title: 'Payments & dues',
    body: 'All payments in one place, plus a Due list with one-tap WhatsApp reminders to customers.',
  },
  {
    id: 'workers',
    route: '/karigar',
    target: 'page-actions',
    title: 'Workers',
    body: 'Add workers with skill and phone, keep track of labour paid and due for each job, and create a login so they can update their own jobs.',
  },
  {
    id: 'stock',
    route: '/stock',
    target: 'page-header',
    title: 'Stock',
    body: 'Keep wood, plywood and hardware stock. Record stock in / out and material used for each order. Low stock is highlighted in red.',
  },
  {
    id: 'expenses',
    route: '/expenses',
    target: 'page-actions',
    title: 'Expenses',
    body: 'Record daily workshop expenses by category – material, transport, rent, tools and more.',
  },
  {
    id: 'reports',
    route: '/reports',
    target: 'page-header',
    title: 'Reports',
    body: 'Monthly orders, income received, dues, expenses and worker workload. Export any table to CSV (opens in Excel).',
  },
  {
    id: 'settings',
    route: '/settings',
    target: 'page-header',
    title: 'Settings',
    body: 'Set your workshop name, logo, address, phone and GST for bills. Edit item types, wood types and work stages, change the language, and load or remove demo data.',
  },
  {
    id: 'install',
    target: 'install',
    title: 'Install the app',
    body: 'Install WoodBook on your phone or computer. It opens full screen like a normal app, starts faster and keeps working with weak internet.',
  },
  {
    id: 'finish',
    title: 'You are ready!',
    body: 'Start by adding your first real order with New Order.\nYou can restart this tour anytime from the menu → Take a tour.',
  },
];

export const WORKER_TOUR: TourStep[] = [
  {
    id: 'w-welcome',
    title: 'Welcome, {name}',
    body: 'WoodBook shows you only the jobs assigned to you. This quick tour shows how to update your work.',
  },
  {
    id: 'w-list',
    route: '/jobs',
    target: 'jobs-list',
    title: 'Your jobs',
    body: 'Each card shows the item, delivery date and progress. Tap a job to open it.',
  },
  {
    id: 'w-stages',
    route: jobDetail,
    target: 'job-stages',
    title: 'Update the stage',
    body: 'When you finish a step, tap the next stage. The owner sees it immediately.',
  },
  {
    id: 'w-photos',
    route: jobDetail,
    target: 'job-photos',
    title: 'Add progress photos',
    body: 'Take a photo of the work with your camera. It is uploaded and shared with the owner.',
  },
  {
    id: 'w-install',
    target: 'install',
    title: 'Install the app',
    body: 'Install WoodBook on your phone to open it like a normal app.',
  },
  {
    id: 'w-finish',
    title: 'All set!',
    body: 'Open My Jobs anytime to see your work. You can restart this tour from the menu.',
  },
];
