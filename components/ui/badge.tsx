import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Sparkles,
  MessageSquare,
  Scale,
  Check,
  X,
  Trash2,
  Pencil,
  Clock,
  AlertTriangle,
  Hourglass,
  Play,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]',
        primary: 'bg-[var(--primary)] text-[var(--primary-foreground)]',
        success: 'bg-[#EBF7EE] text-[#2F7D5B] dark:bg-[#1C3627] dark:text-[#67D19B] border border-[#C5E8CE]',
        warning: 'bg-[#FEF5E7] text-[#B7791F] dark:bg-[#3D2C12] dark:text-[#E8AF59] border border-[#FADBB0]',
        danger: 'bg-[#FDF2F0] text-[#B3392F] dark:bg-[#3D1A18] dark:text-[#E8736B] border border-[#F8C8C4]',
        info: 'bg-[#EDF5FA] text-[#2D6A9F] dark:bg-[#182C3D] dark:text-[#72B4EB] border border-[#C6DFEF]',
        muted: 'bg-[var(--surface-muted)] text-[var(--muted-foreground)] border border-[var(--border)]',
        accent: 'bg-[var(--accent-soft)] text-[var(--primary)] border border-[var(--accent)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type StatusType =
  | 'new'
  | 'contacted'
  | 'quoted'
  | 'negotiating'
  | 'converted'
  | 'accepted'
  | 'approved'
  | 'completed'
  | 'paid'
  | 'delivered'
  | 'done'
  | 'lost'
  | 'rejected'
  | 'cancelled'
  | 'voided'
  | 'junk'
  | 'draft'
  | 'sent'
  | 'pending'
  | 'partially_paid'
  | 'unpaid'
  | 'overdue'
  | 'blocked'
  | 'behind_schedule'
  | 'expired'
  | 'superseded'
  | 'in_progress'
  | 'confirmed';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  status?: StatusType;
}

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  let variant: VariantProps<typeof badgeVariants>['variant'] = 'default';
  let Icon = Sparkles;
  const label = status.replace(/_/g, ' ');

  switch (status) {
    case 'new':
      variant = 'info';
      Icon = Sparkles;
      break;
    case 'contacted':
    case 'quoted':
      variant = 'warning';
      Icon = MessageSquare;
      break;
    case 'negotiating':
      variant = 'accent';
      Icon = Scale;
      break;
    case 'converted':
    case 'accepted':
    case 'approved':
    case 'completed':
    case 'paid':
    case 'delivered':
    case 'done':
      variant = 'success';
      Icon = Check;
      break;
    case 'lost':
    case 'rejected':
    case 'cancelled':
    case 'voided':
      variant = 'danger';
      Icon = X;
      break;
    case 'junk':
      variant = 'muted';
      Icon = Trash2;
      break;
    case 'draft':
      variant = 'muted';
      Icon = Pencil;
      break;
    case 'sent':
    case 'pending':
    case 'partially_paid':
    case 'unpaid':
      variant = 'warning';
      Icon = Clock;
      break;
    case 'overdue':
    case 'blocked':
    case 'behind_schedule':
      variant = 'danger';
      Icon = AlertTriangle;
      break;
    case 'expired':
    case 'superseded':
      variant = 'muted';
      Icon = Hourglass;
      break;
    case 'in_progress':
      variant = 'info';
      Icon = Play;
      break;
    case 'confirmed':
      variant = 'info';
      Icon = Calendar;
      break;
  }

  return (
    <div className={cn(badgeVariants({ variant }), 'capitalize', className)}>
      <Icon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
