'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CrewMember, CrewRole, CrewType } from '@/types/bookings';
import { formatINR, toPaise } from '@/lib/money';
import { createCrewMemberAction } from '@/server/actions/crew.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CrewDirectoryProps {
  initialCrew: CrewMember[];
  canViewMoney: boolean;
  canManage: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  photographer: 'Photographer',
  videographer: 'Videographer',
  drone_operator: 'Drone Specialist',
  editor: 'Editor / Post-Production',
  assistant: 'Assistant',
  coordinator: 'Event Coordinator',
  other: 'Other Specialist',
};

export function CrewDirectory({ initialCrew, canViewMoney, canManage }: CrewDirectoryProps) {
  const router = useRouter();
  const [crew, setCrew] = useState<CrewMember[]>(initialCrew);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding crew member
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'photographer' as CrewRole,
    crewType: 'freelancer' as CrewType,
    phone: '',
    email: '',
    rateRupees: 8000,
    rateUnit: 'per_day' as 'per_day' | 'per_event',
    portfolioUrl: '',
    notes: '',
    accountHolder: '',
    accountNumber: '',
    bankName: '',
    ifsc: '',
    upiId: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Metrics
  const totalActive = crew.filter((c) => c.isActive).length;
  const photographersCount = crew.filter((c) => c.role === 'photographer').length;
  const videographersCount = crew.filter((c) => c.role === 'videographer' || c.role === 'drone_operator').length;
  const editorsCount = crew.filter((c) => c.role === 'editor').length;

  // Filtered crew
  const filteredCrew = crew.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = selectedRole === 'all' || c.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const bankDetails =
      formData.accountNumber || formData.upiId
        ? {
            accountHolder: formData.accountHolder || null,
            accountNumber: formData.accountNumber || null,
            bankName: formData.bankName || null,
            ifsc: formData.ifsc || null,
            upiId: formData.upiId || null,
          }
        : null;

    const res = await createCrewMemberAction({
      fullName: formData.fullName,
      role: formData.role,
      crewType: formData.crewType,
      phone: formData.phone,
      email: formData.email || null,
      ratePaise: canViewMoney ? Number(toPaise(Number(formData.rateRupees) || 0)) : null,
      rateUnit: canViewMoney ? formData.rateUnit : null,
      bankDetails,
      portfolioUrl: formData.portfolioUrl || null,
      notes: formData.notes || null,
      isActive: true,
    });

    if (res.error) {
      setFormError(res.error.message);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        fullName: '',
        role: 'photographer',
        crewType: 'freelancer',
        phone: '',
        email: '',
        rateRupees: 8000,
        rateUnit: 'per_day',
        portfolioUrl: '',
        notes: '',
        accountHolder: '',
        accountNumber: '',
        bankName: '',
        ifsc: '',
        upiId: '',
      });
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Crew Roster &amp; Talent Directory</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage cinematographers, lead photographers, drone pilots, and editors with conflict detection and encrypted accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <span className="text-base leading-none">+</span>
              Add Crew Member
            </Button>
          )}
        </div>
      </div>

      {/* Operational Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm">
          <p className="text-xs uppercase font-medium text-outline tracking-wider">Active Roster</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{totalActive}</p>
          <span className="text-xs text-outline">Total qualified specialists</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm">
          <p className="text-xs uppercase font-medium text-outline tracking-wider">Photographers</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{photographersCount}</p>
          <span className="text-xs text-outline">Candid &amp; traditional stills</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm">
          <p className="text-xs uppercase font-medium text-outline tracking-wider">Cinematographers &amp; Drone</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{videographersCount}</p>
          <span className="text-xs text-outline">Cinematic video &amp; aerial</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm">
          <p className="text-xs uppercase font-medium text-outline tracking-wider">Post-Production</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{editorsCount}</p>
          <span className="text-xs text-outline">Colorists &amp; video editors</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              type="text"
              placeholder="Search crew by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1">
            <button
              onClick={() => setSelectedRole('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedRole === 'all'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              All Disciplines ({crew.length})
            </button>
            {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
              const count = crew.filter((c) => c.role === roleKey).length;
              return (
                <button
                  key={roleKey}
                  onClick={() => setSelectedRole(roleKey)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    selectedRole === roleKey
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Crew Cards Grid */}
      {filteredCrew.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-xl border border-outline-variant/40">
          <p className="text-outline text-sm">No crew members found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCrew.map((member) => (
            <div
              key={member.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container text-on-surface font-bold flex items-center justify-center text-sm border border-outline-variant/50">
                      {member.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/crm/crew/${member.id}`}
                        className="font-medium text-on-surface hover:text-primary hover:underline block"
                      >
                        {member.fullName}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="default" className="text-[10px] capitalize">
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                        <Badge variant="muted" className="text-[10px] capitalize">
                          {member.crewType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    {member.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface-container text-outline">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-on-surface-variant space-y-1.5 pt-2 border-t border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <span className="text-outline">Phone:</span>
                    <span className="font-mono text-on-surface">{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Email:</span>
                      <span className="truncate max-w-[180px]">{member.email}</span>
                    </div>
                  )}
                  {canViewMoney && member.ratePaise != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Standard Rate:</span>
                      <span className="font-semibold text-on-surface">
                        {formatINR(BigInt(member.ratePaise))} / {member.rateUnit === 'per_event' ? 'event' : 'day'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <Link
                  href={`/crm/crew/${member.id}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View Profile &amp; Schedule →
                </Link>
                {member.portfolioUrl && (
                  <a
                    href={member.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-outline hover:text-on-surface"
                  >
                    Portfolio ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Crew Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Add Crew Member</h3>
                <p className="text-xs text-on-surface-variant">
                  Register personnel with conflict tracking and encrypted banking records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-outline hover:text-on-surface text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-error-container border border-error/30 text-on-error-container text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCrew} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Full Name <span className="text-error">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Arjun Sharma"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Phone <span className="text-error">*</span>
                  </label>
                  <Input
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="arjun@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Primary Discipline <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as CrewRole })}
                    className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Engagement Type <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.crewType}
                    onChange={(e) => setFormData({ ...formData, crewType: e.target.value as CrewType })}
                    className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="freelancer">Freelancer</option>
                    <option value="employee">In-House Staff</option>
                  </select>
                </div>
              </div>

              {canViewMoney && (
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Standard Rate &amp; Financials</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Standard Rate (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.rateRupees}
                        onChange={(e) => setFormData({ ...formData, rateRupees: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Billing Frequency</label>
                      <select
                        value={formData.rateUnit}
                        onChange={(e) => setFormData({ ...formData, rateUnit: e.target.value as 'per_day' | 'per_event' })}
                        className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="per_day">Per Day</option>
                        <option value="per_event">Per Event</option>
                      </select>
                    </div>
                  </div>

                  <h5 className="text-[11px] font-semibold text-outline pt-2 border-t border-outline-variant/40">
                    Encrypted Bank Account (AES-256-GCM Protected)
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Account Holder Name"
                      value={formData.accountHolder}
                      onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                    />
                    <Input
                      placeholder="Bank Name (e.g. HDFC)"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    />
                    <Input
                      placeholder="Account Number"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    />
                    <Input
                      placeholder="IFSC Code (e.g. HDFC0001234)"
                      value={formData.ifsc}
                      onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <Input
                    placeholder="UPI ID (e.g. arjun@okhdfcbank)"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Portfolio or Reel URL</label>
                <Input
                  type="url"
                  placeholder="https://instagram.com/... or https://vimeo.com/..."
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Gear kit owned, camera specs, preferred shooting styles..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-on-surface p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Crew Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
