import { EventType } from './sales';
import { UserRole } from '@/lib/constants/permissions';

export type { UserRole };

export type BookingStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  bookingNumber: string;
  clientId: string;
  clientName?: string | null;
  enquiryId?: string | null;
  quotationId?: string | null;
  status: BookingStatus;
  contractTotalPaise: number;
  notes?: string | null;
  targetDeliveryDate?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancellationFeePaise?: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  eventCount?: number;
}

export interface BookingOps {
  id: string;
  bookingNumber: string;
  clientId: string;
  clientName: string;
  enquiryId?: string | null;
  quotationId?: string | null;
  status: BookingStatus;
  notes?: string | null;
  targetDeliveryDate?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  eventCount: number;
}

export interface BookingLineItem {
  id: string;
  bookingId: string;
  sort: number;
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface StudioEvent {
  id: string;
  bookingId: string;
  bookingNumber?: string;
  clientName?: string;
  eventType: EventType;
  name: string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  venueName: string;
  venueAddress?: string | null;
  requirements?: string | null;
  equipmentNotes?: string | null;
  sort: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  assignments?: EventCrewAssignment[];
}

export type CrewRole =
  | 'photographer'
  | 'videographer'
  | 'drone_operator'
  | 'editor'
  | 'assistant'
  | 'coordinator'
  | 'other';

export type CrewType = 'employee' | 'freelancer';

export interface BankDetails {
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  ifsc?: string;
  upiId?: string;
}

export interface CrewMember {
  id: string;
  profileId?: string | null;
  fullName: string;
  role: CrewRole;
  crewType: CrewType;
  phone: string;
  email?: string | null;
  ratePaise?: number | null;
  rateUnit?: 'per_day' | 'per_event' | null;
  bankDetails?: BankDetails | null;
  portfolioUrl?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventAssignmentRole =
  | 'lead_photographer'
  | 'second_photographer'
  | 'lead_videographer'
  | 'second_videographer'
  | 'drone_operator'
  | 'assistant'
  | 'coordinator'
  | 'other';

export interface EventCrewAssignment {
  id: string;
  eventId: string;
  crewMemberId: string;
  crewMemberName?: string;
  crewMemberPhone?: string;
  role: EventAssignmentRole;
  rateOverridePaise?: number | null;
  confirmedAt?: string | null;
  notes?: string | null;
  overrideReason?: string | null;
  overrideBy?: string | null;
  overrideByName?: string | null;
  createdAt: string;
}

export interface CrewUnavailability {
  id: string;
  crewMemberId: string;
  fromTs: string;
  toTs: string;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export type CrewPayStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface CrewPayRecord {
  id: string;
  crewMemberId: string;
  crewMemberName?: string;
  bookingId: string;
  bookingNumber?: string;
  eventId?: string | null;
  workDates?: string[] | null;
  agreedPaise: number;
  paidPaise: number;
  status: CrewPayStatus;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrewEvent {
  assignmentId: string;
  crewMemberId: string;
  profileId?: string | null;
  eventId: string;
  bookingId: string;
  bookingNumber: string;
  clientName: string;
  eventName: string;
  eventType: EventType;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  venueName: string;
  venueAddress?: string | null;
  requirements?: string | null;
  equipmentNotes?: string | null;
  assignedRole: EventAssignmentRole;
  confirmedAt?: string | null;
  assignmentNotes?: string | null;
}

export interface SchedulingConflict {
  type: 'unavailability' | 'assignment_overlap';
  details: string;
}
