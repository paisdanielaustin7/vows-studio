'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CrewMember, CrewUnavailability } from '@/types/bookings';
import { formatINR, toPaise } from '@/lib/money';
import {
  updateCrewMemberAction,
  createCrewUnavailabilityAction,
  deleteCrewUnavailabilityAction,
} from '@/server/actions/crew.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CrewProfileViewProps {
  crewMember: CrewMember;
  unavailabilities: CrewUnavailability[];
  assignedEvents: Array<{
    id: string;
    role: string;
    eventDate: string;
    eventName: string;
    bookingNumber: string;
    bookingId: string;
    venueName: string | null;
  }>;
  canViewMoney: boolean;
  canManage: boolean;
}

export function CrewProfileView({
  crewMember: initialCrewMember,
  unavailabilities: initialUnavailabilities,
  assignedEvents,
  canViewMoney,
  canManage,
}: CrewProfileViewProps) {
  const router = useRouter();
  const [crewMember, setCrewMember] = useState<CrewMember>(initialCrewMember);
  const [unavailabilities, setUnavailabilities] = useState<CrewUnavailability[]>(initialUnavailabilities);

  // Unavailability modal state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockFromDate, setBlockFromDate] = useState('');
  const [blockToDate, setBlockToDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Edit rate modal state
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateRupees, setRateRupees] = useState(
    crewMember.ratePaise ? Math.round(crewMember.ratePaise / 100) : 0
  );
  const [rateUnit, setRateUnit] = useState<'per_day' | 'per_event'>(
    crewMember.rateUnit || 'per_day'
  );
  const [isSavingRate, setIsSavingRate] = useState(false);

  // Toggle active status
  const handleToggleStatus = async () => {
    if (!canManage) return;
    const newStatus = !crewMember.isActive;
    const res = await updateCrewMemberAction(crewMember.id, { isActive: newStatus });
    if (!res.error) {
      setCrewMember({ ...crewMember, isActive: newStatus });
      router.refresh();
    }
  };

  // Add unavailability
  const handleAddUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockFromDate || !blockToDate) {
      setBlockError('Both start and end dates are required.');
      return;
    }

    setIsSubmittingBlock(true);
    setBlockError(null);

    const fromTs = new Date(`${blockFromDate}T00:00:00.000Z`).toISOString();
    const toTs = new Date(`${blockToDate}T23:59:59.999Z`).toISOString();

    const res = await createCrewUnavailabilityAction({
      crewMemberId: crewMember.id,
      fromTs,
      toTs,
      reason: blockReason || null,
    });

    if (res.error) {
      setBlockError(res.error.message);
      setIsSubmittingBlock(false);
    } else {
      setIsSubmittingBlock(false);
      setIsBlockModalOpen(false);
      setBlockFromDate('');
      setBlockToDate('');
      setBlockReason('');
      router.refresh();
    }
  };

  // Delete unavailability
  const handleDeleteUnavailability = async (unavailabilityId: string) => {
    if (!confirm('Remove this unavailability block?')) return;
    const res = await deleteCrewUnavailabilityAction(unavailabilityId);
    if (!res.error) {
      setUnavailabilities(unavailabilities.filter((u) => u.id !== unavailabilityId));
      router.refresh();
    }
  };

  // Save rate updates
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRate(true);
    const newRatePaise = Number(toPaise(Number(rateRupees) || 0));

    const res = await updateCrewMemberAction(crewMember.id, {
      ratePaise: newRatePaise,
      rateUnit,
    });

    if (!res.error) {
      setCrewMember({ ...crewMember, ratePaise: newRatePaise, rateUnit });
      setIsRateModalOpen(false);
      router.refresh();
    }
    setIsSavingRate(false);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/crm/crew" className="hover:underline">
            Crew Directory
          </Link>
          <span>/</span>
          <span className="text-stone-900 font-medium">{crewMember.fullName}</span>
        </div>
        <Link href="/crm/crew">
          <Button variant="outline" size="sm">
            ← Back to Directory
          </Button>
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-stone-900 text-white font-bold text-xl flex items-center justify-center">
              {crewMember.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-stone-900">{crewMember.fullName}</h1>
                <Badge variant={crewMember.isActive ? 'success' : 'muted'}>
                  {crewMember.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
                <span className="capitalize font-medium text-stone-700">{crewMember.role.replace('_', ' ')}</span>
                <span>•</span>
                <span className="capitalize">{crewMember.crewType}</span>
                {crewMember.portfolioUrl && (
                  <>
                    <span>•</span>
                    <a
                      href={crewMember.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-900 hover:underline"
                    >
                      Portfolio ↗
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                {crewMember.isActive ? 'Mark Inactive' : 'Mark Active'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Details & Financials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Contact Information</h2>
          <div className="text-sm space-y-2 pt-1">
            <div>
              <span className="text-xs text-stone-400 block">Phone</span>
              <span className="font-mono text-stone-900 font-medium">{crewMember.phone}</span>
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Email</span>
              <span className="text-stone-900">{crewMember.email || 'None recorded'}</span>
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Notes & Gear</span>
              <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded border border-stone-200 mt-1 whitespace-pre-wrap">
                {crewMember.notes || 'No operational notes.'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial & Compensation Card */}
        {canViewMoney && (
          <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Compensation</h2>
              {canManage && (
                <button
                  onClick={() => setIsRateModalOpen(true)}
                  className="text-xs text-stone-900 hover:underline font-medium"
                >
                  Edit Rate
                </button>
              )}
            </div>
            <div className="text-sm space-y-2 pt-1">
              <div>
                <span className="text-xs text-stone-400 block">Standard Rate</span>
                <span className="text-xl font-bold font-serif text-stone-900">
                  {crewMember.ratePaise != null ? formatINR(BigInt(crewMember.ratePaise)) : 'Not configured'}
                </span>
                <span className="text-xs text-stone-500 ml-1">
                  / {crewMember.rateUnit === 'per_event' ? 'event' : 'day'}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-100">
                <span className="text-xs text-stone-400 block">Rate Protection</span>
                <span className="text-xs text-stone-600">
                  Hidden from Staff and Crew roles per D-34 RBAC invariants.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Encrypted Banking Details Card (SA / BO only) */}
        {crewMember.bankDetails ? (
          <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              Encrypted Bank Account (AES-256)
            </h2>
            <div className="text-xs space-y-1.5 pt-1 text-stone-700">
              <div>
                <span className="text-stone-400 block">Account Holder</span>
                <span className="font-medium">{crewMember.bankDetails.accountHolder || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Bank Name</span>
                <span>{crewMember.bankDetails.bankName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Account Number</span>
                <span className="font-mono">{crewMember.bankDetails.accountNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block">IFSC Code</span>
                <span className="font-mono">{crewMember.bankDetails.ifsc || 'N/A'}</span>
              </div>
              {crewMember.bankDetails.upiId && (
                <div>
                  <span className="text-stone-400 block">UPI ID</span>
                  <span className="font-mono">{crewMember.bankDetails.upiId}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Bank Details</h2>
            <p className="text-xs text-stone-500 pt-2">
              No bank account or UPI details on file, or access restricted to System Admin / Business Owner.
            </p>
          </div>
        )}
      </div>

      {/* Unavailability & Leaves Management */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Unavailability & Blackout Dates</h2>
            <p className="text-xs text-stone-500">
              Dates when this crew member cannot be assigned without an explicit override reason (D-34).
            </p>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setIsBlockModalOpen(true)}>
              + Block Dates / Leave
            </Button>
          )}
        </div>

        {unavailabilities.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 bg-stone-50 rounded border border-dashed border-stone-200">
            No active unavailability blocks recorded. Crew member is eligible for scheduling.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border rounded-md">
            {unavailabilities.map((u) => {
              const fromStr = new Date(u.fromTs).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const toStr = new Date(u.toTs).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              return (
                <div key={u.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-stone-900">
                      {fromStr} — {toStr}
                    </span>
                    {u.reason && <span className="text-stone-500 ml-2">({u.reason})</span>}
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleDeleteUnavailability(u.id)}
                      className="text-red-600 hover:underline font-medium"
                    >
                      Remove Block
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assigned Events Roster */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Production Assignments History</h2>
          <p className="text-xs text-stone-500">Events scheduled and completed by this crew member.</p>
        </div>

        {assignedEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 bg-stone-50 rounded border border-dashed border-stone-200">
            No event assignments recorded.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border rounded-md">
            {assignedEvents.map((ev) => (
              <div key={ev.id} className="p-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900">{ev.eventName}</span>
                    <Badge variant="default" className="text-[10px] capitalize">
                      {ev.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-stone-500">
                    <span>{ev.eventDate}</span>
                    {ev.venueName && <span> • {ev.venueName}</span>}
                  </div>
                </div>
                <Link
                  href={`/crm/bookings/${ev.bookingId}`}
                  className="font-mono text-stone-700 hover:underline font-medium"
                >
                  {ev.bookingNumber} →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block Dates Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-stone-900">Block Unavailability Window</h3>
              <button onClick={() => setIsBlockModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            {blockError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {blockError}
              </div>
            )}

            <form onSubmit={handleAddUnavailability} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">From Date</label>
                <Input
                  type="date"
                  required
                  value={blockFromDate}
                  onChange={(e) => setBlockFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">To Date</label>
                <Input
                  type="date"
                  required
                  value={blockToDate}
                  onChange={(e) => setBlockToDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Reason / Note</label>
                <Input
                  placeholder="e.g. Personal leave, gear servicing, out of town"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsBlockModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingBlock}>
                  {isSubmittingBlock ? 'Saving...' : 'Record Unavailability'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-stone-900">Update Compensation Rate</h3>
              <button onClick={() => setIsRateModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Standard Rate (₹)</label>
                <Input
                  type="number"
                  min={0}
                  required
                  value={rateRupees}
                  onChange={(e) => setRateRupees(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Frequency</label>
                <select
                  value={rateUnit}
                  onChange={(e) => setRateUnit(e.target.value as 'per_day' | 'per_event')}
                  className="w-full h-9 rounded-md border border-stone-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                >
                  <option value="per_day">Per Day</option>
                  <option value="per_event">Per Event</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSavingRate}>
                  {isSavingRate ? 'Saving...' : 'Update Rate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
