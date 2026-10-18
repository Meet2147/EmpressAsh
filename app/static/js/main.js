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

  /* ---------- Drifting embers, snow and bokeh (like the reference reel) ---------- */
  var canvas = $(".motes");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, parts = [];
    var resize = function () {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var make = function (kind, anywhere) {
      var p = { kind: kind, x: Math.random() * W, phase: Math.random() * 6.28 };
      if (kind === "ember") { p.r = 0.8 + Math.random() * 1.8; p.vy = -(0.15 + Math.random() * 0.35); p.vx = 0.05 + Math.random() * 0.15; p.y = anywhere ? Math.random() * H : H + 10; }
      else if (kind === "snow") { p.r = 0.6 + Math.random() * 1.6; p.vy = 0.2 + Math.random() * 0.45; p.vx = 0.15 + Math.random() * 0.3; p.y = anywhere ? Math.random() * H : -10; }
      else { p.r = 14 + Math.random() * 26; p.vy = -(0.03 + Math.random() * 0.06); p.vx = 0.02; p.y = anywhere ? Math.random() * H : H + p.r; }
      return p;
    };
    resize();
    var n = window.innerWidth < 700 ? 32 : 64;
    for (var i = 0; i < n; i++) parts.push(make(i % 3 === 0 ? "snow" : "ember", true));
    for (var j = 0; j < (window.innerWidth < 700 ? 4 : 8); j++) parts.push(make("bokeh", true));
    var draw = function (t) {
      ctx.clearRect(0, 0, W, H);
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        var flicker = 0.55 + 0.45 * Math.sin(t / 600 + p.phase * 3);
        var g;
        if (p.kind === "ember") {
          g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, "rgba(255, 226, 160," + (0.9 * flicker).toFixed(3) + ")");
          g.addColorStop(0.35, "rgba(248, 190, 110," + (0.35 * flicker).toFixed(3) + ")");
          g.addColorStop(1, "rgba(248, 190, 110, 0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        } else if (p.kind === "snow") {
          ctx.fillStyle = "rgba(236, 240, 234," + (0.35 + 0.3 * flicker).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        } else {
          g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, "rgba(255, 236, 196, 0.07)");
          g.addColorStop(0.7, "rgba(255, 236, 196, 0.04)");
          g.addColorStop(1, "rgba(255, 236, 196, 0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
    };
    var step = function (t) {
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        p.x += p.vx + Math.sin(t / 2000 + p.phase) * 0.25;
        p.y += p.vy;
        if (p.y < -40 || p.y > H + 40 || p.x > W + 40) parts[k] = make(p.kind, false);
        if (parts[k].x > W + 40) parts[k].x = -20;
      }
      draw(t);
      if (!document.hidden) raf = requestAnimationFrame(step);
    };
    var raf;
    window.addEventListener("resize", resize);
    if (calm) draw(0);
    else {
      raf = requestAnimationFrame(step);
      document.addEventListener("visibilitychange", function () { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(step); });
    }
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
