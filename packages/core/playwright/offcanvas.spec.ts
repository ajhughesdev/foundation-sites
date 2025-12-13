import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('OffCanvas', () => {
  test('passes axe when closed', async ({ page }) => {
    await page.goto('/packages/core/examples/offcanvas.html');
    await page.locator('#open-left').waitFor();
    await expectNoAxeViolations(page);
  });

  test('opens, traps focus, and closes on Escape with focus restore', async ({ page }) => {
    await page.goto('/packages/core/examples/offcanvas.html');

    const opener = page.locator('#open-left');
    const panel = page.locator('#demo-offcanvas-left');
    const closeButton = panel.locator('#demo-offcanvas-left-close');
    const lastFocusable = panel.getByRole('button', { name: 'Secondary action' });
    const toolbar = page.locator('.demo-toolbar');

    const rootOverflowBefore = await page.evaluate(() => document.documentElement.style.overflow);

    await opener.click();
    await expect(panel).toHaveAttribute('data-offcanvas-opened', '');
    await expect(closeButton).toBeFocused();
    await expect(toolbar).toHaveJSProperty('inert', true);

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.style.overflow))
      .toBe('hidden');

    await page.keyboard.press('Shift+Tab');
    await expect(lastFocusable).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panel).not.toHaveAttribute('data-offcanvas-opened', '');
    await expect(opener).toBeFocused();
    await expect(toolbar).toHaveJSProperty('inert', false);

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.style.overflow))
      .toBe(rootOverflowBefore);
  });

  test('closes via backdrop click', async ({ page }) => {
    await page.goto('/packages/core/examples/offcanvas.html');

    const opener = page.locator('#open-left');
    const panel = page.locator('#demo-offcanvas-left');

    await opener.click();
    await expect(panel).toHaveAttribute('data-offcanvas-opened', '');

    const backdrop = page.locator('.f-offcanvas-backdrop[data-offcanvas-backdrop-for="demo-offcanvas-left"]');
    await expect(backdrop).toBeVisible();

    const box = await backdrop.boundingBox();
    if (!box) throw new Error('Expected backdrop to have a bounding box');
    await page.mouse.click(box.x + box.width - 10, box.y + 10);
    await expect(panel).not.toHaveAttribute('data-offcanvas-opened', '');
    await expect(opener).toBeFocused();
  });
});
