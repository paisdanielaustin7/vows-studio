import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Demo reset only triggers if running in DEMO mode
  if (process.env.APP_MODE !== 'demo') {
    return NextResponse.json({
      success: true,
      job: 'demo-reset',
      skipped: true,
      reason: 'Instance is not running in demo mode (APP_MODE !== "demo").',
    });
  }

  try {
    const admin = getAdminClient();

    // 1. Wipe demo business data
    await (admin as any).rpc('reset_business_data', {
      p_scopes: [
        'clients_and_dependants',
        'finance_only',
        'crew',
        'catalogue',
        'portfolio_and_website',
      ],
      p_restart_numbering: true,
      p_clear_audit: true,
      p_actor_id: null,
    });

    // 2. Load fresh sample demo dataset
    await (admin as any).rpc('load_sample_data', {
      p_actor_id: null,
    });

    return NextResponse.json({
      success: true,
      job: 'demo-reset',
      timestamp: new Date().toISOString(),
      message: 'Weekly demo environment successfully refreshed.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Demo reset cron failed' },
      { status: 500 }
    );
  }
}
