"""
Shivhem Consultancy website — Flask backend.

Serves the static front-end and powers the self-serve financial calculators
(income tax, GST, EMI, SIP) plus a contact enquiry endpoint.
"""
import os

from flask import Flask, jsonify, render_template, request

import calculators

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify(status="ok")


def _num(payload, key, default=0.0):
    try:
        return float(payload.get(key, default))
    except (TypeError, ValueError):
        return default


@app.post("/api/calculate/income-tax")
def api_income_tax():
    data = request.get_json(silent=True) or {}
    result = calculators.income_tax_new_regime(
        gross_income=_num(data, "income"),
        is_salaried=bool(data.get("salaried", True)),
    )
    return jsonify(result)


@app.post("/api/calculate/gst")
def api_gst():
    data = request.get_json(silent=True) or {}
    result = calculators.gst_calculator(
        amount=_num(data, "amount"),
        rate=_num(data, "rate", 18),
        mode=data.get("mode", "add"),
    )
    return jsonify(result)


@app.post("/api/calculate/emi")
def api_emi():
    data = request.get_json(silent=True) or {}
    result = calculators.emi_calculator(
        principal=_num(data, "principal"),
        annual_rate=_num(data, "rate"),
        tenure_months=int(_num(data, "months", 12)),
    )
    return jsonify(result)


@app.post("/api/calculate/sip")
def api_sip():
    data = request.get_json(silent=True) or {}
    result = calculators.sip_calculator(
        monthly_investment=_num(data, "monthly"),
        annual_return=_num(data, "rate"),
        years=_num(data, "years"),
    )
    return jsonify(result)


@app.post("/api/contact")
def api_contact():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    errors = {}
    if not name:
        errors["name"] = "Please enter your name."
    if "@" not in email or "." not in email:
        errors["email"] = "Please enter a valid email address."
    if len(message) < 10:
        errors["message"] = "Please tell us a little more (at least 10 characters)."

    if errors:
        return jsonify(ok=False, errors=errors), 400

    # In production this would be persisted or emailed. Here we acknowledge it.
    app.logger.info("New enquiry from %s <%s>: %s", name, email, message[:120])
    return jsonify(
        ok=True,
        message=f"Thank you, {name.split(' ')[0]}. We'll be in touch shortly.",
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
