"use client";

type ContentLoaderProps = {
  label?: string;
  compact?: boolean;
};

export default function ContentLoader({ label = "Carregando conteúdo...", compact = false }: ContentLoaderProps) {
  return (
    <div className={compact ? "kf-content-loader-wrap kf-content-loader-wrap--compact" : "kf-content-loader-wrap"} role="status" aria-live="polite">
      <svg className="kf-content-loader" viewBox="0 0 50 50" aria-hidden="true">
        <rect x="0" y="0" width="50" height="50" />
      </svg>
      <span className="kf-content-loader-label">{label}</span>
    </div>
  );
}
