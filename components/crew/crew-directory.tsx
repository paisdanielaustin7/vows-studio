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
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">Crew Roster & Talent Directory</h1>
          <p className="text-sm text-stone-500 mt-1">
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
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <p className="text-xs uppercase font-medium text-stone-500 tracking-wider">Active Roster</p>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{totalActive}</p>
          <span className="text-xs text-stone-400">Total qualified specialists</span>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <p className="text-xs uppercase font-medium text-stone-500 tracking-wider">Photographers</p>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{photographersCount}</p>
          <span className="text-xs text-stone-400">Candid & traditional stills</span>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <p className="text-xs uppercase font-medium text-stone-500 tracking-wider">Cinematographers & Drone</p>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{videographersCount}</p>
          <span className="text-xs text-stone-400">Cinematic video & aerial</span>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <p className="text-xs uppercase font-medium text-stone-500 tracking-wider">Post-Production</p>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{editorsCount}</p>
          <span className="text-xs text-stone-400">Colorists & video editors</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
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
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedRole === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    selectedRole === roleKey
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
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
        <div className="text-center py-16 bg-white rounded-lg border border-stone-200">
          <p className="text-stone-500 text-sm">No crew members found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCrew.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-sm border border-stone-300">
                      {member.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/crm/crew/${member.id}`}
                        className="font-medium text-stone-900 hover:underline block"
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-500">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Phone:</span>
                    <span className="font-mono">{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Email:</span>
                      <span className="truncate max-w-[180px]">{member.email}</span>
                    </div>
                  )}
                  {canViewMoney && member.ratePaise != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Standard Rate:</span>
                      <span className="font-semibold text-stone-900">
                        {formatINR(BigInt(member.ratePaise))} / {member.rateUnit === 'per_event' ? 'event' : 'day'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                <Link
                  href={`/crm/crew/${member.id}`}
                  className="text-xs font-medium text-stone-900 hover:underline"
                >
                  View Profile & Schedule →
                </Link>
                {member.portfolioUrl && (
                  <a
                    href={member.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-stone-400 hover:text-stone-700"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">Add Crew Member</h3>
                <p className="text-xs text-stone-500">
                  Register personnel with conflict tracking and encrypted banking records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCrew} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Arjun Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Primary Discipline <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as CrewRole })}
                    className="w-full h-9 rounded-md border border-stone-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Engagement Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.crewType}
                    onChange={(e) => setFormData({ ...formData, crewType: e.target.value as CrewType })}
                    className="w-full h-9 rounded-md border border-stone-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    <option value="freelancer">Freelancer</option>
                    <option value="employee">In-House Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="arjun@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {canViewMoney && (
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">Standard Rate & Financials</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Standard Rate (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.rateRupees}
                        onChange={(e) => setFormData({ ...formData, rateRupees: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Billing Frequency</label>
                      <select
                        value={formData.rateUnit}
                        onChange={(e) => setFormData({ ...formData, rateUnit: e.target.value as 'per_day' | 'per_event' })}
                        className="w-full h-9 rounded-md border border-stone-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                      >
                        <option value="per_day">Per Day</option>
                        <option value="per_event">Per Event</option>
                      </select>
                    </div>
                  </div>

                  <h5 className="text-[11px] font-semibold text-stone-500 pt-2 border-t border-stone-200">
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
                <label className="block text-xs font-medium text-stone-700 mb-1">Portfolio or Reel URL</label>
                <Input
                  type="url"
                  placeholder="https://instagram.com/... or https://vimeo.com/..."
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Gear kit owned, camera specs, preferred shooting styles..."
                  className="w-full rounded-md border border-stone-300 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
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
