'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { StatusBadge, StatusType } from '@/components/ui/badge';
import {
  MoneyInput,
  PercentInput,
  PhoneInput,
  DatePicker,
} from '@/components/ui/specialized-inputs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Banner, EmptyState, Skeleton } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/lib/money';
import { Calendar } from 'lucide-react';

export default function ComponentGalleryPage() {
  const [money, setMoney] = React.useState<bigint>(15000000n);
  const [bps, setBps] = React.useState<number>(1800);
  const [phone, setPhone] = React.useState<string>('+919840012345');
  const [date, setDate] = React.useState<string>('2026-11-15');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  const statuses: StatusType[] = [
    'new',
    'contacted',
    'quoted',
    'negotiating',
    'converted',
    'accepted',
    'approved',
    'completed',
    'paid',
    'delivered',
    'done',
    'lost',
    'rejected',
    'cancelled',
    'voided',
    'junk',
    'draft',
    'sent',
    'pending',
    'partially_paid',
    'unpaid',
    'overdue',
    'blocked',
    'behind_schedule',
    'expired',
    'superseded',
    'in_progress',
    'confirmed',
  ];

  return (
    <div className={isDark ? 'dark bg-[#141217] text-[#F1EEF3] min-h-screen p-8' : 'bg-[#F7F9F6] text-[#171D19] min-h-screen p-8'}>
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="flex items-center justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Design System & Component Gallery</h1>
            <p className="text-sm opacity-70 mt-1">
              Internal development reference for VOWS Studio "Serene Editorial" UI tokens & base components.
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsDark(!isDark)}>
            Toggle Theme: {isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
          </Button>
        </div>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Buttons & Actions</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary Action</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="primary" isLoading>Loading State</Button>
            <Button variant="link">Link Button</Button>
          </div>
        </section>

        {/* Status Badges Map (§6) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Status Badges (§6 Specification Map)</h2>
          <div className="flex flex-wrap gap-2.5 p-4 rounded-xl border bg-[var(--surface)]">
            {statuses.map((st) => (
              <StatusBadge key={st} status={st} />
            ))}
          </div>
        </section>

        {/* Specialized Financial & Format Inputs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Specialized Format Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-xl border bg-[var(--surface)]">
            <div>
              <label className="text-xs font-semibold mb-1 block">Money (Paise Engine)</label>
              <MoneyInput value={money} onChange={setMoney} />
              <span className="text-[11px] opacity-70 mt-1 block">Raw paise: {money.toString()} ({formatINR(money)})</span>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Percentage (Basis Points)</label>
              <PercentInput value={bps} onChange={setBps} />
              <span className="text-[11px] opacity-70 mt-1 block">Stored bps: {bps} ({bps / 100}%)</span>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Phone (Indian Mobile E.164)</label>
              <PhoneInput value={phone} onChange={setPhone} />
              <span className="text-[11px] opacity-70 mt-1 block">Formatted: {phone}</span>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Date Picker (IST)</label>
              <DatePicker value={date} onChange={setDate} />
              <span className="text-[11px] opacity-70 mt-1 block">Value: {date}</span>
            </div>
          </div>
        </section>

        {/* Form Inputs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Standard Inputs & Validation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Client Full Name (e.g. Samantha Pinto)" />
            <Input placeholder="Invalid Field Example" error="This field is required per schema." />
            <div className="md:col-span-2">
              <Textarea placeholder="Notes for couple or internal production instructions..." />
            </div>
          </div>
        </section>

        {/* Banners */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Banners & Feedback</h2>
          <div className="space-y-3">
            <Banner variant="info" title="System Notice">
              Supabase backup snapshot scheduled for 03:00 IST.
            </Banner>
            <Banner variant="warning" title="Gmail Needs Reconnection">
              Google OAuth tokens invalidated. Please reconnect your studio email account in Settings.
            </Banner>
            <Banner variant="danger" title="Overdue Invoices">
              2 client invoices have exceeded the 15-day credit period.
            </Banner>
            <Banner variant="success" title="Quotation Accepted">
              Client accepted proposal QT-2026-000001. Ready to convert to booking.
            </Banner>
          </div>
        </section>

        {/* Data Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Data Table Layout</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document No</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">QT-2026-000001</TableCell>
                <TableCell>Samantha Pinto & Derick D'Souza</TableCell>
                <TableCell>15 Nov 2026</TableCell>
                <TableCell><StatusBadge status="accepted" /></TableCell>
                <TableCell className="text-right font-medium tabular-nums">₹1,50,000.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">INV-2026-000012</TableCell>
                <TableCell>Michelle Roy & Alister Coelho</TableCell>
                <TableCell>22 Nov 2026</TableCell>
                <TableCell><StatusBadge status="overdue" /></TableCell>
                <TableCell className="text-right font-medium tabular-nums">₹85,000.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* Empty State & Dialogs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">7. Dialogs, Tabs & Empty State</h2>
          <Tabs defaultValue="empty">
            <TabsList>
              <TabsTrigger value="empty">Empty State Pattern</TabsTrigger>
              <TabsTrigger value="skeleton">Skeleton Loader</TabsTrigger>
              <TabsTrigger value="dialog">Confirmation Dialog</TabsTrigger>
            </TabsList>
            <TabsContent value="empty" className="pt-4">
              <EmptyState
                icon={Calendar}
                title="No Events Scheduled"
                description="There are no upcoming wedding shoots or client meetings scheduled for this period."
                actionLabel="Create Booking"
                onAction={() => alert('New Booking')}
              />
            </TabsContent>
            <TabsContent value="skeleton" className="pt-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </TabsContent>
            <TabsContent value="dialog" className="pt-4">
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Open Confirm Dialog
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Cancel Invoice INV-2026-000012?"
                description="This will mark the invoice as cancelled. Immutable accounting rules state cancelled invoices remain in records and cannot be deleted."
                confirmLabel="Yes, Cancel Invoice"
                isDestructive
                onConfirm={() => {
                  setConfirmOpen(false);
                  alert('Confirmed');
                }}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
