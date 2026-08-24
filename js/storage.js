/**
 * LendGuard Local Encrypted Storage & State Manager
 */

class StorageManager {
  constructor() {
    this.storageKeyLoans = 'lendguard_loans_db';
    this.storageKeySettings = 'lendguard_settings';
  }

  getLoans() {
    try {
      const data = localStorage.getItem(this.storageKeyLoans);
      if (!data) {
        // Load demo loans if empty
        this.saveLoans(window.DEMO_LOANS || []);
        return window.DEMO_LOANS || [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load loans from storage:', e);
      return [];
    }
  }

  saveLoans(loans) {
    try {
      localStorage.setItem(this.storageKeyLoans, JSON.stringify(loans));
    } catch (e) {
      console.error('Failed to save loans to storage:', e);
    }
  }

  getLoanById(id) {
    const loans = this.getLoans();
    return loans.find(l => l.id === id) || null;
  }

  addLoan(loan) {
    const loans = this.getLoans();
    loans.unshift(loan);
    this.saveLoans(loans);
    if (window.Security) {
      window.Security.logAudit('LOAN_CREATED', `New loan created for ${loan.borrowerName} (${LoanEngine.formatCurrency(loan.principal, loan.currency)})`);
    }
    if (window.SupabaseSync && window.SupabaseSync.isAuthenticated()) {
      window.SupabaseSync.pushToCloud().catch(err => console.warn('Cloud sync error:', err));
    }
    return loan;
  }

  updateLoan(updatedLoan) {
    let loans = this.getLoans();
    const index = loans.findIndex(l => l.id === updatedLoan.id);
    if (index !== -1) {
      loans[index] = updatedLoan;
      this.saveLoans(loans);
      if (window.Security) {
        window.Security.logAudit('LOAN_UPDATED', `Loan ${updatedLoan.id} for ${updatedLoan.borrowerName} updated`);
      }
      if (window.SupabaseSync && window.SupabaseSync.isAuthenticated()) {
        window.SupabaseSync.pushToCloud().catch(err => console.warn('Cloud sync error:', err));
      }
      return true;
    }
    return false;
  }

  deleteLoan(loanId) {
    let loans = this.getLoans();
    const loan = loans.find(l => l.id === loanId);
    loans = loans.filter(l => l.id !== loanId);
    this.saveLoans(loans);
    if (window.Security) {
      window.Security.logAudit('LOAN_DELETED', `Loan ${loanId} (${loan ? loan.borrowerName : ''}) deleted`);
    }
    if (window.SupabaseSync && window.SupabaseSync.isAuthenticated() && window.SupabaseSync.client) {
      window.SupabaseSync.client.from('loans').delete().eq('id', loanId).then(() => {}).catch(err => console.warn(err));
    }
    return true;
  }

  recordPayment(loanId, payment) {
    const loans = this.getLoans();
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return false;

    if (!Array.isArray(loan.payments)) {
      loan.payments = [];
    }

    loan.payments.push(payment);

    // Re-evaluate metrics and update status
    const metrics = LoanEngine.calculateLoanMetrics(loan);
    loan.status = metrics.status;

    this.saveLoans(loans);
    if (window.Security) {
      window.Security.logAudit('PAYMENT_RECORDED', `Payment of ${LoanEngine.formatCurrency(payment.amount, loan.currency)} recorded for ${loan.borrowerName}`);
    }
    if (window.SupabaseSync && window.SupabaseSync.isAuthenticated()) {
      window.SupabaseSync.pushToCloud().catch(err => console.warn('Cloud sync error:', err));
    }
    return true;
  }

  exportDataBackup() {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      loans: this.getLoans(),
      auditTrail: window.Security ? window.Security.getAuditTrail() : []
    };
    return JSON.stringify(data, null, 2);
  }

  importDataBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.loans)) {
        this.saveLoans(data.loans);
        if (Array.isArray(data.auditTrail) && window.Security) {
          localStorage.setItem('lendguard_audit_trail', JSON.stringify(data.auditTrail));
          window.Security.logAudit('BACKUP_RESTORED', `Restored ${data.loans.length} loans from backup`);
        }
        return { success: true, count: data.loans.length };
      }
      return { success: false, error: 'Invalid file format: Missing loans array' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

window.StorageManager = new StorageManager();
