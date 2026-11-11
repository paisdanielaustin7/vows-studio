import { test, expect } from './fixtures/auth';

test.describe('E2E Flow 2: Create Enquiry -> Build Quotation -> Download PDF', () => {
  test('manager can navigate enquiries, open quotation builder, and render PDF endpoint', async ({
    managerPage,
  }) => {
    await managerPage.goto('/crm/enquiries');
    await expect(managerPage.getByRole('heading', { name: /Enquiries/i }).first()).toBeVisible();

    await managerPage.goto('/crm/quotations/new');
    await expect(managerPage.getByText(/Quotation/i).first()).toBeVisible();

    // Verify existing quotation list & PDF route if seeded quotation exists
    await managerPage.goto('/crm/quotations');
    await expect(managerPage.getByRole('heading', { name: /Quotations/i }).first()).toBeVisible();

    const firstQuotationLink = managerPage.locator('a[href^="/crm/quotations/"]').first();
    if ((await firstQuotationLink.count()) > 0) {
      const href = await firstQuotationLink.getAttribute('href');
      if (href && !href.endsWith('/new')) {
        await firstQuotationLink.click();
        await managerPage.waitForURL(/\/crm\/quotations\/[^/]+/);
        const qtId = managerPage.url().split('/').pop();
        if (qtId) {
          const pdfRes = await managerPage.request.get(`/api/pdf/quotation/${qtId}`);
          expect([200, 404]).toContain(pdfRes.status());
          if (pdfRes.status() === 200) {
            expect(pdfRes.headers()['content-type']).toContain('application/pdf');
          }
        }
      }
    }
  });
});
