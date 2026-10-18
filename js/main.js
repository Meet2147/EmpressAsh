(function () {
  "use strict";
  var SITE = window.SITE, READINGS = window.READINGS, FORMATS = window.FORMATS;

  function isSet(v) { return v && String(v).indexOf("PLACEHOLDER") === -1; }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- Currency: INR for visitors in India, USD elsewhere ---------- */
  function detectCurrency() {
    var saved = store("ea-currency");
    if (saved === "inr" || saved === "usd") return saved;
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "inr";
    } catch (e) {}
    return "usd";
  }
  var currency = detectCurrency();
  function price(r, fIdx) {
    if (r.inr[fIdx] == null) return "On request";
    return currency === "inr" ? "₹" + r.inr[fIdx].toLocaleString("en-IN") : "$" + r.usd[fIdx];
  }
  function setCurrency(c) {
    currency = c; store("ea-currency", c);
    document.querySelectorAll("[data-currency]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-currency") === c));
    });
    renderReadings(); renderBooking();
  }

  /* ---------- Shared header and footer ---------- */
  var page = document.body.getAttribute("data-page");
  var nav = [["index.html", "Home", "home"], ["about.html", "About", "about"], ["readings.html", "Readings", "readings"],
    ["book.html", "Book", "book"], ["contact.html", "Contact", "contact"]];

  var header = $("#site-header");
  if (header) {
    header.innerHTML =
      '<a class="brand" href="index.html" aria-label="EmpressAsh home"><span class="brand-moon" aria-hidden="true"></span>EmpressAsh</a>' +
      '<button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>' +
      '<nav id="site-nav"><ul>' + nav.map(function (n) {
        return '<li><a href="' + n[0] + '"' + (page === n[2] ? ' aria-current="page"' : "") + ">" + n[1] + "</a></li>";
      }).join("") + '</ul><a class="btn btn-small" href="readings.html">Book a reading</a></nav>';
    var toggle = $(".nav-toggle", header);
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  var footer = $("#site-footer");
  if (footer) {
    var links = [];
    if (isSet(SITE.social.instagram)) links.push('<a href="' + SITE.social.instagram + '" target="_blank" rel="noopener">Instagram</a>');
    if (isSet(SITE.social.youtube)) links.push('<a href="' + SITE.social.youtube + '" target="_blank" rel="noopener">YouTube</a>');
    footer.innerHTML =
      '<div class="footer-inner">' +
      '<div><p class="brand">EmpressAsh</p><p class="muted">Tarot, oracle &amp; energy guidance with Ash.</p></div>' +
      '<div class="footer-links"><a href="readings.html">Readings</a><a href="book.html">Book</a><a href="contact.html">Contact</a><a href="policies.html">Policies</a>' + links.join("") + "</div>" +
      '<p class="fine">Readings are for spiritual reflection and guidance only and are not a substitute for medical, legal, mental health or financial advice. Clients must be 18 or older. All sessions are confidential.</p>' +
      '<p class="fine">© ' + new Date().getFullYear() + " EmpressAsh</p></div>";
  }

  /* ---------- Starfield ---------- */
  var sky = $(".sky");
  if (sky && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 90; i++) {
      var s = document.createElement("span");
      s.className = "star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      var size = Math.random() < 0.85 ? 1 + Math.random() * 1.5 : 2.5 + Math.random();
      s.style.width = s.style.height = size.toFixed(1) + "px";
      frag.appendChild(s);
    }
    sky.appendChild(frag);
  }

  /* ---------- WhatsApp button ---------- */
  var waNumber = isSet(SITE.contact.whatsapp) ? SITE.contact.whatsapp : null;
  var wa = el('<a class="whatsapp" aria-label="Chat with Ash on WhatsApp" target="_blank" rel="noopener">' +
    '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5 0-.1-.3-.2-.6-.3z"/></svg></a>');
  wa.href = waNumber ? "https://wa.me/" + waNumber + "?text=" + encodeURIComponent("Hi Ash, I'd like to ask about a reading.") : "contact.html";
  document.body.appendChild(wa);

  /* ---------- 18+ gate ---------- */
  if (store("ea-age-ok") !== "yes") {
    var gate = el('<div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title"><div class="gate-card">' +
      '<span class="brand-moon big" aria-hidden="true"></span>' +
      '<h2 id="gate-title">Welcome, traveller</h2>' +
      "<p>EmpressAsh readings are for adults only. Please confirm you are 18 or older to enter.</p>" +
      '<p class="fine">Readings offer spiritual reflection and guidance. They do not replace medical, legal, mental health or financial advice.</p>' +
      '<div class="gate-actions"><button class="btn" data-age="yes">I am 18 or older</button>' +
      '<button class="btn btn-ghost" data-age="no">I am under 18</button></div></div></div>');
    document.body.appendChild(gate);
    document.body.classList.add("locked");
    gate.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-age");
      if (a === "yes") { store("ea-age-ok", "yes"); gate.remove(); document.body.classList.remove("locked"); }
      if (a === "no") {
        $(".gate-card", gate).innerHTML = "<h2>Thank you for visiting</h2><p>Ash only reads for clients aged 18 and over. Please come back when you are older.</p>";
      }
    });
    var first = $("[data-age=yes]", gate); if (first) first.focus();
  }

  /* ---------- Currency switch ---------- */
  document.querySelectorAll("[data-currency]").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.getAttribute("data-currency") === currency));
    b.addEventListener("click", function () { setCurrency(b.getAttribute("data-currency")); });
  });

  /* ---------- Readings list ---------- */
  function renderReadings() {
    var list = $("#readings-list");
    if (!list) return;
    var limit = parseInt(list.getAttribute("data-limit") || "0", 10);
    var items = limit ? READINGS.slice(0, limit) : READINGS;
    list.innerHTML = items.map(function (r) {
      return '<article class="reading" id="' + r.id + '">' +
        '<p class="eyebrow">' + esc(r.tag) + "</p><h3>" + esc(r.name) + "</h3>" +
        '<p class="muted">' + esc(r.desc) + "</p>" +
        '<p class="duration">✦ ' + esc(r.duration) + "</p>" +
        '<ul class="formats">' + FORMATS.map(function (f, i) {
          return '<li><span>' + f.label + '</span><span class="price">' + price(r, i) + '</span>' +
            '<a class="btn btn-small" href="book.html?reading=' + r.id + "&format=" + f.id + '">Book</a></li>';
        }).join("") + "</ul></article>";
    }).join("");
  }
  renderReadings();

  /* ---------- Booking page ---------- */
  var params = new URLSearchParams(location.search);
  var calLoaded = false;

  function renderBooking() {
    var box = $("#booking");
    if (!box) return;
    var rSel = $("#pick-reading"), fSel = $("#pick-format");
    if (!rSel.options.length) {
      rSel.innerHTML = READINGS.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("");
      fSel.innerHTML = FORMATS.map(function (f) { return '<option value="' + f.id + '">' + f.label + "</option>"; }).join("");
      if (params.get("reading")) rSel.value = params.get("reading");
      if (params.get("format")) fSel.value = params.get("format");
      if (rSel.selectedIndex < 0) rSel.selectedIndex = 0;
      if (fSel.selectedIndex < 0) fSel.selectedIndex = 0;
      rSel.addEventListener("change", function () { calLoaded = false; renderBooking(); });
      fSel.addEventListener("change", function () { calLoaded = false; renderBooking(); });
    }
    if (params.get("free") === "1") { renderFree(); return; }
    var r = READINGS.filter(function (x) { return x.id === rSel.value; })[0] || READINGS[0];
    var fIdx = Math.max(0, FORMATS.map(function (f) { return f.id; }).indexOf(fSel.value));
    var f = FORMATS[fIdx];

    $("#summary").innerHTML = "<h3>" + esc(r.name) + '</h3><p class="muted">' + f.label + (f.live ? " · " + esc(r.duration) : " · delivered within 48 hours") +
      '</p><p class="price big">' + price(r, fIdx) + "</p>";

    // Step: choose a time (live readings only)
    var calStep = $("#step-time");
    calStep.hidden = !f.live;
    if (f.live && !calLoaded) {
      var calLink = SITE.calEvents[r.id] || SITE.calDefault;
      var target = $("#cal-inline");
      target.innerHTML = "";
      target.classList.toggle("live", isSet(calLink));
      if (isSet(calLink)) {
        loadCal(calLink, r, f);
      } else {
        target.innerHTML = '<div class="placeholder">The live calendar will appear here once Ash\'s Cal.com account is connected. Until then, message Ash on WhatsApp to pick a Thursday to Sunday evening slot (6–8pm IST).</div>';
      }
      calLoaded = true;
    }
    $("#step-pay-num").textContent = f.live ? "2" : "1";
    $("#written-note").hidden = f.live;

    // Step: pay in full via Dodo
    var key = r.id + ":" + f.id + ":" + currency;
    var link = r.inr[fIdx] == null ? null : SITE.dodo[key];
    var pay = $("#pay-btn");
    if (isSet(link)) {
      pay.href = link; pay.classList.remove("disabled"); pay.removeAttribute("aria-disabled");
      pay.textContent = "Pay " + price(r, fIdx) + " securely";
      $("#pay-note").textContent = "You'll be taken to Dodo Payments' secure checkout. Your booking is confirmed once payment is received.";
    } else {
      pay.removeAttribute("href"); pay.classList.add("disabled"); pay.setAttribute("aria-disabled", "true");
      pay.textContent = "Payment link coming soon";
      $("#pay-note").textContent = r.inr[fIdx] == null
        ? "This reading is priced on request. Message Ash on WhatsApp or email for details."
        : "Online payment is being set up. Message Ash on WhatsApp or email to complete your booking.";
    }
  }

  function renderFree() {
    $("#pickers").hidden = true;
    $("#step-pay").hidden = true;
    $("#step-time").hidden = false;
    $("#step-time h3").innerHTML = '<span class="step-num">1</span>Book your free first reading';
    $("#summary").innerHTML = '<h3>Your first reading</h3><p class="price big">Free</p>' +
      '<p class="muted">One free reading for new clients. When you book, please share your name, email, mobile number and date of birth.</p>';
    if (calLoaded) return;
    var target = $("#cal-inline");
    target.classList.toggle("live", isSet(SITE.calFree));
    if (isSet(SITE.calFree)) loadCal(SITE.calFree, { name: "Free first reading" }, { label: "Free" });
    else target.innerHTML = '<div class="placeholder">Free first-reading booking opens soon. Until then, message Ash on WhatsApp with your name, email, mobile number and date of birth.</div>';
    calLoaded = true;
  }

  function loadCal(calLink, r, f) {
    /* Official Cal.com inline embed loader */
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    window.Cal("init", { origin: "https://cal.com" });
    window.Cal("inline", {
      elementOrSelector: "#cal-inline",
      calLink: calLink,
      layout: "month_view",
      config: { theme: "dark", notes: r.name + " · " + f.label },
    });
    window.Cal("ui", { theme: "dark", cssVarsPerTheme: { dark: { "cal-brand": "#d9c3ff" } }, hideEventTypeDetails: false });
  }
  renderBooking();

  /* ---------- Contact links ---------- */
  document.querySelectorAll("[data-contact]").forEach(function (a) {
    var kind = a.getAttribute("data-contact");
    var v = SITE.contact[kind];
    if (!isSet(v)) { a.textContent = "Coming soon"; a.removeAttribute("href"); return; }
    a.textContent = kind === "whatsapp" ? "Message on WhatsApp" : v;
    a.href = kind === "email" ? "mailto:" + v : kind === "phone" ? "tel:" + v.replace(/\s/g, "") : "https://wa.me/" + v;
  });
  document.querySelectorAll("[data-social]").forEach(function (a) {
    var v = SITE.social[a.getAttribute("data-social")];
    if (isSet(v)) a.href = v; else a.remove();
  });

  /* ---------- Wand cursor ---------- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fine) {
    document.documentElement.classList.add("wand");
    if (!calm) {
      var light = document.createElement("div");
      light.className = "wand-light"; light.style.opacity = "0";
      document.body.appendChild(light);
      var lastSpark = 0;
      document.addEventListener("mousemove", function (e) {
        light.style.opacity = "1";
        light.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
        var now = Date.now();
        if (now - lastSpark > 45) {
          lastSpark = now;
          var sp = document.createElement("span");
          sp.className = "spark";
          sp.style.left = e.clientX + "px"; sp.style.top = e.clientY + "px";
          sp.style.setProperty("--dx", (Math.random() * 30 - 15).toFixed(0) + "px");
          sp.style.setProperty("--dy", (Math.random() * 24 + 6).toFixed(0) + "px");
          document.body.appendChild(sp);
          setTimeout(function () { sp.remove(); }, 800);
        }
      }, { passive: true });
      document.addEventListener("mouseleave", function () { light.style.opacity = "0"; });
    }
  }

  /* ---------- Reveal on scroll ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (n) { io.observe(n); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in"); });
  }
})();
