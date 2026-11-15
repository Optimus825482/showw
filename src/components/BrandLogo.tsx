interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "h-9 w-9 rounded-xl",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-2xl",
};

export function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden shadow-sm ring-1 ring-slate-200/80 ${SIZE_CLASSES[size]} ${className}`}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        fill="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient
            id="showBufeLogoGrad"
            x1="48"
            y1="32"
            x2="464"
            y2="480"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="55%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="url(#showBufeLogoGrad)" />
        <rect
          x="24"
          y="24"
          width="464"
          height="464"
          rx="92"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="8"
        />
        <path
          d="M256 80c18 22 26 40 20 56-4 12-12 18-20 22-8-4-16-10-20-22-6-16 2-34 20-56z"
          fill="#fbbf24"
        />
        <path
          d="M196 106c10 14 14 26 10 38-3 8-8 12-13 15-5-3-10-7-12-14-4-12 2-25 15-39z"
          fill="#fbbf24"
          fillOpacity="0.9"
        />
        <path
          d="M316 106c10 14 14 26 10 38-3 8-8 12-13 15-5-3-10-7-12-14-4-12 2-25 15-39z"
          fill="#fbbf24"
          fillOpacity="0.9"
        />
        <circle cx="256" cy="190" r="20" fill="#ffffff" />
        <path
          d="M116 332c0-78 62.68-140 140-140s140 62 140 140H116z"
          fill="#ffffff"
        />
        <path
          d="M158 308c8-46 42-80 86-88"
          stroke="#bae6fd"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <rect x="86" y="348" width="340" height="30" rx="15" fill="#ffffff" />
        <rect
          x="156"
          y="398"
          width="200"
          height="24"
          rx="12"
          fill="#fbbf24"
        />
      </svg>
    </div>
  );
}
