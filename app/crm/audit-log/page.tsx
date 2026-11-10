import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditLogViewer } from '@/components/audit/audit-log-viewer';
import { AuditLogEntry } from '@/types/auth';

export default async function BusinessOwnerAuditLogPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'business_owner') {
    redirect('/403');
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const entries: AuditLogEntry[] = (data || []).map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    action: row.action,
    tableName: row.table_name,
    recordId: row.record_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));

  return (
    <AuditLogViewer
      entries={entries}
      title="Business Activity Audit Trail"
      description="Chronological log of modifications to clients, quotations, bookings, financial documents, and settings."
      isScoped={true}
    />
  );
}
