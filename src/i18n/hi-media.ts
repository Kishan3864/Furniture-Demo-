/** Hinglish translations (photos/videos, login tabs, misc). Key = exact English text used in t(). */
const dict: Record<string, string> = {
  // ---- Photos & videos ----
  'Play video': 'Video chalayein',
  'View photo': 'Photo dekhein',
  Video: 'Video',
  Previous: 'Pichla',
  'Loading video...': 'Video load ho raha hai...',
  '{n} file(s) uploaded': '{n} file upload ho gayi',
  'Only photos and videos can be uploaded': 'Sirf photo aur video upload ho sakte hain',
  'Take photo': 'Photo khinchein',
  'Record video': 'Video banayein',
  'From gallery': 'Gallery se',
  'Uploading {i} of {n}...': 'Upload ho raha hai {i} / {n}...',
  'Keep this screen open until the upload finishes.': 'Upload poora hone tak yeh screen khuli rakhein.',
  'Photos are compressed automatically. Videos up to {mb} MB.': 'Photo apne aap chhoti hoti hai. Video {mb} MB tak.',
  'Video is too large (max {mb} MB). Please record a shorter clip.': 'Video bahut bada hai (max {mb} MB). Chhota video banayein.',
  'Video not found': 'Video nahi mila',
  'Site photos & videos': 'Site ki photos aur videos',
  '{p} photos · {v} videos': '{p} photo · {v} video',
  'Created from a site visit - open sizes': 'Site visit se bana order - naap dekhein',
  'No site photos or videos yet': 'Abhi site ki koi photo ya video nahi',
  'Delete this video?': 'Yeh video delete karein?',
  'Delete this photo?': 'Yeh photo delete karein?',

  'See the photos and videos from the customer’s site. You can also add new site photos or record a video.':
    'Grahak ki site ki photos aur videos dekhein. Aap nayi photo ya video bhi daal sakte hain.',

  // ---- Login (admin / worker) ----
  'Admin login': 'Owner login',
  'Worker login': 'Karigar login',
  'Admin sign in': 'Owner login',
  'Worker sign in': 'Karigar login',
  'Full access: orders, payments, workers, reports and settings.': 'Poora access: orders, payments, karigar, reports aur settings.',
  'See your assigned jobs, update the stage and add photos and videos.': 'Apna kaam dekhein, stage badlein aur photo/video daalein.',
  'This is a worker account. Please use Worker login.': 'Yeh karigar ka account hai. Karigar login use karein.',
  'This is an admin account. Please use Admin login.': 'Yeh owner ka account hai. Owner login use karein.',
};

export default dict;
