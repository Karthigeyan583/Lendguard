/**
 * LendGuard - Supabase Backend & Cloud Sync Client
 * Lightweight, zero-latency hybrid offline-first sync engine.
 */

class SupabaseSyncManager {
  constructor() {
    this.storageKeyUrl = 'lendguard_supabase_url';
    this.storageKeyKey = 'lendguard_supabase_anon_key';
    this.client = null;
    this.currentUser = null;
    this.isSyncing = false;

    this.initClient();
  }

  initClient() {
    const url = localStorage.getItem(this.storageKeyUrl);
    const key = localStorage.getItem(this.storageKeyKey);

    if (url && key && window.supabase) {
      try {
        this.client = window.supabase.createClient(url, key);
        this.checkAuthSession();
      } catch (e) {
        console.warn('Failed to initialize Supabase client:', e);
      }
    }
  }

  isConfigured() {
    return !!this.client;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  configureCredentials(url, key) {
    if (!url || !key) {
      throw new Error('Supabase URL and Anon Key are required');
    }
    localStorage.setItem(this.storageKeyUrl, url.trim());
    localStorage.setItem(this.storageKeyKey, key.trim());
    this.initClient();
    if (window.Security) {
      window.Security.logAudit('SUPABASE_CONFIGURED', 'Supabase credentials configured');
    }
    return true;
  }

  disconnectCredentials() {
    localStorage.removeItem(this.storageKeyUrl);
    localStorage.removeItem(this.storageKeyKey);
    this.client = null;
    this.currentUser = null;
    this.updateCloudStatusUI();
    if (window.Security) {
      window.Security.logAudit('SUPABASE_DISCONNECTED', 'Supabase disconnected. Switched to Local Vault Mode.');
    }
  }

  async checkAuthSession() {
    if (!this.client) return null;
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) throw error;
      this.currentUser = session?.user || null;
      this.updateCloudStatusUI();
      if (this.currentUser) {
        // Auto-sync in background
        this.pullFromCloud();
      }
      return this.currentUser;
    } catch (e) {
      console.warn('Supabase session check error:', e);
      this.updateCloudStatusUI();
      return null;
    }
  }

  async signUp(email, password) {
    if (!this.client) throw new Error('Supabase is not configured yet');
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    this.currentUser = data.user;
    this.updateCloudStatusUI();
    if (window.Security) {
      window.Security.logAudit('AUTH_SIGNUP_CLOUD', `Account created for ${email}`);
    }
    return data;
  }

  async signIn(email, password) {
    if (!this.client) throw new Error('Supabase is not configured yet');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.currentUser = data.user;
    this.updateCloudStatusUI();
    if (window.Security) {
      window.Security.logAudit('AUTH_LOGIN_CLOUD', `Signed in as ${email}`);
    }
    // Pull down latest data
    await this.pullFromCloud();
    return data;
  }

  async signOut() {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.currentUser = null;
    this.updateCloudStatusUI();
    if (window.Security) {
      window.Security.logAudit('AUTH_LOGOUT_CLOUD', 'Signed out of cloud sync');
    }
  }

  /**
   * Fast bidirectional sync with Supabase
   */
  async syncAll() {
    if (!this.client || !this.currentUser || this.isSyncing) return;
    this.isSyncing = true;
    this.updateCloudStatusUI('Syncing...');

    try {
      // 1. Push local changes to Cloud
      await this.pushToCloud();
      // 2. Pull remote changes to local
      await this.pullFromCloud();

      this.updateCloudStatusUI('Synced Just Now');
      if (window.LendApp) window.LendApp.showToast('Cloud sync complete', 'success');
    } catch (e) {
      console.error('Sync error:', e);
      this.updateCloudStatusUI('Sync Error');
      if (window.LendApp) window.LendApp.showToast(`Sync error: ${e.message}`, 'error');
    } finally {
      this.isSyncing = false;
    }
  }

  async pushToCloud() {
    if (!this.client || !this.currentUser) return;
    const localLoans = window.StorageManager.getLoans();

    for (const loan of localLoans) {
      // Upsert Loan
      const loanRow = {
        id: loan.id,
        user_id: this.currentUser.id,
        type: loan.type,
        borrower_name: loan.borrowerName,
        borrower_phone: loan.borrowerPhone,
        borrower_email: loan.borrowerEmail,
        tag: loan.tag || 'Personal',
        principal: loan.principal,
        currency: loan.currency || '$',
        interest_type: loan.interestType || 'none',
        interest_rate: loan.interestRate || 0,
        start_date: loan.startDate || new Date().toISOString().split('T')[0],
        due_date: loan.dueDate || null,
        tenure_months: loan.tenureMonths || 3,
        notes: loan.notes || '',
        status: loan.status || 'active',
        updated_at: new Date().toISOString()
      };

      await this.client.from('loans').upsert(loanRow);

      // Upsert Payments for this loan
      if (Array.isArray(loan.payments)) {
        for (const payment of loan.payments) {
          const payRow = {
            id: payment.id,
            loan_id: loan.id,
            user_id: this.currentUser.id,
            amount: payment.amount,
            payment_date: payment.date || new Date().toISOString().split('T')[0],
            method: payment.method || 'Bank Transfer',
            notes: payment.notes || ''
          };
          await this.client.from('payments').upsert(payRow);
        }
      }
    }
  }

  async pullFromCloud() {
    if (!this.client || !this.currentUser) return;

    // 1. Fetch Loans
    const { data: remoteLoans, error: loanErr } = await this.client
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (loanErr) throw loanErr;
    if (!remoteLoans) return;

    // 2. Fetch Payments
    const { data: remotePayments, error: payErr } = await this.client
      .from('payments')
      .select('*');

    if (payErr) throw payErr;

    // Format into local model
    const mergedLoans = remoteLoans.map(row => {
      const loanPayments = (remotePayments || [])
        .filter(p => p.loan_id === row.id)
        .map(p => ({
          id: p.id,
          date: p.payment_date,
          amount: Number(p.amount),
          method: p.method,
          notes: p.notes
        }));

      return {
        id: row.id,
        type: row.type,
        borrowerName: row.borrower_name,
        borrowerPhone: row.borrower_phone,
        borrowerEmail: row.borrower_email,
        tag: row.tag,
        principal: Number(row.principal),
        currency: row.currency,
        interestType: row.interest_type,
        interestRate: Number(row.interest_rate),
        startDate: row.start_date,
        dueDate: row.due_date,
        tenureMonths: Number(row.tenure_months),
        notes: row.notes,
        status: row.status,
        payments: loanPayments
      };
    });

    if (mergedLoans.length > 0) {
      window.StorageManager.saveLoans(mergedLoans);
      if (window.LendApp) window.LendApp.renderDashboard();
    }
  }

  updateCloudStatusUI(statusText = null) {
    const badge = document.getElementById('cloudStatusBadge');
    if (!badge) return;

    if (!this.isConfigured()) {
      badge.innerHTML = '🔒 Local Vault Only';
      badge.className = 'badge badge-active';
      badge.style.background = 'var(--bg-tertiary)';
      badge.style.color = 'var(--text-secondary)';
      badge.style.cursor = 'pointer';
    } else if (!this.isAuthenticated()) {
      badge.innerHTML = '☁️ Supabase (Sign In)';
      badge.className = 'badge badge-partial';
      badge.style.cursor = 'pointer';
    } else {
      badge.innerHTML = `☁️ ${statusText || 'Synced with Supabase'}`;
      badge.className = 'badge badge-settled';
      badge.style.cursor = 'pointer';
    }
  }
}

window.SupabaseSync = new SupabaseSyncManager();
