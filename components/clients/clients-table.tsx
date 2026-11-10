'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Client, ClientDuplicateMatch } from '@/types/sales';
import {
  createClientAction,
  deleteClientAction,
  checkDuplicateClientsAction,
  exportClientsCsvAction,
} from '@/server/actions/client.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Download,
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';

export function ClientsTable({
  initialClients,
  canCreate,
  canDelete,
  canExport,
}: {
  initialClients: Client[];
  canCreate: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const [clients, setClients] = React.useState<Client[]>(initialClients);
  const [search, setSearch] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New client form state
  const [form, setForm] = React.useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    gstin: '',
    referralSource: 'other' as const,
    notes: '',
  });

  const [saving, setSaving] = React.useState(false);
  const [duplicates, setDuplicates] = React.useState<ClientDuplicateMatch[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = React.useState(false);

  // Duplicate check debounced
  React.useEffect(() => {
    if (!form.phone && !form.email && form.fullName.length < 3) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      const res = await checkDuplicateClientsAction({
        phone: form.phone || undefined,
        email: form.email || undefined,
        name: form.fullName || undefined,
      });
      setCheckingDuplicates(false);
      if (res.data) {
        setDuplicates(res.data);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.phone, form.email, form.fullName]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    setSaving(true);
    setStatus(null);

    const res = await createClientAction({
      fullName: form.fullName,
      city: form.city || null,
      state: form.state || null,
      stateCode: form.stateCode || null,
      pincode: form.pincode || null,
      gstin: form.gstin || null,
      referralSource: form.referralSource,
      notes: form.notes || null,
      phones: [
        {
          phoneE164: form.phone,
          label: 'Mobile',
          isPrimary: true,
          isInternational: false,
        },
      ],
      emails: form.email
        ? [
            {
              email: form.email,
              isPrimary: true,
            },
          ]
        : [],
    });

    setSaving(false);
    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setIsModalOpen(false);
      setStatus({ type: 'success', message: 'Client created successfully.' });
      router.refresh();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!canDelete) return;
    if (!confirm(`Are you sure you want to delete client "${name}"?`)) return;

    setDeletingId(id);
    const res = await deleteClientAction(id);
    setDeletingId(null);

    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setClients(clients.filter((c) => c.id !== id));
      setStatus({ type: 'success', message: `Client "${name}" deleted.` });
    }
  };

  const handleExportCsv = async () => {
    if (!canExport) return;
    setExporting(true);
    const res = await exportClientsCsvAction();
    setExporting(false);

    if (res.data) {
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vows_clients_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const primaryPhone = c.phones.find((p) => p.isPrimary)?.phoneE164 || '';
    const primaryEmail = c.emails.find((e) => e.isPrimary)?.email || '';
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      primaryPhone.includes(q) ||
      primaryEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {status && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            status.type === 'success'
              ? 'bg-secondary-container/50 text-on-secondary-container border border-secondary-container'
              : 'bg-error-container/50 text-error border border-error-container'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-error" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, city..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="text-xs"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              Export CSV
            </Button>
          )}

          {canCreate && (
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Client
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/20 bg-surface-container/50 text-xs text-outline uppercase font-semibold">
              <th className="py-3 px-4">Client Name</th>
              <th className="py-3 px-4">Primary Contact</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Referral Source</th>
              <th className="py-3 px-4">Registered Date</th>
              {canDelete && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-outline text-sm">
                  No clients match your search query.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const primaryPhone = c.phones.find((p) => p.isPrimary)?.phoneE164 || c.phones[0]?.phoneE164 || '—';
                const primaryEmail = c.emails.find((e) => e.isPrimary)?.email || c.emails[0]?.email || '—';

                return (
                  <tr key={c.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/crm/clients/${c.id}`}
                        className="font-medium text-on-surface hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        {c.fullName}
                        <ExternalLink className="w-3 h-3 text-outline opacity-0 group-hover:opacity-100" />
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col text-xs text-on-surface-variant gap-0.5">
                        <span className="font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-outline" />
                          {primaryPhone}
                        </span>
                        {primaryEmail !== '—' && (
                          <span className="text-outline flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {primaryEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant">
                      {c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-surface-container text-on-surface-variant capitalize">
                        {c.referralSource?.replace('_', ' ') || 'Other'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-outline">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    {canDelete && (
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id, c.fullName)}
                          disabled={deletingId === c.id}
                          className="h-8 px-2 text-outline hover:text-error"
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col gap-5 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h3 className="text-base font-semibold text-on-surface">Add New Client</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duplicate detection warning */}
            {duplicates.length > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg flex flex-col gap-2 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Possible duplicate client record detected:</span>
                </div>
                <div className="flex flex-col gap-1 pl-6">
                  {duplicates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>
                        <strong>{d.fullName}</strong> matched on {d.matchField} ({d.matchValue})
                      </span>
                      <Link
                        href={`/crm/clients/${d.clientId}`}
                        className="text-primary hover:underline font-semibold"
                      >
                        View Profile
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Client Full Name *</label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Aarav Patel &amp; Diya Sharma"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Primary Phone (+91...) *</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+919840012345"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Email Address</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="aarav@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">City</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Chennai"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">State</label>
                  <Input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="Tamil Nadu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Pincode</label>
                  <Input
                    value={form.pincode}
                    maxLength={6}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    placeholder="600001"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Referral Source</label>
                  <select
                    value={form.referralSource}
                    onChange={(e) => setForm({ ...form, referralSource: e.target.value as any })}
                    className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs text-on-surface capitalize"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="google">Google</option>
                    <option value="referral">Friend / Referral</option>
                    <option value="wedding_wire">Wedding Wire</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="returning_client">Returning Client</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Client Notes</label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Preferences, preferred style, family contacts..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Client'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
