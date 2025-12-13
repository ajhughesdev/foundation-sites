import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('Tabs', () => {
  test('passes axe on the demo page', async ({ page }) => {
    await page.goto('/packages/core/examples/tabs.html');
    await page.locator('[data-tabs]').first().waitFor();
    await expectNoAxeViolations(page);
  });

  test('auto activation changes selection with arrows', async ({ page }) => {
    await page.goto('/packages/core/examples/tabs.html');

    const root = page.locator('[data-tabs]').nth(0);
    const account = root.locator('[data-tabs-tab="panel-account"]');
    const billing = root.locator('[data-tabs-tab="panel-billing"]');
    const billingPanel = root.locator('#panel-billing');

    await expect(account).toHaveAttribute('aria-selected', 'true');
    await expect(billingPanel).toHaveAttribute('hidden', '');

    await account.focus();
    await page.keyboard.press('ArrowRight');

    await expect(billing).toHaveAttribute('aria-selected', 'true');
    await expect(billingPanel).not.toHaveAttribute('hidden', '');

    await page.keyboard.press('ArrowRight');
    await expect(account).toHaveAttribute('aria-selected', 'true');
  });

  test('manual activation only selects on Enter/Space', async ({ page }) => {
    await page.goto('/packages/core/examples/tabs.html');

    const root = page.locator('[data-tabs]').nth(1);
    const one = root.locator('[data-tabs-tab="panel-one"]');
    const two = root.locator('[data-tabs-tab="panel-two"]');
    const twoPanel = root.locator('#panel-two');

    await expect(one).toHaveAttribute('aria-selected', 'true');
    await expect(twoPanel).toHaveAttribute('hidden', '');

    await one.focus();
    await page.keyboard.press('ArrowRight');

    await expect(two).toBeFocused();
    await expect(two).toHaveAttribute('aria-selected', 'false');
    await expect(twoPanel).toHaveAttribute('hidden', '');

    await page.keyboard.press('Enter');
    await expect(two).toHaveAttribute('aria-selected', 'true');
    await expect(twoPanel).not.toHaveAttribute('hidden', '');
  });

  test('hash linking reads and updates the URL hash', async ({ page }) => {
    await page.goto('/packages/core/examples/tabs.html#panel-hash-b');

    const root = page.locator('[data-tabs-update-hash]');
    const tabB = root.getByRole('tab', { name: 'Hash B' });
    const panelB = root.locator('#panel-hash-b');

    await expect(tabB).toHaveAttribute('aria-selected', 'true');
    await expect(panelB).not.toHaveAttribute('hidden', '');

    const tabA = root.getByRole('tab', { name: 'Hash A' });
    await tabA.click();
    await expect(page).toHaveURL(/#panel-hash-a$/);
  });
});
