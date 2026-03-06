"use client";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-0.5 pb-1 pt-0.5">
      <div className="grid gap-1">
        <h2 className="m-0 text-2xl font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="m-0 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
