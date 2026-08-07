import type { SyntheticEvent } from 'react';

export const handleImgError = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
};

interface AssetImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
}

export function AssetImage({ src, alt, className, loading = 'lazy', onLoad }: AssetImageProps) {
  if (!src) return null;
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={handleImgError}
      onLoad={onLoad}
    />
  );
}

export function LocationBadge({ path }: { path: string }) {
  return (
    <span
      className="absolute top-2 left-2 right-2 md:top-3 md:left-3 md:right-3 z-10 inline-flex items-center gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 rounded-md bg-white/95 text-[#121014] text-[8px] md:text-[9px] font-[Space_Mono] font-semibold tracking-[0.02em] shadow-[0_2px_10px_rgba(0,0,0,0.35)] w-fit max-w-[calc(100%-1rem)]"
      aria-hidden="true"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <span className="truncate">{path}</span>
    </span>
  );
}
