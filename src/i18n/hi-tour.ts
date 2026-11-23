/** Hinglish translations (guided tour + install app). Key = exact English text used in t(). */
const dict: Record<string, string> = {
  // ---- Tour UI ----
  'Take a tour': 'App tour dekhein',
  'New to FurniCraft?': 'FurniCraft mein naye hain?',
  'Take a quick guided tour of how to add orders, track work, deliver and collect payments.':
    'Chhota sa tour dekhein - order kaise jodein, kaam kaise track karein, delivery aur payment kaise lein.',
  'Start tour': 'Tour shuru karein',
  'Not now': 'Abhi nahi',
  'Step {n} of {total}': 'Step {n} / {total}',
  'Close tour': 'Tour band karein',
  'Opening...': 'Khul raha hai...',
  'Skip tour': 'Tour chhodein',
  Next: 'Aage',
  Finish: 'Khatam',

  // ---- Owner tour ----
  'Welcome to FurniCraft': 'FurniCraft mein swagat hai',
  'This short tour shows the full workflow of your workshop:\nNew order → measurements → work stages → delivery → payment.\n\nUse Next and Back, or press Skip anytime. You can restart the tour from the menu.':
    'Yeh chhota tour aapke workshop ka poora kaam dikhata hai:\nNaya order → naap → kaam ke stage → delivery → payment.\n\nAage / Peeche dabayein, ya kabhi bhi Tour chhodein. Menu se tour dobara dekh sakte hain.',
  'Your day at a glance': 'Aaj ka poora haal',
  "Today's and this week's deliveries, overdue jobs (in red), work in progress, ready-to-deliver orders and total pending payments. Tap any box to open that list.":
    'Aaj aur is hafte ki delivery, overdue kaam (laal), chal raha kaam, ready orders aur kul baaki payment. Kisi bhi box par tap karke list kholein.',
  'Take a new order': 'Naya order lein',
  'Every job starts here. Tap New Order whenever a customer gives you work.':
    'Har kaam yahin se shuru hota hai. Grahak kaam de to Naya Order dabayein.',
  'Find anything fast': 'Kuch bhi jaldi dhoondein',
  'Search by customer name, phone number or order number (for example FC-0012).':
    'Grahak ka naam, phone number ya order number (jaise FC-0012) se dhoondein.',
  'Add a customer with name, phone and address. Each customer keeps their full order history, total paid and balance due.\nTip: you can also add a new customer directly while creating an order.':
    'Naam, phone aur address ke saath grahak jodein. Har grahak ka poora order history, kul diya aur baaki yahan dikhta hai.\nTip: order banate waqt bhi naya grahak jod sakte hain.',
  'Step 1 – Choose the customer': 'Step 1 – Grahak chunein',
  'Pick an existing customer, or tap New customer to add their name and phone right here.':
    'Purana grahak chunein, ya Naya grahak dabakar yahin naam aur phone jodein.',
  'Step 2 – What to make': 'Step 2 – Kya banana hai',
  'Choose the item type (Wardrobe, Bed, Sofa, Kitchen…), add a short title and set the quantity.':
    'Item chunein (Almaari, Bed, Sofa, Kitchen…), chhota title likhein aur quantity daalein.',
  'Step 3 – Measurements': 'Step 3 – Naap',
  'Enter Length × Width × Height. Switch between feet and inches anytime – values convert automatically. Add extra measurements and notes when needed.':
    'Lambai × Chaudai × Unchai daalein. Feet aur inch kabhi bhi badlein – naap apne aap convert hota hai. Zaroorat ho to extra naap aur notes jodein.',
  'Step 4 – Design photos': 'Step 4 – Design photos',
  'Add design or reference photos (they are compressed automatically) and paste a reference link if the customer sent one.':
    'Design ya reference photos jodein (apne aap chhoti ho jaati hain) aur grahak ne link bheja ho to woh daalein.',
  'Step 5 – Wood & finish': 'Step 5 – Lakdi aur polish',
  'Select the wood type, polish colour and hardware notes so workers know exactly what to use.':
    'Lakdi, polish colour aur hardware likhein taaki karigar ko pata ho kya lagana hai.',
  'Step 6 – Price & advance': 'Step 6 – Price aur advance',
  'Enter the price, any discount and the advance received. The balance is calculated automatically and a receipt is created for the advance.':
    'Price, discount aur mila hua advance daalein. Baaki apne aap nikalta hai aur advance ki receipt ban jaati hai.',
  'Step 7 – Delivery date & priority': 'Step 7 – Delivery date aur priority',
  'Set the promised delivery date and priority. FurniCraft counts down the days and warns you before a job is late.':
    'Delivery date aur priority set karein. FurniCraft din ginta hai aur late hone se pehle batata hai.',
  'Step 8 – Assign workers': 'Step 8 – Karigar lagayein',
  'Assign one or more workers. They see this job on their phone – without any prices.':
    'Ek ya zyada karigar chunein. Unhe yeh kaam apne phone par dikhega – bina price ke.',
  'Save the order': 'Order save karein',
  'Save to create the order with an automatic number like WB-0001. The job starts at the first stage.':
    'Save karte hi order number (jaise WB-0001) apne aap banta hai. Kaam pehle stage se shuru hota hai.',
  'All orders': 'Saare orders',
  'Search and filter orders by status, stage, item, worker or balance due. Tap any order to open it.':
    'Status, stage, item, karigar ya baaki ke hisaab se orders dhoondein. Kisi bhi order par tap karke kholein.',
  'Track every stage': 'Har stage track karein',
  'Move the job through Measurement → Design → Cutting → Assembly → Polish → Ready → Delivered. Every change is saved with date and time.':
    'Kaam ko Naap → Design → Cutting → Assembly → Polish → Ready → Delivered tak le jaayein. Har badlav date aur time ke saath save hota hai.',
  'Progress photos & WhatsApp': 'Progress photos aur WhatsApp',
  'Upload progress photos, then tap Send to Customer to share a live status page on WhatsApp. Prices stay hidden unless you allow them.':
    'Kaam ki photos daalein, phir Grahak ko bhejein dabakar WhatsApp par live status page bhejein. Price tab tak chhupa rehta hai jab tak aap na chahein.',
  'Payments for this order': 'Is order ki payments',
  'Record the advance and later instalments in Cash, UPI or Bank. The balance updates automatically and every payment has a printable receipt.':
    'Advance aur baad ki kisht Cash, UPI ya Bank mein likhein. Baaki apne aap update hota hai aur har payment ki receipt print hoti hai.',
  'Bill & estimate': 'Bill aur estimate',
  'Print or save as PDF a bill or an estimate with your workshop name, logo and GST number.':
    'Workshop ke naam, logo aur GST ke saath bill ya estimate print karein ya PDF banayein.',
  'Work progress board': 'Kaam kahan tak - board',
  'Every active job, grouped by stage or by worker. Drag sideways with the mouse or swipe on the phone to see all columns, and use Next to move a job forward.':
    'Saare chalu kaam, stage ya karigar ke hisaab se. Mouse se side mein kheenchein ya phone par swipe karein, aur Next se kaam aage badhayein.',
  'Nearest deliveries first, with countdown badges (Today, 3 DAYS, Overdue). Switch to Calendar to plan the whole month.':
    'Sabse paas wali delivery pehle, countdown ke saath (Aaj, 3 DIN, Overdue). Poore mahine ke liye Calendar dekhein.',
  'Payments & dues': 'Payments aur baaki',
  'All payments in one place, plus a Due list with one-tap WhatsApp reminders to customers.':
    'Saari payments ek jagah, aur baaki list se ek tap mein WhatsApp reminder.',
  'Add workers with skill and phone, keep track of labour paid and due for each job, and create a login so they can update their own jobs.':
    'Karigar ko skill aur phone ke saath jodein, har kaam ki majdoori diya/baaki dekhein, aur login banayein taaki woh apna kaam khud update karein.',
  'Keep wood, plywood and hardware stock. Record stock in / out and material used for each order. Low stock is highlighted in red.':
    'Lakdi, ply aur hardware ka stock rakhein. Stock in / out aur har order mein laga maal likhein. Kam stock laal mein dikhta hai.',
  'Record daily workshop expenses by category – material, transport, rent, tools and more.':
    'Workshop ka roz ka kharcha category ke saath likhein – maal, transport, kiraya, auzaar wagairah.',
  'Monthly orders, income received, dues, expenses and worker workload. Export any table to CSV (opens in Excel).':
    'Mahine ke orders, aamdani, baaki, kharcha aur karigar ka kaam. Koi bhi table CSV (Excel) mein nikaalein.',
  'Set your workshop name, logo, address, phone and GST for bills. Edit item types, wood types and work stages, change the language, and load or remove demo data.':
    'Bill ke liye workshop ka naam, logo, address, phone aur GST set karein. Item, lakdi aur stages badlein, bhasha badlein, aur demo data daalein ya hatayein.',
  'Install the app': 'App install karein',
  'Install FurniCraft on your phone or computer. It opens full screen like a normal app, starts faster and keeps working with weak internet.':
    'FurniCraft ko phone ya computer par install karein. Yeh normal app ki tarah poori screen par khulta hai, jaldi chalta hai aur kamzor internet mein bhi kaam karta hai.',
  'You are ready!': 'Aap taiyaar hain!',
  'Start by adding your first real order with New Order.\nYou can restart this tour anytime from the menu → Take a tour.':
    'Naya Order se apna pehla asli order jodein.\nMenu → App tour dekhein se yeh tour kabhi bhi dobara dekh sakte hain.',

  // ---- Worker tour ----
  'Welcome, {name}': 'Swagat hai, {name}',
  'FurniCraft shows you only the jobs assigned to you. This quick tour shows how to update your work.':
    'FurniCraft mein aapko sirf aapke kaam dikhte hain. Yeh tour dikhata hai kaam kaise update karein.',
  'Your jobs': 'Aapke kaam',
  'Each card shows the item, delivery date and progress. Tap a job to open it.':
    'Har card mein item, delivery date aur progress hai. Kaam par tap karke kholein.',
  'Update the stage': 'Stage update karein',
  'When you finish a step, tap the next stage. The owner sees it immediately.':
    'Ek step poora hote hi agla stage dabayein. Owner ko turant dikh jaata hai.',
  'Add progress photos': 'Kaam ki photo daalein',
  'Take a photo of the work with your camera. It is uploaded and shared with the owner.':
    'Camera se kaam ki photo khinchein. Woh upload hokar owner tak pahunch jaati hai.',
  'Install FurniCraft on your phone to open it like a normal app.': 'FurniCraft ko phone par install karein, normal app ki tarah khulega.',
  'All set!': 'Sab taiyaar!',
  'Open My Jobs anytime to see your work. You can restart this tour from the menu.':
    'Apna kaam dekhne ke liye kabhi bhi Mera Kaam kholein. Tour menu se dobara dekh sakte hain.',

  // ---- Install / PWA ----
  'Install app': 'App install karein',
  Install: 'Install',
  'Install FurniCraft': 'FurniCraft install karein',
  'Install FurniCraft app': 'FurniCraft app install karein',
  'Opens full screen, faster, works offline': 'Poori screen, tez, offline bhi chalta hai',
  'Install once and open FurniCraft full screen from your home screen, like a normal app.':
    'Ek baar install karein aur home screen se normal app ki tarah poori screen par kholein.',
  'Open this page in Safari and tap the Share button at the bottom.': 'Yeh page Safari mein kholein aur neeche Share button dabayein.',
  'Scroll down and tap "Add to Home Screen".': 'Neeche scroll karke "Add to Home Screen" dabayein.',
  'Tap "Add". FurniCraft now appears on your home screen.': '"Add" dabayein. FurniCraft aapki home screen par aa jaayega.',
  'Chrome / Edge: click the install icon in the address bar, or open the browser menu (⋮) and choose "Install app" / "Add to Home screen".':
    'Chrome / Edge: address bar mein install icon dabayein, ya menu (⋮) kholkar "Install app" / "Add to Home screen" chunein.',
  'Android: open the Chrome menu (⋮) and tap "Install app" or "Add to Home screen".':
    'Android: Chrome menu (⋮) kholkar "Install app" ya "Add to Home screen" dabayein.',
  'FurniCraft app installed': 'FurniCraft app install ho gaya',
  'A new version of FurniCraft is ready': 'FurniCraft ka naya version taiyaar hai',
  Reload: 'Reload karein',
  App: 'App',
};

export default dict;
