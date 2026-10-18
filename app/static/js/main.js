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

  /* ---------- Currency (picked from location in <head>; checkout form follows it) ---------- */
  var cur = document.documentElement.classList.contains("inr") ? "inr" : "usd";
  $all("[data-currency-input]").forEach(function (i) { i.value = cur; });

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

  /* ---------- Share image (for Instagram stories and posts) ---------- */
  // Draws the drawn card(s) on a 1080x1350 image, then opens the share sheet (phones) or downloads it.
  function wrap(ctx, text, maxW) {
    var words = text.split(" "), lines = [], line = "";
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function cardImage(opts) {
    var W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
    var ctx = c.getContext("2d"), fell = '"IM Fell English", Georgia, serif', gold = "#F8D794";
    var ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("60px \"IM Fell English\""), document.fonts.load("italic 40px \"IM Fell English\"")]).catch(function () {}) : Promise.resolve();
    return ready.then(function () {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#2b2338"); g.addColorStop(0.55, "#1f2e29"); g.addColorStop(1, "#111A19");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var glow = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, 600);
      glow.addColorStop(0, "rgba(248,215,148,0.18)"); glow.addColorStop(1, "rgba(248,215,148,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 90; i++) { ctx.fillStyle = "rgba(255,240,200," + (Math.random() * 0.6).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.8, 0, 6.283); ctx.fill(); }
      ctx.strokeStyle = "rgba(248,215,148,0.5)"; ctx.lineWidth = 2; roundRect(ctx, 30, 30, W - 60, H - 60, 24); ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = gold;
      ctx.font = "56px " + fell; ctx.fillText("EmpressAsh", W / 2, 130);
      ctx.fillStyle = "#F3EBD6"; ctx.font = "italic 40px " + fell;
      wrap(ctx, opts.title, W - 200).slice(0, 2).forEach(function (l, k) { ctx.fillText(l, W / 2, 200 + k * 50); });
      var cards = opts.cards, n = cards.length, cw = n === 1 ? 420 : 290, ch = cw * 1.55, gap = 36;
      var x0 = (W - (n * cw + (n - 1) * gap)) / 2, y0 = n === 1 ? 290 : 450;
      cards.forEach(function (cd, k) {
        var x = x0 + k * (cw + gap), y = y0;
        var cg = ctx.createLinearGradient(x, y, x + cw, y + ch); cg.addColorStop(0, "#372C41"); cg.addColorStop(1, "#284139");
        ctx.save(); ctx.shadowColor = "rgba(248,215,148,0.35)"; ctx.shadowBlur = 40;
        roundRect(ctx, x, y, cw, ch, 18); ctx.fillStyle = cg; ctx.fill(); ctx.restore();
        ctx.strokeStyle = gold; ctx.lineWidth = 2; roundRect(ctx, x, y, cw, ch, 18); ctx.stroke();
        ctx.strokeStyle = "rgba(248,215,148,0.45)"; ctx.lineWidth = 1; roundRect(ctx, x + 12, y + 12, cw - 24, ch - 24, 12); ctx.stroke();
        ctx.fillStyle = gold; ctx.font = (n === 1 ? 44 : 34) + "px " + fell; ctx.fillText(cd.numeral, x + cw / 2, y + 70);
        ctx.font = (n === 1 ? 150 : 100) + "px " + fell; ctx.save(); ctx.shadowColor = "rgba(248,215,148,0.8)"; ctx.shadowBlur = 30;
        ctx.fillText("✦", x + cw / 2, y + ch * 0.58); ctx.restore();
        ctx.fillStyle = "#F3EBD6"; ctx.font = (n === 1 ? 46 : 34) + "px " + fell;
        wrap(ctx, cd.name, cw - 50).forEach(function (l, j, arr) { ctx.fillText(l, x + cw / 2, y + ch - 40 - (arr.length - 1 - j) * 40); });
        if (cd.label) { ctx.fillStyle = "#93A052"; ctx.font = "30px " + fell; ctx.fillText(cd.label.toUpperCase(), x + cw / 2, y + ch + 50); }
      });
      if (opts.meaning) {
        ctx.fillStyle = "#F3EBD6"; ctx.font = "italic 38px " + fell;
        wrap(ctx, opts.meaning, W - 200).slice(0, 4).forEach(function (l, k) { ctx.fillText(l, W / 2, y0 + ch + 90 + k * 50); });
      }
      ctx.fillStyle = gold; ctx.font = "34px " + fell;
      ctx.fillText((location.host || "empressash").replace(/^www\./, ""), W / 2, H - 80);
      return new Promise(function (res) { c.toBlob(res, "image/png"); });
    });
  }
  function saveCardImage(opts, btn) {
    var label = btn.textContent; btn.textContent = "Preparing…";
    cardImage(opts).then(function (blob) {
      btn.textContent = label;
      if (!blob) return;
      var file = new File([blob], opts.filename || "empressash-card.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "EmpressAsh" }).catch(function () {});
      } else {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }
    }, function () { btn.textContent = label; });
  }
  window.EA = { cardImage: cardImage, saveCardImage: saveCardImage };
  $all("[data-card-image]").forEach(function (b) {
    b.addEventListener("click", function () {
      saveCardImage({ title: b.getAttribute("data-title"), meaning: b.getAttribute("data-meaning"),
        cards: [{ numeral: b.getAttribute("data-numeral"), name: b.getAttribute("data-name") }], filename: "empressash-card-of-the-day.png" }, b);
    });
  });

  /* ---------- Reading rooms remembered on this device ---------- */
  var rooms = [];
  try { rooms = JSON.parse(store("ea-rooms") || "[]"); } catch (e) { rooms = []; }
  var room = $("[data-room]");
  if (room) {
    var tok = room.getAttribute("data-token");
    rooms = rooms.filter(function (x) { return x.token !== tok; });
    rooms.unshift({ token: tok, name: room.getAttribute("data-name"), date: room.getAttribute("data-date") });
    store("ea-rooms", JSON.stringify(rooms.slice(0, 30)));
  }
  var list = $("[data-my-rooms]");
  if (list) {
    if (!rooms.length) $("[data-my-empty]").hidden = false;
    rooms.forEach(function (x) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = "/room/" + encodeURIComponent(x.token); a.className = "card plain";
      a.textContent = x.name + " · " + x.date;
      li.appendChild(a); list.appendChild(li);
    });
  }

  /* ---------- Share buttons ---------- */
  $all(".share-row").forEach(function (row) {
    var url = row.getAttribute("data-share-url");
    var native = $("[data-share=native]", row), copy = $("[data-share=copy]", row);
    if (native) {
      if (!navigator.share) native.remove();
      else native.addEventListener("click", function () { navigator.share({ title: "EmpressAsh", text: row.getAttribute("data-share-text"), url: url }).catch(function () {}); });
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
  } else if (!calm && "ontouchstart" in window) {
    /* Phones: a wand follows the finger, lights up what it touches and leaves sparks. */
    document.documentElement.classList.add("touch-wand-on");
    var tLight = document.createElement("div"), tWand = document.createElement("div");
    tLight.className = "wand-light touch"; tWand.className = "touch-wand";
    document.body.appendChild(tLight); document.body.appendChild(tWand);
    var tLast = 0, tHide = null, lit = null;
    var LIT = ".tcard, .card, .reading, .btn, .pcard, a, button";
    var sparkAt = function (x, y) {
      var sp = document.createElement("span");
      sp.className = "spark";
      sp.style.left = x + "px"; sp.style.top = y + "px";
      sp.style.setProperty("--dx", (Math.random() * 40 - 20).toFixed(0) + "px");
      sp.style.setProperty("--dy", (Math.random() * 30 + 8).toFixed(0) + "px");
      document.body.appendChild(sp);
      setTimeout(function () { sp.remove(); }, 800);
    };
    var touchAt = function (e, burst) {
      var t = e.touches[0]; if (!t) return;
      var x = t.clientX, y = t.clientY;
      clearTimeout(tHide);
      tLight.style.opacity = "1"; tWand.style.opacity = "1";
      tLight.style.transform = "translate(" + x + "px," + y + "px)";
      tWand.style.transform = "translate(" + x + "px," + y + "px)";
      var now = Date.now();
      if (burst) { for (var i = 0; i < 6; i++) sparkAt(x, y); tLast = now; }
      else if (now - tLast > 40) { tLast = now; sparkAt(x, y); }
      var el = document.elementFromPoint(x, y), hit = el && el.closest(LIT);
      if (hit !== lit) { if (lit) lit.classList.remove("lumos"); lit = hit; if (lit) lit.classList.add("lumos"); }
    };
    var touchEnd = function () {
      tHide = setTimeout(function () {
        tLight.style.opacity = "0"; tWand.style.opacity = "0";
        if (lit) { lit.classList.remove("lumos"); lit = null; }
      }, 700);
    };
    document.addEventListener("touchstart", function (e) { touchAt(e, true); }, { passive: true });
    document.addEventListener("touchmove", function (e) { touchAt(e, false); }, { passive: true });
    document.addEventListener("touchend", touchEnd, { passive: true });
    document.addEventListener("touchcancel", touchEnd, { passive: true });
  }

  /* ---------- Reading cards: deal in, tilt, turn over ---------- */
  var tcards = $all("[data-tcard]");  // .tcard-hero has no data-tcard, so it only gets the hover shine
  tcards.forEach(function (card) {
    var front = $(".tcard-front", card), back = $(".tcard-back", card);
    var setTurned = function (on) {
      card.classList.toggle("turned", on);
      if ("inert" in back) { back.inert = !on; front.inert = on; }
      var focusBtn = $("[data-turn]", on ? back : front);
      if (focusBtn) setTimeout(function () { focusBtn.focus({ preventScroll: true }); }, on ? 350 : 350);
    };
    if ("inert" in back) back.inert = true;
    card.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      if (e.target.closest("[data-turn]")) { setTurned(!card.classList.contains("turned")); return; }
      if (!card.classList.contains("turned") && e.target.closest(".tcard-front")) setTurned(true);
    });
    card.addEventListener("keydown", function (e) { if (e.key === "Escape" && card.classList.contains("turned")) setTurned(false); });
    if (calm || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add("hovering");
      card.style.setProperty("--ry", ((x - 0.5) * 16).toFixed(2) + "deg");
      card.style.setProperty("--rx", ((0.5 - y) * 12).toFixed(2) + "deg");
      card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    });
    card.addEventListener("pointerleave", function () {
      card.classList.remove("hovering");
      card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg");
    });
  });

  // Deal: cards fly in from a single point, as if dealt from a deck, when they scroll into view.
  if (!calm && "IntersectionObserver" in window) {
    $all("[data-deal]").forEach(function (group) {
      var cards = $all("[data-tcard]", group);
      cards.forEach(function (c) { c.classList.add("undealt"); });
      var dealer = new IntersectionObserver(function (entries) {
        var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
        if (!batch.length) return;
        batch.sort(function (a, b) { return cards.indexOf(a) - cards.indexOf(b); });
        var rects = batch.map(function (c) { return c.getBoundingClientRect(); });
        var left = Math.min.apply(null, rects.map(function (r) { return r.left; }));
        var right = Math.max.apply(null, rects.map(function (r) { return r.right; }));
        var top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
        var cx = (left + right) / 2;
        batch.forEach(function (c, i) {
          var r = rects[i];
          c.style.setProperty("--dx", (cx - (r.left + r.width / 2)).toFixed(0) + "px");
          c.style.setProperty("--dy", (top - r.top - 60).toFixed(0) + "px");
          c.style.setProperty("--rot", ((Math.random() * 24) - 12).toFixed(1) + "deg");
          c.style.setProperty("--deal-delay", (i * 0.09).toFixed(2) + "s");
          dealer.unobserve(c);
        });
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          batch.forEach(function (c) {
            c.classList.remove("undealt");
            setTimeout(function () { c.style.setProperty("--deal-delay", "0s"); }, 1400);
          });
        }); });
      }, { threshold: 0.15 });
      cards.forEach(function (c) { dealer.observe(c); });
    });
  }

  // Arrow buttons for the homepage rail.
  $all("[data-rail]").forEach(function (b) {
    b.addEventListener("click", function () {
      var row = $(".card-row", b.parentNode);
      row.scrollBy({ left: Number(b.getAttribute("data-rail")) * row.clientWidth * 0.8, behavior: calm ? "auto" : "smooth" });
    });
  });

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
