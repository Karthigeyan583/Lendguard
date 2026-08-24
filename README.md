# 🛡️ LendGuard - Secure Personal Loan, IOU & Debt Tracker

> **Never forget money lent or borrowed.** Track principal, interest, tenures, partial repayments ("half paid / half pending"), generate polite reminders, and protect your data with enterprise-grade security controls and optional Supabase cloud sync.

![LendGuard Banner](https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80)

---

## 🌟 Key Features

* **📊 Complete Financial Overview**: Real-time counters for Total Lent, Total Recovered, Outstanding Balance, and Accrued Interest.
* **💰 Partial Repayments ("Half Paid / Half Pending")**: Log partial installments via Cash, Bank Transfer, Zelle, UPI, Venmo, PayPal, or Check with dynamic progress bars.
* **🧮 Flexible Interest Models**:
  * `0% Friendly / Family Loans`
  * `Simple Interest (% per year)`
  * `Monthly Market Rate (% per month)`
  * `Compound Interest`
  * `Fixed Flat Fee`
  * `Standalone Interactive EMI & Amortization Calculator`
* **💬 1-Click Polite Reminder Generator**: Pre-formatted messages across 4 tones (*Friendly*, *Polite*, *Formal*, *Urgent*) with direct **WhatsApp (`wa.me`)** and clipboard integration.
* **📜 Cryptographic Digital IOU & Receipts**: Official printable/downloadable statements with **SHA-256 integrity digests**.
* **🌓 Dynamic Dark / Light Theme**: Instant toggle with smooth CSS transitions and local persistence.
* **🔐 Enterprise Security Controls**:
  * 4-Digit Master PIN Lock Screen with brute-force defense
  * Inactivity Auto-Lockout (1, 2, 5, 10 min)
  * Instant Privacy Mode (1-click blur/mask balances)
  * Tamper-evident SHA-256 linked audit trail
  * Encrypted JSON backup export & restore
* **☁️ Optional Supabase Cloud Sync (PostgreSQL + RLS)**:
  * Zero-latency offline-first architecture with automatic background sync.
  * PostgreSQL Row-Level Security (RLS) policies included in `supabase_schema.sql`.

---

## 📁 Project Structure

```
.
├── index.html                  # Main application UI & modal dialogs
├── supabase_schema.sql         # Production-ready PostgreSQL schema with RLS
├── css/
│   ├── main.css                # Base design tokens, typography, dark/light themes
│   ├── components.css          # Buttons, modals, forms, badges, toasts
│   ├── dashboard.css           # Stat widgets, loan cards, progress bars
│   ├── reminders.css           # Reminder composer & printable IOU receipts
│   └── security.css            # PIN keypad lock & audit ledger styles
├── js/
│   ├── app.js                  # Master application controller & event router
│   ├── loanEngine.js           # Calculations: Interest, EMI, partial payment allocation
│   ├── security.js             # Web Crypto SHA-256, PIN lock, inactivity timer, audit ledger
│   ├── reminderEngine.js       # Reminder generator & digital IOU builder
│   ├── storage.js              # Encrypted local persistence & JSON backup manager
│   ├── supabaseClient.js       # Hybrid offline-first Supabase sync client
│   └── demoData.js             # Realistic sample loans for instant exploration
├── test_engine.py              # Automated financial & security test suite
└── README.md
```

---

## 🚀 Quick Start

### 1. Run Locally
Because LendGuard is built with zero bloated dependencies, you can run it with any static web server:

```bash
# Using Python
python3 -m http.server 8080

# Or using Node
npx serve .
```
Then open **`http://localhost:8080`** in your browser.

> **Default Master PIN:** `1234` (Customize in the Security Center).

---

### 2. Connect Supabase (Optional)
1. In your [Supabase Dashboard](https://supabase.com/dashboard), open the **SQL Editor**.
2. Run the queries from [`supabase_schema.sql`](./supabase_schema.sql).
3. In LendGuard, click **`☁️ Supabase Cloud`** in the top bar, enter your Project URL and Anon Key, and sign in!

---

## 📄 License
MIT License. Free for personal and commercial use.
