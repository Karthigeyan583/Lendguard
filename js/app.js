/**
 * LendGuard - Master Application Controller
 */

class LendGuardApp {
  constructor() {
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.activeLoanForAction = null;
    this.currentReminderTone = 'polite';

    this.init();
  }

  init() {
    this.initTheme();
    this.setupEventListeners();
    this.renderDashboard();
    this.renderSecurityCenter();
    this.initStandaloneCalculator();

    // Check if security privacy mode is on
    if (window.Security && window.Security.privacyMode) {
      document.body.classList.add('privacy-active');
      const privBtn = document.getElementById('btnTogglePrivacy');
      if (privBtn) privBtn.innerHTML = '👁️‍🗨️ Show Balances';
    }
  }

  initTheme() {
    const savedTheme = localStorage.getItem('lendguard_theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('lendguard_theme', theme);

    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    }
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
    this.showToast(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Mode`, 'info');
  }

  setupEventListeners() {
    // Theme Toggle
    const btnToggleTheme = document.getElementById('btnToggleTheme');
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener('click', () => this.toggleTheme());
    }

    // Top Navigation Tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetView = e.currentTarget.dataset.view;
        this.switchView(targetView);
      });
    });

    // Supabase Cloud Sync Modal Trigger
    const btnOpenSupabaseModal = document.getElementById('btnOpenSupabaseModal');
    if (btnOpenSupabaseModal) {
      btnOpenSupabaseModal.addEventListener('click', () => this.openSupabaseModal());
    }

    const supabaseCredsForm = document.getElementById('supabaseCredsForm');
    if (supabaseCredsForm) {
      supabaseCredsForm.addEventListener('submit', (e) => this.handleSupabaseCredsSubmit(e));
    }

    // Privacy Mode Toggle
    const btnTogglePrivacy = document.getElementById('btnTogglePrivacy');
    if (btnTogglePrivacy) {
      btnTogglePrivacy.addEventListener('click', () => {
        const isMasked = window.Security.togglePrivacyMode();
        btnTogglePrivacy.innerHTML = isMasked ? '👁️‍🗨️ Show Balances' : '👁️ Mask Balances';
        this.showToast(isMasked ? 'Privacy Mode Enabled (Amounts Hidden)' : 'Privacy Mode Disabled', 'info');
      });
    }

    // Lock Now Button
    const btnLockNow = document.getElementById('btnLockNow');
    if (btnLockNow) {
      btnLockNow.addEventListener('click', () => {
        window.Security.lockApp();
      });
    }

    // Keypad Event Delegation
    const keypad = document.getElementById('pinKeypad');
    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.keypad-btn');
        if (btn) {
          const key = btn.dataset.key;
          window.Security.handleKeypadPress(key);
        }
      });
    }

    // Search Input
    const searchInput = document.getElementById('loanSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderLoansGrid();
      });
    }

    // Filter Pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        filterPills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentFilter = e.currentTarget.dataset.filter;
        this.renderLoansGrid();
      });
    });

    // Add Loan Button
    const btnOpenAddLoan = document.getElementById('btnOpenAddLoan');
    if (btnOpenAddLoan) {
      btnOpenAddLoan.addEventListener('click', () => this.openAddLoanModal());
    }

    // Add/Edit Loan Form
    const loanForm = document.getElementById('loanForm');
    if (loanForm) {
      loanForm.addEventListener('submit', (e) => this.handleLoanFormSubmit(e));

      // Dynamic calculations inside add modal
      const calcInputs = ['loanPrincipal', 'loanInterestType', 'loanInterestRate', 'loanTenureMonths', 'loanStartDate'];
      calcInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => this.updateModalCalculationPreview());
          el.addEventListener('change', () => this.updateModalCalculationPreview());
        }
      });
    }

    // Partial Payment Form
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => this.handlePaymentFormSubmit(e));
    }

    // Reminder Tone Buttons
    const toneButtons = document.querySelectorAll('.tone-btn');
    toneButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        toneButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentReminderTone = e.currentTarget.dataset.tone;
        this.updateReminderPreview();
      });
    });

    // Security Settings Form
    const securitySettingsForm = document.getElementById('securitySettingsForm');
    if (securitySettingsForm) {
      securitySettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPin = document.getElementById('newPinInput').value;
        const confirmPin = document.getElementById('confirmPinInput').value;
        const timeout = document.getElementById('inactivityTimeoutSelect').value;

        if (newPin) {
          if (newPin !== confirmPin) {
            this.showToast('PIN confirmation does not match!', 'error');
            return;
          }
          if (newPin.length !== 4) {
            this.showToast('PIN must be exactly 4 digits', 'error');
            return;
          }
          window.Security.setMasterPin(newPin);
          document.getElementById('newPinInput').value = '';
          document.getElementById('confirmPinInput').value = '';
        }

        window.Security.setInactivityTimeout(timeout);
        this.showToast('Security settings saved successfully', 'success');
        this.renderSecurityCenter();
      });
    }

    // Backup & Restore
    const btnExportBackup = document.getElementById('btnExportBackup');
    if (btnExportBackup) {
      btnExportBackup.addEventListener('click', () => this.handleExportBackup());
    }

    const backupFileInput = document.getElementById('backupFileInput');
    if (backupFileInput) {
      backupFileInput.addEventListener('change', (e) => this.handleImportBackup(e));
    }
  }

  switchView(viewName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    if (viewName === 'dashboard') {
      this.renderDashboard();
    } else if (viewName === 'security') {
      this.renderSecurityCenter();
    } else if (viewName === 'calculator') {
      this.calculateStandalone();
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /* Render Dashboard, Stat Counters and Loan Cards */
  renderDashboard() {
    const loans = window.StorageManager.getLoans();
    let totalLent = 0;
    let totalRecovered = 0;
    let totalPending = 0;
    let totalInterestAccrued = 0;
    let overdueCount = 0;

    loans.forEach(loan => {
      const metrics = LoanEngine.calculateLoanMetrics(loan);
      if (loan.type === 'lent') {
        totalLent += metrics.principal;
        totalRecovered += metrics.totalPaid;
        totalPending += metrics.remainingTotal;
        totalInterestAccrued += metrics.totalExpectedInterest;
      }
      if (metrics.isOverdue) overdueCount++;
    });

    // Update Top Summary Cards
    const elTotalLent = document.getElementById('statTotalLent');
    const elTotalRecovered = document.getElementById('statTotalRecovered');
    const elTotalPending = document.getElementById('statTotalPending');
    const elTotalInterest = document.getElementById('statTotalInterest');

    if (elTotalLent) elTotalLent.textContent = LoanEngine.formatCurrency(totalLent);
    if (elTotalRecovered) elTotalRecovered.textContent = LoanEngine.formatCurrency(totalRecovered);
    if (elTotalPending) elTotalPending.textContent = LoanEngine.formatCurrency(totalPending);
    if (elTotalInterest) elTotalInterest.textContent = LoanEngine.formatCurrency(totalInterestAccrued);

    this.renderLoansGrid();
  }

  renderLoansGrid() {
    const grid = document.getElementById('loansGrid');
    if (!grid) return;

    const loans = window.StorageManager.getLoans();

    // Filter logic
    const filtered = loans.filter(loan => {
      const metrics = LoanEngine.calculateLoanMetrics(loan);

      // Search matching
      const matchesSearch = !this.searchQuery ||
        loan.borrowerName.toLowerCase().includes(this.searchQuery) ||
        (loan.tag && loan.tag.toLowerCase().includes(this.searchQuery)) ||
        (loan.notes && loan.notes.toLowerCase().includes(this.searchQuery));

      if (!matchesSearch) return false;

      // Filter Pill matching
      if (this.currentFilter === 'all') return true;
      if (this.currentFilter === 'lent') return loan.type === 'lent';
      if (this.currentFilter === 'borrowed') return loan.type === 'borrowed';
      if (this.currentFilter === 'partially_paid') return metrics.status === 'partially_paid';
      if (this.currentFilter === 'overdue') return metrics.isOverdue;
      if (this.currentFilter === 'settled') return metrics.status === 'settled';
      if (this.currentFilter === 'friend') return (loan.tag || '').toLowerCase() === 'friend';
      if (this.currentFilter === 'family') return (loan.tag || '').toLowerCase() === 'family';
      if (this.currentFilter === 'business') return (loan.tag || '').toLowerCase() === 'business';

      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <h3>No matching records found</h3>
          <p>Try adjusting your search query or filter pill, or click "Add New Loan" to record a new agreement.</p>
          <button class="btn btn-primary" onclick="window.LendApp.openAddLoanModal()">+ Record New Loan</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(loan => {
      const metrics = LoanEngine.calculateLoanMetrics(loan);
      const initials = (loan.borrowerName || 'B').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const curr = loan.currency || '$';

      let statusBadgeClass = 'badge-active';
      let statusText = 'Active';
      if (metrics.status === 'settled') {
        statusBadgeClass = 'badge-settled';
        statusText = 'Settled 100%';
      } else if (metrics.isOverdue) {
        statusBadgeClass = 'badge-overdue';
        statusText = `Overdue (${metrics.daysOverdue}d)`;
      } else if (metrics.status === 'partially_paid') {
        statusBadgeClass = 'badge-partial';
        statusText = `Partial (${metrics.progressPercent}%)`;
      }

      const typeBadge = loan.type === 'lent'
        ? `<span class="badge badge-lent">You Lent</span>`
        : `<span class="badge badge-borrowed">You Borrowed</span>`;

      return `
        <div class="loan-card" onclick="window.LendApp.openLoanDetailModal('${loan.id}')">
          <div class="loan-card-header">
            <div class="borrower-info">
              <div class="borrower-avatar">${initials}</div>
              <div class="borrower-details">
                <h3>${loan.borrowerName}</h3>
                <div class="borrower-tag">
                  ${typeBadge}
                  <span>•</span>
                  <span>${loan.tag || 'Personal'}</span>
                </div>
              </div>
            </div>
            <span class="badge ${statusBadgeClass}">
              <span class="badge-dot"></span>
              ${statusText}
            </span>
          </div>

          <div class="loan-financial-summary">
            <div class="financial-row">
              <span class="financial-label">Remaining Balance</span>
              <span class="financial-amount text-emerald privacy-maskable">${LoanEngine.formatCurrency(metrics.remainingTotal, curr)}</span>
            </div>
            <div class="financial-row">
              <span class="financial-label">Original Principal</span>
              <span class="financial-sub privacy-maskable">${LoanEngine.formatCurrency(metrics.principal, curr)}</span>
            </div>
            ${metrics.totalExpectedInterest > 0 ? `
              <div class="financial-row">
                <span class="financial-label">Agreed Interest</span>
                <span class="financial-sub text-amber privacy-maskable">+${LoanEngine.formatCurrency(metrics.totalExpectedInterest, curr)} (${loan.interestRate}% ${loan.interestType})</span>
              </div>
            ` : ''}
          </div>

          <!-- Progress Bar: Half Paid & Half Pending -->
          <div class="progress-container">
            <div class="progress-header">
              <span class="text-muted">Repayment Progress</span>
              <span class="text-emerald">${metrics.progressPercent}% (${LoanEngine.formatCurrency(metrics.totalPaid, curr)} paid)</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${metrics.status === 'settled' ? 'settled' : ''}" style="width: ${metrics.progressPercent}%"></div>
            </div>
          </div>

          <div class="loan-meta-grid">
            <div>
              <div class="meta-item-label">Start Date</div>
              <div class="meta-item-value">${LoanEngine.formatDate(loan.startDate)}</div>
            </div>
            <div>
              <div class="meta-item-label">${metrics.isOverdue ? 'Overdue Since' : 'Agreed Due Date'}</div>
              <div class="meta-item-value ${metrics.isOverdue ? 'text-rose' : ''}">
                ${loan.dueDate ? LoanEngine.formatDate(loan.dueDate) : 'Flexible'}
              </div>
            </div>
          </div>

          <div class="loan-card-actions" onclick="event.stopPropagation()">
            ${metrics.status !== 'settled' ? `
              <button class="btn btn-primary btn-sm" onclick="window.LendApp.openRecordPaymentModal('${loan.id}')" title="Log a partial payment">
                💰 Record Payment
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled style="opacity:0.7;">
                ✔️ Completed
              </button>
            `}
            <button class="btn btn-secondary btn-sm" onclick="window.LendApp.openReminderModal('${loan.id}')" title="Generate WhatsApp/SMS reminder">
              💬 Remind
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.LendApp.openIOUReceiptModal('${loan.id}')" title="View / Print Digital IOU">
              📜 IOU
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* Add / Edit Loan Modal */
  openAddLoanModal(editLoanId = null) {
    const modal = document.getElementById('loanModal');
    const title = document.getElementById('loanModalTitle');
    const form = document.getElementById('loanForm');

    form.reset();
    document.getElementById('loanEditId').value = '';
    document.getElementById('loanStartDate').value = new Date().toISOString().split('T')[0];

    // Default 3 months from now for due date
    const defDue = new Date();
    defDue.setMonth(defDue.getMonth() + 3);
    document.getElementById('loanDueDate').value = defDue.toISOString().split('T')[0];

    if (editLoanId) {
      const loan = window.StorageManager.getLoanById(editLoanId);
      if (loan) {
        title.textContent = 'Edit Loan Agreement';
        document.getElementById('loanEditId').value = loan.id;
        document.getElementById('loanType').value = loan.type || 'lent';
        document.getElementById('borrowerName').value = loan.borrowerName || '';
        document.getElementById('borrowerPhone').value = loan.borrowerPhone || '';
        document.getElementById('borrowerEmail').value = loan.borrowerEmail || '';
        document.getElementById('borrowerTag').value = loan.tag || 'Friend';
        document.getElementById('loanPrincipal').value = loan.principal || '';
        document.getElementById('loanCurrency').value = loan.currency || '$';
        document.getElementById('loanInterestType').value = loan.interestType || 'none';
        document.getElementById('loanInterestRate').value = loan.interestRate || '0';
        document.getElementById('loanStartDate').value = loan.startDate || '';
        document.getElementById('loanDueDate').value = loan.dueDate || '';
        document.getElementById('loanTenureMonths').value = loan.tenureMonths || '3';
        document.getElementById('loanNotes').value = loan.notes || '';
      }
    } else {
      title.textContent = 'Record New Loan / IOU';
    }

    this.updateModalCalculationPreview();
    modal.classList.add('active');
  }

  updateModalCalculationPreview() {
    const principal = Number(document.getElementById('loanPrincipal').value) || 0;
    const interestType = document.getElementById('loanInterestType').value;
    const interestRate = Number(document.getElementById('loanInterestRate').value) || 0;
    const tenureMonths = Number(document.getElementById('loanTenureMonths').value) || 3;
    const currency = document.getElementById('loanCurrency').value || '$';

    const tempLoan = {
      principal,
      interestType,
      interestRate,
      tenureMonths,
      startDate: document.getElementById('loanStartDate').value,
      payments: []
    };

    const metrics = LoanEngine.calculateLoanMetrics(tempLoan);

    const previewBox = document.getElementById('loanCalcPreview');
    if (previewBox) {
      previewBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:var(--text-secondary);">Agreed Total Return:</span>
          <strong style="color:var(--accent-primary); font-family:var(--font-mono);">${LoanEngine.formatCurrency(metrics.totalAgreedAmount, currency)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
          <span>Principal: ${LoanEngine.formatCurrency(principal, currency)}</span>
          <span>Interest: +${LoanEngine.formatCurrency(metrics.totalExpectedInterest, currency)}</span>
        </div>
      `;
    }
  }

  handleLoanFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('loanEditId').value;
    const principal = Number(document.getElementById('loanPrincipal').value);

    if (!principal || principal <= 0) {
      this.showToast('Please enter a valid principal amount', 'error');
      return;
    }

    const borrowerName = document.getElementById('borrowerName').value.trim();
    if (!borrowerName) {
      this.showToast('Please enter the contact / borrower name', 'error');
      return;
    }

    const loanPayload = {
      id: editId || 'LN-' + Date.now().toString(36).toUpperCase(),
      type: document.getElementById('loanType').value,
      borrowerName,
      borrowerPhone: document.getElementById('borrowerPhone').value.trim(),
      borrowerEmail: document.getElementById('borrowerEmail').value.trim(),
      tag: document.getElementById('borrowerTag').value,
      principal,
      currency: document.getElementById('loanCurrency').value,
      interestType: document.getElementById('loanInterestType').value,
      interestRate: Number(document.getElementById('loanInterestRate').value) || 0,
      startDate: document.getElementById('loanStartDate').value,
      dueDate: document.getElementById('loanDueDate').value,
      tenureMonths: Number(document.getElementById('loanTenureMonths').value) || 3,
      notes: document.getElementById('loanNotes').value.trim(),
      payments: editId ? (window.StorageManager.getLoanById(editId)?.payments || []) : []
    };

    if (editId) {
      window.StorageManager.updateLoan(loanPayload);
      this.showToast(`Updated loan agreement for ${borrowerName}`, 'success');
    } else {
      window.StorageManager.addLoan(loanPayload);
      this.showToast(`Successfully created loan for ${borrowerName}`, 'success');
    }

    this.closeModal('loanModal');
    this.renderDashboard();
    this.renderSecurityCenter();
  }

  /* Partial Payment Modal */
  openRecordPaymentModal(loanId) {
    const loan = window.StorageManager.getLoanById(loanId);
    if (!loan) return;

    this.activeLoanForAction = loan;
    const metrics = LoanEngine.calculateLoanMetrics(loan);
    const curr = loan.currency || '$';

    document.getElementById('payBorrowerName').textContent = loan.borrowerName;
    document.getElementById('payOutstandingAmount').textContent = LoanEngine.formatCurrency(metrics.remainingTotal, curr);
    document.getElementById('payAmountInput').value = '';
    document.getElementById('payAmountInput').max = metrics.remainingTotal;
    document.getElementById('payDateInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('payNotesInput').value = '';

    document.getElementById('paymentModal').classList.add('active');
  }

  handlePaymentFormSubmit(e) {
    e.preventDefault();
    if (!this.activeLoanForAction) return;

    const amount = Number(document.getElementById('payAmountInput').value);
    if (!amount || amount <= 0) {
      this.showToast('Please enter a valid repayment amount', 'error');
      return;
    }

    const payment = {
      id: 'PAY-' + Date.now().toString(36).toUpperCase(),
      date: document.getElementById('payDateInput').value,
      amount,
      method: document.getElementById('payMethodSelect').value,
      notes: document.getElementById('payNotesInput').value.trim()
    };

    window.StorageManager.recordPayment(this.activeLoanForAction.id, payment);
    this.showToast(`Recorded partial payment of ${LoanEngine.formatCurrency(amount, this.activeLoanForAction.currency)} from ${this.activeLoanForAction.borrowerName}`, 'success');

    this.closeModal('paymentModal');
    this.renderDashboard();
    this.renderSecurityCenter();
  }

  /* Loan Detail & History Modal */
  openLoanDetailModal(loanId) {
    const loan = window.StorageManager.getLoanById(loanId);
    if (!loan) return;

    this.activeLoanForAction = loan;
    const metrics = LoanEngine.calculateLoanMetrics(loan);
    const curr = loan.currency || '$';

    const modal = document.getElementById('loanDetailModal');
    const content = document.getElementById('loanDetailBody');

    const payments = Array.isArray(loan.payments) ? loan.payments : [];
    let paymentsHTML = '';

    if (payments.length === 0) {
      paymentsHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-style:italic;">No payments logged yet. Use "Record Payment" to track partial installments.</div>`;
    } else {
      paymentsHTML = `
        <table class="audit-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Notes</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td>${LoanEngine.formatDate(p.date)}</td>
                <td><span class="badge badge-active">${p.method}</span></td>
                <td>${p.notes || '-'}</td>
                <td style="text-align:right; font-weight:700; color:var(--accent-primary);">${LoanEngine.formatCurrency(p.amount, curr)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800;">${loan.borrowerName}</h2>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">
            ${loan.borrowerPhone || ''} ${loan.borrowerEmail ? `• ${loan.borrowerEmail}` : ''} • Tag: <strong>${loan.tag || 'Personal'}</strong>
          </div>
        </div>
        <div>
          <span class="badge ${metrics.status === 'settled' ? 'badge-settled' : 'badge-active'}">
            ${metrics.status.toUpperCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom:1.5rem;">
        <div class="stat-card" style="padding:1rem;">
          <span class="stat-label">Principal</span>
          <span class="stat-value privacy-maskable" style="font-size:1.3rem;">${LoanEngine.formatCurrency(metrics.principal, curr)}</span>
        </div>
        <div class="stat-card" style="padding:1rem;">
          <span class="stat-label">Total Paid</span>
          <span class="stat-value text-cyan privacy-maskable" style="font-size:1.3rem;">${LoanEngine.formatCurrency(metrics.totalPaid, curr)}</span>
        </div>
        <div class="stat-card" style="padding:1rem;">
          <span class="stat-label">Remaining</span>
          <span class="stat-value text-emerald privacy-maskable" style="font-size:1.3rem;">${LoanEngine.formatCurrency(metrics.remainingTotal, curr)}</span>
        </div>
      </div>

      <div style="background:var(--bg-tertiary); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.5rem; font-size:0.85rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>Interest Model:</span>
          <strong>${loan.interestType.toUpperCase()} (${loan.interestRate}%)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>Start Date:</span>
          <strong>${LoanEngine.formatDate(loan.startDate)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Agreed Due Date:</span>
          <strong class="${metrics.isOverdue ? 'text-rose' : ''}">${loan.dueDate ? LoanEngine.formatDate(loan.dueDate) : 'Flexible'} ${metrics.isOverdue ? `(Overdue by ${metrics.daysOverdue} days)` : ''}</strong>
        </div>
      </div>

      ${loan.notes ? `
        <div style="background:rgba(0,0,0,0.2); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.5rem; font-size:0.85rem;">
          <strong style="color:var(--text-secondary);">Agreement Notes:</strong>
          <p style="margin-top:4px; color:var(--text-primary);">${loan.notes}</p>
        </div>
      ` : ''}

      <div style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <h4 style="font-weight:700;">Recorded Payment Installments</h4>
        ${metrics.status !== 'settled' ? `
          <button class="btn btn-primary btn-sm" onclick="window.LendApp.openRecordPaymentModal('${loan.id}')">+ Log Payment</button>
        ` : ''}
      </div>
      <div class="audit-table-wrap" style="margin-bottom:1.5rem;">
        ${paymentsHTML}
      </div>

      <div style="display:flex; gap:0.75rem; justify-content:flex-end; border-top:1px solid var(--border-subtle); padding-top:1.25rem;">
        <button class="btn btn-secondary btn-sm" onclick="window.LendApp.openReminderModal('${loan.id}')">💬 Send Reminder</button>
        <button class="btn btn-secondary btn-sm" onclick="window.LendApp.openIOUReceiptModal('${loan.id}')">📜 View IOU Receipt</button>
        <button class="btn btn-secondary btn-sm" onclick="window.LendApp.openAddLoanModal('${loan.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="window.LendApp.deleteLoan('${loan.id}')">🗑️ Delete</button>
      </div>
    `;

    modal.classList.add('active');
  }

  deleteLoan(loanId) {
    if (confirm('Are you sure you want to delete this loan record? This action cannot be undone.')) {
      window.StorageManager.deleteLoan(loanId);
      this.showToast('Loan record deleted', 'info');
      this.closeModal('loanDetailModal');
      this.renderDashboard();
      this.renderSecurityCenter();
    }
  }

  /* Reminder Composer Modal */
  openReminderModal(loanId) {
    const loan = window.StorageManager.getLoanById(loanId);
    if (!loan) return;

    this.activeLoanForAction = loan;
    document.getElementById('reminderBorrowerName').textContent = loan.borrowerName;
    this.updateReminderPreview();

    document.getElementById('reminderModal').classList.add('active');
  }

  updateReminderPreview() {
    if (!this.activeLoanForAction) return;

    const message = ReminderEngine.generateMessage(this.activeLoanForAction, this.currentReminderTone);
    const box = document.getElementById('reminderMessageText');
    if (box) box.textContent = message;

    // Update Action Buttons
    const btnWhatsApp = document.getElementById('btnSendWhatsApp');
    if (btnWhatsApp) {
      const waLink = ReminderEngine.getWhatsAppLink(this.activeLoanForAction.borrowerPhone, message);
      btnWhatsApp.href = waLink;
    }
  }

  copyReminderText() {
    const box = document.getElementById('reminderMessageText');
    if (box) {
      navigator.clipboard.writeText(box.textContent).then(() => {
        this.showToast('Reminder copied to clipboard!', 'success');
      });
    }
  }

  /* Digital IOU & Printable Receipt Modal */
  async openIOUReceiptModal(loanId) {
    const loan = window.StorageManager.getLoanById(loanId);
    if (!loan) return;

    const container = document.getElementById('iouReceiptContainer');
    if (container) {
      container.innerHTML = '<div style="text-align:center; padding:2rem;">Generating verified cryptographic receipt...</div>';
      const html = await ReminderEngine.generateIOUReceiptHTML(loan, 'Private Lender');
      container.innerHTML = html;
    }

    document.getElementById('iouModal').classList.add('active');
  }

  printReceipt() {
    window.print();
  }

  /* Standalone Loan & EMI Calculator */
  initStandaloneCalculator() {
    const sliderP = document.getElementById('calcPrincipalRange');
    const inputP = document.getElementById('calcPrincipalInput');
    const sliderR = document.getElementById('calcRateRange');
    const inputR = document.getElementById('calcRateInput');
    const sliderT = document.getElementById('calcTenureRange');
    const inputT = document.getElementById('calcTenureInput');

    const syncAndCalc = (src, dest) => {
      dest.value = src.value;
      this.calculateStandalone();
    };

    if (sliderP && inputP) {
      sliderP.addEventListener('input', () => syncAndCalc(sliderP, inputP));
      inputP.addEventListener('input', () => syncAndCalc(inputP, sliderP));
    }
    if (sliderR && inputR) {
      sliderR.addEventListener('input', () => syncAndCalc(sliderR, inputR));
      inputR.addEventListener('input', () => syncAndCalc(inputR, sliderR));
    }
    if (sliderT && inputT) {
      sliderT.addEventListener('input', () => syncAndCalc(sliderT, inputT));
      inputT.addEventListener('input', () => syncAndCalc(inputT, sliderT));
    }
  }

  calculateStandalone() {
    const principal = Number(document.getElementById('calcPrincipalInput')?.value) || 10000;
    const rate = Number(document.getElementById('calcRateInput')?.value) || 8;
    const tenure = Number(document.getElementById('calcTenureInput')?.value) || 12;

    const result = LoanEngine.calculateEMI(principal, rate, tenure);

    const elEMI = document.getElementById('calcResultEMI');
    const elInterest = document.getElementById('calcResultInterest');
    const elTotal = document.getElementById('calcResultTotal');

    if (elEMI) elEMI.textContent = LoanEngine.formatCurrency(result.monthlyEMI);
    if (elInterest) elInterest.textContent = LoanEngine.formatCurrency(result.totalInterest);
    if (elTotal) elTotal.textContent = LoanEngine.formatCurrency(result.totalPayment);

    // Render schedule preview
    const tbody = document.getElementById('calcScheduleTbody');
    if (tbody && result.schedule) {
      tbody.innerHTML = result.schedule.slice(0, 12).map(s => `
        <tr>
          <td>Month ${s.month}</td>
          <td>${LoanEngine.formatCurrency(s.payment)}</td>
          <td>${LoanEngine.formatCurrency(s.principal)}</td>
          <td>${LoanEngine.formatCurrency(s.interest)}</td>
          <td style="font-weight:700;">${LoanEngine.formatCurrency(s.balance)}</td>
        </tr>
      `).join('');
    }
  }

  /* Security Center & Audit Trail */
  renderSecurityCenter() {
    const trail = window.Security.getAuditTrail();
    const tbody = document.getElementById('auditTrailTbody');
    if (tbody) {
      if (trail.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No audit entries yet</td></tr>`;
      } else {
        // Show newest first
        tbody.innerHTML = [...trail].reverse().slice(0, 25).map(entry => `
          <tr>
            <td style="font-size:0.75rem; color:var(--text-muted);">${new Date(entry.timestamp).toLocaleTimeString()}</td>
            <td><strong style="color:var(--accent-primary);">${entry.action}</strong></td>
            <td>${entry.details}</td>
            <td><span class="audit-hash">${entry.prevHash}</span></td>
            <td><span class="audit-hash">${entry.hash}</span></td>
          </tr>
        `).join('');
      }
    }
  }

  /* Supabase Cloud Sync UI Handlers */
  openSupabaseModal() {
    this.updateSupabaseModalUI();
    document.getElementById('supabaseModal').classList.add('active');
  }

  updateSupabaseModalUI() {
    const isConfigured = window.SupabaseSync.isConfigured();
    const isAuthenticated = window.SupabaseSync.isAuthenticated();
    const configSection = document.getElementById('supabaseConfigSection');
    const authSection = document.getElementById('supabaseAuthSection');
    const loggedOutSection = document.getElementById('supabaseUserLoggedOut');
    const loggedInSection = document.getElementById('supabaseUserLoggedIn');
    const connectedUrlEl = document.getElementById('connectedProjectUrl');
    const userEmailEl = document.getElementById('supabaseUserEmailDisplay');

    if (!isConfigured) {
      configSection.style.display = 'block';
      authSection.style.display = 'none';
    } else {
      configSection.style.display = 'none';
      authSection.style.display = 'block';
      const storedUrl = localStorage.getItem('lendguard_supabase_url') || '';
      connectedUrlEl.textContent = storedUrl;

      if (isAuthenticated) {
        loggedOutSection.style.display = 'none';
        loggedInSection.style.display = 'block';
        userEmailEl.textContent = `Signed in as: ${window.SupabaseSync.currentUser.email}`;
      } else {
        loggedOutSection.style.display = 'block';
        loggedInSection.style.display = 'none';
      }
    }
  }

  handleSupabaseCredsSubmit(e) {
    e.preventDefault();
    const url = document.getElementById('supabaseUrlInput').value;
    const key = document.getElementById('supabaseKeyInput').value;

    try {
      window.SupabaseSync.configureCredentials(url, key);
      this.showToast('Supabase connected successfully!', 'success');
      this.updateSupabaseModalUI();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleSupabaseSignIn() {
    const email = document.getElementById('supabaseEmailInput').value.trim();
    const password = document.getElementById('supabasePasswordInput').value;

    if (!email || !password) {
      this.showToast('Please enter both email and password', 'error');
      return;
    }

    try {
      this.showToast('Signing in to cloud...', 'info');
      await window.SupabaseSync.signIn(email, password);
      this.showToast('Signed in successfully! Synced with cloud.', 'success');
      this.updateSupabaseModalUI();
      this.renderDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleSupabaseSignUp() {
    const email = document.getElementById('supabaseEmailInput').value.trim();
    const password = document.getElementById('supabasePasswordInput').value;

    if (!email || !password) {
      this.showToast('Please enter both email and password', 'error');
      return;
    }

    try {
      this.showToast('Creating cloud account...', 'info');
      await window.SupabaseSync.signUp(email, password);
      this.showToast('Account created! Please check your email if confirmation is required.', 'success');
      this.updateSupabaseModalUI();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleSupabaseSignOut() {
    await window.SupabaseSync.signOut();
    this.showToast('Signed out of Supabase cloud sync', 'info');
    this.updateSupabaseModalUI();
  }

  disconnectSupabase() {
    if (confirm('Disconnect Supabase? The app will switch back to local vault mode.')) {
      window.SupabaseSync.disconnectCredentials();
      this.showToast('Supabase disconnected. Using local encrypted vault.', 'info');
      this.updateSupabaseModalUI();
    }
  }

  async triggerManualSync() {
    this.showToast('Starting full cloud sync...', 'info');
    await window.SupabaseSync.syncAll();
    this.renderDashboard();
  }

  handleExportBackup() {
    const jsonStr = window.StorageManager.exportDataBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lendguard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Encrypted backup downloaded successfully', 'success');
  }

  handleImportBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = window.StorageManager.importDataBackup(evt.target.result);
      if (result.success) {
        this.showToast(`Restored ${result.count} loan records successfully!`, 'success');
        this.renderDashboard();
        this.renderSecurityCenter();
      } else {
        this.showToast(`Restore failed: ${result.error}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.LendApp = new LendGuardApp();
});
