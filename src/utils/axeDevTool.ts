import axe from 'axe-core';

export interface ClientA11yReport {
  timestamp: string;
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
 * Runs an accessibility audit in the browser using axe-core on a target element or document.
 * Outputs formatted summary into developer console and returns structured results.
 */
export async function runBrowserAxeAudit(
  element?: HTMLElement | null
): Promise<ClientA11yReport> {
  const target = element || document.getElementById('root') || document.body;

  try {
    const results = await axe.run(target, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
      rules: {
        // In iframe or development environments, allow reasonable color-contrast tolerance if necessary
        'color-contrast': { enabled: true },
      },
    });

    const report: ClientA11yReport = {
      timestamp: new Date().toISOString(),
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

    if (results.violations.length === 0) {
      console.log(
        `%c [axe-core] Accessibility Audit Passed! ${results.passes.length} rules verified with 0 violations. `,
        'background: #0F5C63; color: #FFFFFF; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
      );
    } else {
      console.warn(
        `%c [axe-core] Found ${results.violations.length} accessibility violation(s): `,
        'background: #DC2626; color: #FFFFFF; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
      );
      console.table(
        results.violations.map((v) => ({
          ID: v.id,
          Impact: v.impact,
          Description: v.help,
          HelpURL: v.helpUrl,
        }))
      );
    }

    return report;
  } catch (error) {
    console.error('[axe-core] Error during accessibility audit:', error);
    return {
      timestamp: new Date().toISOString(),
      violationsCount: -1,
      passesCount: 0,
      incompleteCount: 0,
      violations: [
        {
          id: 'audit-execution-error',
          impact: 'serious',
          description: String(error),
          help: 'Execution failed',
          helpUrl: '',
          nodes: [],
        },
      ],
    };
  }
}
