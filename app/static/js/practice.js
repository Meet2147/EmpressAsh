/* Ask the cards: shuffle, pick three from a fan, flip them and practise reading. */
(function () {
  "use strict";
  var root = document.querySelector("[data-practice]");
  if (!root) return;
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $all = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DECK = JSON.parse(document.getElementById("deck-data").textContent);
  var FAN_SIZE = 22;
  var stack = $("[data-stack]"), fan = $("[data-fan]"), spread = $("[data-spread]"), hint = $("[data-hint]");
  var done = $("[data-done]"), shuffleBtn = $("[data-shuffle]"), question = $("[data-question]");
  var slots = $all("[data-slot]");
  var picked = [], busy = false;

  function shuffled() {
    var a = DECK.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, calm ? 0 : ms); }); }
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  function face(card) {
    return '<span class="pcard-inner"><span class="pcard back"></span>' +
      '<span class="pcard front"><span class="pc-num">' + esc(card.numeral) + '</span><span class="pc-star">✦</span>' +
      '<span class="pc-name">' + esc(card.name) + '</span></span></span>';
  }

  function reset() {
    picked = [];
    fan.innerHTML = ""; fan.hidden = true;
    spread.hidden = true; done.hidden = true;
    slots.forEach(function (s, i) {
      $("[data-slot-card]", s).innerHTML = '<span class="slot-empty">' + (i + 1) + "</span>";
      $(".slot-body", s).hidden = true;
      $("textarea", s).value = "";
      $("[data-card-meaning]", s).hidden = true;
      $("[data-reveal-meaning]", s).hidden = false;
    });
  }

  function layoutFan() {
    var cards = $all(".fan-card", fan), n = cards.length;
    var narrow = fan.clientWidth < 560, spreadDeg = narrow ? 58 : 96;
    cards.forEach(function (c, i) {
      var a = n > 1 ? -spreadDeg / 2 + (spreadDeg * i) / (n - 1) : 0;
      c.style.setProperty("--a", a.toFixed(2) + "deg");
    });
  }

  function shuffle() {
    if (busy) return;
    busy = true;
    reset();
    hint.textContent = "Shuffling…";
    stack.hidden = false;
    stack.classList.remove("shuffling"); void stack.offsetWidth; stack.classList.add("shuffling");
    var deck = shuffled().slice(0, FAN_SIZE);
    wait(1500).then(function () {
      stack.classList.remove("shuffling");
      stack.hidden = true;
      fan.hidden = false;
      deck.forEach(function (card, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "fan-card dealing";
        b.setAttribute("aria-label", "Card " + (i + 1) + " of " + deck.length + ", face down");
        b.style.setProperty("--d", (i * 0.03).toFixed(2) + "s");
        b.innerHTML = '<span class="pcard back"></span>';
        b._card = card;
        b.addEventListener("click", function () { pick(b); });
        fan.appendChild(b);
      });
      layoutFan();
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        $all(".fan-card", fan).forEach(function (b) { b.classList.remove("dealing"); });
      }); });
      hint.textContent = "Pick three cards. Let your hand choose.";
      busy = false;
    });
  }

  function pick(btn) {
    if (busy || picked.length >= 3 || btn.classList.contains("taken")) return;
    busy = true;
    var idx = picked.length, card = btn._card, slot = slots[idx];
    picked.push(card);
    spread.hidden = false;
    var holder = $("[data-slot-card]", slot);
    var from = btn.getBoundingClientRect(), to = holder.getBoundingClientRect();
    btn.classList.add("taken"); btn.disabled = true;
    var fly = document.createElement("span");
    fly.className = "pcard back flying";
    fly.style.cssText = "left:" + from.left + "px;top:" + from.top + "px;width:" + from.width + "px;height:" + from.height + "px";
    document.body.appendChild(fly);
    var anim = calm || !fly.animate ? null : fly.animate([
      { transform: "translate(0,0) rotate(" + getComputedStyle(btn).getPropertyValue("--a") + ")" },
      { transform: "translate(" + (to.left - from.left) + "px," + (to.top - from.top) + "px) scale(" + (to.width / from.width) + ") rotate(0deg)" }
    ], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    var land = function () {
      fly.remove();
      holder.innerHTML = '<span class="slot-flip">' + face(card) + "</span>";
      var body = $(".slot-body", slot);
      $("[data-card-name]", body).textContent = card.name;
      $("[data-card-meaning]", body).textContent = card.meaning;
      wait(250).then(function () {
        $(".slot-flip", holder).classList.add("flipped");
        body.hidden = false;
        busy = false;
        if (picked.length < 3) hint.textContent = (3 - picked.length) + (picked.length === 2 ? " more card." : " more cards.");
        else finish();
      });
    };
    if (anim) anim.onfinish = land; else land();
  }

  function finish() {
    hint.textContent = "Your three cards are drawn. Read them yourself, then turn to the meanings.";
    fan.classList.add("gathered");
    setTimeout(function () { fan.hidden = true; fan.classList.remove("gathered"); }, calm ? 0 : 600);
    var names = picked.map(function (c) { return c.name; }).join(", ");
    var q = question.value.trim();
    var text = "I asked the cards" + (q ? ' "' + q + '"' : "") + " and drew " + names + ". Try it on EmpressAsh:";
    var row = $(".share-row", done);
    row.setAttribute("data-share-text", text);
    var url = row.getAttribute("data-share-url");
    $("[data-share-wa]", done).href = "https://wa.me/?text=" + encodeURIComponent(text + " " + url);
    done.hidden = false;
    shuffleBtn.textContent = "Shuffle again";
  }

  slots.forEach(function (s) {
    $("[data-reveal-meaning]", s).addEventListener("click", function (e) {
      $("[data-card-meaning]", s).hidden = false;
      e.currentTarget.hidden = true;
    });
  });
  shuffleBtn.addEventListener("click", shuffle);
  $("[data-again]").addEventListener("click", function () { window.scrollTo({ top: root.offsetTop - 90, behavior: calm ? "auto" : "smooth" }); shuffle(); });
  question.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); shuffle(); } });
  window.addEventListener("resize", layoutFan);

  var imgBtn = $("[data-share-image]");
  if (imgBtn && window.EA && window.EA.cardImage) imgBtn.addEventListener("click", function () {
    var q = question.value.trim();
    window.EA.saveCardImage({
      title: q ? "“" + q + "”" : "Ask the cards",
      cards: picked.map(function (c, i) { return { numeral: c.numeral, name: c.name, label: ["Past", "Present", "Future"][i] }; }),
      filename: "empressash-three-cards.png"
    }, imgBtn);
  });
})();
