import DOMPurify from "dompurify";

/**
 * Sanitize store-authored rich HTML (Shopify product `descriptionHtml`) before
 * it is handed to dangerouslySetInnerHTML.
 *
 * The Storefront API does NOT strip dangerous markup for you — that assumption
 * was a myth. DOMPurify removes <script>, inline event handlers (onerror/onclick
 * …) and javascript:/data: URLs while keeping the tables, lists, links and
 * formatting a real product description uses. The site's CSP (`script-src
 * 'self'`) is the second line of defence if this is ever bypassed.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
