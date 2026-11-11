import { test, expect } from './fixtures/auth';

test.describe('E2E Flow 5: Submit Public Enquiry Form -> Appears in CRM', () => {
  test('unauthenticated visitor submits enquiry on /contact and manager views it in CRM', async ({
    publicPage,
    managerPage,
  }) => {
    const uniqueName = `E2E Couple ${Date.now()}`;
    const uniqueEmail = `e2e.${Date.now()}@example.com`;

    await publicPage.goto('/contact');
    await expect(publicPage.locator('form')).toBeVisible();

    await publicPage.getByPlaceholder("e.g. Derick D'Souza").fill(uniqueName);
    await publicPage.getByPlaceholder('+91 98200 44521').fill('+919820044521');
    await publicPage.getByPlaceholder('you@domain.com').fill(uniqueEmail);
    await publicPage.getByPlaceholder('e.g. St. Cajetan Church, Goa').fill('Se Cathedral, Old Goa');
    await publicPage
      .getByPlaceholder(/Tell us about your chapel/i)
      .fill('E2E verification enquiry for documentary wedding coverage.');

    await publicPage.locator('input[type="checkbox"]').check();
    await publicPage.getByRole('button', { name: /Transmit Inscription/i }).click();

    await publicPage.waitForURL(/\/contact\/thank-you/, { timeout: 15_000 });
    await expect(publicPage.getByText(/Thank|Received|Inscription/i).first()).toBeVisible();

    // Verify in CRM Enquiries list as Manager (D-33: enquiry created without auto-client)
    await managerPage.goto('/crm/enquiries');
    await expect(managerPage.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });
});
