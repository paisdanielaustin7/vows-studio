import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listClientsAction } from '@/server/actions/client.actions';
import { EnquiryDetailView } from '@/components/enquiries/enquiry-detail-view';
import { Enquiry, EventType, EnquirySource, EnquiryStatus } from '@/types/sales';

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();

  let enqRes = await supabase
    .from('enquiries')
    .select('*, clients(full_name), profiles:profiles!enquiries_assigned_to_fkey(full_name)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (enqRes.error || !enqRes.data) {
    enqRes = await supabase
      .from('enquiries')
      .select('*, clients(full_name)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
  }

  const [fuRes, clientsRes] = await Promise.all([
    supabase
      .from('follow_ups')
      .select('*')
      .eq('enquiry_id', id)
      .order('due_at', { ascending: true }),
    listClientsAction('', 100, 0),
  ]);

  if (enqRes.error || !enqRes.data) {
    notFound();
  }

  const row = enqRes.data as any;
  const enquiry: Enquiry = {
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients?.full_name || null,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    guestEmail: row.guest_email,
    eventType: row.event_type as EventType,
    eventDate: row.event_date,
    eventDateIsApprox: row.event_date_is_approx,
    venue: row.venue,
    guestCount: row.guest_count,
    servicesInterested: row.services_interested || [],
    budgetPaise: row.budget_paise,
    source: row.source as EnquirySource,
    status: row.status as EnquiryStatus,
    assignedTo: row.assigned_to,
    assigneeName: row.profiles?.full_name || null,
    message: row.message,
    notes: row.notes,
    lostReason: row.lost_reason,
    convertedBookingId: row.converted_booking_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const canManage = ['system_admin', 'business_owner', 'manager', 'staff'].includes(user.role);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <EnquiryDetailView
        enquiry={enquiry}
        followUps={fuRes.data || []}
        clients={clientsRes.data?.clients || []}
        canManage={canManage}
      />
    </div>
  );
}
