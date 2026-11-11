import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Revoke expired delivery pipeline share tokens
    const { data: expiredPipelines } = await admin
      .from('delivery_pipelines')
      .update({
        share_token_hash: null,
        share_revoked_at: nowIso,
      })
      .not('share_token_hash', 'is', null)
      .lt('share_expires_at', nowIso)
      .select('id');

    // 2. Count expired user invitations
    const { data: expiredInvites } = await admin
      .from('invitations')
      .select('id')
      .is('accepted_at', null)
      .is('revoked_at', null)
      .lt('expires_at', nowIso);

    return NextResponse.json({
      success: true,
      job: 'expiry-sweep',
      timestamp: nowIso,
      expiredShareLinksRevoked: expiredPipelines?.length || 0,
      staleInvitationsFound: expiredInvites?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Expiry sweep cron failed' },
      { status: 500 }
    );
  }
}
