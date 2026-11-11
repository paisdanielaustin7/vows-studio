'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Booking, BookingOps, BookingLineItem, StudioEvent, CrewMember, EventAssignmentRole } from '@/types/bookings';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cancelBookingAction, updateBookingStatusAction } from '@/server/actions/booking.actions';
import { createEventAction } from '@/server/actions/event.actions';
import { assignCrewAction, checkCrewConflictsAction, removeCrewAssignmentAction } from '@/server/actions/crew.actions';
import { PipelineTracker } from '@/components/delivery/pipeline-tracker';
import { GenerateReviewLinkModal } from '@/components/reviews/generate-review-link-modal';

interface BookingDetailViewProps {
  booking: Booking | BookingOps;
  lines: BookingLineItem[];
  events: StudioEvent[];
  deliveryStages: Array<{
    id: string;
    stageCode: string;
    sort: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    blockedReason: string | null;
  }>;
  availableCrew: CrewMember[];
  canViewMoney: boolean;
  canManage: boolean;
  userRole?: string;
  userId?: string;
}

export function BookingDetailView({
  booking: initialBooking,
  lines,
  events: initialEvents,
  deliveryStages,
  availableCrew,
  canViewMoney,
  canManage,
  userRole,
  userId,
}: BookingDetailViewProps) {
  const router = useRouter();
  const [booking, setBooking] = useState(initialBooking);
  const [events, setEvents] = useState(initialEvents);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'crew' | 'billing' | 'delivery'>('events');

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeeRupees, setCancelFeeRupees] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Add Event Modal State
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventType, setNewEventType] = useState<'wedding' | 'pre_wedding' | 'reception' | 'engagement' | 'other'>('wedding');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newEquipmentNotes, setNewEquipmentNotes] = useState('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Assign Crew Modal State
  const [assigningEventId, setAssigningEventId] = useState<string | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<EventAssignmentRole>('lead_photographer');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [conflicts, setConflicts] = useState<Array<{ type: string; details: string }>>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Handlers
  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      alert('Cancellation reason is strictly required.');
      return;
    }
    setIsCancelling(true);
    const res = await cancelBookingAction({
      bookingId: booking.id,
      reason: cancelReason.trim(),
      feePaise: Math.round(cancelFeeRupees * 100),
    });
    setIsCancelling(false);
    if (res.error) {
      alert(`Error: ${res.error.message}`);
    } else {
      setIsCancelModalOpen(false);
      setBooking((prev) => ({
        ...prev,
        status: 'cancelled',
        cancellationReason: cancelReason.trim(),
        cancellationFeePaise: Math.round(cancelFeeRupees * 100),
        cancelledAt: new Date().toISOString(),
      }));
      router.refresh();
    }
  };

  const handleStatusChange = async (newStatus: 'confirmed' | 'in_progress' | 'completed') => {
    const res = await updateBookingStatusAction(booking.id, newStatus);
    if (res.error) {
      alert(`Error: ${res.error.message}`);
    } else {
      setBooking((prev) => ({ ...prev, status: newStatus }));
      router.refresh();
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName || !newEventDate || !newVenueName) {
      alert('Event name, date, and venue are required.');
      return;
    }

    setIsSubmittingEvent(true);
    const res = await createEventAction({
      bookingId: booking.id,
      name: newEventName,
      eventType: newEventType,
      eventDate: newEventDate,
      startTime: newStartTime || null,
      endTime: newEndTime || null,
      venueName: newVenueName,
      venueAddress: newVenueAddress || null,
      requirements: newRequirements || null,
      equipmentNotes: newEquipmentNotes || null,
    });
    setIsSubmittingEvent(false);

    if (res.error) {
      alert(`Error: ${res.error.message}`);
    } else {
      setIsAddEventModalOpen(false);
      router.refresh();
    }
  };

  const handleOpenAssignModal = async (eventId: string) => {
    setAssigningEventId(eventId);
    setSelectedCrewId(availableCrew[0]?.id || '');
    setSelectedRole('lead_photographer');
    setOverrideReason('');
    setConflicts([]);
    setAssignError(null);

    // Initial conflict check
    const ev = events.find((e) => e.id === eventId);
    if (ev && availableCrew[0]) {
      setIsCheckingConflicts(true);
      const confRes = await checkCrewConflictsAction(
        availableCrew[0].id,
        ev.eventDate,
        ev.startTime,
        ev.endTime,
        ev.id
      );
      setIsCheckingConflicts(false);
      if (confRes.data) {
        setConflicts(confRes.data);
      }
    }
  };

  const handleCrewChange = async (crewId: string) => {
    setSelectedCrewId(crewId);
    setConflicts([]);
    setAssignError(null);

    const ev = events.find((e) => e.id === assigningEventId);
    if (ev && crewId) {
      setIsCheckingConflicts(true);
      const confRes = await checkCrewConflictsAction(crewId, ev.eventDate, ev.startTime, ev.endTime, ev.id);
      setIsCheckingConflicts(false);
      if (confRes.data) {
        setConflicts(confRes.data);
      }
    }
  };

  const handleAssignCrewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEventId || !selectedCrewId) return;

    if (conflicts.length > 0 && !overrideReason.trim()) {
      setAssignError('Scheduling conflict detected. An explicit override reason is strictly required (D-34).');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    const res = await assignCrewAction({
      eventId: assigningEventId,
      crewMemberId: selectedCrewId,
      role: selectedRole,
      overrideReason: conflicts.length > 0 ? overrideReason.trim() : undefined,
    });
    setIsAssigning(false);

    if (res.error) {
      setAssignError(res.error.message);
    } else {
      setAssigningEventId(null);
      router.refresh();
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this crew member from the event?')) return;
    const res = await removeCrewAssignmentAction(assignmentId);
    if (res.error) {
      alert(`Error: ${res.error.message}`);
    } else {
      router.refresh();
    }
  };

  // Collect all unique crew assigned across events
  const crewRegistry = React.useMemo(() => {
    const map = new Map<string, { memberId: string; name: string; phone?: string; roles: string[]; eventNames: string[] }>();
    events.forEach((ev) => {
      ev.assignments?.forEach((a) => {
        const existing = map.get(a.crewMemberId);
        if (existing) {
          existing.roles.push(a.role.replace(/_/g, ' '));
          existing.eventNames.push(ev.name);
        } else {
          map.set(a.crewMemberId, {
            memberId: a.crewMemberId,
            name: a.crewMemberName || 'Crew Member',
            phone: a.crewMemberPhone,
            roles: [a.role.replace(/_/g, ' ')],
            eventNames: [ev.name],
          });
        }
      });
    });
    return Array.from(map.values());
  }, [events]);

  const contractTotalPaise = 'contractTotalPaise' in booking ? booking.contractTotalPaise : 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/crm/bookings"
            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">{booking.bookingNumber}</h1>
          <Badge
            variant={
              booking.status === 'confirmed'
                ? 'success'
                : booking.status === 'in_progress'
                ? 'info'
                : booking.status === 'cancelled'
                ? 'danger'
                : 'default'
            }
          >
            {booking.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && booking.status !== 'cancelled' && (
            <>
              {booking.status === 'confirmed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('in_progress')}
                  className="h-9"
                >
                  Mark In Progress
                </Button>
              )}
              {booking.status === 'in_progress' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('completed')}
                  className="h-9"
                >
                  Mark Completed
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddEventModalOpen(true)}
                className="h-9 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">calendar_add_on</span>
                <span>Add Event</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReviewModalOpen(true)}
                className="h-9 text-primary border-primary/30 hover:bg-primary/10 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">star</span>
                <span>Request Review</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCancelModalOpen(true)}
                className="h-9 text-error border-error/30 hover:bg-error/10 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Cancel Booking</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="h-9 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print Confirmation</span>
          </Button>
        </div>
      </div>

      {/* Cancellation Notice Banner (matching Stitch cancelled variant) */}
      {booking.status === 'cancelled' && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/30 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span className="material-symbols-outlined text-lg">warning</span>
            <span>Booking Cancelled</span>
          </div>
          <p className="text-xs">
            <strong>Reason:</strong> {booking.cancellationReason || 'No reason provided.'}
          </p>
          {'cancellationFeePaise' in booking &&
            typeof booking.cancellationFeePaise === 'number' &&
            booking.cancellationFeePaise > 0 && (
              <p className="text-xs">
                <strong>Cancellation Fee:</strong> {formatINR(BigInt(booking.cancellationFeePaise))} (Invoices intact per D-35)
              </p>
            )}
        </div>
      )}

      {/* Quick Specs Grid (matching Stitch editorial spec) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-container-low/60 rounded-xl p-4 border border-outline-variant/30">
        <div>
          <span className="text-[11px] uppercase font-semibold text-outline block">Client Reference</span>
          <span className="text-sm font-medium text-on-surface">{booking.clientName || 'Unnamed Client'}</span>
        </div>
        <div>
          <span className="text-[11px] uppercase font-semibold text-outline block">Target Delivery</span>
          <span className="text-sm font-medium text-on-surface">
            {booking.targetDeliveryDate
              ? new Date(booking.targetDeliveryDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Not set'}
          </span>
        </div>
        <div>
          <span className="text-[11px] uppercase font-semibold text-outline block">Events Scheduled</span>
          <span className="text-sm font-medium text-on-surface">{events.length} production events</span>
        </div>
        {canViewMoney && (
          <div className="md:text-right">
            <span className="text-[11px] uppercase font-semibold text-outline block">Contract Valuation</span>
            <span className="text-lg font-bold text-primary">{formatINR(BigInt(contractTotalPaise))}</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl overflow-x-auto w-full sm:w-auto">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'events'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          <span>Events</span>
          <span className="px-1.5 py-0.2 rounded-full bg-secondary-container text-on-secondary-container text-xs">
            {events.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('crew')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'crew'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Crew Registry ({crewRegistry.length})
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'delivery'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Master Delivery ({deliveryStages.length} Stages)
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'billing'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Billing & Invoices
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Overview & Notes
        </button>
      </div>

      {/* TAB 1: EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-on-surface">Production Schedule</h2>
            <span className="text-xs text-outline">{events.length} events scheduled</span>
          </div>

          <div className="space-y-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-outline-variant/20 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-on-surface">{ev.name}</h3>
                      <Badge variant="default">{ev.eventType.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-outline mt-1">
                      <span className="material-symbols-outlined text-[16px]">event</span>
                      <span>
                        {new Date(ev.eventDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {ev.startTime && (
                        <>
                          <span>•</span>
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span>
                            {ev.startTime.slice(0, 5)} {ev.endTime ? `– ${ev.endTime.slice(0, 5)}` : ''}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="material-symbols-outlined text-[16px]">place</span>
                      <span>{ev.venueName}</span>
                    </div>
                  </div>

                  {canManage && booking.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAssignModal(ev.id)}
                      className="h-8 text-xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">person_add</span>
                      <span>Assign Crew</span>
                    </Button>
                  )}
                </div>

                {/* Event Details: Requirements & Equipment */}
                {(ev.requirements || ev.equipmentNotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-surface-container-low/40 p-3 rounded-lg">
                    {ev.requirements && (
                      <div>
                        <span className="font-semibold text-outline uppercase block text-[10px]">Requirements</span>
                        <p className="text-on-surface mt-0.5">{ev.requirements}</p>
                      </div>
                    )}
                    {ev.equipmentNotes && (
                      <div>
                        <span className="font-semibold text-outline uppercase block text-[10px]">Equipment Notes</span>
                        <p className="text-on-surface mt-0.5">{ev.equipmentNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Crew List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase text-outline tracking-wider block">
                    Assigned Crew ({ev.assignments?.length || 0})
                  </span>
                  {(!ev.assignments || ev.assignments.length === 0) ? (
                    <div className="p-3 rounded-lg bg-surface-container-low/30 text-xs text-outline flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-warning">warning</span>
                      <span>No crew members assigned to this event yet.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {ev.assignments.map((a) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[11px]">
                              {a.crewMemberName ? a.crewMemberName.charAt(0) : 'C'}
                            </div>
                            <div>
                              <p className="font-semibold text-on-surface">{a.crewMemberName}</p>
                              <p className="text-[10px] text-outline capitalize">{a.role.replace(/_/g, ' ')}</p>
                              {a.overrideReason && (
                                <p className="text-[10px] text-warning font-medium">Overridden</p>
                              )}
                            </div>
                          </div>
                          {canManage && booking.status !== 'cancelled' && (
                            <button
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="text-outline hover:text-error transition-colors p-1"
                              title="Remove assignment"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40 space-y-2 text-outline">
                <span className="material-symbols-outlined text-4xl text-outline/60">calendar_month</span>
                <p>No events added to this booking yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREW REGISTRY */}
      {activeTab === 'crew' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b border-outline-variant/40">
            <h3 className="font-semibold text-sm text-on-surface">Crew Registry Roster</h3>
            <p className="text-xs text-outline">Aggregated personnel assigned across this booking</p>
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-surface-container-low/40 text-xs text-outline uppercase font-medium">
              <tr>
                <th className="py-2.5 px-4">Crew Member</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Roles</th>
                <th className="py-2.5 px-4">Assigned Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {crewRegistry.map((c) => (
                <tr key={c.memberId} className="hover:bg-surface-container-low/30">
                  <td className="py-3 px-4 font-semibold text-on-surface">
                    <Link href={`/crm/crew/${c.memberId}`} className="hover:underline text-primary">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant text-xs">{c.phone || '—'}</td>
                  <td className="py-3 px-4 text-xs text-outline">
                    {Array.from(new Set(c.roles)).join(', ')}
                  </td>
                  <td className="py-3 px-4 text-xs text-on-surface font-medium">
                    {c.eventNames.join(', ')}
                  </td>
                </tr>
              ))}
              {crewRegistry.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-outline">
                    No crew members currently assigned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: MASTER DELIVERY */}
      {activeTab === 'delivery' && (
        <PipelineTracker
          bookingId={booking.id}
          bookingNumber={booking.bookingNumber}
          clientName={booking.clientName || undefined}
          targetDeliveryDate={booking.targetDeliveryDate}
          userRole={userRole}
          userId={userId}
        />
      )}

      {/* TAB 4: BILLING & INVOICES */}
      {activeTab === 'billing' && (
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-on-surface">Contract Deliverables & Billing</h3>
              <p className="text-xs text-outline">Line items copied from accepted quotation (BK-10)</p>
            </div>
            {canViewMoney && (
              <span className="text-lg font-bold text-primary">
                {formatINR(BigInt(contractTotalPaise))}
              </span>
            )}
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-surface-container-low/50 text-xs text-outline uppercase font-medium">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-center">Qty</th>
                {canViewMoney && <th className="py-2.5 px-4 text-right">Unit Price</th>}
                {canViewMoney && <th className="py-2.5 px-4 text-right">Line Total</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {lines.map((l, idx) => (
                <tr key={l.id || idx}>
                  <td className="py-3 px-4 text-outline">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-on-surface">{l.description}</td>
                  <td className="py-3 px-4 text-center">{l.quantity}</td>
                  {canViewMoney && (
                    <td className="py-3 px-4 text-right">{formatINR(BigInt(l.unitPricePaise))}</td>
                  )}
                  {canViewMoney && (
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatINR(BigInt(l.lineTotalPaise))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: OVERVIEW & NOTES */}
      {activeTab === 'overview' && (
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-4">
          <h3 className="font-semibold text-base text-on-surface">Production Notes & Terms</h3>
          <p className="text-sm text-on-surface whitespace-pre-wrap">{booking.notes || 'No notes specified.'}</p>
        </div>
      )}

      {/* ASSIGN CREW MODAL */}
      {assigningEventId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <h3 className="font-bold text-lg text-on-surface">Assign Crew Member</h3>
              <button
                onClick={() => setAssigningEventId(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignCrewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">
                  Crew Member
                </label>
                <select
                  value={selectedCrewId}
                  onChange={(e) => handleCrewChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  {availableCrew.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.role.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as EventAssignmentRole)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="lead_photographer">Lead Photographer</option>
                  <option value="second_photographer">Second Photographer</option>
                  <option value="lead_videographer">Lead Videographer</option>
                  <option value="second_videographer">Second Videographer</option>
                  <option value="drone_operator">Drone Operator</option>
                  <option value="assistant">Assistant</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Conflict Warnings */}
              {isCheckingConflicts ? (
                <div className="text-xs text-outline py-2">Checking availability...</div>
              ) : conflicts.length > 0 ? (
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-warning font-semibold text-xs">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>Scheduling Conflict Detected (D-34)</span>
                  </div>
                  <ul className="list-disc pl-4 text-xs text-on-surface space-y-1">
                    {conflicts.map((c, idx) => (
                      <li key={idx}>
                        <strong className="capitalize">{c.type.replace('_', ' ')}:</strong> {c.details}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <label className="block text-xs font-semibold text-outline uppercase mb-1">
                      Override Reason (Mandatory)
                    </label>
                    <textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      rows={2}
                      placeholder="Explain why this assignment is permitted despite the conflict..."
                      className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/50 text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none"
                    />
                  </div>
                </div>
              ) : null}

              {assignError && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs">
                  {assignError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssigningEventId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAssigning}
                  className="bg-[#4c6452] hover:bg-[#3d5242] text-white"
                >
                  Assign Crew
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EVENT MODAL */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <h3 className="font-bold text-lg text-on-surface">Add Event to Booking</h3>
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">Event Name</label>
                <Input
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. Roce Ceremony / Main Nuptials"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase mb-1">Event Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="pre_wedding">Pre-Wedding</option>
                    <option value="reception">Reception</option>
                    <option value="engagement">Engagement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase mb-1">Event Date</label>
                  <Input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase mb-1">End Time</label>
                  <Input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">Venue Name</label>
                <Input
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="e.g. St. Aloysius Chapel"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">Venue Address</label>
                <Input
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                  placeholder="Address or landmark"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">Requirements</label>
                <Input
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="Special instructions, drone permits, etc."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddEventModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEvent}
                  className="bg-[#4c6452] hover:bg-[#3d5242] text-white"
                >
                  Create Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL BOOKING MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <h3 className="font-bold text-lg text-on-surface">Cancel Booking</h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-outline">
              Cancelling requires an explicit reason. Any linked invoices remain intact and are not automatically cancelled (per Decision D-35).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">
                  Cancellation Reason (Mandatory)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for cancellation..."
                  className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">
                  Cancellation Fee (₹ optional)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={cancelFeeRupees}
                  onChange={(e) => setCancelFeeRupees(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Keep Booking
              </Button>
              <Button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="bg-error hover:bg-error/90 text-white"
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE REVIEW LINK MODAL */}
      <GenerateReviewLinkModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        preselectedBookingId={booking.id}
      />
    </div>
  );
}
