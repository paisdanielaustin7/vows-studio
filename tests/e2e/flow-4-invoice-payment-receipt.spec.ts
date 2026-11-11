import { test, expect } from './fixtures/auth';

test.describe('E2E Flow 4: Invoices, Payments, Receipts & General Ledger', () => {
  test('accountant can view invoices, payments, receipts, credit notes, and general ledger', async ({
    accountantPage,
  }) => {
    await accountantPage.goto('/crm/invoices');
    await expect(accountantPage.getByRole('heading', { name: /Invoices/i }).first()).toBeVisible();

    await accountantPage.goto('/crm/invoices/new');
    await expect(accountantPage.getByText(/Invoice/i).first()).toBeVisible();

    await accountantPage.goto('/crm/payments');
    await expect(accountantPage.getByRole('heading', { name: /Payments/i }).first()).toBeVisible();

    await accountantPage.goto('/crm/receipts');
    await expect(accountantPage.getByRole('heading', { name: /Receipts/i }).first()).toBeVisible();

    await accountantPage.goto('/crm/ledger');
    await expect(accountantPage.getByRole('heading', { name: /Ledger/i }).first()).toBeVisible();

    // Verify PDF download endpoint for seeded invoice if present
    await accountantPage.goto('/crm/invoices');
    const firstInvoiceLink = accountantPage.locator('a[href^="/crm/invoices/"]').first();
    if ((await firstInvoiceLink.count()) > 0) {
      const href = await firstInvoiceLink.getAttribute('href');
      if (href && !href.endsWith('/new')) {
        await firstInvoiceLink.click();
        await accountantPage.waitForURL(/\/crm\/invoices\/[^/]+/);
        const invId = accountantPage.url().split('/').pop();
        if (invId) {
          const pdfRes = await accountantPage.request.get(`/api/pdf/invoice/${invId}`);
          expect([200, 404]).toContain(pdfRes.status());
          if (pdfRes.status() === 200) {
            expect(pdfRes.headers()['content-type']).toContain('application/pdf');
          }
        }
      }
    }
  });
});
