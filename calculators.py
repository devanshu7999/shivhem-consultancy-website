"""
Financial calculators for Shivhem Consultancy.

These are simple, self-serve estimators. All figures are indicative only and
should be confirmed with the consultancy before you rely on them.
"""


def _round2(value):
    return round(float(value) + 0.0, 2)


def income_tax_new_regime(gross_income, is_salaried=True):
    """
    Estimate income tax under India's New Tax Regime (FY 2024-25 / AY 2025-26).

    Slabs (after standard deduction for salaried):
        up to 3,00,000     : nil
        3,00,001-7,00,000  : 5%
        7,00,001-10,00,000 : 10%
        10,00,001-12,00,000: 15%
        12,00,001-15,00,000: 20%
        above 15,00,000    : 30%
    Section 87A rebate makes tax nil when taxable income <= 7,00,000.
    Health & education cess of 4% is added on the tax.
    """
    gross_income = max(0.0, float(gross_income))
    standard_deduction = 75000.0 if is_salaried else 0.0
    taxable = max(0.0, gross_income - standard_deduction)

    slabs = [
        (300000, 0.00),
        (700000, 0.05),
        (1000000, 0.10),
        (1200000, 0.15),
        (1500000, 0.20),
        (float("inf"), 0.30),
    ]

    tax = 0.0
    lower = 0.0
    breakdown = []
    for upper, rate in slabs:
        if taxable > lower:
            slice_amount = min(taxable, upper) - lower
            slice_tax = slice_amount * rate
            tax += slice_tax
            if rate > 0:
                breakdown.append(
                    {
                        "slab": f"{int(lower):,} - {'∞' if upper == float('inf') else format(int(upper), ',')}",
                        "rate": f"{int(rate * 100)}%",
                        "tax": _round2(slice_tax),
                    }
                )
            lower = upper
        else:
            break

    # Section 87A rebate (new regime): taxable income up to 7,00,000 -> tax nil
    rebate_applied = False
    if taxable <= 700000:
        tax = 0.0
        rebate_applied = True

    cess = tax * 0.04
    total = tax + cess

    effective_rate = (total / gross_income * 100) if gross_income > 0 else 0.0

    return {
        "gross_income": _round2(gross_income),
        "standard_deduction": _round2(standard_deduction),
        "taxable_income": _round2(taxable),
        "slab_breakdown": breakdown,
        "rebate_87a": rebate_applied,
        "tax_before_cess": _round2(tax),
        "cess": _round2(cess),
        "total_tax": _round2(total),
        "net_income": _round2(gross_income - total),
        "effective_rate": _round2(effective_rate),
        "regime": "New Tax Regime (FY 2024-25)",
    }


def gst_calculator(amount, rate, mode="add"):
    """
    GST calculator.

    mode="add"     -> amount is the base (exclusive) value; add GST on top.
    mode="extract" -> amount is the gross (inclusive) value; extract the GST.
    """
    amount = max(0.0, float(amount))
    rate = max(0.0, float(rate))
    mode = (mode or "add").lower()

    if mode == "extract":
        base = amount / (1 + rate / 100) if rate >= 0 else amount
        gst = amount - base
        gross = amount
    else:
        base = amount
        gst = amount * rate / 100
        gross = amount + gst

    cgst = gst / 2
    sgst = gst / 2

    return {
        "mode": mode,
        "rate": _round2(rate),
        "base_amount": _round2(base),
        "gst_amount": _round2(gst),
        "cgst": _round2(cgst),
        "sgst": _round2(sgst),
        "gross_amount": _round2(gross),
    }


def emi_calculator(principal, annual_rate, tenure_months):
    """
    EMI (equated monthly instalment) for a loan.

    EMI = P * r * (1+r)^n / ((1+r)^n - 1), where r is the monthly rate.
    """
    principal = max(0.0, float(principal))
    annual_rate = max(0.0, float(annual_rate))
    tenure_months = max(1, int(tenure_months))

    monthly_rate = annual_rate / 12 / 100

    if monthly_rate == 0:
        emi = principal / tenure_months
    else:
        factor = (1 + monthly_rate) ** tenure_months
        emi = principal * monthly_rate * factor / (factor - 1)

    total_payment = emi * tenure_months
    total_interest = total_payment - principal

    return {
        "principal": _round2(principal),
        "annual_rate": _round2(annual_rate),
        "tenure_months": tenure_months,
        "emi": _round2(emi),
        "total_interest": _round2(total_interest),
        "total_payment": _round2(total_payment),
    }


def sip_calculator(monthly_investment, annual_return, years):
    """
    SIP future value with monthly compounding (investment at start of month).

    FV = P * ((1+i)^n - 1) / i * (1+i)
    """
    monthly_investment = max(0.0, float(monthly_investment))
    annual_return = max(0.0, float(annual_return))
    years = max(0.0, float(years))

    months = int(round(years * 12))
    monthly_rate = annual_return / 12 / 100
    invested = monthly_investment * months

    if months == 0:
        future_value = 0.0
    elif monthly_rate == 0:
        future_value = invested
    else:
        future_value = (
            monthly_investment
            * (((1 + monthly_rate) ** months - 1) / monthly_rate)
            * (1 + monthly_rate)
        )

    est_returns = future_value - invested

    return {
        "monthly_investment": _round2(monthly_investment),
        "annual_return": _round2(annual_return),
        "years": _round2(years),
        "months": months,
        "invested_amount": _round2(invested),
        "estimated_returns": _round2(est_returns),
        "future_value": _round2(future_value),
    }
