import React from 'react';

export function MaoSeal({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-label="Sello tradicional Restaurante Mao"
      role="img"
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="4"
        fill="#A61C1C"
        stroke="#8B1515"
        strokeWidth="2"
      />
      <rect
        x="9"
        y="9"
        width="46"
        height="46"
        rx="2"
        fill="none"
        stroke="#FAF8F5"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      {/* Stylized traditional Chinese character 毛 (Mao) */}
      <path
        d="M44 16 C36 18 27 19 20 19 M18 28 L46 28 M16 38 L48 36 M32 18 L32 42 C32 46 34 48 41 48 L47 48 C48 48 49 46 49 43"
        fill="none"
        stroke="#FAF8F5"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MingLatticeCorner({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M2 30 V2 H30 M2 10 H10 V2 M10 18 H18 V10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function SectionHeader({
  index,
  title,
  subtitle,
  chineseSub,
}: {
  index: string;
  title: string;
  subtitle: string;
  chineseSub?: string;
}) {
  return (
    <div className="mb-6 pb-4 border-b border-stone-200 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-1.5">
          <span className="font-mono text-[#A61C1C] tabular-nums">{index}</span>
          {chineseSub && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tracking-wide text-stone-500">{chineseSub}</span>
            </>
          )}
        </div>
        <h2
          className="text-2xl md:text-3xl font-semibold text-stone-900 tracking-tight"
          style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
        >
          {title}
        </h2>
      </div>
      <p className="text-sm text-stone-600 max-w-xl leading-relaxed">{subtitle}</p>
    </div>
  );
}
