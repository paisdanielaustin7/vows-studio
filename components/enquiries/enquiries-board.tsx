'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Enquiry, EnquiryStatus, EventType, EnquirySource, Client } from '@/types/sales';
import {
  createEnquiryAction,
  updateEnquiryStatusAction,
} from '@/server/actions/enquiry.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  LayoutGrid,
  List as ListIcon,
  Search,
  Loader2,
  Calendar,
  MapPin,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react';

const STATUS_COLUMNS: Array<{ status: EnquiryStatus; label: string; color: string }> = [
  { status: 'new', label: 'New Lead', color: 'bg-emerald-500' },
  { status: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { status: 'qualified', label: 'Qualified', color: 'bg-amber-500' },
  { status: 'proposal_sent', label: 'Proposal Sent', color: 'bg-purple-500' },
  { status: 'won', label: 'Won / Converted', color: 'bg-primary' },
  { status: 'lost', label: 'Lost', color: 'bg-gray-400' },
  { status: 'junk', label: 'Junk', color: 'bg-red-400' },
];

const EVENT_TYPES: EventType[] = [
  'wedding',
  'pre_wedding',
  'engagement',
  'reception',
  'birthday',
  'corporate',
  'maternity',
  'anniversary',
  'other',
];

export function EnquiriesBoard({
  initialEnquiries,
  clients,
  canCreate,
}: {
  initialEnquiries: Enquiry[];
  clients: Client[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [enquiries, setEnquiries] = React.useState<Enquiry[]>(initialEnquiries);
  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = React.useState('');
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<string>('all');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Initial form template with multi-event support
  const initialFormState = {
    clientId: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    eventType: 'wedding' as EventType,
    eventDate: '',
    eventDateIsApprox: true,
    venue: '',
    guestCount: '',
    budgetRupees: '',
    source: 'instagram' as EnquirySource,
    message: '',
    notes: '',
    events: [
      {
        name: 'Wedding Ceremony',
        eventType: 'wedding' as EventType,
        eventDate: '',
        venue: '',
      },
    ],
  };

  const [form, setForm] = React.useState(initialFormState);

  const resetForm = React.useCallback(() => {
    setForm(initialFormState);
    setModalError(null);
  }, []);

  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalError, setModalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEnquiries(initialEnquiries);
  }, [initialEnquiries]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    setSaving(true);
    setStatus(null);
    setModalError(null);

    const budgetPaise = form.budgetRupees ? Math.round(Number(form.budgetRupees) * 100) : null;
    const primaryEvent = form.events && form.events.length > 0 ? form.events[0] : null;
    const effectiveEventType = primaryEvent?.eventType || form.eventType;
    const effectiveEventDate = primaryEvent?.eventDate || form.eventDate || null;
    const effectiveVenue = primaryEvent?.venue || form.venue || null;

    const res = await createEnquiryAction({
      clientId: form.clientId ? form.clientId : null,
      guestName: form.guestName || null,
      guestPhone: form.guestPhone || null,
      guestEmail: form.guestEmail || null,
      eventType: effectiveEventType,
      eventDate: effectiveEventDate,
      eventDateIsApprox: form.eventDateIsApprox,
      venue: effectiveVenue,
      guestCount: form.guestCount ? Number(form.guestCount) : null,
      budgetPaise,
      source: form.source,
      status: 'new',
      message: form.message || null,
      notes: form.notes || null,
      events: form.events,
    });

    setSaving(false);
    if (res.error) {
      setModalError(res.error.message);
      setStatus({ type: 'error', message: res.error.message });
    } else {
      const newId = res.data || `temp-${Date.now()}`;
      const newEnq: Enquiry = {
        id: newId,
        clientId: form.clientId || null,
        clientName: clients.find((c) => c.id === form.clientId)?.fullName || null,
        guestName: form.guestName || null,
        guestPhone: form.guestPhone || null,
        guestEmail: form.guestEmail || null,
        eventType: effectiveEventType,
        eventDate: effectiveEventDate,
        eventDateIsApprox: form.eventDateIsApprox,
        venue: effectiveVenue,
        guestCount: form.guestCount ? Number(form.guestCount) : null,
        budgetPaise,
        source: form.source,
        status: 'new',
        message: form.message || null,
        notes: form.notes || null,
        events: form.events,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEnquiries((prev) => [newEnq, ...prev.filter((item) => item.id !== newId)]);
      resetForm();
      setIsModalOpen(false);
      setStatus({ type: 'success', message: 'Enquiry created successfully.' });
      router.refresh();
    }
  };

  const handleQuickStatusChange = async (enquiryId: string, newStatus: EnquiryStatus) => {
    let lostReason: string | undefined = undefined;
    if (newStatus === 'lost') {
      const promptRes = window.prompt('Please enter a reason for marking this enquiry as lost:');
      if (!promptRes) return;
      lostReason = promptRes;
    }

    const res = await updateEnquiryStatusAction(enquiryId, newStatus, lostReason);
    if (!res.error) {
      setEnquiries(
        enquiries.map((e) =>
          e.id === enquiryId ? { ...e, status: newStatus, lostReason: lostReason || null } : e
        )
      );
    }
  };

  const filtered = enquiries.filter((e) => {
    const q = search.toLowerCase();
    const name = e.clientName || e.guestName || '';
    const matchesSearch =
      name.toLowerCase().includes(q) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.guestPhone && e.guestPhone.includes(q));

    const matchesStatus = activeStatusFilter === 'all' || e.status === activeStatusFilter;
    return matchesSearch && matchesStatus;
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

      {/* Top Filter Strip */}
      <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveStatusFilter('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeStatusFilter === 'all'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span>All</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-container font-mono">
            {enquiries.length}
          </span>
        </button>

        {STATUS_COLUMNS.map((col) => {
          const count = enquiries.filter((e) => e.status === col.status).length;
          return (
            <button
              key={col.status}
              onClick={() => setActiveStatusFilter(col.status)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeStatusFilter === col.status
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${col.color}`} />
              <span>{col.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-container font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search enquiries by name, phone, venue..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center border border-outline-variant/40 rounded-lg p-0.5 bg-surface-container-lowest">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md ${
                viewMode === 'kanban' ? 'bg-secondary-container text-on-secondary-container' : 'text-outline'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${
                viewMode === 'list' ? 'bg-secondary-container text-on-secondary-container' : 'text-outline'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          {canCreate && (
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Enquiry
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-4 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colEnquiries = filtered.filter((e) => e.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/30 flex flex-col gap-3 min-w-[220px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.color}`} />
                    <span className="text-xs font-semibold text-on-surface">{col.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-outline">{colEnquiries.length}</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {colEnquiries.map((enq) => {
                    const displayName = enq.clientName || enq.guestName || 'Unnamed Lead';

                    return (
                      <div
                        key={enq.id}
                        className="bg-surface-container-lowest p-3.5 rounded-lg border border-outline-variant/20 shadow-xs flex flex-col gap-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={`/crm/enquiries/${enq.id}`}
                            className="font-medium text-xs text-on-surface hover:text-primary leading-tight line-clamp-1"
                          >
                            {displayName}
                          </Link>
                          <span className="text-[10px] font-medium text-outline uppercase tracking-wider">
                            {enq.eventType.replace('_', ' ')}
                          </span>
                        </div>

                        {enq.eventDate && (
                          <div className="flex items-center gap-1 text-[11px] text-outline font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>{enq.eventDate}</span>
                          </div>
                        )}

                        {enq.venue && (
                          <div className="flex items-center gap-1 text-[11px] text-outline">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{enq.venue}</span>
                          </div>
                        )}

                        {enq.events && enq.events.length > 1 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary">
                              {enq.events.length} Events: {enq.events.map((e) => e.name).join(' + ')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-[10px] text-outline">
                          <span className="capitalize">{enq.source}</span>
                          <select
                            value={enq.status}
                            onChange={(e) => handleQuickStatusChange(enq.id, e.target.value as EnquiryStatus)}
                            className="bg-surface-container rounded px-1.5 py-0.5 text-[10px] text-on-surface cursor-pointer"
                          >
                            {STATUS_COLUMNS.map((c) => (
                              <option key={c.status} value={c.status}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container/50 text-xs text-outline uppercase font-semibold">
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-sm">
              {filtered.map((enq) => {
                const displayName = enq.clientName || enq.guestName || 'Unnamed';
                return (
                  <tr key={enq.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/crm/enquiries/${enq.id}`}
                        className="font-medium text-xs text-on-surface hover:text-primary"
                      >
                        {displayName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs capitalize text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span>{enq.eventType.replace('_', ' ')}</span>
                        {enq.events && enq.events.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">
                            {enq.events.length} Events
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-outline">{enq.eventDate || '—'}</td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant">{enq.venue || '—'}</td>
                    <td className="py-3 px-4 text-xs text-outline capitalize">{enq.source}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary-container text-on-secondary-container capitalize">
                        {enq.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/crm/enquiries/${enq.id}`}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col gap-5 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h3 className="text-base font-semibold text-on-surface">New Wedding Enquiry</h3>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Optional Existing Client link */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Existing Client (Optional)</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs text-on-surface"
                >
                  <option value="">— Select an existing client or enter guest below —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {!form.clientId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5 sm:col-span-3">
                    <label className="text-xs font-medium text-on-surface">Guest / Couple Name *</label>
                    <Input
                      value={form.guestName}
                      onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                      placeholder="Ananya &amp; Siddharth"
                      required={!form.clientId}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-on-surface">Phone (+91...)</label>
                    <Input
                      value={form.guestPhone}
                      onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                      placeholder="+919840011111"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-1">
                    <label className="text-xs font-medium text-on-surface">Email</label>
                    <Input
                      type="email"
                      value={form.guestEmail}
                      onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                      placeholder="guest@mail.com"
                    />
                  </div>
                </div>
              )}

              {/* Multi-Event Entry Section */}
              <div className="flex flex-col gap-3 p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-on-surface">Events Covered</span>
                    <p className="text-[11px] text-outline">Enter multiple events for this enquiry (e.g. Roce + Wedding).</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        events: [
                          ...prev.events,
                          {
                            name: prev.events.length === 1 ? 'Nuptials / Wedding' : `Event #${prev.events.length + 1}`,
                            eventType: 'wedding' as EventType,
                            eventDate: '',
                            venue: '',
                          },
                        ],
                      }))
                    }
                    className="text-xs h-7"
                  >
                    + Add Event
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.events.map((ev, idx) => (
                    <div key={idx} className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                          Event #{idx + 1}
                        </span>
                        {form.events.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                events: prev.events.filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-[11px] text-error hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Event Name</label>
                          <Input
                            value={ev.name}
                            onChange={(e) => {
                              const updated = [...form.events];
                              updated[idx] = { ...ev, name: e.target.value };
                              setForm({ ...form, events: updated });
                            }}
                            placeholder="e.g. Roce / Nuptials / Sangeet"
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Event Type</label>
                          <select
                            value={ev.eventType}
                            onChange={(e) => {
                              const updated = [...form.events];
                              updated[idx] = { ...ev, eventType: e.target.value as EventType };
                              setForm({ ...form, events: updated });
                            }}
                            className="h-8 px-2 w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs capitalize text-on-surface"
                          >
                            {EVENT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Event Date</label>
                          <Input
                            type="date"
                            value={ev.eventDate || ''}
                            onChange={(e) => {
                              const updated = [...form.events];
                              updated[idx] = { ...ev, eventDate: e.target.value };
                              setForm({ ...form, events: updated });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Venue / City</label>
                          <Input
                            value={ev.venue || ''}
                            onChange={(e) => {
                              const updated = [...form.events];
                              updated[idx] = { ...ev, venue: e.target.value };
                              setForm({ ...form, events: updated });
                            }}
                            placeholder="e.g. Milagres Hall / ITC Grand"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Primary Venue Note</label>
                  <Input
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    placeholder="e.g. Goa &amp; Mangalore"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Estimated Budget (₹)</label>
                  <Input
                    type="number"
                    value={form.budgetRupees === '0' || !form.budgetRupees ? '' : form.budgetRupees}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setForm({ ...form, budgetRupees: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Lead Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as EnquirySource })}
                  className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs capitalize text-on-surface"
                >
                  <option value="instagram">Instagram</option>
                  <option value="google">Google Search</option>
                  <option value="referral">Friend / Word of mouth</option>
                  <option value="wedding_wire">Wedding Wire</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Initial Notes / Requirements</label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="2-day wedding, wants drone and candid coverage..."
                />
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-error-container/60 text-error text-xs flex items-center gap-2 border border-error-container">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Record Enquiry'
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
