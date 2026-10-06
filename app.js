/* Poster companion: the shelf, six stations, and their instruments. All numbers come from WLModel. */
(function () {
  "use strict";
  var M = window.WLModel;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seedBase = (Date.now() % 100000) >>> 0, seedN = 0;
  function freshSeed() { seedN++; return (seedBase * 2654435761 + seedN * 40503) >>> 0; }
  function pct(v) { return Math.round(v * 100) + "%"; }
  function setLv(el, v) { el.style.setProperty("--lv", (Math.max(0, Math.min(1, v)) * 100).toFixed(1) + "%"); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }

  /* ---------- condensation on the wall ---------- */
  (function () {
    var s = 11, r = function () { s = (s * 16807) % 2147483647; return s / 2147483647; }, h = "";
    for (var i = 0; i < 46; i++) {
      var big = r() < 0.3, w = big ? 6 + r() * 9 : 2 + r() * 3.5;
      h += '<i class="drop' + (big ? "" : " sm") + '" style="left:' + (r() * 100).toFixed(1) + "%;top:" + (r() * 100).toFixed(1) + "%;width:" + w.toFixed(1) + "px;height:" + (big ? w * 1.15 : w).toFixed(1) + 'px"></i>';
    }
    $("drops").innerHTML = h;
  })();

  /* ---------- routing: #s1 .. #s6, empty = the shelf ---------- */
  var enter = {}, leave = {};
  function show() {
    var id = (location.hash || "").replace("#", "") || "home";
    if (!$(id) || !/^(home|s[1-6])$/.test(id)) id = "home";
    document.querySelectorAll(".station").forEach(function (s) {
      var on = s.id === id;
      if (!on && !s.hidden && leave[s.id]) leave[s.id]();
      s.hidden = !on;
    });
    window.scrollTo(0, 0);
    if (enter[id]) enter[id]();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]"); if (!b) return;
    var to = b.getAttribute("data-go");
    location.hash = to === "home" ? "" : to;
    if (to === "home" && !location.hash) show();
  });
  window.addEventListener("hashchange", show);

  /* copy the address */
  $("copy").addEventListener("click", function () {
    var b = this, a = $("addr").textContent;
    function sel() { var r = document.createRange(); r.selectNodeContents($("addr")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "SELECTED"; }
    try { navigator.clipboard.writeText(a).then(function () { b.textContent = "COPIED"; }, sel); } catch (e) { sel(); }
    setTimeout(function () { b.textContent = "COPY"; }, 1800);
  });

  /* ---------- a drifting grating on a canvas ---------- */
  function Grating(canvas) {
    var ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height, img = ctx.createImageData(W, H);
    var state = { c: 1, dir: -1, on: false, visible: true }, phase = 0, raf = 0, nseed = 1;
    function frame() {
      phase += 0.09 * state.dir;
      var d = img.data, amp = state.visible ? state.c * 0.5 : 0, k = 2 * Math.PI / 38;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        nseed = (nseed * 1103515245 + 12345) & 0x7fffffff;
        var noise = ((nseed / 0x7fffffff) - 0.5) * 0.16;
        var v = 0.5 + amp * Math.sin(k * x - phase) + noise;
        var g = Math.max(0, Math.min(255, v * 255)) | 0, i = (y * W + x) * 4;
        d[i] = g; d[i + 1] = g; d[i + 2] = Math.min(255, g + 4); d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (state.on) raf = requestAnimationFrame(frame);
    }
    return {
      set: function (o) { for (var k in o) state[k] = o[k]; if (!state.on) frame(); },
      start: function () { if (state.on) return; state.on = true; raf = requestAnimationFrame(frame); },
      stop: function () { state.on = false; cancelAnimationFrame(raf); }
    };
  }

  /* =====================================================================
     01 · faint evidence, strong prior
     ===================================================================== */
  (function () {
    var g = Grating($("g1")), knob = $("knob"), t = 1, seen = false;
    var ZETA1 = 0.25, PI1 = M.BETA;                         // the mouse is sure of an 80/20 block
    function render() {
      var c = t * t;                                        // finer control near faint
      knob.style.setProperty("--rot", (-135 + 270 * t) + "deg");
      knob.setAttribute("aria-valuenow", Math.round(t * 100));
      $("k-val").textContent = c.toFixed(2);
      $("k-word").textContent = c < 0.02 ? "none" : c < 0.08 ? "faint" : c < 0.3 ? "weak" : "strong";
      var p = M.pLickRight(-c, PI1, ZETA1), p0 = M.pLickRight(-c, 0.5, ZETA1);
      setLv($("t1"), p); $("t1v").textContent = pct(p);
      $("m1").style.bottom = "calc(" + (p0 * 100).toFixed(1) + "% * .97 + 3px)";
      $("m1v").textContent = "- - no prior: " + pct(p0);
      g.set({ c: c, dir: -1 });
      if (c < 0.08 && !seen) { seen = true; $("ins1").hidden = false; }
    }
    var drag = null;
    function angleT(e) {
      var r = knob.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      var a = Math.atan2(x, -y) * 180 / Math.PI;            // 0 at top, clockwise positive
      return Math.max(0, Math.min(1, (a + 135) / 270));
    }
    knob.addEventListener("pointerdown", function (e) { drag = true; knob.setPointerCapture(e.pointerId); t = angleT(e); render(); });
    knob.addEventListener("pointermove", function (e) { if (drag) { t = angleT(e); render(); } });
    knob.addEventListener("pointerup", function () { drag = false; });
    knob.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { t = Math.min(1, t + 0.05); render(); e.preventDefault(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { t = Math.max(0, t - 0.05); render(); e.preventDefault(); }
    });
    enter.s1 = function () { render(); g.start(); };
    leave.s1 = function () { g.stop(); };
  })();

  /* ---------- three belief tubes, used by 02 and 05 ---------- */
  function beliefTubes(host) {
    var names = ["mostly<br>right", "even<br>50/50", "mostly<br>left"], cols = ["var(--tint)", "#7f93a6", "var(--ink)"], liq = [], val = [];
    host.innerHTML = "";
    names.forEach(function (n, i) {
      var d = document.createElement("div"); d.className = "belief";
      d.innerHTML = '<span class="pct">33%</span><div class="glass"><i class="liq" style="--c:' + cols[i] + ';--lv:33%"></i><i class="line90"></i></div><span class="nm">' + n + "</span>";
      host.appendChild(d); liq.push(d.querySelector(".liq")); val.push(d.querySelector(".pct"));
    });
    return function (pb) { for (var i = 0; i < 3; i++) { setLv(liq[i], pb[i]); val[i].textContent = pct(pb[i]); } };
  }

  /* =====================================================================
     02 · guess, then watch
     ===================================================================== */
  (function () {
    var MAXT = 40, guess = 15, running = false, setBel = beliefTubes($("bel2"));
    var bur = $("bur2"), clamp = $("clamp2"), sc = $("sc2");
    var H = function () { return bur.clientHeight; };
    for (var k = 0; k <= MAXT; k += 10) { var s = document.createElement("span"); s.textContent = k; s.style.bottom = (k / MAXT * 100) + "%"; sc.appendChild(s); }
    function placeClamp() { clamp.style.bottom = (guess / MAXT * 100) + "%"; $("clampv").textContent = "guess " + guess; clamp.setAttribute("aria-valuenow", guess); }
    function fromY(e) { var r = bur.getBoundingClientRect(); return Math.max(1, Math.min(MAXT, Math.round((r.bottom - e.clientY) / r.height * MAXT))); }
    var dragging = false;
    clamp.addEventListener("pointerdown", function (e) { if (running) return; dragging = true; clamp.setPointerCapture(e.pointerId); });
    clamp.addEventListener("pointermove", function (e) { if (dragging) { guess = fromY(e); placeClamp(); } });
    clamp.addEventListener("pointerup", function () { dragging = false; });
    bur.addEventListener("pointerdown", function (e) { if (running || e.target === clamp || clamp.contains(e.target)) return; guess = fromY(e); placeClamp(); });
    clamp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { guess = Math.min(MAXT, guess + 1); placeClamp(); e.preventDefault(); }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") { guess = Math.max(1, guess - 1); placeClamp(); e.preventDefault(); }
    });
    function reset() {
      setBel([1 / 3, 1 / 3, 1 / 3]); $("drip2").innerHTML = ""; $("cnt2").textContent = "trial 0";
      setLv($("b2liq"), 0); $("act2").hidden = true; $("res2").textContent = "";
    }
    var median2 = null;
    $("run2").addEventListener("click", async function () {
      if (running) return; running = true; this.disabled = true; reset();
      var sim = M.simulate(M.seq(0, 0, MAXT, 0.8), freshSeed()), hit = null;
      for (var t = 0; t < MAXT; t++) {
        var tr = sim.trials[t], pb = sim.PB[t + 1];
        var dr = document.createElement("i"); if (tr.stim < 0) dr.className = "L"; $("drip2").appendChild(dr);
        setBel(pb); setLv($("b2liq"), (t + 1) / MAXT); $("cnt2").textContent = "trial " + (t + 1);
        await wait(230);
        if (pb[0] >= 0.9) { hit = t + 1; break; }
      }
      var act = $("act2"); act.hidden = false;
      if (hit) { act.style.bottom = (hit / MAXT * 100) + "%"; act.querySelector("b").textContent = "took " + hit; setLv($("b2liq"), hit / MAXT); }
      else { act.style.bottom = "100%"; act.querySelector("b").textContent = "not in 40"; }
      if (median2 === null) median2 = M.runCondition(M.CONDITIONS[0], 500, freshSeed()).median;
      var diff = hit ? Math.abs(hit - guess) : null;
      $("res2").textContent = (hit ? "This mouse took " + hit + " trials. You guessed " + guess + (diff === 0 ? ", exactly. " : " (off by " + diff + "). ") : "This mouse wasn't sure within 40 trials. ") + "Median of 500 mice: " + median2 + ".";
      $("ins2").hidden = false; this.disabled = false; this.textContent = "Run another mouse"; running = false;
    });
    placeClamp(); reset();
  })();

  /* =====================================================================
     03 · one trial, step by step
     ===================================================================== */
  (function () {
    var trial, pbBefore, pbAfter, step = 0, done = 0;
    var V = [0, 1, 2, 3, 4].map(function (i) { return $("v" + i); });
    function mini(pb) { var is = $("mini").children; for (var i = 0; i < 3; i++) is[i].style.height = (pb[i] * 100).toFixed(1) + "%"; }
    function newTrial() {
      // a mouse a few trials into an 80/20 block, then the trial we slow down
      var warm = 3 + Math.floor(Math.random() * 6);
      var sim = M.simulate(M.seq(0, 0, warm + 1, 0.8), freshSeed());
      trial = sim.trials[warm]; pbBefore = sim.PB[warm]; pbAfter = sim.PB[warm + 1]; step = 0;
      V.forEach(function (v, i) { v.classList.toggle("on", i === 0); });
      mini(pbBefore); $("vv0").textContent = pct(pbBefore[0]) + " R";
      ["l1", "l2", "l3", "l4"].forEach(function (id) { setLv($(id), 0); });
      ["vv1", "vv2", "vv3", "vv4"].forEach(function (id) { $(id).textContent = "·"; });
      $("evd").classList.remove("in"); $("spL").classList.remove("lit"); $("spR").classList.remove("lit");
      $("st3").innerHTML = "It has seen " + warm + " trials of this block. Its belief: <span class=\"mono\">" + pct(pbBefore[0]) + "</span> mostly-right, <span class=\"mono\">" + pct(pbBefore[1]) + "</span> even, <span class=\"mono\">" + pct(pbBefore[2]) + "</span> mostly-left.";
      $("step3").disabled = false; $("step3").textContent = "Step ▸";
    }
    $("step3").addEventListener("click", function () {
      step++;
      if (step === 1) {
        V[1].classList.add("on"); setLv($("l1"), trial.pi); $("vv1").textContent = pct(trial.pi);
        $("st3").innerHTML = "<b>Prior.</b> Before looking, those beliefs add up to a lean: <span class=\"mono\">" + pct(trial.pi) + "</span> that this trial goes right.";
      } else if (step === 2) {
        V[2].classList.add("on");
        var x = Math.max(4, Math.min(96, 50 + trial.m / 2.5 * 50));
        $("evd").style.left = x + "%"; requestAnimationFrame(function () { $("evd").classList.add("in"); });
        var lr = M.observe(trial.m, [1 / 3, 1 / 3, 1 / 3]).LR;
        setLv($("l2"), lr); $("vv2").textContent = (trial.m >= 0 ? "+" : "") + trial.m.toFixed(2);
        $("st3").innerHTML = "<b>Evidence.</b> The grating had contrast <span class=\"mono\">" + trial.c + "</span>, but the mouse only gets a noisy reading: <span class=\"mono\">m = " + (trial.m >= 0 ? "+" : "") + trial.m.toFixed(2) + "</span>. On its own that says <span class=\"mono\">" + pct(lr) + "</span> right.";
      } else if (step === 3) {
        V[3].classList.add("on"); setLv($("l3"), trial.post); $("vv3").textContent = pct(trial.post);
        $("st3").innerHTML = "<b>Posterior.</b> Prior and evidence combine: <span class=\"mono\">" + pct(trial.post) + "</span> that this trial goes right.";
      } else if (step === 4) {
        V[4].classList.add("on"); var R = trial.choice === 1;
        setLv($("l4"), R ? 1 : 0.02); $("vv4").textContent = R ? "R" : "L";
        $(R ? "spR" : "spL").classList.add("lit");
        $("st3").innerHTML = "<b>Lick.</b> It licks the side with the higher posterior: <span class=\"mono\">" + (R ? "right" : "left") + "</span>.";
      } else if (step === 5) {
        var ok = trial.correct, R2 = trial.stim === 1;
        mini(pbAfter); $("vv0").textContent = pct(pbAfter[0]) + " R"; V[0].classList.add("on");
        $("st3").innerHTML = "<b>Feedback.</b> The grating really moved <span class=\"mono\">" + (R2 ? "right" : "left") + "</span>, so the lick was " + (ok ? "rewarded" : "not rewarded") + ". Knowing the true side, it updates its block belief to <span class=\"mono\">" + pct(pbAfter[0]) + "</span> mostly-right. That becomes the next trial's prior.";
        $("step3").disabled = true; done++;
        if (done >= 1) $("ins3").hidden = false;
      }
    });
    $("new3").addEventListener("click", newTrial);
    enter.s3 = function () { if (!trial) newTrial(); };
  })();

  /* =====================================================================
     04 · which block is this?
     ===================================================================== */
  (function () {
    var hidden, sim, t = 0, timer = 0, guessed = false, MAXT = 40;
    var caps = Array.prototype.slice.call(document.querySelectorAll(".cap-tube"));
    function stop() { clearTimeout(timer); timer = 0; }
    function start() {
      stop(); guessed = false; t = 0;
      var ps = [0.8, 0.5, 0.2]; hidden = ps[Math.floor(Math.random() * 3)];
      sim = M.simulate(M.seq(0, 0, MAXT, hidden), freshSeed());
      $("beaker").innerHTML = ""; $("res4").textContent = ""; caps.forEach(function (c) { c.disabled = false; c.classList.remove("right"); });
      tick();
    }
    function tally() {
      var r = 0; for (var i = 0; i < t; i++) if (sim.trials[i].stim === 1) r++;
      $("tR").textContent = "right " + r; $("tL").textContent = "left " + (t - r); $("tN").textContent = "trial " + t;
    }
    function tick() {
      if (guessed || t >= MAXT) { if (!guessed) $("res4").textContent = "40 trials in. Make your call."; return; }
      var d = document.createElement("i"); if (sim.trials[t].stim < 0) d.className = "L"; $("beaker").appendChild(d);
      t++; tally(); timer = setTimeout(tick, reduce ? 150 : 650);
    }
    caps.forEach(function (c) {
      c.addEventListener("click", function () {
        if (guessed || !sim) return; guessed = true; stop();
        var p = +c.getAttribute("data-p"), right = Math.abs(p - hidden) < 1e-9, blk = M.blockOf(hidden);
        var obs = M.trialsTo90(sim.PB, blk, 1);
        caps.forEach(function (x) { x.disabled = true; if (Math.abs(+x.getAttribute("data-p") - hidden) < 1e-9) x.classList.add("right"); });
        var name = { 0.8: "80/20", 0.5: "50/50", 0.2: "20/80" }[hidden];
        $("res4").innerHTML = (right ? "<b>Right.</b> " : "<b>Not quite.</b> ") + "It was <span class=\"mono\">" + name + "</span>. You called it after <span class=\"mono\">" + t + "</span> trials. The observer was 90% sure " +
          (obs ? (obs <= t ? "at trial <span class=\"mono\">" + obs + "</span>." : "only at trial <span class=\"mono\">" + obs + "</span>.") : "not within 40 trials.");
        $("ins4").hidden = false;
      });
    });
    $("new4").addEventListener("click", start);
    enter.s4 = function () { if (!sim || guessed || t >= MAXT) start(); else tick(); };
    leave.s4 = stop;
  })();

  /* =====================================================================
     05 · run 500 mice
     ===================================================================== */
  (function () {
    var host = $("burets"), parts = [], ran = false, XMAX = 80;
    M.CONDITIONS.forEach(function (c, i) {
      var d = document.createElement("div"); d.className = "buret";
      d.innerHTML = '<span class="val">·</span><div class="glass"><i class="liq" style="--lv:0%"></i><i class="ticks"></i></div><canvas class="hist" width="200" height="60" aria-hidden="true"></canvas><span class="nm">' + c.label + "</span>" + (c.key === "reversal" ? '<button class="why" hidden>why?</button>' : "");
      host.appendChild(d); parts.push({ val: d.querySelector(".val"), liq: d.querySelector(".liq"), cv: d.querySelector(".hist"), why: d.querySelector(".why") });
    });
    function hist(cv, vals) {
      var ctx = cv.getContext("2d"), W = cv.width, H = cv.height, bins = new Array(20).fill(0);
      vals.forEach(function (v) { bins[Math.min(19, Math.floor(Math.min(v, XMAX - 0.01) / (XMAX / 20)))]++; });
      var mx = Math.max.apply(null, bins) || 1; ctx.clearRect(0, 0, W, H);
      bins.forEach(function (b, i) { var h = b / mx * (H - 4); ctx.fillStyle = "#35a3a0"; ctx.fillRect(i * W / 20 + 1, H - h, W / 20 - 2, h); });
      ctx.fillStyle = "#3a5264"; ctx.fillRect(0, H - 1, W, 1);
    }
    $("lever").addEventListener("click", async function () {
      var lv = this; if (lv.classList.contains("busy")) return;
      lv.classList.add("down", "busy");
      parts.forEach(function (p) { setLv(p.liq, 0); p.val.textContent = "·"; });
      await wait(450);
      for (var i = 0; i < M.CONDITIONS.length; i++) {
        var r = M.runCondition(M.CONDITIONS[i], 500, freshSeed()), p = parts[i];
        setLv(p.liq, r.median / XMAX); p.val.textContent = r.median;
        hist(p.cv, r.values);
        if (p.why) { p.why.hidden = false; p.why.title = r.never + " of 500 weren't sure within 100 trials"; }
        await wait(380);
      }
      lv.classList.remove("down", "busy"); ran = true; $("ins5").hidden = false;
    });
    var setBel = beliefTubes($("bel5")), replaying = false;
    parts[2].why.addEventListener("click", async function () {
      if (replaying) return; replaying = true;
      $("replay").hidden = false; $("replay").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      var sim = M.simulate(M.seq(19, 0.8, 100, 0.2), freshSeed());
      for (var t = 0; t <= 119; t++) {
        var pb = sim.PB[t]; setBel(pb);
        var phase = t < 20 ? "80/20 block" : "after the flip to 20/80";
        $("cnt5").textContent = "trial " + t + " · " + phase + (t >= 20 && pb[2] >= 0.9 ? " · sure of the new block" : "");
        if (t >= 20 && pb[2] >= 0.9) break;
        await wait(t < 20 ? 60 : 110);
      }
      replaying = false;
    });
  })();

  /* =====================================================================
     06 · be the mouse
     ===================================================================== */
  (function () {
    var g = Grating($("g6")), N = 20, sim, t = 0, you = 0, obs = 0, faintYou = 0, faintObs = 0, faintN = 0, bias, playing = false;
    g.set({ c: 0, dir: 1, visible: false });
    function btns(on) { $("lickL").disabled = !on; $("lickR").disabled = !on; }
    async function present() {
      var tr = sim.trials[t];
      $("cnt6").textContent = "trial " + (t + 1) + " of " + N;
      $("win6").classList.remove("ok", "no");
      g.set({ c: tr.c, dir: tr.stim, visible: true }); g.start();
      await wait(900);
      g.set({ visible: false }); btns(true);
    }
    function lick(side) {
      if (!playing) return; btns(false);
      var tr = sim.trials[t], ok = side === tr.stim, faint = tr.c <= 0.0625;
      if (ok) you++; if (tr.correct) obs++;
      if (faint) { faintN++; if (side === bias) faintYou++; if (tr.choice === bias) faintObs++; }
      $("win6").classList.add(ok ? "ok" : "no");
      t++;
      if (t >= N) return finish();
      setTimeout(present, reduce ? 50 : 500);
    }
    function finish() {
      playing = false; g.stop(); $("cnt6").textContent = "done";
      $("score6").hidden = false; $("sc-you").textContent = you + "/" + N; $("sc-obs").textContent = obs + "/" + N;
      var side = bias === 1 ? "right" : "left";
      $("res6").hidden = false;
      $("res6").innerHTML = "The hidden block was mostly <b>" + side + "</b>. " + (faintN ? "On the " + faintN + " faintest trials you licked " + side + " <span class=\"mono\">" + faintYou + "/" + faintN + "</span> times; the observer did <span class=\"mono\">" + faintObs + "/" + faintN + "</span>. Leaning with the block when you can't see is what a prior does." : "");
      $("start6").textContent = "Play again"; $("start6").disabled = false;
    }
    $("lickL").addEventListener("click", function () { lick(-1); });
    $("lickR").addEventListener("click", function () { lick(1); });
    $("start6").addEventListener("click", function () {
      bias = Math.random() < 0.5 ? 1 : -1;
      sim = M.simulate(M.seq(0, 0, N, bias === 1 ? 0.8 : 0.2), freshSeed());
      t = you = obs = faintYou = faintObs = faintN = 0; playing = true;
      $("score6").hidden = true; $("res6").hidden = true; this.disabled = true;
      present();
    });
    leave.s6 = function () { g.stop(); playing = false; btns(false); $("start6").disabled = false; };
  })();

  show();
})();
