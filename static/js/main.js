(function () {
  "use strict";

  const rupee = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
  const money = (n) => rupee.format(Number(n) || 0);

  /* ---------- theme toggle ---------- */
  const themeBtn = document.getElementById("theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeColors = { dark: "#0a0a0b", light: "#f7f4ec" };
  const applyTheme = (theme) => {
    const isLight = theme === "light";
    document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
    if (themeMeta) themeMeta.setAttribute("content", isLight ? themeColors.light : themeColors.dark);
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", String(isLight));
      themeBtn.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    }
  };
  const stored = (() => {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  })();
  applyTheme(stored === "light" ? "light" : "dark");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ---------- header shadow on scroll ---------- */
  const header = document.getElementById("site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile nav ---------- */
  const toggle = document.getElementById("nav-toggle");
  const nav = document.querySelector(".main-nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a") && nav.classList.contains("open")) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- services accordion ---------- */
  const triggers = document.querySelectorAll(".acc-trigger");
  triggers.forEach((btn) => {
    const panel = btn.nextElementSibling;
    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      // close all
      triggers.forEach((other) => {
        other.setAttribute("aria-expanded", "false");
        other.nextElementSibling.style.maxHeight = null;
      });
      if (!isOpen) {
        btn.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });

  /* ---------- calculator tabs ---------- */
  const tabs = document.querySelectorAll(".calc-tab");
  const panels = document.querySelectorAll(".calc-panel[data-panel]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      panels.forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      const target = document.querySelector(
        `.calc-panel[data-panel="${tab.dataset.calc}"]`
      );
      if (target) target.classList.add("is-active");
    });
  });

  /* ---------- calculator submissions ---------- */
  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function renderResult(container, headline, rows, note) {
    const list = rows
      .map(
        (r) =>
          `<li><span>${r[0]}</span><span>${r[1]}</span></li>`
      )
      .join("");
    container.innerHTML = `
      <div class="result-headline">
        <span class="r-label">${headline.label}</span>
        <span class="r-value">${headline.value}</span>
      </div>
      <ul class="result-rows">${list}</ul>
      ${note ? `<p class="result-note">${note}</p>` : ""}
    `;
  }

  const forms = {
    "income-tax": {
      url: "/api/calculate/income-tax",
      collect: (f) => ({
        income: f.income.value,
        salaried: f.salaried.checked,
      }),
      render: (c, d) => {
        const rows = [
          ["Gross income", money(d.gross_income)],
          ["Standard deduction", money(d.standard_deduction)],
          ["Taxable income", money(d.taxable_income)],
          ["Tax before cess", money(d.tax_before_cess)],
          ["Health & education cess (4%)", money(d.cess)],
          ["Effective tax rate", d.effective_rate + "%"],
          ["Net income after tax", money(d.net_income)],
        ];
        if (d.rebate_87a) rows.splice(3, 0, ["Section 87A rebate", "Applied — nil tax"]);
        renderResult(
          c,
          { label: "Total tax payable", value: money(d.total_tax) },
          rows,
          d.regime + " · Indicative estimate only."
        );
      },
    },
    gst: {
      url: "/api/calculate/gst",
      collect: (f) => ({
        amount: f.amount.value,
        rate: f.rate.value,
        mode: f.mode.value,
      }),
      render: (c, d) => {
        renderResult(
          c,
          { label: "Total (incl. GST)", value: money(d.gross_amount) },
          [
            ["Base amount", money(d.base_amount)],
            [`GST @ ${d.rate}%`, money(d.gst_amount)],
            ["CGST", money(d.cgst)],
            ["SGST", money(d.sgst)],
          ],
          d.mode === "extract"
            ? "GST extracted from the inclusive amount."
            : "GST added on top of the base amount."
        );
      },
    },
    emi: {
      url: "/api/calculate/emi",
      collect: (f) => ({
        principal: f.principal.value,
        rate: f.rate.value,
        months: f.months.value,
      }),
      render: (c, d) => {
        renderResult(
          c,
          { label: "Monthly EMI", value: money(d.emi) },
          [
            ["Loan amount", money(d.principal)],
            ["Interest rate", d.annual_rate + "% p.a."],
            ["Tenure", d.tenure_months + " months"],
            ["Total interest", money(d.total_interest)],
            ["Total payment", money(d.total_payment)],
          ]
        );
      },
    },
    sip: {
      url: "/api/calculate/sip",
      collect: (f) => ({
        monthly: f.monthly.value,
        rate: f.rate.value,
        years: f.years.value,
      }),
      render: (c, d) => {
        renderResult(
          c,
          { label: "Future value", value: money(d.future_value) },
          [
            ["Monthly investment", money(d.monthly_investment)],
            ["Expected return", d.annual_return + "% p.a."],
            ["Duration", d.years + " years (" + d.months + " months)"],
            ["Total invested", money(d.invested_amount)],
            ["Estimated returns", money(d.estimated_returns)],
          ],
          "Assumes monthly compounding · Indicative estimate only."
        );
      },
    },
  };

  panels.forEach((panel) => {
    const key = panel.dataset.panel;
    const cfg = forms[key];
    if (!cfg) return;
    const result = panel.querySelector("[data-result]");
    panel.addEventListener("submit", async (e) => {
      e.preventDefault();
      result.innerHTML = `<p class="result-note">Calculating…</p>`;
      try {
        const data = await postJSON(cfg.url, cfg.collect(panel));
        cfg.render(result, data);
      } catch (err) {
        result.innerHTML = `<p class="result-error">Something went wrong. Please try again.</p>`;
      }
    });
  });

  /* ---------- contact form ---------- */
  const contactForm = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const clearErrors = () =>
    contactForm
      .querySelectorAll(".field-error")
      .forEach((el) => (el.textContent = ""));

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    status.textContent = "";
    status.className = "form-status";

    const payload = {
      name: contactForm.name.value,
      email: contactForm.email.value,
      message: contactForm.message.value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        contactForm.reset();
        status.textContent = data.message;
        status.classList.add("ok");
      } else if (data.errors) {
        Object.entries(data.errors).forEach(([field, msg]) => {
          const el = contactForm.querySelector(`[data-error="${field}"]`);
          if (el) el.textContent = msg;
        });
        status.textContent = "Please fix the highlighted fields.";
        status.classList.add("err");
      }
    } catch (err) {
      status.textContent = "Network error. Please try again.";
      status.classList.add("err");
    }
  });
})();
