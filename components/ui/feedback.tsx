import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle, Info, LucideIcon } from 'lucide-react';
import { Button } from './button';

// ---------------- Skeleton ----------------
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--surface-muted)]', className)}
      {...props}
    />
  );
}

// ---------------- Banner ----------------
export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
}

export function Banner({
  variant = 'info',
  title,
  children,
  className,
  ...props
}: BannerProps) {
  const styles = {
    info: 'bg-[#EDF5FA] text-[#2D6A9F] border-[#C6DFEF] dark:bg-[#182C3D] dark:text-[#72B4EB]',
    warning: 'bg-[#FEF5E7] text-[#B7791F] border-[#FADBB0] dark:bg-[#3D2C12] dark:text-[#E8AF59]',
    danger: 'bg-[#FDF2F0] text-[#B3392F] border-[#F8C8C4] dark:bg-[#3D1A18] dark:text-[#E8736B]',
    success: 'bg-[#EBF7EE] text-[#2F7D5B] border-[#C5E8CE] dark:bg-[#1C3627] dark:text-[#67D19B]',
  };

  const icons = {
    info: Info,
    warning: AlertTriangle,
    danger: AlertCircle,
    success: CheckCircle,
  };

  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 text-sm font-medium',
        styles[variant],
        className
      )}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h5 className="mb-1 font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
}

// ---------------- Empty State ----------------
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Info,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center',
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted-foreground)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
