/**
 * LendGuard Loan & Interest Engine
 * Handles financial calculations, partial payment allocations, interest accruals,
 * tenure schedules, and loan lifecycle statuses.
 */

class LoanEngine {
  /**
   * Calculate interest accrued and total payoff amount
   * @param {Object} loan 
   */
  static calculateLoanMetrics(loan) {
    const principal = Number(loan.principal) || 0;
    const payments = Array.isArray(loan.payments) ? loan.payments : [];
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const startDate = new Date(loan.startDate || Date.now());
    const now = new Date();
    
    // Days elapsed
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const monthsElapsed = daysElapsed / 30.4375; // Average days in month
    const yearsElapsed = daysElapsed / 365.25;

    let totalExpectedInterest = 0;
    let accruedInterestToday = 0;

    const rate = Number(loan.interestRate) || 0;
    const tenureMonths = Number(loan.tenureMonths) || (loan.dueDate ? this.getMonthsBetween(startDate, new Date(loan.dueDate)) : 0);

    switch (loan.interestType) {
      case 'none': // 0% Friendly Loan
        totalExpectedInterest = 0;
        accruedInterestToday = 0;
        break;

      case 'simple': // Simple Interest Annual %
        totalExpectedInterest = principal * (rate / 100) * (tenureMonths / 12);
        accruedInterestToday = principal * (rate / 100) * yearsElapsed;
        break;

      case 'monthly': // Monthly Flat % (e.g. 1% or 2% per month)
        totalExpectedInterest = principal * (rate / 100) * tenureMonths;
        accruedInterestToday = principal * (rate / 100) * monthsElapsed;
        break;

      case 'fixed_fee': // Fixed agreed flat fee (e.g. $100)
        totalExpectedInterest = rate;
        accruedInterestToday = rate; // Fixed fee is owed
        break;

      case 'compound': // Compound Interest (Compounded Monthly)
        const periods = Math.max(1, tenureMonths);
        const monthlyRate = (rate / 100) / 12;
        totalExpectedInterest = principal * Math.pow(1 + monthlyRate, periods) - principal;
        accruedInterestToday = principal * Math.pow(1 + monthlyRate, Math.max(0, monthsElapsed)) - principal;
        break;

      default:
        totalExpectedInterest = 0;
        accruedInterestToday = 0;
    }

    // Round interest to 2 decimal places
    totalExpectedInterest = Math.max(0, Math.round(totalExpectedInterest * 100) / 100);
    accruedInterestToday = Math.max(0, Math.round(accruedInterestToday * 100) / 100);

    const totalAgreedAmount = principal + totalExpectedInterest;
    
    // Remaining balance calculation
    let remainingPrincipal = Math.max(0, principal - totalPaid);
    let remainingTotal = Math.max(0, totalAgreedAmount - totalPaid);

    // If loan is settled or forgiven
    let status = loan.status || 'active';
    
    if (status !== 'forgiven') {
      if (remainingTotal <= 0.01) {
        status = 'settled';
        remainingTotal = 0;
        remainingPrincipal = 0;
      } else if (totalPaid > 0) {
        status = 'partially_paid';
      } else {
        status = 'active';
      }
    }

    // Check overdue status
    let isOverdue = false;
    let daysOverdue = 0;
    let daysRemaining = null;

    if (loan.dueDate && status !== 'settled' && status !== 'forgiven') {
      const due = new Date(loan.dueDate);
      const timeDiff = due.getTime() - now.getTime();
      const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      if (dayDiff < 0) {
        isOverdue = true;
        daysOverdue = Math.abs(dayDiff);
        status = 'overdue';
      } else {
        daysRemaining = dayDiff;
      }
    }

    // Progress percentage
    const progressPercent = totalAgreedAmount > 0 
      ? Math.min(100, Math.round((totalPaid / totalAgreedAmount) * 100))
      : 100;

    return {
      principal,
      totalPaid,
      totalExpectedInterest,
      accruedInterestToday,
      totalAgreedAmount,
      remainingTotal,
      remainingPrincipal,
      status,
      isOverdue,
      daysOverdue,
      daysRemaining,
      daysElapsed,
      progressPercent
    };
  }

  static getMonthsBetween(d1, d2) {
    let months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return Math.max(1, months);
  }

  /**
   * Format currency with commas and 2 decimals
   */
  static formatCurrency(amount, currency = '$') {
    const num = Number(amount) || 0;
    return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format relative human-readable date
   */
  static formatDate(dateString) {
    if (!dateString) return 'No date specified';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /**
   * Calculate standalone EMI for loan calculator tab
   */
  static calculateEMI(principal, annualRate, tenureMonths) {
    const p = Number(principal);
    const r = (Number(annualRate) / 100) / 12;
    const n = Number(tenureMonths);

    if (r === 0) {
      const emi = p / n;
      return {
        monthlyEMI: emi,
        totalInterest: 0,
        totalPayment: p,
        schedule: []
      };
    }

    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - p;

    // Generate month-by-month schedule
    let balance = p;
    const schedule = [];

    for (let i = 1; i <= n; i++) {
      const interestForMonth = balance * r;
      const principalForMonth = emi - interestForMonth;
      balance = Math.max(0, balance - principalForMonth);

      schedule.push({
        month: i,
        payment: emi,
        principal: principalForMonth,
        interest: interestForMonth,
        balance
      });
    }

    return {
      monthlyEMI: emi,
      totalInterest,
      totalPayment,
      schedule
    };
  }
}

window.LoanEngine = LoanEngine;
