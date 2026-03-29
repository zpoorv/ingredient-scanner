import { requireAdminPage } from './auth-guard.js';
import { setupAdminLayout } from './layout.js';
import { byId, inputValue, setStatus } from './shared.js';
import { loadUsers, saveUser } from './firebase-client.js';

const { profile, user } = await requireAdminPage();
setupAdminLayout({ activeNav: 'users', profile, user });

let selectedUser = null;
let allUsers = [];

const userFieldIds = {
  countryCode: 'userCountryCode',
  email: 'userEmail',
  name: 'userName',
  plan: 'userPlan',
  role: 'userRole',
  uid: 'userUid',
};

function getFilteredUsers() {
  const query = byId('userSearchInput').value.trim().toLowerCase();
  const roleFilter = byId('userRoleFilter').value;
  const planFilter = byId('userPlanFilter').value;

  return allUsers.filter((account) => {
    const haystack = `${account.name || ''} ${account.email || ''}`.toLowerCase();
    const roleMatch = !roleFilter || account.role === roleFilter;
    const planMatch = !planFilter || account.plan === planFilter;
    return (!query || haystack.includes(query)) && roleMatch && planMatch;
  });
}

function renderStats(users) {
  byId('visibleUsersStat').textContent = String(users.length);
  byId('visiblePremiumStat').textContent = String(users.filter((item) => item.plan === 'premium').length);
  byId('visibleAdminsStat').textContent = String(users.filter((item) => item.role === 'admin').length);
}

function renderUserList() {
  const users = getFilteredUsers();
  const container = byId('userList');
  renderStats(users);

  container.innerHTML = users.length
    ? users
        .map(
          (account) => `
            <button class="user-row${selectedUser?.uid === account.uid ? ' active' : ''}" type="button" data-user-uid="${account.uid}">
              <div class="stack-tight">
                <strong>${account.name || 'Unnamed user'}</strong>
                <span>${account.email}</span>
                <small>${account.role} / ${account.plan}</small>
              </div>
            </button>
          `
        )
        .join('')
    : `<div class="empty-state">No users match your current filters.</div>`;

  container.querySelectorAll('[data-user-uid]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextUser = allUsers.find((item) => item.uid === button.dataset.userUid);

      if (nextUser) {
        selectUser(nextUser);
      }
    });
  });
}

function selectUser(account) {
  selectedUser = account;
  Object.entries(userFieldIds).forEach(([field, id]) => {
    byId(id).value = inputValue(account[field]);
  });
  renderUserList();
  setStatus('userStatus', '', 'neutral');
}

async function refreshUsers() {
  allUsers = await loadUsers();
  renderUserList();
}

['userSearchInput', 'userRoleFilter', 'userPlanFilter'].forEach((id) => {
  byId(id).addEventListener('input', renderUserList);
  byId(id).addEventListener('change', renderUserList);
});

byId('userForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!selectedUser) {
    setStatus('userStatus', 'Select a user first.', 'warning');
    return;
  }

  const nextUser = {
    ...selectedUser,
    countryCode: byId('userCountryCode').value.trim() || null,
    name: byId('userName').value.trim(),
    plan: byId('userPlan').value,
    role: byId('userRole').value,
    updatedAt: new Date().toISOString(),
  };

  try {
    await saveUser(nextUser);
    selectedUser = nextUser;
    setStatus('userStatus', 'User saved.', 'success');
    await refreshUsers();
  } catch (error) {
    setStatus(
      'userStatus',
      error instanceof Error ? error.message : 'Saving the user failed.',
      'danger'
    );
  }
});

await refreshUsers();
