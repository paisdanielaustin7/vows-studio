import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listExpensesAction } from '@/server/actions/finance.actions';
import { ExpensesManager } from '@/components/finance/expenses-manager';

export const metadata = {
  title: 'Expenses | VOWS CRM',
};

export default async function ExpensesPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'expenses:view');

  const supabase = await createClient();
  const [expensesRes, { data: catData }] = await Promise.all([
    listExpensesAction(),
    supabase
      .from('expense_categories')
      .select('id, code, name')
      .order('sort', { ascending: true }),
  ]);

  const expenses = expensesRes.data || [];

  const categories = (catData || []).map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  const canManage =
    user.role === 'system_admin' ||
    user.role === 'business_owner' ||
    user.role === 'accountant';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ExpensesManager
        initialExpenses={expenses}
        categories={categories}
        canManage={canManage}
      />
    </div>
  );
}
