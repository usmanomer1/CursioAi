import { cn } from "@/lib/utils";

/**
 * Cursio mark — an angular "C" chevron with a layered ribbon fold,
 * rendered in the brand blue→cyan gradient.
 *
 * Gradient ids are suffixed per-instance so multiple marks on one page
 * (e.g. sidebar + mobile bar) don't collide in the SVG id namespace.
 */
export function LogoMark({
  className,
  id = "default",
}: {
  className?: string;
  id?: string;
}) {
  const g1 = `cursio-g1-${id}`;
  const g2 = `cursio-g2-${id}`;
  const g3 = `cursio-g3-${id}`;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={g1} x1="20" y1="18" x2="82" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="0.55" stopColor="#2E7BF6" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={g2} x1="18" y1="84" x2="86" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="0.5" stopColor="#2563EB" />
          <stop offset="1" stopColor="#38E0F0" />
        </linearGradient>
        <linearGradient id={g3} x1="34" y1="34" x2="74" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" stopOpacity="0.95" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* upper arm of the C, folding to a sharp point on the right */}
      <path
        d="M96 12 L44 12 C40.5 12 37.4 13.5 35.2 16.1 L6.6 47.4 C4.6 49.6 4.6 52.6 6.6 54.8 L20.4 69.9 L34.6 46.2 C36.9 42.4 41 40 45.4 40 L74.8 40 Z"
        fill={`url(#${g1})`}
      />

      {/* lower arm, mirrored */}
      <path
        d="M96 88 L44 88 C40.5 88 37.4 86.5 35.2 83.9 L6.6 52.6 C4.6 50.4 4.6 47.4 6.6 45.2 L20.4 30.1 L34.6 53.8 C36.9 57.6 41 60 45.4 60 L74.8 60 Z"
        fill={`url(#${g2})`}
      />

      {/* inner ribbon highlight where the two arms overlap */}
      <path
        d="M20.4 30.1 L34.6 53.8 C36.9 57.6 41 60 45.4 60 L74.8 60 L60 49.6 L45.4 40 C41 40 36.9 42.4 34.6 46.2 Z"
        fill={`url(#${g3})`}
        opacity="0.85"
      />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
  size = "md",
  id,
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  id?: string;
}) {
  const mark = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" }[size];
  const text = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={mark} id={id} />
      {showText && (
        <span
          className={cn(
            "font-bold tracking-tight text-fg",
            text
          )}
        >
          Cursio
        </span>
      )}
    </span>
  );
}
