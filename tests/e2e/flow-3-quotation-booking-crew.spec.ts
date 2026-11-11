import { test, expect } from './fixtures/auth';

test.describe('E2E Flow 3: Bookings, Events & Crew Conflict Scheduling', () => {
  test('manager can access bookings, create booking view, crew directory, and schedule', async ({
    managerPage,
  }) => {
    await managerPage.goto('/crm/bookings');
    await expect(managerPage.getByRole('heading', { name: /Bookings/i }).first()).toBeVisible();

    await managerPage.goto('/crm/bookings/new');
    await expect(managerPage.getByText(/Booking/i).first()).toBeVisible();

    await managerPage.goto('/crm/crew');
    await expect(managerPage.getByRole('heading', { name: /Crew/i }).first()).toBeVisible();

    await managerPage.goto('/crm/schedule');
    await expect(managerPage.getByRole('heading', { name: /Schedule/i }).first()).toBeVisible();

    // Check existing booking detail tabs if seeded
    await managerPage.goto('/crm/bookings');
    const firstBookingLink = managerPage.locator('a[href^="/crm/bookings/"]').first();
    if ((await firstBookingLink.count()) > 0) {
      const href = await firstBookingLink.getAttribute('href');
      if (href && !href.endsWith('/new')) {
        await firstBookingLink.click();
        await managerPage.waitForURL(/\/crm\/bookings\/[^/]+/);
        await expect(managerPage.getByText(/Events|Crew|Delivery/i).first()).toBeVisible();
      }
    }
  });
});
