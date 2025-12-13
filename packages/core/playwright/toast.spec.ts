import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('Toast', () => {
  test('passes axe on the demo page', async ({ page }) => {
    await page.goto('/packages/core/examples/toast.html');
    await page.locator('[data-toast-show="demo-toasts"]').first().waitFor();
    await expectNoAxeViolations(page);
  });

  test('shows and dismisses a toast', async ({ page }) => {
    await page.goto('/packages/core/examples/toast.html');

    const success = page.getByRole('button', { name: 'Show success toast' });
    await success.click();

    const toast = page.locator('[data-toast-item]').filter({ hasText: 'Success: Saved!' });
    await expect(toast).toHaveCount(1);
    await expect(toast.first()).toHaveAttribute('role', 'status');

    await toast.getByRole('button', { name: 'Dismiss' }).click();
    await expect(toast).toHaveCount(0);
  });

  test('danger uses role=alert and can auto-dismiss', async ({ page }) => {
    await page.goto('/packages/core/examples/toast.html');

    await page.getByRole('button', { name: 'Show danger toast' }).click();
    const danger = page.locator('[data-toast-item]').filter({ hasText: 'Danger: Something went wrong.' }).first();
    await expect(danger).toHaveAttribute('role', 'alert');

    await page.getByRole('button', { name: 'Show quick auto-dismiss' }).click();
    const quick = page.locator('[data-toast-item]').filter({ hasText: 'This toast auto-dismisses quickly' });
    await expect(quick).toHaveCount(1);
    await expect(quick).toHaveCount(0, { timeout: 2_000 });
  });

  test('clear removes all toasts', async ({ page }) => {
    await page.goto('/packages/core/examples/toast.html');

    await page.getByRole('button', { name: 'Show info toast' }).click();
    await page.getByRole('button', { name: 'Show warning toast' }).click();

    await expect(page.locator('[data-toast-item]')).toHaveCount(2);

    await page.getByRole('button', { name: 'Clear toasts' }).click();
    await expect(page.locator('[data-toast-item]')).toHaveCount(0);
  });
});

