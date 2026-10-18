/* Calm background sound, made live in the browser (no audio files, so nothing to license).
   A soft drone, slow air, and a singing bowl now and then. Off until the visitor turns it on;
   the choice is remembered and resumes on their first tap on later pages. */
(function () {
  var btn = document.querySelector("[data-ambience]");
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  var KEY = "ea-sound", ctx = null, master = null, bus = null, bowlTimer = null, on = false;
  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  };

  function reverb(c) {
    // A long, dark hall made from decaying noise.
    var len = c.sampleRate * 5, buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    var conv = c.createConvolver(); conv.buffer = buf; return conv;
  }

  function lfo(c, rate, depth, target) {
    var o = c.createOscillator(), g = c.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(target); o.start();
  }

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);

    var hall = reverb(ctx), wet = ctx.createGain(), dry = ctx.createGain();
    wet.gain.value = 0.55; dry.gain.value = 0.45;
    hall.connect(wet); wet.connect(master); dry.connect(master);
    bus = ctx.createGain(); bus.connect(hall); bus.connect(dry);

    // Drone: a warm open chord (A, E, A, C#) that slowly breathes.
    var pad = ctx.createBiquadFilter(); pad.type = "lowpass"; pad.frequency.value = 650; pad.Q.value = 0.4;
    lfo(ctx, 0.03, 250, pad.frequency);
    var padGain = ctx.createGain(); padGain.gain.value = 0.16;
    lfo(ctx, 0.07, 0.05, padGain.gain);
    pad.connect(padGain); padGain.connect(bus);
    [110, 164.81, 220, 277.18].forEach(function (f, i) {
      [-4, 4].forEach(function (cents) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = f; o.detune.value = cents;
        g.gain.value = i === 0 ? 0.5 : 0.22;
        o.connect(g); g.connect(pad); o.start();
      });
    });

    // Air: soft filtered noise, like a slow breath.
    var n = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = n.getChannelData(0), last = 0;
    for (var i = 0; i < nd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = last * 3.5; }
    var noise = ctx.createBufferSource(); noise.buffer = n; noise.loop = true;
    var air = ctx.createBiquadFilter(); air.type = "bandpass"; air.frequency.value = 500; air.Q.value = 0.7;
    var airGain = ctx.createGain(); airGain.gain.value = 0.05;
    lfo(ctx, 0.05, 0.035, airGain.gain);
    noise.connect(air); air.connect(airGain); airGain.connect(bus); noise.start();
  }

  function bowl() {
    if (!on || !ctx) return;
    var base = [220, 246.94, 329.63, 440][Math.floor(Math.random() * 4)], t = ctx.currentTime;
    [[1, 0.09], [2.76, 0.035], [5.4, 0.012]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = base * p[0];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p[1], t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 9);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 9.2);
    });
    bowlTimer = setTimeout(bowl, 14000 + Math.random() * 12000);
  }

  function start() {
    if (!ctx) build();
    ctx.resume();
    on = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.5, ctx.currentTime, 2.5);
    clearTimeout(bowlTimer); bowlTimer = setTimeout(bowl, 4000);
    paint();
  }

  function stop() {
    on = false; clearTimeout(bowlTimer);
    if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 3000);
    }
    paint();
  }

  function paint() {
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Turn calm sound off" : "Turn calm sound on");
    btn.title = on ? "Calm sound on" : "Calm sound off";
  }

  btn.hidden = false;
  paint();
  btn.addEventListener("click", function () {
    if (on) { stop(); store.set("off"); } else { start(); store.set("on"); }
  });

  // Browsers only allow sound after a tap or key, so resume a remembered "on" at the first one.
  if (store.get() === "on") {
    btn.classList.add("waiting");
    var resume = function (e) {
      if (e && e.target && e.target.closest && e.target.closest("[data-ambience]")) return;
      document.removeEventListener("pointerdown", resume, true);
      document.removeEventListener("keydown", resume, true);
      btn.classList.remove("waiting");
      if (!on) start();
    };
    document.addEventListener("pointerdown", resume, true);
    document.addEventListener("keydown", resume, true);
  }

  // Quiet while the tab is hidden.
  document.addEventListener("visibilitychange", function () {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
})();
