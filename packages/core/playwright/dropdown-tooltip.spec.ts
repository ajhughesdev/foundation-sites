import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

async function tooltipForTrigger(trigger: import('@playwright/test').Locator) {
  const tooltipId = await trigger.evaluate((el) => {
    const raw = el.getAttribute('aria-describedby') || '';
    const ids = raw.split(/\s+/).map((v) => v.trim()).filter(Boolean);
    return ids.at(-1) || '';
  });

  if (!tooltipId) throw new Error('Expected trigger to have aria-describedby tooltip id');
  return trigger.page().locator(`#${tooltipId}`);
}

test.describe('Dropdown + Tooltip', () => {
  test('passes axe on the demo page', async ({ page }) => {
    await page.goto('/packages/core/examples/dropdown-tooltip.html');
    await page.locator('[data-dropdown-toggle="demo-dropdown-1"]').waitFor();
    await expectNoAxeViolations(page);
  });

  test('dropdown opens via ArrowDown and supports keyboard nav', async ({ page }) => {
    await page.goto('/packages/core/examples/dropdown-tooltip.html');

    const trigger = page.locator('[data-dropdown-toggle="demo-dropdown-1"]');
    const dropdown = page.locator('#demo-dropdown-1');

    await trigger.focus();
    await page.keyboard.press('ArrowDown');

    await expect(dropdown).toHaveAttribute('data-dropdown-opened', '');
    await expect(dropdown.locator('a[href="#"]')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(dropdown.locator('[data-dropdown-close]')).toBeFocused();

    await page.keyboard.press('Home');
    await expect(dropdown.locator('a[href="#"]')).toBeFocused();

    await page.keyboard.press('End');
    await expect(dropdown.locator('[data-dropdown-close]')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dropdown).not.toHaveAttribute('data-dropdown-opened', '');
    await expect(trigger).toBeFocused();
  });

  test('tooltip shows on focus and hides on blur', async ({ page }) => {
    await page.goto('/packages/core/examples/dropdown-tooltip.html');

    const trigger = page.getByRole('button', { name: 'Hover/focus me' });
    await trigger.focus();

    const tooltip = await tooltipForTrigger(trigger);
    await expect(tooltip).toHaveAttribute('data-tooltip-opened', '');
    await expect(tooltip).toContainText('Tooltip from title attribute');

    await page.locator('#theme').focus();
    await expect(tooltip).not.toHaveAttribute('data-tooltip-opened', '');
  });

  test('tooltip respects hover delays', async ({ page }) => {
    await page.goto('/packages/core/examples/dropdown-tooltip.html');

    const trigger = page.getByRole('button', { name: 'Data tooltip' });
    const tooltip = await tooltipForTrigger(trigger);

    await trigger.hover();
    await expect(tooltip).toHaveAttribute('data-tooltip-opened', '', { timeout: 2_000 });

    await page.mouse.move(0, 0);
    await expect(tooltip).not.toHaveAttribute('data-tooltip-opened', '', { timeout: 2_000 });
  });
});
