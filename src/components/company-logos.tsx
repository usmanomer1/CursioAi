import {
  siAirbnb,
  siAtlassian,
  siCoinbase,
  siGoldmansachs,
  siGoogle,
  siMeta,
  siNetflix,
  siNvidia,
  siShopify,
  siSpotify,
  siStripe,
  siUber,
} from "simple-icons";

interface Brand {
  name: string;
  path: string;
  /** Hide the wordmark text when the glyph alone is iconic (e.g. Uber). */
  glyphOnly?: boolean;
}

export const COMPANY_LOGOS: Brand[] = [
  { name: "Goldman Sachs", path: siGoldmansachs.path },
  { name: "Google", path: siGoogle.path },
  { name: "Meta", path: siMeta.path },
  { name: "Stripe", path: siStripe.path },
  { name: "Shopify", path: siShopify.path },
  { name: "Netflix", path: siNetflix.path },
  { name: "Spotify", path: siSpotify.path },
  { name: "Uber", path: siUber.path },
  { name: "NVIDIA", path: siNvidia.path },
  { name: "Airbnb", path: siAirbnb.path },
  { name: "Coinbase", path: siCoinbase.path },
  { name: "Atlassian", path: siAtlassian.path },
];

/** Monochrome brand lockup: official glyph + name, inheriting currentColor. */
export function BrandMark({ brand }: { brand: Brand }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6 fill-current"
      >
        <path d={brand.path} />
      </svg>
      {!brand.glyphOnly && (
        <span className="whitespace-nowrap text-base font-semibold tracking-tight">
          {brand.name}
        </span>
      )}
    </span>
  );
}
