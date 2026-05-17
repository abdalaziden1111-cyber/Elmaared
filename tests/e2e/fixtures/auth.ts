/**
 * Playwright custom fixtures that log a persona into the app and reuse
 * their auth state across tests. First test that touches a role pays the
 * cost of going through the real login form; subsequent tests load the
 * cached storage state in milliseconds.
 *
 * Requires the test users to exist in the Supabase project — run:
 *   pnpm node scripts/seed-test-users.mjs
 *
 * Skip specs that depend on this by tagging them @needs-db and using:
 *   pnpm test:e2e:no-db
 */
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PERSONAS, type Persona } from './personas';

const STORAGE_DIR = join(process.cwd(), 'tests/e2e/.auth');
if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });

function storagePath(role: Persona['role']): string {
  return join(STORAGE_DIR, `${role}.json`);
}

async function loginAs(page: Page, persona: Persona): Promise<void> {
  await page.goto('/ar/login');
  await page.getByLabel(/البريد|email/i).fill(persona.email);
  await page.getByLabel(/كلمة|password/i).fill(persona.password);
  await page.getByRole('button', { name: /تسجيل الدخول|sign in/i }).click();

  // Wait for the redirect to the role's landing page. Login server action
  // redirects to /{locale}/dashboard | /{locale}/supplier | /admin.
  const dest =
    persona.role === 'client'
      ? /\/ar\/dashboard/
      : persona.role === 'supplier'
        ? /\/ar\/supplier/
        : /\/admin/;
  await page.waitForURL(dest, { timeout: 10_000 });
}

async function loadOrCreateStorage(
  context: BrowserContext,
  page: Page,
  persona: Persona
): Promise<void> {
  const path = storagePath(persona.role);
  // Cache hit: storageState is already in playwright.config.use, nothing to do.
  if (existsSync(path)) return;
  // Cache miss: do a real login, then persist for subsequent specs.
  await loginAs(page, persona);
  await context.storageState({ path });
}

export const test = base.extend<{
  clientPage: Page;
  supplierPage: Page;
  adminPage: Page;
}>({
  clientPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loadOrCreateStorage(ctx, page, PERSONAS.client);
    await ctx.close();
    const ctx2 = await browser.newContext({ storageState: storagePath('client') });
    const page2 = await ctx2.newPage();
    await use(page2);
    await ctx2.close();
  },
  supplierPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loadOrCreateStorage(ctx, page, PERSONAS.supplier);
    await ctx.close();
    const ctx2 = await browser.newContext({ storageState: storagePath('supplier') });
    const page2 = await ctx2.newPage();
    await use(page2);
    await ctx2.close();
  },
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loadOrCreateStorage(ctx, page, PERSONAS.admin);
    await ctx.close();
    const ctx2 = await browser.newContext({ storageState: storagePath('admin') });
    const page2 = await ctx2.newPage();
    await use(page2);
    await ctx2.close();
  },
});

export { expect };
