import { requireAdminPage } from './auth-guard.js';
import {
  loadAdminAppConfig,
  loadProductOverrides,
  loadUsers,
} from './firebase-client.js';
import { formatDateTime, setHtml } from './shared.js';
import { setupAdminLayout } from './layout.js';

const { profile, user } = await requireAdminPage();
setupAdminLayout({ activeNav: 'dashboard', profile, user });

const [users, overrides, config] = await Promise.all([
  loadUsers(),
  loadProductOverrides(),
  loadAdminAppConfig(),
]);

const premiumUsers = users.filter((item) => item.plan === 'premium').length;
const adminUsers = users.filter((item) => item.role === 'admin').length;

document.getElementById('totalUsersStat').textContent = String(users.length);
document.getElementById('premiumUsersStat').textContent = String(premiumUsers);
document.getElementById('adminUsersStat').textContent = String(adminUsers);
document.getElementById('overrideCountStat').textContent = String(overrides.length);

setHtml(
  'recentOverridesList',
  overrides.length
    ? overrides
        .slice(0, 6)
        .map(
          (override) => `
            <article class="list-row">
              <div>
                <strong>${override.name || `Barcode ${override.barcode}`}</strong>
                <div class="muted">${override.brand || 'No brand'} · ${override.barcode}</div>
              </div>
              <div class="list-meta">
                <span class="badge">${override.adminScore ?? 'Auto'} score</span>
                <small>${formatDateTime(override.updatedAt)}</small>
              </div>
            </article>
          `
        )
        .join('')
    : `<div class="empty-state">No products saved yet.</div>`
);

setHtml(
  'recentUsersList',
  users.length
    ? users
        .slice(0, 6)
        .map(
          (account) => `
            <article class="list-row">
              <div>
                <strong>${account.name || 'Unnamed user'}</strong>
                <div class="muted">${account.email}</div>
              </div>
              <div class="list-meta">
                <span class="badge">${account.role} / ${account.plan}</span>
                <small>${formatDateTime(account.updatedAt)}</small>
              </div>
            </article>
          `
        )
        .join('')
    : `<div class="empty-state">No synced users yet.</div>`
);

setHtml(
  'configSummary',
  [
    ['Rule-based suggestions', config.enableRuleBasedSuggestions ? 'On' : 'Off'],
    ['Source attribution', config.showSourceAttribution ? 'Shown' : 'Hidden'],
    ['History entry point', config.enableHistory ? 'On' : 'Off'],
    ['Ingredient OCR', config.enableIngredientOcr ? 'On' : 'Off'],
    ['Manual barcode entry', config.enableManualBarcodeEntry ? 'On' : 'Off'],
    ['Support email', config.supportEmail || 'Not set'],
  ]
    .map(
      ([label, value]) => `
        <div class="summary-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join('')
);
