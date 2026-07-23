/** Single source of truth for LOOK brand + contact details.
 *  Use these everywhere (footer, contact, policy pages) instead of literals. */
export const site = {
  name: "LOOK",
  tagline: "Modern Western Essentials",
  email: "support@look.ind.in",
  emailHref: "mailto:support@look.ind.in",
  phone: "+91 91500 02116",
  phoneHref: "tel:+919150002116",
  // WhatsApp click-to-chat (wa.me needs digits only, incl. country code)
  whatsapp: "919150002116",
  whatsappHref: "https://wa.me/919150002116?text=Hi%20LOOK%2C%20I%20have%20a%20question",
  instagram: "https://www.instagram.com/look_.in",
  instagramHandle: "@look_.in",
  founder: "Sushmitha",
} as const;
