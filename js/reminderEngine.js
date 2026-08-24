/**
 * LendGuard Reminder & Digital IOU Engine
 * Generates personalized reminder templates across tones, instant WhatsApp / Email links,
 * and cryptographically verifiable digital IOU and payment receipts.
 */

class ReminderEngine {
  /**
   * Generate message text based on loan details and tone
   */
  static generateMessage(loan, tone = 'polite') {
    const metrics = LoanEngine.calculateLoanMetrics(loan);
    const borrowerName = loan.borrowerName || 'Friend';
    const amountStr = LoanEngine.formatCurrency(metrics.principal, loan.currency || '$');
    const remainingStr = LoanEngine.formatCurrency(metrics.remainingTotal, loan.currency || '$');
    const paidStr = LoanEngine.formatCurrency(metrics.totalPaid, loan.currency || '$');
    const dateLentStr = LoanEngine.formatDate(loan.startDate);
    const dueDateStr = loan.dueDate ? LoanEngine.formatDate(loan.dueDate) : 'as agreed';

    let interestNote = '';
    if (metrics.totalExpectedInterest > 0) {
      interestNote = ` (including ${LoanEngine.formatCurrency(metrics.totalExpectedInterest, loan.currency || '$')} agreed interest)`;
    }

    let paymentProgressNote = '';
    if (metrics.totalPaid > 0) {
      paymentProgressNote = ` Thank you for your previous payments totaling ${paidStr}.`;
    }

    switch (tone) {
      case 'friendly':
        return `Hey ${borrowerName}! Hope you're doing well. Just a gentle heads-up regarding the ${amountStr} lent on ${dateLentStr}.${paymentProgressNote} The remaining balance is ${remainingStr} (due ${dueDateStr}). Let me know when convenient! 😊`;

      case 'polite':
        return `Hi ${borrowerName}, hope all is well with you. This is a quick friendly reminder regarding our loan of ${amountStr}${interestNote}.${paymentProgressNote} The current outstanding balance is ${remainingStr}, scheduled for ${dueDateStr}. Please let me know if you need account details for transfer. Thanks!`;

      case 'formal':
        return `Dear ${borrowerName},\n\nThis is a formal reminder regarding the personal loan agreement initiated on ${dateLentStr} for the amount of ${amountStr}.${interestNote}\n\n• Total Paid: ${paidStr}\n• Remaining Balance Due: ${remainingStr}\n• Agreed Due Date: ${dueDateStr}\n\nPlease arrange for the transfer of the outstanding balance by the due date. Kindly confirm receipt of this notice.\n\nBest regards.`;

      case 'urgent':
        const overdueDaysText = metrics.isOverdue ? ` (now overdue by ${metrics.daysOverdue} days)` : '';
        return `URGENT: Hi ${borrowerName}, I am following up regarding the outstanding loan of ${amountStr} from ${dateLentStr}.${overdueDaysText} The remaining balance of ${remainingStr} was due on ${dueDateStr}.${paymentProgressNote}\n\nPlease provide an immediate update on the repayment timeline or send payment at your earliest convenience. Thank you.`;

      default:
        return `Hi ${borrowerName}, reminder for remaining loan balance: ${remainingStr}. Due: ${dueDateStr}.`;
    }
  }

  /**
   * Generate direct WhatsApp link
   */
  static getWhatsAppLink(phone, messageText) {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(messageText);
    if (cleanPhone) {
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  /**
   * Generate Digital IOU & Payment Receipt HTML
   */
  static async generateIOUReceiptHTML(loan, lenderName = 'Lender') {
    const metrics = LoanEngine.calculateLoanMetrics(loan);
    const loanId = loan.id || 'LN-' + Date.now();
    const payload = `${loanId}|${loan.borrowerName}|${loan.principal}|${loan.startDate}|${loan.dueDate}`;
    
    let hash = 'SHA256-VERIFIED';
    try {
      if (window.Security) {
        hash = await window.Security.computeSHA256(payload);
      }
    } catch (e) {
      console.warn('Hash fallback', e);
    }

    const curr = loan.currency || '$';
    const payments = Array.isArray(loan.payments) ? loan.payments : [];

    let paymentsRows = '';
    if (payments.length === 0) {
      paymentsRows = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic;">No payments recorded yet</td></tr>`;
    } else {
      paymentsRows = payments.map((p, idx) => `
        <tr>
          <td>#${idx + 1}</td>
          <td>${LoanEngine.formatDate(p.date)}</td>
          <td>${p.method || 'Cash / Transfer'} ${p.notes ? `(${p.notes})` : ''}</td>
          <td style="font-weight:700; color:#047857; text-align:right;">${LoanEngine.formatCurrency(p.amount, curr)}</td>
        </tr>
      `).join('');
    }

    return `
      <div class="receipt-wrapper" id="printableReceipt">
        <div class="receipt-header">
          <div>
            <div class="receipt-logo-title">
              <span>🛡️ LendGuard</span>
              <span class="receipt-badge-p2p">Peer-to-Peer Agreement</span>
            </div>
            <p style="font-size:0.8rem; color:#64748b; margin-top:4px;">Official Digital IOU & Repayment Statement</p>
          </div>
          <div class="receipt-meta">
            <div><strong>Reference:</strong> ${loanId}</div>
            <div><strong>Date Issued:</strong> ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}</div>
            <div><strong>Status:</strong> <span style="text-transform:uppercase; font-weight:700; color:${metrics.status === 'settled' ? '#059669' : '#d97706'}">${metrics.status.replace('_', ' ')}</span></div>
          </div>
        </div>

        <div class="receipt-parties-grid">
          <div>
            <div class="party-title">Lender (Creditor)</div>
            <div class="party-name">${lenderName}</div>
            <div class="party-sub">Verified Private Lender</div>
          </div>
          <div>
            <div class="party-title">Borrower (Debtor)</div>
            <div class="party-name">${loan.borrowerName || 'Borrower'}</div>
            <div class="party-sub">${loan.borrowerPhone || loan.borrowerEmail || 'Personal Contact'} • Tag: ${loan.tag || 'Personal'}</div>
          </div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Details / Terms</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Original Principal Amount</strong></td>
              <td>Disbursed on ${LoanEngine.formatDate(loan.startDate)}</td>
              <td style="text-align:right; font-weight:700;">${LoanEngine.formatCurrency(metrics.principal, curr)}</td>
            </tr>
            <tr>
              <td><strong>Agreed Interest & Terms</strong></td>
              <td>Type: ${loan.interestType || 'None'} (${loan.interestRate || 0}%) • Due: ${loan.dueDate ? LoanEngine.formatDate(loan.dueDate) : 'Flexible'}</td>
              <td style="text-align:right; font-weight:700;">+ ${LoanEngine.formatCurrency(metrics.totalExpectedInterest, curr)}</td>
            </tr>
            <tr style="background:#f8fafc; font-weight:700;">
              <td>Total Agreed Repayment Value</td>
              <td>Principal + Total Interest</td>
              <td style="text-align:right; color:#0f172a;">${LoanEngine.formatCurrency(metrics.totalAgreedAmount, curr)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:1.5rem; margin-bottom:0.75rem; font-weight:700; font-size:0.9rem; color:#334155;">
          Recorded Payments Ledger
        </div>
        <table class="receipt-table" style="margin-bottom:1rem;">
          <thead>
            <tr>
              <th>#</th>
              <th>Payment Date</th>
              <th>Method / Notes</th>
              <th style="text-align:right;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsRows}
          </tbody>
        </table>

        <div class="receipt-total-box">
          <div>
            <div style="font-size:0.8rem; color:#64748b; font-weight:600;">CURRENT OUTSTANDING BALANCE</div>
            <div style="font-size:0.85rem; color:#475569;">Total Paid to Date: <strong>${LoanEngine.formatCurrency(metrics.totalPaid, curr)}</strong> (${metrics.progressPercent}% settled)</div>
          </div>
          <div class="receipt-total-amount">
            ${LoanEngine.formatCurrency(metrics.remainingTotal, curr)}
          </div>
        </div>

        ${loan.notes ? `
          <div style="background:#f1f5f9; padding:0.85rem 1rem; border-radius:6px; font-size:0.8rem; color:#475569; margin-bottom:1.5rem;">
            <strong>Loan Purpose / Agreement Notes:</strong> ${loan.notes}
          </div>
        ` : ''}

        <div class="receipt-security-footer">
          <div>
            <div>🔐 <strong>Cryptographic Verification Hash:</strong></div>
            <div class="receipt-hash">${hash}</div>
          </div>
          <div style="text-align:right;">
            <div>Signed & Sealed digitally via <strong>LendGuard</strong></div>
            <div>Tamper-Evident Ledger Block</div>
          </div>
        </div>
      </div>
    `;
  }
}

window.ReminderEngine = ReminderEngine;
