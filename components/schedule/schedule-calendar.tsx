'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CrewEvent, CrewMember } from '@/types/bookings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ScheduleCalendarProps {
  initialEvents: CrewEvent[];
  crewMembers: CrewMember[];
  userRole: string;
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  wedding: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  reception: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  engagement: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  pre_wedding: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  sangeet: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
  haldi: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  mehendi: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300' },
  birthday: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  corporate: { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-300' },
  other: { bg: 'bg-stone-50', text: 'text-stone-800', border: 'border-stone-300' },
};

export function ScheduleCalendar({ initialEvents, crewMembers, userRole: _userRole }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [selectedCrewId, setSelectedCrewId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CrewEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter events by selected crew member
  const filteredEvents = initialEvents.filter((e) => {
    if (selectedCrewId === 'all') return true;
    return e.crewMemberId === selectedCrewId;
  });

  // Calculate days for current month view
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create calendar grid items
  const calendarCells = [];
  // Pad previous month days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      dateNum: prevMonthDays - i,
      isCurrentMonth: false,
      dateString: '',
    });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    calendarCells.push({
      dateNum: d,
      isCurrentMonth: true,
      dateString: `${year}-${monthStr}-${dayStr}`,
    });
  }
  // Pad next month days to make complete 7xN grid
  const remainingCells = 7 - (calendarCells.length % 7);
  if (remainingCells < 7) {
    for (let d = 1; d <= remainingCells; d++) {
      calendarCells.push({
        dateNum: d,
        isCurrentMonth: false,
        dateString: '',
      });
    }
  }

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayDateString = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Header & Operational Control Surface */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="text-xs uppercase font-medium text-stone-500 tracking-wider">
              Studio Operations • Production Schedule
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Production Schedule & Calendar
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Master shoot availability, multi-ceremony logistics, and crew rosters.
          </p>
        </div>

        {/* Date Navigator & View Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-stone-100 rounded-lg p-1 shadow-sm">
            <button
              onClick={handlePrev}
              className="w-8 h-8 flex items-center justify-center rounded text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition-colors"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-stone-900 px-3 min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={handleNext}
              className="w-8 h-8 flex items-center justify-center rounded text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition-colors"
            >
              ›
            </button>
            <button
              onClick={handleToday}
              className="ml-1 px-2.5 py-1 text-xs font-medium rounded bg-white text-stone-900 shadow-xs hover:bg-stone-50 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center bg-stone-100 p-1 rounded-lg shadow-sm text-xs font-medium">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded transition-colors ${
                viewMode === 'month' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded transition-colors ${
                viewMode === 'week' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Crew Filter Strip */}
      <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="uppercase font-semibold text-stone-400 text-[10px] tracking-wider shrink-0">
            Filter Crew:
          </span>
          <button
            onClick={() => setSelectedCrewId('all')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              selectedCrewId === 'all'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Personnel ({crewMembers.length})
          </button>
          {crewMembers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCrewId(c.id)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCrewId === c.id
                  ? 'bg-stone-900 text-white font-medium'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {c.fullName}
            </button>
          ))}
        </div>

        <div className="text-xs text-stone-500 shrink-0">
          <strong className="text-stone-900">{filteredEvents.length}</strong> event assignments in view
        </div>
      </div>

      {/* Legend Strip */}
      <div className="flex items-center gap-3 overflow-x-auto py-2 px-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
        <span className="uppercase font-semibold text-stone-400 text-[10px] tracking-wider shrink-0">
          Event Types:
        </span>
        {Object.entries(EVENT_TYPE_COLORS).map(([typeKey, colors]) => (
          <div key={typeKey} className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full border ${colors.bg} ${colors.border}`}></span>
            <span className="capitalize text-stone-700">{typeKey.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Main View Display */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center py-2 text-xs font-semibold text-stone-600">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-stone-200">
            {calendarCells.map((cell, idx) => {
              const cellEvents = cell.dateString
                ? filteredEvents.filter((e) => e.eventDate === cell.dateString)
                : [];
              const isToday = cell.dateString === todayDateString;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 transition-colors ${
                    !cell.isCurrentMonth
                      ? 'bg-stone-50/50 text-stone-300'
                      : 'bg-white hover:bg-stone-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center'
                          : cell.isCurrentMonth
                          ? 'text-stone-800'
                          : 'text-stone-400'
                      }`}
                    >
                      {cell.dateNum}
                    </span>
                    {cellEvents.length > 0 && (
                      <span className="text-[10px] font-mono text-stone-400">
                        {cellEvents.length} shoot{cellEvents.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Events list in cell */}
                  <div className="space-y-1">
                    {cellEvents.slice(0, 3).map((ev, eIdx) => {
                      const color = EVENT_TYPE_COLORS[ev.eventType] || EVENT_TYPE_COLORS.other;
                      return (
                        <div
                          key={eIdx}
                          onClick={() => setSelectedEvent(ev)}
                          className={`p-1.5 rounded text-[11px] border cursor-pointer truncate shadow-2xs hover:shadow-xs transition-shadow ${color.bg} ${color.text} ${color.border}`}
                          title={`${ev.eventName} (${ev.eventType}) - ${ev.clientName}`}
                        >
                          <div className="font-semibold truncate leading-tight">{ev.eventName}</div>
                          <div className="text-[10px] text-stone-500 truncate">
                            {ev.startTime ? `${ev.startTime.slice(0, 5)} • ` : ''}
                            {ev.clientName}
                          </div>
                        </div>
                      );
                    })}
                    {cellEvents.length > 3 && (
                      <div className="text-[10px] text-stone-500 font-medium pl-1">
                        +{cellEvents.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week / List View */}
      {(viewMode === 'week' || viewMode === 'list') && (
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm divide-y divide-stone-100">
          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-sm text-stone-500">
              No events scheduled for the current selection.
            </div>
          ) : (
            filteredEvents.map((ev, idx) => {
              const color = EVENT_TYPE_COLORS[ev.eventType] || EVENT_TYPE_COLORS.other;
              return (
                <div
                  key={idx}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-center px-3 py-2 bg-stone-100 rounded-md border border-stone-200 min-w-[70px]">
                      <div className="text-xs uppercase font-medium text-stone-500">
                        {new Date(ev.eventDate).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-xl font-bold font-serif text-stone-900">
                        {new Date(ev.eventDate).getDate()}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-stone-900 text-sm">{ev.eventName}</h3>
                        <Badge
                          variant="default"
                          className={`text-[10px] capitalize ${color.bg} ${color.text} ${color.border}`}
                        >
                          {ev.eventType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-xs text-stone-500 mt-1 space-x-2">
                        <span>Client: <strong className="text-stone-700">{ev.clientName}</strong></span>
                        {ev.startTime && (
                          <span>
                            • Time: {ev.startTime.slice(0, 5)} - {ev.endTime ? ev.endTime.slice(0, 5) : 'Late'}
                          </span>
                        )}
                        {ev.venueName && <span>• Venue: {ev.venueName}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="muted" className="capitalize text-xs">
                      {ev.assignedRole.replace('_', ' ')}
                    </Badge>
                    <Link href={`/crm/bookings/${ev.bookingId}`}>
                      <Button variant="outline" size="sm">
                        View Booking →
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Event Details Drawer/Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-mono text-stone-400 uppercase">
                  Booking #{selectedEvent.bookingNumber}
                </span>
                <h3 className="text-lg font-serif font-bold text-stone-900">{selectedEvent.eventName}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-stone-400 hover:text-stone-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-md border border-stone-200">
                <div>
                  <span className="text-stone-400 block">Date</span>
                  <span className="font-semibold text-stone-900">{selectedEvent.eventDate}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Ceremony Type</span>
                  <span className="font-semibold text-stone-900 capitalize">
                    {selectedEvent.eventType.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Hours</span>
                  <span className="text-stone-900">
                    {selectedEvent.startTime ? `${selectedEvent.startTime.slice(0, 5)} - ${selectedEvent.endTime?.slice(0, 5) || 'Late'}` : 'All Day'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Client</span>
                  <span className="font-semibold text-stone-900">{selectedEvent.clientName}</span>
                </div>
              </div>

              {selectedEvent.venueName && (
                <div>
                  <span className="text-stone-400 block">Venue & Location</span>
                  <p className="text-stone-800 font-medium">{selectedEvent.venueName}</p>
                  {selectedEvent.venueAddress && (
                    <p className="text-stone-500">{selectedEvent.venueAddress}</p>
                  )}
                </div>
              )}

              {selectedEvent.requirements && (
                <div>
                  <span className="text-stone-400 block">Shoot Requirements</span>
                  <p className="p-2.5 bg-stone-50 rounded border border-stone-200 text-stone-700 whitespace-pre-wrap">
                    {selectedEvent.requirements}
                  </p>
                </div>
              )}

              {selectedEvent.equipmentNotes && (
                <div>
                  <span className="text-stone-400 block">Equipment Checklist</span>
                  <p className="p-2.5 bg-stone-50 rounded border border-stone-200 text-stone-700 whitespace-pre-wrap">
                    {selectedEvent.equipmentNotes}
                  </p>
                </div>
              )}

              <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-emerald-600 block">Assigned Role</span>
                  <span className="font-semibold capitalize">{selectedEvent.assignedRole.replace('_', ' ')}</span>
                </div>
                {selectedEvent.confirmedAt && (
                  <Badge variant="success" className="bg-white text-emerald-700 border-emerald-300">
                    Confirmed
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <Link href={`/crm/bookings/${selectedEvent.bookingId}`}>
                <Button variant="primary" size="sm">
                  Open Production Booking →
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
