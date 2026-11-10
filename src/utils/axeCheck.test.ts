import { test } from 'node:test';
import assert from 'node:assert';
import { runAllA11yAudits } from '../../scripts/runAxeAudit.js';

test('Axe-Core Automated Accessibility: All UI components pass WCAG 2.1 AA and best practices without violations', async () => {
  const audit = await runAllA11yAudits();
  assert.strictEqual(audit.success, true, `Axe audit failed with ${audit.totalViolations} violations`);
  assert.strictEqual(audit.totalViolations, 0, 'No axe-core violations allowed');
  assert.ok(audit.totalChecks >= 9, 'All 9 core components and states must be audited');
});
