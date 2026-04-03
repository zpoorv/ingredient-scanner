import { requireAdminPage } from './auth-guard.js';
import {
  loadCorrectionReports,
  saveCorrectionReportStatus,
} from './firebase-client.js';
import { setupAdminLayout } from './layout.js';
import { byId, formatDateTime, setHtml, setStatus } from './shared.js';

const { profile, user } = await requireAdminPage();
setupAdminLayout({ activeNav: 'reports', profile, user });

async function loadReports() {
  setStatus('reportsStatus', 'Loading trust review queue...', 'neutral');

  try {
    const reports = await loadCorrectionReports();

    setHtml(
      'reportsList',
      reports.length
          ? reports
            .map(
              (report) => `
                <article class="list-row">
                  <div>
                    <strong>${report.productName || `Barcode ${report.barcode}`}</strong>
                    <div class="muted">${report.reason} · ${report.summary}</div>
                    <div class="muted">
                      ${report.barcode} · ${report.confidence} confidence · priority ${report.priorityScore ?? 0} · ${formatDateTime(report.createdAt)}
                    </div>
                    <div class="muted">
                      ${report.reportType === 'trust-confirmation' ? 'Trust confirmation' : 'Issue report'}
                      ${report.trustConfirmationType ? ` · ${report.trustConfirmationType.replace('-', ' ')}` : ''}
                      ${report.repeatBuyWeight ? ` · repeat weight ${report.repeatBuyWeight}` : ''}
                      ${report.confirmationCount ? ` · confirmations ${report.confirmationCount}` : ''}
                      ${report.timelineSeverity ? ` · timeline ${report.timelineSeverity}` : ''}
                    </div>
                  </div>
                  <div class="list-meta">
                    <span class="badge">${report.status}</span>
                    <a class="inline-link" href="./products.html?barcode=${encodeURIComponent(report.barcode)}">Open product</a>
                    ${
                      report.status !== 'resolved'
                        ? `<button class="ghost-button" data-resolve-report="${report.id}" type="button">Resolve</button>`
                        : ''
                    }
                  </div>
                </article>
              `
            )
            .join('')
        : `<div class="empty-state">No reports in the queue right now.</div>`
    );

    setStatus(
      'reportsStatus',
      reports.length ? `${reports.length} report(s) loaded.` : 'Queue is clear.',
      'success'
    );
  } catch (error) {
    setStatus(
      'reportsStatus',
      error instanceof Error ? error.message : 'Could not load reports.',
      'danger'
    );
  }
}

document.addEventListener('click', async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const reportId = target.dataset.resolveReport;

  if (!reportId) {
    return;
  }

  await saveCorrectionReportStatus(reportId, { status: 'resolved' });
  void loadReports();
});

void loadReports();
