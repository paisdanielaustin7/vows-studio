import * as React from 'react';
import { getAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditLogViewer } from '@/components/audit/audit-log-viewer';
import { AuditLogEntry } from '@/types/auth';

export default async function AdminAuditLogPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'system_admin') {
    redirect('/403');
  }

  const admin = getAdminClient();
  const { data } = await admin
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
      title="System Audit Trail"
      description="Cryptographically recorded append-only security and data mutation logs across all studio domains."
      isScoped={false}
    />
  );
}
