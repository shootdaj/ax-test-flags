(function() {
  'use strict';

  const API = '/api';
  let currentEnv = 'dev';

  // DOM elements
  const envSelect = document.getElementById('env-select');
  const flagList = document.getElementById('flag-list');
  const btnCreate = document.getElementById('btn-create');
  const formSection = document.getElementById('flag-form-section');
  const formTitle = document.getElementById('form-title');
  const flagForm = document.getElementById('flag-form');
  const flagIdInput = document.getElementById('flag-id');
  const flagNameInput = document.getElementById('flag-name');
  const flagDescInput = document.getElementById('flag-description');
  const flagEnabledInput = document.getElementById('flag-enabled');
  const flagPercentage = document.getElementById('flag-percentage');
  const percentageDisplay = document.getElementById('percentage-display');
  const flagAllowlist = document.getElementById('flag-allowlist');
  const flagBlocklist = document.getElementById('flag-blocklist');
  const targetingEnvLabel = document.getElementById('targeting-env');
  const btnCancel = document.getElementById('btn-cancel');
  const analyticsSection = document.getElementById('analytics-section');
  const analyticsFlagName = document.getElementById('analytics-flag-name');
  const analyticsContent = document.getElementById('analytics-content');
  const btnCloseAnalytics = document.getElementById('btn-close-analytics');

  // --- API helpers ---

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    if (res.status === 204) return null;
    return { status: res.status, data: await res.json() };
  }

  // --- Flag list ---

  async function loadFlags() {
    const res = await apiFetch('/flags');
    renderFlags(res.data);
  }

  function renderFlags(flags) {
    if (!flags || flags.length === 0) {
      flagList.innerHTML = '<p class="empty-state">No feature flags yet. Create one to get started.</p>';
      return;
    }

    flagList.innerHTML = flags.map(flag => {
      const envState = flag.environments[currentEnv];
      const isEnvEnabled = envState ? envState.enabled : false;
      return `
        <div class="flag-card" data-id="${flag.id}">
          <label class="flag-toggle">
            <input type="checkbox" ${isEnvEnabled ? 'checked' : ''}
                   onchange="window.toggleFlag('${flag.id}', '${currentEnv}', this.checked)">
            <span class="slider"></span>
          </label>
          <div class="flag-info">
            <div class="flag-name">${escapeHtml(flag.name)}</div>
            <div class="flag-description">${escapeHtml(flag.description || '')}</div>
            <div class="flag-meta">
              Global: ${flag.enabled ? 'ON' : 'OFF'} |
              ${currentEnv}: ${isEnvEnabled ? 'ON' : 'OFF'} |
              Rollout: ${envState ? envState.percentage : 100}%
            </div>
          </div>
          <div class="flag-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.showAnalytics('${flag.id}', '${escapeHtml(flag.name)}')">Analytics</button>
            <button class="btn btn-secondary btn-sm" onclick="window.editFlag('${flag.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteFlag('${flag.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Toggle ---

  window.toggleFlag = async function(id, env, enabled) {
    await apiFetch(`/flags/${id}/environments/${env}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    });
    await loadFlags();
  };

  // --- Create/Edit ---

  function showForm(title, flag) {
    formTitle.textContent = title;
    formSection.classList.remove('hidden');
    targetingEnvLabel.textContent = currentEnv;

    if (flag) {
      flagIdInput.value = flag.id;
      flagNameInput.value = flag.name;
      flagDescInput.value = flag.description || '';
      flagEnabledInput.checked = flag.enabled;

      const envConfig = flag.environments[currentEnv];
      flagPercentage.value = envConfig.percentage;
      percentageDisplay.textContent = envConfig.percentage + '%';
      flagAllowlist.value = (envConfig.allowlist || []).join(', ');
      flagBlocklist.value = (envConfig.blocklist || []).join(', ');
    } else {
      flagIdInput.value = '';
      flagNameInput.value = '';
      flagDescInput.value = '';
      flagEnabledInput.checked = false;
      flagPercentage.value = 100;
      percentageDisplay.textContent = '100%';
      flagAllowlist.value = '';
      flagBlocklist.value = '';
    }

    flagNameInput.focus();
  }

  function hideForm() {
    formSection.classList.add('hidden');
    flagForm.reset();
  }

  btnCreate.addEventListener('click', () => showForm('Create Flag', null));
  btnCancel.addEventListener('click', hideForm);

  flagPercentage.addEventListener('input', () => {
    percentageDisplay.textContent = flagPercentage.value + '%';
  });

  flagForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = flagIdInput.value;
    const body = {
      name: flagNameInput.value.trim(),
      description: flagDescInput.value.trim(),
      enabled: flagEnabledInput.checked
    };

    if (!body.name) return;

    let flagId;
    if (id) {
      // Update
      await apiFetch(`/flags/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      flagId = id;
    } else {
      // Create
      const res = await apiFetch('/flags', { method: 'POST', body: JSON.stringify(body) });
      flagId = res.data.id;
    }

    // Update environment targeting
    const allowlistStr = flagAllowlist.value.trim();
    const blocklistStr = flagBlocklist.value.trim();
    const envBody = {
      enabled: true, // enable in current env if saving
      percentage: Number(flagPercentage.value),
      allowlist: allowlistStr ? allowlistStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      blocklist: blocklistStr ? blocklistStr.split(',').map(s => s.trim()).filter(Boolean) : []
    };

    await apiFetch(`/flags/${flagId}/environments/${currentEnv}`, {
      method: 'PUT',
      body: JSON.stringify(envBody)
    });

    hideForm();
    await loadFlags();
  });

  window.editFlag = async function(id) {
    const res = await apiFetch(`/flags/${id}`);
    showForm('Edit Flag', res.data);
  };

  window.deleteFlag = async function(id) {
    if (!confirm('Delete this flag?')) return;
    await apiFetch(`/flags/${id}`, { method: 'DELETE' });
    await loadFlags();
  };

  // --- Analytics ---

  window.showAnalytics = async function(id, name) {
    analyticsFlagName.textContent = name;
    analyticsSection.classList.remove('hidden');

    const res = await apiFetch(`/flags/${id}/analytics`);
    const analytics = res.data.analytics;

    analyticsContent.innerHTML = ['dev', 'staging', 'production'].map(env => {
      const data = analytics[env] || { true: 0, false: 0 };
      const total = data.true + data.false;
      return `
        <div class="analytics-card">
          <h3>${env}</h3>
          <div class="analytics-stat">
            <div class="stat-true">
              <span class="stat-value">${data.true}</span>
              <span class="stat-label">True</span>
            </div>
            <div class="stat-false">
              <span class="stat-value">${data.false}</span>
              <span class="stat-label">False</span>
            </div>
          </div>
          <div style="margin-top:8px;font-size:0.75rem;color:#999;">Total: ${total}</div>
        </div>
      `;
    }).join('');
  };

  btnCloseAnalytics.addEventListener('click', () => {
    analyticsSection.classList.add('hidden');
  });

  // --- Environment switcher ---

  envSelect.addEventListener('change', () => {
    currentEnv = envSelect.value;
    loadFlags();
    // Update targeting label if form is open
    targetingEnvLabel.textContent = currentEnv;
  });

  // --- Init ---

  loadFlags();
})();
