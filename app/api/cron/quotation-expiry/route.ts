import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Scan quotations expiring within 3 days
    const { data: expiringQuotes } = await admin
      .from('quotations')
      .select('id, quotation_number, client_id, valid_until, created_by')
      .eq('status', 'sent')
      .gte('valid_until', todayStr)
      .lte('valid_until', threeDaysLater);

    const expiringCount = expiringQuotes?.length || 0;

    // Send notifications to creators / sales owners
    if (expiringQuotes && expiringQuotes.length > 0) {
      const notifications = expiringQuotes
        .filter((q) => q.created_by)
        .map((q) => ({
          user_id: q.created_by!,
          type: 'quotation_expiring',
          title: `Quotation Expiring Soon: ${q.quotation_number}`,
          body: `Quotation is valid until ${q.valid_until}. Follow up with client before expiration.`,
          link: `/crm/quotations/${q.id}`,
          is_read: false,
        }));

      if (notifications.length > 0) {
        await admin.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json({
      success: true,
      job: 'quotation-expiry',
      timestamp: new Date().toISOString(),
      expiringQuotesCount: expiringCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Quotation expiry cron failed' },
      { status: 500 }
    );
  }
}
