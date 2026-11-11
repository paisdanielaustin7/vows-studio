import { test, expect } from './fixtures/auth';

test.describe('E2E Flow 6: Admin User Management, Invitations & MFA Setup', () => {
  test('system_admin accesses /admin/users, /admin/audit-log, and /admin/system/data', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/users');
    await expect(adminPage.getByRole('heading', { name: /User|Access|Team/i }).first()).toBeVisible();

    // Check invitation modal/form availability on admin users page
    await expect(adminPage.getByText(/Invite/i).first()).toBeVisible();

    // Verify audit log and data management console load properly
    await adminPage.goto('/admin/audit-log');
    await expect(adminPage.getByRole('heading', { name: /Audit/i }).first()).toBeVisible();

    await adminPage.goto('/admin/system/data');
    await expect(adminPage.getByText(/Setup Checklist|Reset Wizard|Data Management/i).first()).toBeVisible();
  });

  test('MFA enrollment page requires authentication and redirects signed-out visitors to /login', async ({
    publicPage,
  }) => {
    await publicPage.goto('/mfa/enroll');
    await expect(publicPage).toHaveURL(/\/login/);
  });
});
