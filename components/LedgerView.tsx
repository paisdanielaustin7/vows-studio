'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Plus,
  Scale,
  Receipt,
  Download,
  Search,
  Lock,
  KeyRound,
  Trash2,
  Edit3,
  CreditCard,
  User,
} from 'lucide-react';
import {
  LedgerEntry,
  LedgerCategory,
  LedgerStatus,
  UserAccount,
  Enquiry,
  StudioSettings,
} from '@/types';
import {
  formatCurrencyINR,
  maskClientName,
  maskAmount,
} from '@/lib/formatters';

interface LedgerViewProps {
  initialLedger: LedgerEntry[];
  enquiries?: Enquiry[];
  settings?: StudioSettings;
  currentUser?: UserAccount;
  onOpenLoginModal?: () => void;
  onUpdateLedger?: (entries: LedgerEntry[]) => void;
}

const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Cheque', 'Other'] as const;

export const LedgerView: React.FC<LedgerViewProps> = ({
  initialLedger,
  enquiries = [],
  settings,
  currentUser,
  onOpenLoginModal,
  onUpdateLedger,
}) => {
  const [entries, setEntries] = useState<LedgerEntry[]>(initialLedger);

  useEffect(() => {
    setEntries(initialLedger);
  }, [initialLedger]);

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit entry modal state
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCounterparty, setEditCounterparty] = useState('');
  const [editType, setEditType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [editCategory, setEditCategory] = useState<string>('CLIENT_RECEIVABLE');
  const [editStatus, setEditStatus] = useState<LedgerStatus>('CLEARED');
  const [editDate, setEditDate] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('UPI');

  // Permission check: Admin or user explicitly granted canEditLedger
  const canEditLedger =
    currentUser?.role === 'ADMIN_ACCESS' ||
    currentUser?.role === 'ADMIN_DIRECTOR' ||
    !!currentUser?.canEditLedger;

  const isDemo = currentUser?.role === 'PRODUCT_DEMO';

  // New entry form state - Default to Client Receivable (INCOME)
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCounterparty, setNewCounterparty] = useState('');
  const [newType, setNewType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [newCategory, setNewCategory] = useState<string>('CLIENT_RECEIVABLE');
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>('UPI');
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>('');

  // Keyboard shortcut: Escape dismisses modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setEditingEntry(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Built-in categories + custom studio ledger categories
  const builtInCategories: { value: string; label: string }[] = [
    { value: 'CLIENT_RECEIVABLE', label: 'Client Receivable' },
    { value: 'PRODUCTION_EXPENSE', label: 'Production Expense' },
    { value: 'GEAR_RENTAL', label: 'Gear Rental' },
    { value: 'TALENT_PAYOUT', label: 'Talent Payout' },
    { value: 'LOCATION_PERMIT', label: 'Location Permit' },
    { value: 'STUDIO_OVERHEAD', label: 'Studio Overhead' },
    { value: 'POST_COLOR_GRADE', label: 'Post / Color Grade' },
  ];

  const customCategories = (settings?.customLedgerCategories || []).map((cat) => ({
    value: cat,
    label: cat,
  }));

  const allCategories = [
    ...builtInCategories,
    ...customCategories.filter((c) => !builtInCategories.some((b) => b.value === c.value)),
  ];

  const filteredEntries = entries.filter((e) => {
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.counterparty.toLowerCase().includes(q) ||
        e.transactionRef.toLowerCase().includes(q) ||
        (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalIncome = entries
    .filter((e) => e.type === 'INCOME')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = entries
    .filter((e) => e.type === 'EXPENSE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const handleEnquirySelect = (enqId: string) => {
    setSelectedEnquiryId(enqId);
    if (!enqId) return;
    const found = enquiries.find((e) => e.id === enqId);
    if (found) {
      setNewCounterparty(found.clientName);
      if (!newDesc) {
        setNewDesc(`Retainer / Shoot Advance — ${found.clientName}`);
      }
      setNewType('INCOME');
      setNewCategory('CLIENT_RECEIVABLE');
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newAmount || !newCounterparty) return;

    const matchedEnquiry = enquiries.find((enq) => enq.id === selectedEnquiryId);
    const newRef = `${newType === 'INCOME' ? 'REC' : 'EXP'}-2026-${Math.floor(100 + Math.random() * 900)}`;

    const created: LedgerEntry = {
      id: `led-${Date.now()}`,
      transactionRef: newRef,
      date: new Date().toISOString().split('T')[0],
      description: newDesc,
      category: newCategory as LedgerCategory,
      type: newType,
      amount: parseFloat(newAmount),
      counterparty: newCounterparty,
      relatedShootCode: matchedEnquiry?.shootCode || matchedEnquiry?.enquiryNumber,
      status: 'CLEARED',
      paymentMethod: newPaymentMethod,
    };

    const updated = [created, ...entries];
    setEntries(updated);
    if (onUpdateLedger) onUpdateLedger(updated);
    setNewDesc('');
    setNewAmount('');
    setNewCounterparty('');
    setSelectedEnquiryId('');
    setNewType('INCOME');
    setNewCategory('CLIENT_RECEIVABLE');
    setNewPaymentMethod('UPI');
    setShowAddModal(false);
  };

  const handleOpenEdit = (entry: LedgerEntry) => {
    if (!canEditLedger) return;
    setEditingEntry(entry);
    setEditDesc(entry.description);
    setEditAmount(entry.amount.toString());
    setEditCounterparty(entry.counterparty);
    setEditType(entry.type);
    setEditCategory(entry.category);
    setEditStatus(entry.status);
    setEditDate(entry.date);
    setEditPaymentMethod(entry.paymentMethod || 'UPI');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editDesc || !editAmount || !editCounterparty) return;

    const updated = entries.map((item) =>
      item.id === editingEntry.id
        ? {
            ...item,
            description: editDesc,
            amount: parseFloat(editAmount),
            counterparty: editCounterparty,
            type: editType,
            category: editCategory as LedgerCategory,
            status: editStatus,
            date: editDate,
            paymentMethod: editPaymentMethod,
          }
        : item
    );

    setEntries(updated);
    if (onUpdateLedger) onUpdateLedger(updated);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!canEditLedger) return;
    if (confirm('Are you sure you want to permanently remove this transaction from the ledger?')) {
      const updated = entries.filter((item) => item.id !== entryId);
      setEntries(updated);
      if (onUpdateLedger) onUpdateLedger(updated);
    }
  };

  if (currentUser && !currentUser.canViewFinances) {
    return (
      <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-6">
        <div className="p-8 bg-bone-card dark:bg-obsidian-card border-2 border-vermillion space-y-4">
          <div className="flex items-center gap-3 text-vermillion">
            <Lock size={28} />
            <h2 className="text-2xl font-serif font-black uppercase tracking-tight">
              Access Restricted // Studio Ledger
            </h2>
          </div>
          <p className="text-xs font-mono text-bone-muted dark:text-obsidian-muted leading-relaxed">
            Financial ledger entries, cashflow vaults, and retainer balances are hidden for account{' '}
            <code className="text-carbon dark:text-white font-bold">@{currentUser.username}</code> ({currentUser.fullName}) as per selective studio access policies.
          </p>
          {onOpenLoginModal && (
            <div className="pt-4">
              <button
                onClick={onOpenLoginModal}
                className="px-5 py-2.5 bg-vermillion text-white text-xs font-mono uppercase tracking-widest font-bold hover:bg-black transition-all flex items-center gap-2"
              >
                <KeyRound size={14} />
                <span>Authenticate as Director</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-bone-border dark:border-obsidian-border">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-bone-muted dark:text-obsidian-muted mb-1">
            <span>Treasury & Audit</span>
            <span>//</span>
            <span className="text-vermillion font-bold">Dual Entry General Ledger</span>
            <span className="hidden xs:inline">//</span>
            <span className="hidden xs:inline">{canEditLedger ? 'EDIT ACCESS' : 'READ-ONLY'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-black tracking-tight text-carbon dark:text-white uppercase">
            Studio Ledger
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {canEditLedger && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-mono uppercase tracking-widest bg-carbon text-bone dark:bg-white dark:text-carbon hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1.5 sm:gap-2 font-bold shadow-sm"
            >
              <Plus size={14} />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border">
          <span className="text-[10px] font-mono uppercase tracking-widest text-bone-muted dark:text-obsidian-muted block">
            Total Receivables Cleared
          </span>
          <span className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-green-600 dark:text-green-400 mt-1 block">
            {isDemo ? 'Rs. ••••••/-' : `+${formatCurrencyINR(totalIncome)}`}
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border">
          <span className="text-[10px] font-mono uppercase tracking-widest text-bone-muted dark:text-obsidian-muted block">
            Total Production & Gear Expenses
          </span>
          <span className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-rose-600 dark:text-rose-400 mt-1 block">
            {isDemo ? 'Rs. ••••••/-' : `-${formatCurrencyINR(totalExpense)}`}
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block">
            Net Studio Operating Margin
          </span>
          <span className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {isDemo ? 'Rs. ••••••/-' : formatCurrencyINR(netBalance)}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-xs font-mono">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Search size={14} className="text-bone-muted dark:text-obsidian-muted" />
          <input
            type="text"
            placeholder="Search reference, client, or gear..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-carbon dark:text-white placeholder:text-bone-muted dark:placeholder:text-obsidian-muted outline-none w-full md:w-64"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 text-[10px] uppercase font-mono bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
          >
            <option value="ALL">All Categories</option>
            {allCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <div className="flex items-center border border-bone-border dark:border-obsidian-border text-[10px]">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 uppercase ${typeFilter === 'ALL' ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold' : 'text-bone-muted dark:text-obsidian-muted'}`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('INCOME')}
              className={`px-2.5 py-1 uppercase border-l border-bone-border dark:border-obsidian-border ${typeFilter === 'INCOME' ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold' : 'text-bone-muted dark:text-obsidian-muted'}`}
            >
              Income
            </button>
            <button
              onClick={() => setTypeFilter('EXPENSE')}
              className={`px-2.5 py-1 uppercase border-l border-bone-border dark:border-obsidian-border ${typeFilter === 'EXPENSE' ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold' : 'text-bone-muted dark:text-obsidian-muted'}`}
            >
              Expenses
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-bone-border dark:border-obsidian-border bg-bone-surface/70 dark:bg-obsidian-surface/80 text-[10px] font-mono uppercase tracking-widest text-bone-muted dark:text-obsidian-muted">
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description & Counterparty</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount (INR / ₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEditLedger && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-bone-border dark:divide-obsidian-border text-xs font-mono">
              {filteredEntries.map((entry) => {
                const isIncome = entry.type === 'INCOME';
                return (
                  <tr key={entry.id} className="hover:bg-bone-surface/40 dark:hover:bg-obsidian-surface/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-carbon dark:text-white whitespace-nowrap">
                      {entry.transactionRef}
                    </td>
                    <td className="py-3.5 px-4 text-bone-muted dark:text-obsidian-muted whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-carbon dark:text-white">
                        {entry.description}
                      </div>
                      <div className="text-[10px] text-bone-muted dark:text-obsidian-muted mt-0.5">
                        {maskClientName(entry.counterparty, isDemo)}
                        {entry.relatedShootCode && ` // ${entry.relatedShootCode}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[10px] text-bone-muted dark:text-obsidian-muted whitespace-nowrap">
                      {entry.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[9px] px-2 py-0.5 uppercase tracking-wider font-mono font-bold bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white">
                        {entry.paymentMethod || 'UPI'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isIncome ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} className="text-rose-500" />}
                        {isDemo ? 'Rs. ••••••/-' : `${isIncome ? '+' : '-'}${formatCurrencyINR(entry.amount)}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`text-[9px] px-2 py-0.5 uppercase tracking-widest font-mono font-bold border ${
                        entry.status === 'CLEARED'
                          ? 'border-green-600/30 text-green-700 dark:text-green-400 bg-green-500/10'
                          : 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    {canEditLedger && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white transition-colors"
                            title="Edit transaction record"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 text-bone-muted hover:text-vermillion transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={canEditLedger ? 8 : 7}
                    className="py-8 text-center text-xs font-mono text-bone-muted dark:text-obsidian-muted"
                  >
                    No ledger transactions found. Click "Record Transaction" to add an entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Transaction Modal */}
      {showAddModal && canEditLedger && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-4 sm:p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-bone-border dark:border-obsidian-border mb-4">
              <div>
                <span className="text-[10px] font-mono text-vermillion uppercase font-bold block">
                  Studio Accounting // Audit Trail
                </span>
                <h2 className="font-serif text-xl font-bold uppercase text-carbon dark:text-white">
                  Record Ledger Entry
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4 text-xs font-mono">
              {/* Type Switcher */}
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                  Transaction Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewType('INCOME');
                      setNewCategory('CLIENT_RECEIVABLE');
                    }}
                    className={`py-2 text-center uppercase font-bold border transition-colors ${
                      newType === 'INCOME'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-bone-border dark:border-obsidian-border text-bone-muted hover:border-carbon'
                    }`}
                  >
                    Client Receivable (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewType('EXPENSE');
                      setNewCategory('GEAR_RENTAL');
                    }}
                    className={`py-2 text-center uppercase font-bold border transition-colors ${
                      newType === 'EXPENSE'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'border-bone-border dark:border-obsidian-border text-bone-muted hover:border-carbon'
                    }`}
                  >
                    Production Cost (-)
                  </button>
                </div>
              </div>

              {/* Quick Select Client / Enquiry */}
              {enquiries.length > 0 && (
                <div className="p-3 bg-bone-surface/60 dark:bg-obsidian-surface/60 border border-bone-border dark:border-obsidian-border">
                  <label className="block text-[10px] uppercase text-vermillion font-bold mb-1">
                    Quick-Select Enquiry / Shoot (Optional)
                  </label>
                  <select
                    value={selectedEnquiryId}
                    onChange={(e) => handleEnquirySelect(e.target.value)}
                    className="w-full p-2 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none text-xs font-mono"
                  >
                    <option value="">-- Choose registered enquiry to auto-fill --</option>
                    {enquiries.map((enq) => (
                      <option key={enq.id} value={enq.id}>
                        {enq.clientName} [{enq.shootCode || enq.enquiryNumber}] — {enq.eventDate || 'Date TBD'} ({enq.eventType})
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] text-bone-muted dark:text-obsidian-muted block mt-1">
                    Selecting an enquiry populates counterparty and references automatically.
                  </span>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Cinematics Retainer — Sarah & David"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              {/* Counterparty */}
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                  Counterparty (Client / Vendor)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah D'Souza or Kudla Cine Gear Hire"
                  value={newCounterparty}
                  onChange={(e) => setNewCounterparty(e.target.value)}
                  className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    Amount (INR / ₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="8000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none font-bold"
                  />
                  {newAmount && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
                      Preview: {formatCurrencyINR(newAmount)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    Ledger Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  >
                    {allCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method Pills */}
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1.5 font-bold">
                  Payment Method
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = newPaymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setNewPaymentMethod(method)}
                        className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border transition-all ${
                          isSelected
                            ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold border-carbon dark:border-white shadow-sm'
                            : 'border-bone-border dark:border-obsidian-border text-bone-muted dark:text-obsidian-muted hover:border-carbon dark:hover:border-white'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 uppercase tracking-widest bg-carbon text-bone dark:bg-white dark:text-carbon font-bold hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-colors"
                >
                  Commit Entry
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 uppercase tracking-widest border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingEntry && canEditLedger && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-4 sm:p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-bone-border dark:border-obsidian-border mb-4">
              <div>
                <span className="text-[10px] font-mono text-vermillion uppercase font-bold block">
                  Modify Transaction Record
                </span>
                <h2 className="font-serif text-xl font-bold uppercase text-carbon dark:text-white">
                  {editingEntry.transactionRef}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                  Transaction Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('INCOME')}
                    className={`py-2 text-center uppercase font-bold border transition-colors ${
                      editType === 'INCOME'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-bone-border dark:border-obsidian-border text-bone-muted'
                    }`}
                  >
                    Client Receivable (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('EXPENSE')}
                    className={`py-2 text-center uppercase font-bold border transition-colors ${
                      editType === 'EXPENSE'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'border-bone-border dark:border-obsidian-border text-bone-muted'
                    }`}
                  >
                    Production Cost (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                  Counterparty (Client / Vendor)
                </label>
                <input
                  type="text"
                  required
                  value={editCounterparty}
                  onChange={(e) => setEditCounterparty(e.target.value)}
                  className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    Amount (INR / ₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none font-bold"
                  />
                  {editAmount && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
                      Preview: {formatCurrencyINR(editAmount)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  >
                    {allCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method Pills */}
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1.5 font-bold">
                  Payment Method
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = editPaymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setEditPaymentMethod(method)}
                        className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border transition-all ${
                          isSelected
                            ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold border-carbon dark:border-white shadow-sm'
                            : 'border-bone-border dark:border-obsidian-border text-bone-muted dark:text-obsidian-muted hover:border-carbon dark:hover:border-white'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as LedgerStatus)}
                    className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  >
                    <option value="CLEARED">Cleared</option>
                    <option value="PENDING">Pending</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="DISPUTED">Disputed</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 uppercase tracking-widest bg-carbon text-bone dark:bg-white dark:text-carbon font-bold hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2.5 uppercase tracking-widest border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
