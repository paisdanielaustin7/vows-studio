import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { getLedgerReportAction } from '@/server/actions/finance.actions';
import { LedgerView } from '@/components/finance/ledger-view';

export const metadata = {
  title: 'General Ledger & P&L | VOWS Studio CRM',
};

export default async function LedgerPage(props: {
  searchParams?: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'ledger:view');

  const searchParams = props.searchParams ? await props.searchParams : {};
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const defaultStart = `${year}-${month}-01`;
  // Last day of month
  const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
  const defaultEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  const startDate = searchParams.startDate || defaultStart;
  const endDate = searchParams.endDate || defaultEnd;

  const result = await getLedgerReportAction({ startDate, endDate });
  const entries = result.data?.entries || [];
  const report = result.data?.report || {
    startDate,
    endDate,
    totalIncomePaise: 0,
    totalExpensesPaise: 0,
    netProfitPaise: 0,
    incomeByCategory: [],
    expensesByCategory: [],
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <LedgerView
        initialEntries={entries}
        initialReport={report}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
