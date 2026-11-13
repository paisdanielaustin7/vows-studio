'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Expense, PaymentMethod } from '@/types/finance';
import { formatINR, toPaise } from '@/lib/money';
import { createExpenseAction, deleteExpenseAction } from '@/server/actions/finance.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CategoryOption {
  id: string;
  code: string;
  name: string;
}

interface ExpensesManagerProps {
  initialExpenses: Expense[];
  categories: CategoryOption[];
  canManage: boolean;
}

export function ExpensesManager({ initialExpenses, categories, canManage }: ExpensesManagerProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  // Filter out system-only crew_payment category for manual entry (D-23)
  const manualCategories = categories.filter((c) => c.code !== 'crew_payment');
  const [formCategoryId, setFormCategoryId] = useState(manualCategories[0]?.id || '');
  const [formDescription, setFormDescription] = useState('');
  const [formAmountRupees, setFormAmountRupees] = useState<number>(0);
  const [formVendor, setFormVendor] = useState('');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('bank_transfer');
  const [formRef, setFormRef] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.vendor && e.vendor.toLowerCase().includes(search.toLowerCase())) ||
      (e.bookingNumber && e.bookingNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || e.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalFilteredPaise = filtered.reduce((acc, cur) => acc + cur.amountPaise, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const amountPaise = Number(toPaise(Number(formAmountRupees) || 0));

    const res = await createExpenseAction({
      expenseDate: formDate,
      categoryId: formCategoryId,
      description: formDescription,
      amountPaise,
      vendor: formVendor || null,
      paymentMethod: formMethod,
      referenceNumber: formRef || null,
      notes: formNotes || null,
    });

    if (res.error) {
      setFormError(res.error.message);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setIsAddOpen(false);
      setFormDescription('');
      setFormAmountRupees(0);
      setFormVendor('');
      setFormRef('');
      setFormNotes('');
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense entry?')) return;
    const res = await deleteExpenseAction(id);
    if (!res.error) {
      setExpenses(expenses.filter((e) => e.id !== id));
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Production &amp; Operational Expenses
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Track gear acquisitions, shoot logistics, travel, and automated crew payouts (D-23).
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <span className="text-base leading-none">+</span>
            Record Expense
          </Button>
        )}
      </div>

      {/* Filter Matrix */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              type="text"
              placeholder="Search expenses by description, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
          <span>
            Showing <strong className="text-on-surface">{filtered.length}</strong> items
          </span>
          <span>
            Total in View:{' '}
            <strong className="text-on-surface font-mono text-sm">
              {formatINR(BigInt(totalFilteredPaise))}
            </strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-outline">
            No expenses found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low text-on-surface-variant font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Method &amp; Ref</th>
                  <th className="py-3 px-4">Linked Booking</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4 text-on-surface-variant">{e.expenseDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant={e.source === 'system' ? 'accent' : 'default'}>
                        {e.categoryName}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-on-surface max-w-xs truncate" title={e.description}>
                      {e.description}
                      {e.source === 'system' && (
                        <span className="text-[10px] text-outline block font-normal">
                          Auto-generated from Crew Payment (D-23)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{e.vendor || '—'}</td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      <span className="capitalize">{e.paymentMethod?.replace('_', ' ') || '—'}</span>
                      {e.referenceNumber && (
                        <span className="text-[11px] text-outline block font-mono">
                          {e.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {e.bookingId ? (
                        <Link href={`/crm/bookings/${e.bookingId}`} className="text-primary hover:underline">
                          {e.bookingNumber || 'BK'} →
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-error">
                      -{formatINR(BigInt(e.amountPaise))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {canManage && e.source !== 'system' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(e.id)}
                          className="text-outline hover:text-error transition-colors"
                          title="Delete"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <h3 className="text-base font-bold text-on-surface">Record Operational Expense</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-outline hover:text-on-surface">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-error-container border border-error/30 text-on-error-container text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Date <span className="text-error">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Category <span className="text-error">*</span>
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {manualCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Description <span className="text-error">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. SanDisk Pro Cinema CFexpress 512GB"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Amount (₹) <span className="text-error">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    required
                    placeholder="e.g. 18500"
                    value={formAmountRupees || ''}
                    onChange={(e) => setFormAmountRupees(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Vendor</label>
                  <Input
                    placeholder="e.g. B&H / Amazon / Apple"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Payment Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                    className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="card">Company Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Transaction Ref / Bill #</label>
                  <Input
                    placeholder="Ref / Invoice #"
                    value={formRef}
                    onChange={(e) => setFormRef(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Tax deduction notes, warranty info..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-on-surface p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Record Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
