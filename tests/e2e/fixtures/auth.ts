import { test as base, expect, type Page } from '@playwright/test';

export type E2ERole =
  | 'system_admin'
  | 'business_owner'
  | 'manager'
  | 'accountant'
  | 'staff'
  | 'crew_member';

interface RoleCredentials {
  email: string;
  password: string;
}

export function getRoleCredentials(role: E2ERole): RoleCredentials {
  const defaultPass = process.env.E2E_DEFAULT_PASSWORD || 'VowsDemo2026!';
  switch (role) {
    case 'system_admin':
      return {
        email: process.env.E2E_ADMIN_EMAIL || 'admin@vowsstudio.com',
        password: process.env.E2E_ADMIN_PASSWORD || defaultPass,
      };
    case 'business_owner':
      return {
        email: process.env.E2E_OWNER_EMAIL || 'owner@vowsstudio.com',
        password: process.env.E2E_OWNER_PASSWORD || defaultPass,
      };
    case 'manager':
      return {
        email: process.env.E2E_MANAGER_EMAIL || 'manager@vowsstudio.com',
        password: process.env.E2E_MANAGER_PASSWORD || defaultPass,
      };
    case 'accountant':
      return {
        email: process.env.E2E_ACCOUNTANT_EMAIL || 'accountant@vowsstudio.com',
        password: process.env.E2E_ACCOUNTANT_PASSWORD || defaultPass,
      };
    case 'staff':
      return {
        email: process.env.E2E_STAFF_EMAIL || 'staff@vowsstudio.com',
        password: process.env.E2E_STAFF_PASSWORD || defaultPass,
      };
    case 'crew_member':
      return {
        email: process.env.E2E_CREW_EMAIL || 'crew@vowsstudio.com',
        password: process.env.E2E_CREW_PASSWORD || defaultPass,
      };
  }
}

export async function loginAsRole(page: Page, role: E2ERole): Promise<void> {
  const creds = getRoleCredentials(role);
  await page.goto('/login');
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15_000,
  });

  // In non-demo production/staging with mandatory TOTP, E2E_TOTP_CODE can be supplied
  if (page.url().includes('/mfa') && process.env.E2E_TOTP_CODE) {
    await page.fill('input[type="text"], input[name="code"]', process.env.E2E_TOTP_CODE);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith('/mfa'), {
      timeout: 15_000,
    });
  }
}

interface E2EFixtures {
  adminPage: Page;
  ownerPage: Page;
  managerPage: Page;
  accountantPage: Page;
  staffPage: Page;
  crewPage: Page;
  publicPage: Page;
}

export const test = base.extend<E2EFixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsRole(page, 'system_admin');
    await expect(page.locator('body')).toBeVisible();
    await use(page);
    await ctx.close();
  },
  ownerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsRole(page, 'business_owner');
    await use(page);
    await ctx.close();
  },
  managerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsRole(page, 'manager');
    await use(page);
    await ctx.close();
  },
  accountantPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsRole(page, 'accountant');
    await use(page);
    await ctx.close();
  },
  staffPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsRole(page, 'staff');
    await use(page);
    await ctx.close();
  },
  crewPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsRole(page, 'crew_member');
    await use(page);
    await ctx.close();
  },
  publicPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect };
