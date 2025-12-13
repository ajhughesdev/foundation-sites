import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('Accordion', () => {
  test('passes axe on the demo page', async ({ page }) => {
    await page.goto('/packages/core/examples/accordion.html');
    await page.locator('[data-accordion]').first().waitFor();
    await expectNoAxeViolations(page);
  });

  test('default accordion closes others when one opens', async ({ page }) => {
    await page.goto('/packages/core/examples/accordion.html');

    const accordion = page.locator('[data-accordion]').nth(0);
    const items = accordion.locator('details[data-accordion-item]');

    await expect(items.nth(0)).toHaveJSProperty('open', true);
    await expect(items.nth(1)).toHaveJSProperty('open', false);

    await items.nth(1).locator('summary').click();

    await expect(items.nth(0)).toHaveJSProperty('open', false);
    await expect(items.nth(1)).toHaveJSProperty('open', true);
  });

  test('keyboard navigation moves focus between summaries', async ({ page }) => {
    await page.goto('/packages/core/examples/accordion.html');

    const accordion = page.locator('[data-accordion]').nth(0);
    const summaries = accordion.locator('summary');

    await summaries.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(summaries.nth(1)).toBeFocused();

    await page.keyboard.press('End');
    await expect(summaries.nth(2)).toBeFocused();

    await page.keyboard.press('Home');
    await expect(summaries.nth(0)).toBeFocused();
  });

  test('required open prevents closing the last open item', async ({ page }) => {
    await page.goto('/packages/core/examples/accordion.html');

    const required = page.locator('[data-accordion-allow-all-closed="false"]');
    const items = required.locator('details[data-accordion-item]');

    await expect(items.nth(0)).toHaveJSProperty('open', true);
    await items.nth(0).locator('summary').click();

    await expect(items.nth(0)).toHaveJSProperty('open', true);
  });

  test('programmatic open works', async ({ page }) => {
    await page.goto('/packages/core/examples/accordion.html');

    const required = page.locator('[data-accordion-allow-all-closed="false"]');
    const items = required.locator('details[data-accordion-item]');

    await page.locator('#open-required-b').click();

    await expect(items.nth(0)).toHaveJSProperty('open', false);
    await expect(items.nth(1)).toHaveJSProperty('open', true);
  });
});

