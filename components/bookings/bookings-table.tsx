'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Booking, BookingOps } from '@/types/bookings';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarCheck, Plus } from 'lucide-react';

interface BookingsTableProps {
  initialBookings: Array<Booking | BookingOps>;
  canViewMoney: boolean;
}

export function BookingsTable({ initialBookings, canViewMoney }: BookingsTableProps) {
  const [bookings, setBookings] = useState<Array<Booking | BookingOps>>(initialBookings);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.clientName && b.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        selectedStatus === 'all' || b.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, selectedStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'in_progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Bookings</h1>
          <p className="text-sm text-outline">Manage confirmed wedding productions, event rosters, and delivery milestones.</p>
        </div>
        <Link href="/crm/bookings/new">
          <Button className="bg-[#4c6452] hover:bg-[#3d5242] text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            New Booking
          </Button>
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/40">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['all', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                selectedStatus === tab
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search booking # or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-container-low text-on-surface-variant font-medium border-b border-outline-variant/40">
            <tr>
              <th className="py-3 px-4">Booking #</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4 text-center">Events</th>
              <th className="py-3 px-4">Target Delivery</th>
              {canViewMoney && <th className="py-3 px-4 text-right">Contract Total</th>}
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-on-surface">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canViewMoney ? 7 : 6} className="py-12 text-center text-outline">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CalendarCheck className="w-9 h-9 text-outline/60" />
                    <p>No bookings found matching your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-primary">
                    <Link href={`/crm/bookings/${b.id}`} className="hover:underline flex items-center gap-1">
                      {b.bookingNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-on-surface">
                    {b.clientName || 'Unnamed Client'}
                  </td>
                  <td className="py-3 px-4 text-center text-outline">
                    {b.eventCount ?? 0}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {b.targetDeliveryDate
                      ? new Date(b.targetDeliveryDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  {canViewMoney && (
                    <td className="py-3 px-4 text-right font-semibold text-on-surface">
                      {'contractTotalPaise' in b ? formatINR(BigInt(b.contractTotalPaise)) : '—'}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">{getStatusBadge(b.status)}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/crm/bookings/${b.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-on-surface-variant hover:text-on-surface">
                        View Details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
