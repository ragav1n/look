/**
 * Indian states and union territories with the province codes Shopify accepts
 * as `zoneCode` on a CustomerAddress write.
 *
 * These are Shopify's codes, which differ from ISO 3166-2:IN in four places —
 * Uttarakhand is UK (not UT), Chhattisgarh CG (not CT), Telangana TS (not TG),
 * and Shopify still lists Dadra and Nagar Haveli (DN) and Daman and Diu (DD)
 * separately rather than as the merged DH territory. Checked against Shopify's
 * published province list; don't "correct" them to ISO or writes start failing
 * for those states.
 */
export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "DN", name: "Dadra and Nagar Haveli" },
  { code: "DD", name: "Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

const BY_CODE = new Map(INDIAN_STATES.map((s) => [s.code, s.name]));
const BY_NAME = new Map(INDIAN_STATES.map((s) => [s.name.toLowerCase(), s.code]));

export const stateNameFor = (code: string): string => BY_CODE.get(code) ?? code;

/** Best-effort name → code, for addresses saved before the picker existed. */
export const stateCodeFor = (name: string): string =>
  BY_NAME.get(name.trim().toLowerCase()) ?? "";
