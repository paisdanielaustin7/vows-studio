'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LedgerEntry, ProfitAndLossReport, PaymentMethod } from '@/types/finance';
import { formatINR, toPaise } from '@/lib/money';
import {
  exportLedgerCsvAction,
  createManualIncomeAction,
} from '@/server/actions/finance.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LedgerViewProps {
  initialEntries: LedgerEntry[];
  initialReport: ProfitAndLossReport;
  startDate: string;
  endDate: string;
}

export function LedgerView({
  initialEntries,
  initialReport,
  startDate: initStartDate,
  endDate: initEndDate,
}: LedgerViewProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<LedgerEntry[]>(initialEntries);
  const [report, setReport] = useState<ProfitAndLossReport>(initialReport);

  useEffect(() => {
    setEntries(initialEntries);
    setReport(initialReport);
  }, [initialEntries, initialReport]);
  const [startDate, setStartDate] = useState(initStartDate);
  const [endDate, setEndDate] = useState(initEndDate);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Manual income modal
  const [isManualIncomeOpen, setIsManualIncomeOpen] = useState(false);
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));
  const [incomeDesc, setIncomeDesc] = useState('');
  const [incomeAmountRupees, setIncomeAmountRupees] = useState<number>(0);
  const [incomeMethod, setIncomeMethod] = useState<PaymentMethod>('bank_transfer');
  const [incomeRef, setIncomeRef] = useState('');
  const [incomeNotes, setIncomeNotes] = useState('');
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.referenceNumber && e.referenceNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDateRangeApply = () => {
    router.push(`/crm/ledger?startDate=${startDate}&endDate=${endDate}`);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    const res = await exportLedgerCsvAction({ startDate, endDate });
    if (res.data) {
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `VOWS_General_Ledger_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExporting(false);
  };

  const handleCreateManualIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncomeError(null);
    setIsSubmittingIncome(true);

    const amountPaise = Number(toPaise(Number(incomeAmountRupees) || 0));

    const res = await createManualIncomeAction({
      entryDate: incomeDate,
      description: incomeDesc,
      amountPaise,
      paymentMethod: incomeMethod,
      referenceNumber: incomeRef || null,
      notes: incomeNotes || null,
    });

    if (res.error) {
      setIncomeError(res.error.message);
      setIsSubmittingIncome(false);
    } else {
      setIsSubmittingIncome(false);
      setIsManualIncomeOpen(false);
      setIncomeDesc('');
      setIncomeAmountRupees(0);
      setIncomeRef('');
      setIncomeNotes('');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            General Ledger &amp; P&amp;L Statement
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time unified ledger view dynamically synthesized from payments, manual receipts, and expenses (D-23).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="gap-2"
          >
            <span>↓</span>
            {isExporting ? 'Exporting...' : 'Export CSV (Protected)'}
          </Button>
          <Button onClick={() => setIsManualIncomeOpen(true)} className="gap-2">
            <span className="text-base leading-none">+</span>
            Record Income
          </Button>
        </div>
      </div>

      {/* Date Filter & Preset Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider">
            Period:
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <span className="text-outline text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <Button size="sm" variant="outline" onClick={handleDateRangeApply} className="h-8">
              Apply
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                .toISOString()
                .slice(0, 10);
              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                .toISOString()
                .slice(0, 10);
              setStartDate(firstDay);
              setEndDate(lastDay);
            }}
            className="px-2.5 py-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
          >
            This Month
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
              setStartDate(`${year}-04-01`);
              setEndDate(`${year + 1}-03-31`);
            }}
            className="px-2.5 py-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
          >
            This FY
          </button>
        </div>
      </div>

      {/* Operational P&L Performance Dossier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm">
          <p className="text-xs uppercase font-medium text-outline tracking-wider">Total Income</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatINR(BigInt(report.totalIncomePaise))}
          </p>
          <span className="text-xs text-outline">
            {report.incomeByCategory.length} income revenue streams
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm">
          <p className="text-xs uppercase font-medium text-outline tracking-wider">
            Total Operational Expenses
          </p>
          <p className="text-2xl font-bold text-error mt-1">
            -{formatINR(BigInt(report.totalExpensesPaise))}
          </p>
          <span className="text-xs text-outline">
            Production, crew, and atelier overhead
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm">
          <p className="text-xs uppercase font-medium text-outline tracking-wider">
            Net Production Margin (P&amp;L)
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${
              report.netProfitPaise >= 0 ? 'text-on-surface' : 'text-error'
            }`}
          >
            {formatINR(BigInt(report.netProfitPaise))}
          </p>
          <span className="text-xs text-outline">
            Net Atelier Operating Margin:{' '}
            {report.totalIncomePaise > 0
              ? `${Math.round((report.netProfitPaise / report.totalIncomePaise) * 100)}%`
              : '0%'}
          </span>
        </div>
      </div>

      {/* Ledger Filter & Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <Input
            type="text"
            placeholder="Search transactions by description, category, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                typeFilter === t ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t === 'all' ? 'All Entries' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Unified General Ledger Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-sm text-outline">
            No ledger transactions found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low text-on-surface-variant font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Method &amp; Ref</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                {filteredEntries.map((e) => {
                  const isIncome = e.type === 'income';
                  return (
                    <tr key={e.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3 px-4 text-on-surface-variant font-mono">{e.entryDate}</td>
                      <td className="py-3 px-4">
                        <Badge variant={isIncome ? 'success' : 'danger'}>
                          {isIncome ? 'Income' : 'Expense'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface capitalize">
                        {e.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface max-w-sm truncate" title={e.description}>
                        {e.description}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        <span className="capitalize">{e.paymentMethod?.replace('_', ' ') || '—'}</span>
                        {e.referenceNumber && (
                          <span className="text-[10px] text-outline block font-mono">
                            {e.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-outline font-mono text-[11px]">
                        {e.source}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-error'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatINR(BigInt(e.amountPaise))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Manual Income Dialog */}
      {isManualIncomeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <h3 className="text-base font-bold text-on-surface">Record Non-Invoice Income</h3>
              <button
                onClick={() => setIsManualIncomeOpen(false)}
                className="text-outline hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            {incomeError && (
              <div className="p-2.5 bg-error-container border border-error/30 text-on-error-container text-xs rounded-lg">
                {incomeError}
              </div>
            )}

            <form onSubmit={handleCreateManualIncome} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Date <span className="text-error">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Description <span className="text-error">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Asset sale, workshop fee, studio rental"
                  value={incomeDesc}
                  onChange={(e) => setIncomeDesc(e.target.value)}
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
                    placeholder="e.g. 25000"
                    value={incomeAmountRupees || ''}
                    onChange={(e) => setIncomeAmountRupees(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Method</label>
                  <select
                    value={incomeMethod}
                    onChange={(e) => setIncomeMethod(e.target.value as PaymentMethod)}
                    className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Transaction Reference
                </label>
                <Input
                  placeholder="UTR / Check #"
                  value={incomeRef}
                  onChange={(e) => setIncomeRef(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManualIncomeOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingIncome}>
                  {isSubmittingIncome ? 'Saving...' : 'Record Income'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
