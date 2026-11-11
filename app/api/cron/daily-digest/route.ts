import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Check enquiries with follow-up due today or overdue
    const { data: followups } = await admin
      .from('enquiries')
      .select('id, full_name, event_type, follow_up_date, created_by')
      .lte('follow_up_date', today)
      .not('status', 'in', '("won","lost")')
      .limit(50);

    // 2. Check invoices past due date
    const { data: overdueInvoices } = await admin
      .from('invoices')
      .select('id, invoice_number, client_id, total_paise, due_date')
      .lt('due_date', today)
      .not('status', 'in', '("paid","cancelled")')
      .limit(50);

    // 3. Find business owners and system admins to notify
    const { data: admins } = await admin
      .from('profiles')
      .select('id')
      .in('role', ['system_admin', 'business_owner', 'accountant']);

    const followupsCount = followups?.length || 0;
    const overdueCount = overdueInvoices?.length || 0;

    if ((followupsCount > 0 || overdueCount > 0) && admins && admins.length > 0) {
      const notifications = admins.map((a) => ({
        user_id: a.id,
        type: 'daily_digest',
        title: `Daily Studio Digest (${today})`,
        body: `${followupsCount} enquiry follow-up(s) due, ${overdueCount} overdue invoice(s) pending.`,
        link: '/crm/dashboard',
        is_read: false,
      }));

      await admin.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      success: true,
      job: 'daily-digest',
      timestamp: new Date().toISOString(),
      followupsCount,
      overdueInvoicesCount: overdueCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Daily digest cron failed' },
      { status: 500 }
    );
  }
}
