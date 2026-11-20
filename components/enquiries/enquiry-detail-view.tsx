'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Enquiry, EnquiryStatus, FollowUp, Client } from '@/types/sales';
import {
  updateEnquiryStatusAction,
  createFollowUpAction,
  completeFollowUpAction,
  linkClientToEnquiryAction,
} from '@/server/actions/enquiry.actions';
import { createClientAction } from '@/server/actions/client.actions';
import { formatINR } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Check,
  Loader2,
} from 'lucide-react';

const STATUS_ORDER: EnquiryStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
];

export function EnquiryDetailView({
  enquiry,
  followUps,
  clients,
  canManage,
}: {
  enquiry: Enquiry;
  followUps: any[];
  clients: Client[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = React.useState<EnquiryStatus>(enquiry.status);
  const [lostReason, setLostReason] = React.useState(enquiry.lostReason || '');
  const [allFollowUps, setAllFollowUps] = React.useState(followUps);

  const [followUpDue, setFollowUpDue] = React.useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [followUpNote, setFollowUpNote] = React.useState('');
  const [addingFollowUp, setAddingFollowUp] = React.useState(false);

  const [selectedClientId, setSelectedClientId] = React.useState(enquiry.clientId || '');
  const [linkingClient, setLinkingClient] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const displayName = enquiry.clientName || enquiry.guestName || 'Unnamed Lead';

  const handleStatusChange = async (next: EnquiryStatus) => {
    let reason = undefined;
    if (next === 'lost') {
      const p = window.prompt('Reason for marking as lost:');
      if (!p) return;
      reason = p;
    }

    const res = await updateEnquiryStatusAction(enquiry.id, next, reason);
    if (res.error) {
      setStatusMsg({ type: 'error', message: res.error.message });
    } else {
      setCurrentStatus(next);
      if (reason) setLostReason(reason);
      setStatusMsg({ type: 'success', message: `Status updated to ${next.replace('_', ' ')}.` });
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingFollowUp(true);

    const res = await createFollowUpAction({
      enquiryId: enquiry.id,
      dueAt: new Date(followUpDue).toISOString(),
      note: followUpNote,
      assignedTo: enquiry.assignedTo || '00000000-0000-0000-0000-000000000000', // fallback
      status: 'open',
    });

    setAddingFollowUp(false);
    if (res.error) {
      setStatusMsg({ type: 'error', message: res.error.message });
    } else {
      setFollowUpNote('');
      setAllFollowUps([
        ...allFollowUps,
        {
          id: res.data || 'temp',
          due_at: new Date(followUpDue).toISOString(),
          note: followUpNote,
          status: 'open',
        },
      ]);
      setStatusMsg({ type: 'success', message: 'Follow-up scheduled.' });
    }
  };

  const handleCompleteFollowUp = async (fuId: string) => {
    const res = await completeFollowUpAction(fuId);
    if (!res.error) {
      setAllFollowUps(
        allFollowUps.map((fu) => (fu.id === fuId ? { ...fu, status: 'completed' } : fu))
      );
    }
  };

  const handleLinkClient = async () => {
    if (!selectedClientId) return;
    setLinkingClient(true);
    const res = await linkClientToEnquiryAction(enquiry.id, selectedClientId);
    setLinkingClient(false);
    if (res.error) {
      setStatusMsg({ type: 'error', message: res.error.message });
    } else {
      setStatusMsg({ type: 'success', message: 'Client linked successfully.' });
      router.refresh();
    }
  };

  const handleQuickConvertClient = async () => {
    if (!enquiry.guestName) return;
    setLinkingClient(true);
    const res = await createClientAction({
      fullName: enquiry.guestName,
      phones: enquiry.guestPhone
        ? [{ phoneE164: enquiry.guestPhone, label: 'Mobile', isPrimary: true, isInternational: false }]
        : [{ phoneE164: '+919840000000', label: 'Mobile', isPrimary: true, isInternational: false }],
      emails: enquiry.guestEmail ? [{ email: enquiry.guestEmail, isPrimary: true }] : [],
      referralSource: enquiry.source,
      notes: `Converted from enquiry on ${enquiry.eventDate || 'wedding'}`,
    });

    if (res.error) {
      setLinkingClient(false);
      setStatusMsg({ type: 'error', message: res.error.message });
      return;
    }

    if (res.data) {
      await linkClientToEnquiryAction(enquiry.id, res.data);
      setLinkingClient(false);
      setStatusMsg({ type: 'success', message: 'Client profile created and linked!' });
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-outline">
        <Link href="/crm/enquiries" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Enquiries
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-on-surface font-medium">{displayName}</span>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            statusMsg.type === 'success'
              ? 'bg-secondary-container/50 text-on-secondary-container border border-secondary-container'
              : 'bg-error-container/50 text-error border border-error-container'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-error" />
          )}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* Top Hero Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-on-surface">{displayName}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container capitalize">
              {currentStatus.replace('_', ' ')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
            <span className="capitalize font-medium">Event: {enquiry.eventType.replace('_', ' ')}</span>
            {enquiry.eventDate && (
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-outline" />
                {enquiry.eventDate}
              </span>
            )}
            {enquiry.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-outline" />
                {enquiry.venue}
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {enquiry.clientId ? (
              <Link href={`/crm/quotations/new?clientId=${enquiry.clientId}&enquiryId=${enquiry.id}`}>
                <Button size="sm">
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Generate Quotation
                </Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" onClick={handleQuickConvertClient} disabled={linkingClient}>
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Convert to Client
              </Button>
            )}
          </div>
        )}
      </div>

      {/* State Machine Stepper */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-3">
        <span className="text-xs font-semibold text-outline uppercase tracking-wider">
          Enquiry Lifecycle Pipeline
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_ORDER.map((step, idx) => {
            const isCompleted = STATUS_ORDER.indexOf(currentStatus) >= idx;
            const isCurrent = currentStatus === step;

            return (
              <button
                key={step}
                type="button"
                onClick={() => handleStatusChange(step)}
                disabled={!canManage}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-primary text-on-primary font-semibold shadow-xs'
                    : isCompleted
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container text-outline hover:text-on-surface'
                }`}
              >
                {isCompleted && !isCurrent && <Check className="w-3 h-3" />}
                <span className="capitalize">{step.replace('_', ' ')}</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-outline-variant/30 mx-1" />

          <button
            type="button"
            onClick={() => handleStatusChange('lost')}
            disabled={!canManage}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              currentStatus === 'lost' ? 'bg-gray-700 text-white' : 'text-outline hover:text-error'
            }`}
          >
            Mark Lost
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('junk')}
            disabled={!canManage}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              currentStatus === 'junk' ? 'bg-red-700 text-white' : 'text-outline hover:text-error'
            }`}
          >
            Mark Junk
          </button>
        </div>

        {currentStatus === 'lost' && lostReason && (
          <div className="p-3 bg-surface-container rounded-lg text-xs text-outline">
            <strong>Lost Reason:</strong> {lostReason}
          </div>
        )}
      </div>

      {/* Grid: Enquiry Details + Follow-ups & Client Link */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Enquiry Specifics */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-on-surface">Event &amp; Requirements</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-outline">Event Type:</span>
                <p className="font-medium text-on-surface capitalize mt-0.5">
                  {enquiry.eventType.replace('_', ' ')}
                </p>
              </div>
              <div>
                <span className="text-outline">Target Event Date:</span>
                <p className="font-mono text-on-surface mt-0.5">{enquiry.eventDate || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-outline">Guest Count:</span>
                <p className="font-mono text-on-surface mt-0.5">{enquiry.guestCount || '—'}</p>
              </div>
              <div>
                <span className="text-outline">Estimated Budget:</span>
                <p className="font-medium text-on-surface mt-0.5">
                  {enquiry.budgetPaise ? formatINR(BigInt(enquiry.budgetPaise)) : 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-outline">Lead Source:</span>
                <p className="font-medium text-on-surface capitalize mt-0.5">{enquiry.source}</p>
              </div>
              <div>
                <span className="text-outline">Inquiry Received:</span>
                <p className="font-mono text-outline mt-0.5">
                  {new Date(enquiry.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
            </div>

            {enquiry.events && enquiry.events.length > 0 && (
              <div className="pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
                <span className="text-xs text-outline font-semibold uppercase tracking-wider">
                  Events Included ({enquiry.events.length})
                </span>
                <div className="space-y-2">
                  {enquiry.events.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-surface-container/50 border border-outline-variant/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface">{ev.name}</span>
                        <span className="text-[11px] text-outline capitalize">{ev.eventType.replace('_', ' ')} {ev.venue ? `• ${ev.venue}` : ''}</span>
                      </div>
                      <span className="font-mono text-outline text-[11px]">{ev.eventDate || 'Date TBD'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enquiry.message && (
              <div className="pt-3 border-t border-outline-variant/20">
                <span className="text-xs text-outline font-medium">Customer Message:</span>
                <p className="text-xs text-on-surface mt-1 leading-relaxed bg-surface-container/40 p-3 rounded-lg">
                  {enquiry.message}
                </p>
              </div>
            )}

            {enquiry.notes && (
              <div className="pt-2 border-t border-outline-variant/20">
                <span className="text-xs text-outline font-medium">Internal Notes:</span>
                <p className="text-xs text-outline mt-1 leading-relaxed">{enquiry.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Client Linking + Follow-up Tasks */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Client Connection Card */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-on-surface">Client Connection</h3>
            {enquiry.clientId ? (
              <div className="p-3 bg-secondary-container/40 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-outline">Linked Client:</span>
                  <p className="font-medium text-on-surface">{enquiry.clientName || 'Client'}</p>
                </div>
                <Link
                  href={`/crm/clients/${enquiry.clientId}`}
                  className="text-primary hover:underline font-semibold"
                >
                  View Client
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-outline">
                  Link this enquiry to an existing client record or create a new client.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="flex-1 h-8 px-2 bg-surface-container-lowest border border-outline-variant/40 rounded text-xs text-on-surface"
                  >
                    <option value="">— Select client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={handleLinkClient}
                    disabled={!selectedClientId || linkingClient}
                    className="h-8 text-xs"
                  >
                    Link
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Follow-ups Card */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                Scheduled Follow-ups
              </h3>
              <span className="font-mono text-xs text-outline">{allFollowUps.length}</span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2">
              {allFollowUps.length === 0 ? (
                <span className="text-xs text-outline italic">No follow-ups scheduled yet.</span>
              ) : (
                allFollowUps.map((fu) => (
                  <div
                    key={fu.id}
                    className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                      fu.status === 'completed'
                        ? 'bg-surface-container/30 border-outline-variant/20 text-outline line-through'
                        : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{fu.note || 'Scheduled call / touchpoint'}</span>
                      <span className="font-mono text-[11px] text-outline">
                        Due: {new Date(fu.due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>

                    {fu.status !== 'completed' && canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCompleteFollowUp(fu.id)}
                        className="h-7 text-xs text-primary"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Done
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Follow-up */}
            {canManage && (
              <form onSubmit={handleAddFollowUp} className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
                <Input
                  type="datetime-local"
                  value={followUpDue}
                  onChange={(e) => setFollowUpDue(e.target.value)}
                  className="h-8 text-xs font-mono"
                  required
                />
                <Input
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g. Call bride to review wedding packages"
                  className="h-8 text-xs"
                  required
                />
                <Button type="submit" size="sm" disabled={addingFollowUp} className="h-8 text-xs">
                  {addingFollowUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                  Schedule Follow-up
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
