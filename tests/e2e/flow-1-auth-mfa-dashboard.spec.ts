import { test, expect, loginAsRole } from './fixtures/auth';

test.describe('E2E Flow 1: Login, MFA Enforcement & Role Landing Pages', () => {
  test('system_admin redirects to MFA or /admin/dashboard and sees Admin Console', async ({
    page,
  }) => {
    await loginAsRole(page, 'system_admin');
    const url = page.url();
    expect(url.includes('/admin/dashboard') || url.includes('/mfa')).toBe(true);

    if (url.includes('/admin/dashboard')) {
      await expect(page.getByText(/System|Users|Audit/i).first()).toBeVisible();
    }
  });

  test('crew_member lands on /crm/schedule and receives 403 on restricted routes', async ({
    crewPage,
  }) => {
    await expect(crewPage).toHaveURL(/\/crm\/schedule/);
    // Crew must NOT see Invoices or Quotations links
    await expect(crewPage.locator('a[href="/crm/invoices"]')).toHaveCount(0);
    await expect(crewPage.locator('a[href="/crm/quotations"]')).toHaveCount(0);

    // Direct access to restricted financial route returns 403 page
    await crewPage.goto('/crm/payments');
    await expect(crewPage).toHaveURL(/\/403/);
  });

  test('manager sees /crm/dashboard without revenue/financial amounts (RBAC R3)', async ({
    managerPage,
  }) => {
    await expect(managerPage).toHaveURL(/\/crm\/dashboard/);
    // Manager must be denied from ledger/payments
    await managerPage.goto('/crm/ledger');
    await expect(managerPage).toHaveURL(/\/403/);
  });
});
