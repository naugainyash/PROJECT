import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import axe from 'axe-core';

// Import UI components to check
import { VoiceMicButton } from '../src/components/VoiceMicButton';
import { EmergencyFrame } from '../src/components/EmergencyFrame';
import { DemoBanner } from '../src/components/DemoBanner';
import { SampleDataBadge } from '../src/components/SampleDataBadge';
import { RateLimitToast } from '../src/components/RateLimitToast';
import { MicBlockedHelpCard } from '../src/components/MicBlockedHelpCard';

export interface ComponentAuditResult {
  componentName: string;
  variant?: string;
  violationsCount: number;
  passesCount: number;
  incompleteCount: number;
  violations: Array<{
    id: string;
    impact?: string | null;
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{ html: string; failureSummary?: string }>;
  }>;
}

/**
 * Runs axe-core accessibility checks on a React component or HTML snippet
 * inside an isolated JSDOM environment.
 */
export async function auditComponent(
  name: string,
  element: React.ReactElement,
  options?: { lang?: string; title?: string }
): Promise<ComponentAuditResult> {
  const lang = options?.lang || 'en';
  const title = options?.title || `${name} Accessibility Test`;
  const markup = renderToString(element);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
</head>
<body style="background:#EEF3F1; color:#0F5C63;">
  <main id="root" role="main">
    ${markup}
  </main>
</body>
</html>`;

  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });

  // Inject axe source into jsdom window to execute rules correctly
  dom.window.eval(axe.source);

  // Run axe inside the jsdom window context
  const results = await (dom.window as unknown as { axe: typeof axe }).axe.run(
    dom.window.document.getElementById('root') || dom.window.document.body,
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
      // Disable color-contrast in JSDOM if computed CSS styles are mocked/unavailable in pure Node
      rules: {
        'color-contrast': { enabled: false }, // Color contrast is verified with exact RGB math in a11yCheck.test.ts
      },
    }
  );

  return {
    componentName: name,
    violationsCount: results.violations.length,
    passesCount: results.passes.length,
    incompleteCount: results.incomplete.length,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({
        html: n.html,
        failureSummary: n.failureSummary,
      })),
    })),
  };
}

/**
 * Main development test runner for accessibility across all core UI components
 */
export async function runAllA11yAudits(): Promise<{
  success: boolean;
  totalChecks: number;
  totalViolations: number;
  results: ComponentAuditResult[];
}> {
  console.log('🔍 Starting axe-core automated accessibility audits on UI components...\n');

  const componentsToTest: Array<{ name: string; element: React.ReactElement }> = [
    {
      name: 'VoiceMicButton (idle)',
      element: React.createElement(VoiceMicButton, {
        state: 'idle',
        onClick: () => {},
        audioLevel: 0,
      }),
    },
    {
      name: 'VoiceMicButton (listening)',
      element: React.createElement(VoiceMicButton, {
        state: 'listening',
        onClick: () => {},
        audioLevel: 0.45,
      }),
    },
    {
      name: 'VoiceMicButton (thinking)',
      element: React.createElement(VoiceMicButton, {
        state: 'thinking',
        onClick: () => {},
        audioLevel: 0,
      }),
    },
    {
      name: 'VoiceMicButton (speaking with Stop button)',
      element: React.createElement(VoiceMicButton, {
        state: 'speaking',
        onClick: () => {},
        onStopSpeaking: () => {},
        audioLevel: 0.6,
      }),
    },
    {
      name: 'EmergencyFrame',
      element: React.createElement(EmergencyFrame, {
        onClose: () => {},
      }),
    },
    {
      name: 'DemoBanner',
      element: React.createElement(DemoBanner, {
        onLearnMore: () => {},
      }),
    },
    {
      name: 'SampleDataBadge',
      element: React.createElement(SampleDataBadge, {
        label: 'Simulated OPD data',
      }),
    },
    {
      name: 'RateLimitToast',
      element: React.createElement(RateLimitToast, {
        onDismiss: () => {},
      }),
    },
    {
      name: 'MicBlockedHelpCard',
      element: React.createElement(MicBlockedHelpCard, {
        onRetry: () => {},
        onDismiss: () => {},
      }),
    },
  ];

  const results: ComponentAuditResult[] = [];
  let totalViolations = 0;
  let totalPasses = 0;

  for (const item of componentsToTest) {
    const res = await auditComponent(item.name, item.element);
    results.push(res);
    totalViolations += res.violationsCount;
    totalPasses += res.passesCount;

    if (res.violationsCount === 0) {
      console.log(`  ✅ [PASS] ${item.name} (${res.passesCount} axe rules passed)`);
    } else {
      console.log(`  ❌ [FAIL] ${item.name} (${res.violationsCount} violations):`);
      res.violations.forEach((v) => {
        console.log(`     - [${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`);
        v.nodes.forEach((n) => {
          if (n.failureSummary) console.log(`       Target: ${n.html}\n       Reason: ${n.failureSummary}`);
        });
      });
    }
  }

  console.log('\n---------------------------------------------------------');
  console.log(`Axe Accessibility Audit Summary:`);
  console.log(`• Components Audited: ${results.length}`);
  console.log(`• Total Axe Rules Passed: ${totalPasses}`);
  console.log(`• Total Violations: ${totalViolations}`);
  console.log('---------------------------------------------------------\n');

  return {
    success: totalViolations === 0,
    totalChecks: results.length,
    totalViolations,
    results,
  };
}

// Direct execution via CLI: tsx scripts/runAxeAudit.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllA11yAudits().then((outcome) => {
    if (!outcome.success) {
      process.exit(1);
    }
  });
}
