import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

function formatViolations(violations: Array<{ id: string; impact?: string | null; description: string; nodes: Array<{ target: string[] }> }>) {
  return violations
    .map((v) => {
      const targets = v.nodes.flatMap((n) => n.target).slice(0, 6).join(', ');
      const impact = v.impact ? ` (${v.impact})` : '';
      return `${v.id}${impact}: ${v.description}${targets ? ` [${targets}]` : ''}`;
    })
    .join('\n');
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

