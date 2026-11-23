/** Hinglish translations (admin: dashboard, reports, settings, list editor). Key = exact English text used in t(), value = Hinglish. */
const dict: Record<string, string> = {
  // ---- Dashboard ----
  'View all': 'Sab dekhein',
  'Good morning': 'Good morning',
  'Good afternoon': 'Namaste',
  'Good evening': 'Good evening',
  'Your workshop is ready!': 'Workshop taiyaar hai!',
  'Create your first order, or load demo data to see how FurniCraft works. Also add your workshop name, logo and phone in Settings.':
    'Pehla order banayein, ya demo data daal kar dekhein ki FurniCraft kaise kaam karta hai. Settings mein workshop ka naam, logo aur phone bhi daal dein.',
  'First Order': 'Pehla Order',
  'Load demo data': 'Demo data daalein',
  "Today's deliveries": 'Aaj ki delivery',
  'This week': 'Is hafte delivery',
  'Next 7 days': 'Agle 7 din',
  'In progress': 'Kaam chal raha',
  'Ready, not delivered': 'Ready - delivery baaki',
  'Pending payments': 'Pending payment',
  '{n} orders': '{n} orders',
  'Overdue orders': 'Overdue orders',
  'Deliveries: today + this week': 'Aaj + is hafte delivery',
  'No deliveries this week': 'Is hafte koi delivery nahi',
  'No orders ready yet': 'Abhi koi order ready nahi',
  'Highest dues': 'Sabse zyada baaki',
  'No pending payments': 'Koi payment baaki nahi',
  'Low stock': 'Low stock',
  min: 'min',
  'All stock levels are fine': 'Sab stock theek hai',
  'Recent payments': 'Recent payments',
  'No payments yet': 'Abhi koi payment nahi',

  // ---- Reports ----
  'Business summary · {period}': 'Hisaab-kitaab · {period}',
  Year: 'Saal',
  'Full year': 'Poora saal',
  Month: 'Mahina',
  'Value {amount}': 'Value {amount}',
  'Income received': 'Income mila',
  'Net (income - expenses)': 'Net (income - kharcha)',
  'Total due: {amount}': 'Kul baaki: {amount}',
  'Month-wise - {year}': 'Mahine wise - {year}',
  '{month}: income {income}, expenses {expenses}': '{month}: income {income}, kharcha {expenses}',
  Income: 'Income',
  'Tap a month to filter': 'Mahine par tap karke filter karein',
  'Order value': 'Order value',
  Net: 'Net',
  'Pending dues': 'Baaki payment (dues)',
  'No dues': 'Koi due nahi',
  '+{n} more customers - full list in CSV': '+{n} aur grahak - CSV mein poori list',
  'Expenses by category · {period}': 'Kharcha category wise · {period}',
  'No expenses in this period': 'Is period mein koi kharcha nahi',
  'Worker workload': 'Karigar workload',
  'No workers yet': 'Koi karigar nahi',
  Completed: 'Complete',
  Labour: 'Labour',
  'By item type · {period}': 'Item type wise · {period}',
  'No orders in this period': 'Is period mein koi order nahi',

  // ---- List editor ----
  'Type something first': 'Kuch likhein',
  'This is already in the list': 'Yeh pehle se list mein hai',
  'Move left': 'Baayein karein',
  'Move right': 'Daayein karein',
  'Remove {name}': '{name} hatayein',
  'The list is empty': 'List khaali hai',
  'Type a new name...': 'Naya naam likhein...',

  // ---- Settings: profile ----
  'Please fix the errors in the form': 'Form mein galti hai',
  'Workshop profile saved': 'Workshop profile save ho gaya',
  'Logo updated': 'Logo update ho gaya',
  'Remove logo?': 'Logo hatayein?',
  'Logo removed': 'Logo hata diya',
  'Workshop profile': 'Workshop profile',
  'Change logo': 'Logo badlein',
  'Upload logo': 'Logo upload',
  'Shown on bills, receipts and the customer status page. A square logo works best.':
    'Bill, receipt aur status page par dikhega. Square logo best rahega.',
  'Workshop name': 'Workshop ka naam',
  Tagline: 'Tagline',
  'GSTIN (optional)': 'GSTIN (optional)',
  'You can leave this empty': 'Khaali chhod sakte hain',
  'Bill / estimate terms': 'Bill / estimate terms',
  'Printed at the bottom of bills': 'Bill ke neeche print hoga',
  'Save profile': 'Profile save karein',

  // ---- Settings: lists ----
  'Keep at least 1 item': 'Kam se kam 1 item rakhein',
  '{name} saved': '{name} save ho gaya',
  Unsaved: 'Save nahi hua',
  Default: 'Default',
  'Item types': 'Item types',
  'These options appear when you create an order (Wardrobe, Bed, Table...).':
    'Order banate waqt yeh options dikhenge (Almaari, Bed, Table...).',
  'e.g. Dressing Table': 'jaise Dressing Table',
  'Wood / material types': 'Lakdi / material',
  'Options for the wood type dropdown.': 'Wood type dropdown ke options.',
  'e.g. Oak': 'jaise Oak',
  'Expense categories': 'Kharcha categories',
  'Category options for expenses.': 'Expenses mein category ke options.',
  'e.g. Petrol': 'jaise Petrol',
  'Worker skills': 'Karigar skills',
  'Skill options for workers.': 'Karigar ki skill ke options.',

  // ---- Settings: stages ----
  'At least 3 stages are needed': 'Kam se kam 3 stage chahiye',
  'Stage {n} has no name': 'Stage {n} ka naam khaali hai',
  '"{name}" is used twice': '"{name}" do baar hai',
  '"{name}" % must be between 0 and 100': '"{name}" ka % 0 se 100 ke beech ho',
  '"{name}" % must be higher than the previous stage': '"{name}" ka % pichhli stage se zyada hona chahiye',
  'The last stage (Delivered) must be 100%': 'Aakhri stage (Delivered) 100% honi chahiye',
  'Change stages?': 'Stages badalne hain?',
  '{n} active orders will be matched to the new list by stage number (for example stage 3 = the 3rd stage in the new list). The stage name on each order changes at its next update.':
    '{n} active orders apni stage number ke hisaab se nayi list se match honge (jaise stage 3 = nayi list ki 3rd stage). Order ka stage naam agle update par badlega.',
  'Yes, save': 'Haan, save karein',
  'Stages saved': 'Stages save ho gaye',
  'Work stages': 'Kaam ki stages',
  'Each stage % is shown in the progress bar. The last stage means Delivered and the one before it means Ready (used by the dashboard and delivery list). The % must keep increasing.':
    'Har stage ka % progress bar mein dikhta hai. Aakhri stage = Delivered, aur usse pehle wali = Ready maani jaati hai (dashboard aur delivery list isi se chalti hai). % hamesha badhta hua ho.',
  'Stage name': 'Stage naam',
  'Move up': 'Upar',
  'Move down': 'Neeche',
  'Add stage': 'Stage jodein',
  'Save stages': 'Stages save karein',

  // ---- Settings: recycle bin ----
  'Stock items': 'Stock items',
  Restored: 'Wapas aa gaya',
  'Recycle bin': 'Recycle bin',
  Refresh: 'Refresh',
  'Show deleted items': 'Deleted items dekhein',
  'Deleted orders, customers, workers, stock items and expenses can be restored from here. Restoring an order also restores its payments.':
    'Delete kiye gaye orders, grahak, karigar, stock aur kharcha yahan se wapas la sakte hain. Order wapas laane par uske payments bhi wapas aate hain.',
  'The recycle bin is empty': 'Recycle bin khaali hai',
  Restore: 'Wapas laayein',
  'After restoring a worker, set them as active again from the Workers page.':
    'Karigar restore ke baad Karigar page se unhe dobara active karein.',

  // ---- Settings: demo data ----
  'Load demo data?': 'Demo data daalein?',
  'Sample customers, workers, orders (at different stages), payments, stock and expenses will be added. You can remove them later with "Remove demo data".':
    'Kuch sample grahak, karigar, orders (alag-alag stages), payments, stock aur kharcha jud jayenge. Baad mein "Demo data hatayein" se hata sakte hain.',
  'Yes, load it': 'Haan, daalein',
  'Demo data ready: {orders} orders, {customers} customers, {payments} payments':
    'Demo data taiyaar: {orders} orders, {customers} grahak, {payments} payments',
  'Remove demo data?': 'Demo data hatayein?',
  'Only the demo records will be deleted permanently. Your real data stays safe.':
    'Sirf demo wale records hamesha ke liye delete honge. Aapka asli data safe rahega.',
  '{n} demo records removed': '{n} demo records hata diye',
  'No demo data found': 'Koi demo data nahi mila',
  'Demo data': 'Demo data',
  "Load sample data to try the app - you will see overdue orders, today's deliveries, ready orders, pending payments and low stock.":
    'App try karne ke liye sample data daalein - overdue, aaj ki delivery, ready orders, baaki payments, low stock sab dikhega.',
  'Remove demo data': 'Demo data hatayein',

  // ---- Settings: account + language ----
  'My account': 'Mera account',
  'Owner / Admin': 'Owner / Admin',
  'Create worker logins from the Workers page. Workers only see the jobs assigned to them (no prices or payments).':
    'Karigar ka login Karigar page se banayein - woh sirf apne assign kiye kaam dekh payenge (price/payment nahi).',
  'English is the default. Hinglish is optional. This choice is saved on this device.':
    'Default bhasha English hai. Hinglish optional hai. Yeh choice isi device par save rehti hai.',
  'Workshop profile, lists, stages and data': 'Workshop profile, lists, stages aur data',
};

export default dict;
