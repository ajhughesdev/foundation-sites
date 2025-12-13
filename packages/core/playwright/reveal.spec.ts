import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('Reveal', () => {
  test('passes axe when closed', async ({ page }) => {
    await page.goto('/packages/core/examples/reveal.html');
    await page.locator('[data-reveal-open="demo-dialog"]').waitFor();
    await expectNoAxeViolations(page);
  });

  test('dialog opens and closes with focus restore', async ({ page }) => {
    await page.goto('/packages/core/examples/reveal.html');

    const opener = page.locator('[data-reveal-open="demo-dialog"]');
    const dialog = page.locator('#demo-dialog');

    await opener.click();
    await expect(dialog).toHaveAttribute('data-reveal-opened', '');
    await expect(dialog).toHaveJSProperty('open', true);

    await expect(dialog.locator('[data-reveal-close]').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveJSProperty('open', false);
    await expect(dialog).not.toHaveAttribute('data-reveal-opened', '');
    await expect(opener).toBeFocused();
  });

  test('fallback opens and closes with Escape + focus restore', async ({ page }) => {
    await page.goto('/packages/core/examples/reveal.html');

    const opener = page.locator('[data-reveal-open="demo-fallback"]');
    const reveal = page.locator('#demo-fallback');

    await opener.click();
    await expect(reveal).toHaveAttribute('data-reveal-opened', '');
    await expect(reveal).toBeVisible();
    await expect(reveal.locator('[data-reveal-close]').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(reveal).not.toHaveAttribute('data-reveal-opened', '');
    await expect(reveal).not.toBeVisible();
    await expect(opener).toBeFocused();
  });
});
