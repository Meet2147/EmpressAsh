(function () {
  "use strict";
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile menu ---------- */
  var header = $("#site-header"), toggle = $(".nav-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    var open = header.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  /* ---------- Currency (INR in India, USD elsewhere; set in <head>) ---------- */
  function currentCurrency() { return document.documentElement.classList.contains("inr") ? "inr" : "usd"; }
  function applyCurrency(c) {
    document.documentElement.classList.remove("inr", "usd");
    document.documentElement.classList.add(c);
    $all("[data-currency]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-currency") === c)); });
    $all("[data-currency-input]").forEach(function (i) { i.value = c; });
  }
  $all("[data-currency]").forEach(function (b) {
    b.addEventListener("click", function () { var c = b.getAttribute("data-currency"); store("ea-currency", c); applyCurrency(c); });
  });
  applyCurrency(currentCurrency());

  /* ---------- Starfield ---------- */
  var sky = $(".sky");
  if (sky && !calm) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 90; i++) {
      var st = document.createElement("span");
      st.className = "star";
      st.style.left = Math.random() * 100 + "%";
      st.style.top = Math.random() * 100 + "%";
      st.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      var size = Math.random() < 0.85 ? 1 + Math.random() * 1.5 : 2.5 + Math.random();
      st.style.width = st.style.height = size.toFixed(1) + "px";
      frag.appendChild(st);
    }
    sky.appendChild(frag);
  }

  /* ---------- 18+ gate (not on admin) ---------- */
  if (store("ea-age-ok") !== "yes" && location.pathname.indexOf("/admin") !== 0) {
    var gate = document.createElement("div");
    gate.className = "gate"; gate.setAttribute("role", "dialog"); gate.setAttribute("aria-modal", "true"); gate.setAttribute("aria-labelledby", "gate-title");
    gate.innerHTML = '<div class="gate-card"><span class="brand-moon big" aria-hidden="true"></span>' +
      '<h2 id="gate-title">Welcome, traveller</h2>' +
      "<p>EmpressAsh readings are for adults only. Please confirm you are 18 or older to enter.</p>" +
      '<p class="fine">Readings offer spiritual reflection and guidance. They do not replace medical, legal, mental health or financial advice.</p>' +
      '<div class="gate-actions"><button class="btn" data-age="yes">I am 18 or older</button>' +
      '<button class="btn btn-ghost" data-age="no">I am under 18</button></div></div>';
    document.body.appendChild(gate);
    document.body.classList.add("locked");
    gate.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-age");
      if (a === "yes") { store("ea-age-ok", "yes"); gate.remove(); document.body.classList.remove("locked"); }
      if (a === "no") $(".gate-card", gate).innerHTML = "<h2>Thank you for visiting</h2><p>Ash only reads for clients aged 18 and over. Please come back when you are older.</p>";
    });
    var first = $("[data-age=yes]", gate); if (first) first.focus();
  }

  /* ---------- Daily card flip ---------- */
  var flip = $("[data-flip]");
  if (flip) {
    var reveal = function () {
      flip.classList.add("flipped");
      flip.setAttribute("aria-label", "Today's card is turned over");
      var m = $("[data-meaning]"); if (m) { m.hidden = false; }
      store("ea-flipped", new Date().toDateString());
    };
    flip.addEventListener("click", reveal);
    if (store("ea-flipped") === new Date().toDateString()) reveal();
  }

  /* ---------- Share buttons ---------- */
  $all(".share-row").forEach(function (row) {
    var url = row.getAttribute("data-share-url"), text = row.getAttribute("data-share-text");
    var native = $("[data-share=native]", row), copy = $("[data-share=copy]", row);
    if (native) {
      if (!navigator.share) native.remove();
      else native.addEventListener("click", function () { navigator.share({ title: "EmpressAsh", text: text, url: url }).catch(function () {}); });
    }
    if (copy) copy.addEventListener("click", function () {
      var done = function () { copy.textContent = "Copied ✓"; setTimeout(function () { copy.textContent = "Copy link"; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
      else { var t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) {} t.remove(); }
    });
  });

  /* ---------- Wand cursor ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
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
    $all(".reveal").forEach(function (n) { io.observe(n); });
  } else {
    $all(".reveal").forEach(function (n) { n.classList.add("in"); });
  }
})();
