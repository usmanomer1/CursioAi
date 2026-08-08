/**
 * Resolve a JSearch `country` code from whatever the user typed in the
 * location box.
 *
 * JSearch scopes results by country and defaults to "us", so a search for
 * "Vancouver" without this returns US listings — the query text says Vancouver
 * while the filter says United States, which reads to the user as "no jobs
 * found". We infer the country instead of forcing an extra dropdown; typing
 * "Vancouver, Canada" or "Toronto, ON" acts as an explicit override.
 *
 * Only unambiguous names are listed. Anything that could plausibly be a US
 * place (London, Richmond, Birmingham, Paris TX…) is deliberately absent so it
 * falls through to the caller's default rather than guessing wrong.
 */

/** Country names and aliases → ISO 3166-1 alpha-2, lowercased for JSearch. */
const COUNTRIES: Record<string, string> = {
  canada: "ca",
  // Deliberately no bare "ca": in a location string it means California far
  // more often than Canada ("San Francisco, CA"). "Vancouver, CA" still
  // resolves via the city table below.
  can: "ca",
  "united states": "us",
  usa: "us",
  us: "us",
  "u s a": "us",
  america: "us",
  "united kingdom": "gb",
  uk: "gb",
  gb: "gb",
  britain: "gb",
  "great britain": "gb",
  england: "gb",
  scotland: "gb",
  wales: "gb",
  ireland: "ie",
  germany: "de",
  france: "fr",
  spain: "es",
  italy: "it",
  portugal: "pt",
  netherlands: "nl",
  holland: "nl",
  belgium: "be",
  switzerland: "ch",
  austria: "at",
  sweden: "se",
  norway: "no",
  denmark: "dk",
  finland: "fi",
  poland: "pl",
  "czech republic": "cz",
  czechia: "cz",
  australia: "au",
  "new zealand": "nz",
  india: "in",
  singapore: "sg",
  japan: "jp",
  "south korea": "kr",
  korea: "kr",
  "hong kong": "hk",
  china: "cn",
  "united arab emirates": "ae",
  uae: "ae",
  israel: "il",
  mexico: "mx",
  brazil: "br",
  argentina: "ar",
  "south africa": "za",
  pakistan: "pk",
  nigeria: "ng",
  kenya: "ke",
  philippines: "ph",
  indonesia: "id",
  malaysia: "my",
  vietnam: "vn",
  thailand: "th",
};

/** Canadian province names — unambiguous, so safe to match anywhere. */
const CA_PROVINCES = [
  "british columbia",
  "ontario",
  "quebec",
  "québec",
  "alberta",
  "manitoba",
  "saskatchewan",
  "nova scotia",
  "new brunswick",
  "newfoundland",
  "labrador",
  "prince edward island",
  "yukon",
  "nunavut",
  "northwest territories",
];

/**
 * Two-letter subdivision codes. Only trusted when they appear after a comma
 * ("Toronto, ON") or fully uppercase in the raw input ("VANCOUVER BC") —
 * otherwise "on", "in" and "me" would match ordinary words.
 */
const CA_PROVINCE_CODES = new Set([
  "bc", "ab", "sk", "mb", "on", "qc", "nb", "ns", "pe", "nl", "yt", "nt", "nu",
]);

/** Cities with no well-known US namesake, mapped to their country. */
const CITIES: Record<string, string> = {
  // Canada
  vancouver: "ca",
  toronto: "ca",
  montreal: "ca",
  montréal: "ca",
  calgary: "ca",
  edmonton: "ca",
  ottawa: "ca",
  winnipeg: "ca",
  mississauga: "ca",
  brampton: "ca",
  burnaby: "ca",
  markham: "ca",
  vaughan: "ca",
  gatineau: "ca",
  laval: "ca",
  oshawa: "ca",
  saskatoon: "ca",
  regina: "ca",
  halifax: "ca",
  moncton: "ca",
  sherbrooke: "ca",
  kelowna: "ca",
  abbotsford: "ca",
  coquitlam: "ca",
  langley: "ca",
  scarborough: "ca",
  etobicoke: "ca",
  "north york": "ca",
  "richmond hill": "ca",
  "quebec city": "ca",
  "st catharines": "ca",
  "thunder bay": "ca",
  sudbury: "ca",
  guelph: "ca",
  barrie: "ca",
  nanaimo: "ca",
  kanata: "ca",
  // Elsewhere
  manchester: "gb",
  edinburgh: "gb",
  glasgow: "gb",
  leeds: "gb",
  bristol: "gb",
  berlin: "de",
  munich: "de",
  münchen: "de",
  hamburg: "de",
  frankfurt: "de",
  amsterdam: "nl",
  rotterdam: "nl",
  brussels: "be",
  zurich: "ch",
  zürich: "ch",
  geneva: "ch",
  vienna: "at",
  stockholm: "se",
  oslo: "no",
  copenhagen: "dk",
  helsinki: "fi",
  warsaw: "pl",
  prague: "cz",
  madrid: "es",
  barcelona: "es",
  lisbon: "pt",
  milan: "it",
  rome: "it",
  sydney: "au",
  melbourne: "au",
  brisbane: "au",
  perth: "au",
  auckland: "nz",
  wellington: "nz",
  bangalore: "in",
  bengaluru: "in",
  mumbai: "in",
  "new delhi": "in",
  hyderabad: "in",
  pune: "in",
  chennai: "in",
  kolkata: "in",
  gurgaon: "in",
  noida: "in",
  karachi: "pk",
  lahore: "pk",
  islamabad: "pk",
  tokyo: "jp",
  osaka: "jp",
  seoul: "kr",
  shanghai: "cn",
  beijing: "cn",
  shenzhen: "cn",
  dubai: "ae",
  "abu dhabi": "ae",
  "tel aviv": "il",
  johannesburg: "za",
  "cape town": "za",
  nairobi: "ke",
  lagos: "ng",
  manila: "ph",
  jakarta: "id",
  "kuala lumpur": "my",
  bangkok: "th",
  "ho chi minh city": "vn",
  hanoi: "vn",
  "mexico city": "mx",
  "sao paulo": "br",
  "são paulo": "br",
  "rio de janeiro": "br",
  "buenos aires": "ar",
};

/**
 * Best-effort country for a free-text location. Returns undefined when nothing
 * matches confidently, so callers keep their own default.
 */
export function resolveCountry(location?: string): string | undefined {
  if (!location) return undefined;

  const raw = location.trim();
  if (!raw) return undefined;

  // Normalise punctuation to spaces but remember where the commas were, since
  // a trailing "…, ON" is what makes a two-letter code trustworthy.
  const segments = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const normalized = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  // 1. An explicit country anywhere wins — that's the user overriding us.
  for (const [name, code] of Object.entries(COUNTRIES)) {
    if (name.length <= 3) continue; // codes handled below, too collision-prone
    if (new RegExp(`(^| )${name}( |$)`, "u").test(normalized)) return code;
  }
  // Bare country codes/short aliases, but only as their own comma segment.
  for (const seg of segments) {
    const code = COUNTRIES[seg.toLowerCase()];
    if (code && seg.length <= 3) return code;
  }

  // 2. Canadian province names.
  for (const province of CA_PROVINCES) {
    if (new RegExp(`(^| )${province}( |$)`, "u").test(normalized)) return "ca";
  }

  // 3. Two-letter province codes, only when clearly a subdivision token.
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const lower = seg.toLowerCase();
    if (!CA_PROVINCE_CODES.has(lower)) continue;
    const isTrailingSegment = i > 0; // "Toronto, ON"
    const wasUppercase = seg === seg.toUpperCase();
    if (isTrailingSegment || wasUppercase) return "ca";
  }

  // 4. Known cities — longest name first so "quebec city" beats "quebec".
  const cityNames = Object.keys(CITIES).sort((a, b) => b.length - a.length);
  for (const city of cityNames) {
    if (new RegExp(`(^| )${city}( |$)`, "u").test(normalized)) {
      return CITIES[city];
    }
  }

  return undefined;
}
