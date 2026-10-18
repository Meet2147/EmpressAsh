/**
 * App settings. Change these before building for the App Store.
 *
 * Payments never happen inside the app. Booking buttons open the website's
 * checkout (Dodo Payments) in the phone's browser, so money goes straight to
 * Ash's Dodo account. See README.md, "How payments work".
 */
export const CONFIG = {
  // The live website (the FastAPI app on Render). No trailing slash.
  siteUrl: 'https://empressash.onrender.com',

  // Keep false until live video/voice readings open on the website
  // (the website's LIVE_READINGS_OPEN switch). While false, readings show
  // "Opening soon" and invite people to join the circle instead.
  liveReadingsOpen: false,

  contact: {
    email: '', // e.g. 'hello@empressash.com'
    whatsapp: '', // digits only, e.g. '919876543210'
    instagram: '', // full URL
    youtube: '', // full URL
  },
};

export const siteLink = (path: string) => `${CONFIG.siteUrl}${path}`;
