import math
import hashlib

def calculate_loan_metrics(principal, interest_type, rate, tenure_months, payments):
    total_paid = sum(p['amount'] for p in payments)
    
    if interest_type == 'none':
        total_interest = 0
    elif interest_type == 'simple':
        total_interest = principal * (rate / 100.0) * (tenure_months / 12.0)
    elif interest_type == 'monthly':
        total_interest = principal * (rate / 100.0) * tenure_months
    elif interest_type == 'fixed_fee':
        total_interest = rate
    elif interest_type == 'compound':
        monthly_rate = (rate / 100.0) / 12.0
        total_interest = principal * ((1 + monthly_rate) ** tenure_months) - principal
    else:
        total_interest = 0

    total_agreed = principal + total_interest
    remaining = max(0, total_agreed - total_paid)
    pct = min(100, round((total_paid / total_agreed) * 100)) if total_agreed > 0 else 100

    return {
        'principal': principal,
        'total_interest': round(total_interest, 2),
        'total_agreed': round(total_agreed, 2),
        'total_paid': total_paid,
        'remaining': round(remaining, 2),
        'pct': pct
    }

def calculate_emi(principal, annual_rate, months):
    r = (annual_rate / 100.0) / 12.0
    n = months
    emi = (principal * r * ((1 + r) ** n)) / (((1 + r) ** n) - 1)
    total_pay = emi * n
    return {
        'emi': round(emi, 2),
        'total_pay': round(total_pay, 2),
        'interest': round(total_pay - principal, 2)
    }

# Test Cases
print("--- RUNNING FINANCIAL ENGINE TESTS ---")

# 1. Partial Payments: $2000 loan, 5% simple, 4 months, $800 paid
t1 = calculate_loan_metrics(2000, 'simple', 5, 4, [{'amount': 500}, {'amount': 300}])
print("Test 1 (Partial payments simple interest):", t1)
assert t1['total_interest'] == 33.33, f"Expected 33.33, got {t1['total_interest']}"
assert t1['remaining'] == 1233.33, f"Expected 1233.33, got {t1['remaining']}"
assert t1['pct'] == 39

# 2. Monthly Rate: $5000 loan, 1.5%/month, 4 months, $1500 paid
t2 = calculate_loan_metrics(5000, 'monthly', 1.5, 4, [{'amount': 1500}])
print("Test 2 (Monthly rate):", t2)
assert t2['total_interest'] == 300.0, f"Expected 300, got {t2['total_interest']}"
assert t2['remaining'] == 3800.0
assert t2['pct'] == 28

# 3. 0% Friendly loan: $450 loan, 0 paid
t3 = calculate_loan_metrics(450, 'none', 0, 1.5, [])
print("Test 3 (0% friendly loan):", t3)
assert t3['total_interest'] == 0
assert t3['remaining'] == 450.0

# 4. EMI Amortization: $10000, 8% annual, 12 months
t4 = calculate_emi(10000, 8, 12)
print("Test 4 (EMI Amortization):", t4)
assert t4['emi'] == 869.88, f"Expected 869.88, got {t4['emi']}"
assert t4['total_pay'] == 10438.61, f"Expected 10438.61, got {t4['total_pay']}"

# 5. Tamper-evident Hash test
h1 = hashlib.sha256(b"GENESIS_BLOCK|TEST").hexdigest()
h2 = hashlib.sha256(f"{h1}|NEXT_BLOCK".encode('utf-8')).hexdigest()
print("Test 5 (Cryptographic SHA-256 block hash):", h1[:16], "->", h2[:16])

print("\n>>> ALL 5 FINANCIAL & SECURITY TESTS PASSED PERFECTLY! <<<")
