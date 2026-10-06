/* The Bayesian observer from the poster, one copy shared by every station.
   A port of Raven's split model (SC_priors/task_bayesian_model_split.ipynb: Alyssa's fast version with the
   stimulus-sign fix): generate_session -> generateTrial, compute_prior, observe_direction, update_block, with
   the same names below. Parameters are the poster's: 80/20 blocks, beta_obs = 0.8, noise = 1, sigma from the
   nine signed contrasts. (The notebook's demo run uses pRight = beta_obs = 0.9.) */
(function (root) {
  "use strict";
  var C_SIGNED = [-1, -0.25, -0.125, -0.0625, 0, 0.0625, 0.125, 0.25, 1];
  var SIGMA = Math.sqrt(C_SIGNED.reduce(function (s, c) { return s + c * c / 9; }, 0));
  var C_LEVELS = [0, 0.0625, 0.125, 0.25, 1];
  var C_PROBS = [0.1, 0.3, 0.3, 0.2, 0.1];
  var BETA = 0.8, ZETA = 1.0;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gaussFrom(r) {
    return function () { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  }
  function erf(x) {
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function Phi(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  // inverse normal CDF (Acklam), for the analytic choice curve
  function PhiInv(p) {
    var a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924],
      b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857],
      c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878],
      d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    var q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function pickContrast(r) {
    var x = r(), acc = 0;
    for (var i = 0; i < C_LEVELS.length; i++) { acc += C_PROBS[i]; if (x < acc) return C_LEVELS[i]; }
    return C_LEVELS[C_LEVELS.length - 1];
  }
  // block index: 0 = R-biased, 1 = unbiased, 2 = L-biased
  function blockOf(pRight) { return pRight > 0.5 ? 0 : (pRight < 0.5 ? 2 : 1); }

  /* the world makes one trial */
  function generateTrial(r, g, pRight, zeta) {
    var stim = r() < pRight ? 1 : -1, c = pickContrast(r);
    return { stim: stim, c: c, m: stim * c + (zeta == null ? ZETA : zeta) * g() };
  }
  /* compute_prior: the lean toward right, from the block beliefs */
  function computePrior(pb, beta) {
    beta = beta == null ? BETA : beta;
    return beta * pb[0] + 0.5 * pb[1] + (1 - beta) * pb[2];
  }
  /* observe_direction: likelihood from m, posterior P(right | m) */
  function observe(m, pb, beta, zeta) {
    zeta = zeta == null ? ZETA : zeta;
    var pi = computePrior(pb, beta);
    var z2 = Math.pow(zeta, -2), s2 = Math.pow(SIGMA, -2);
    var mu = z2 * m / (s2 + z2), sd = Math.sqrt(1 / (s2 + z2));
    var LR = Phi(mu / sd);
    var post = LR * pi / (LR * pi + (1 - LR) * (1 - pi));
    return { pi: pi, LR: LR, post: post };
  }
  /* after feedback, the block belief takes in the true stimulus */
  function updateBlock(stim, pb, beta) {
    beta = beta == null ? BETA : beta;
    var lb = stim === 1 ? [beta, 0.5, 1 - beta] : [1 - beta, 0.5, beta];
    var u = [lb[0] * pb[0], lb[1] * pb[1], lb[2] * pb[2]], Z = u[0] + u[1] + u[2];
    return [u[0] / Z, u[1] / Z, u[2] / Z];
  }
  function choose(post, r) { return post > 0.5 ? 1 : (post < 0.5 ? -1 : (r() < 0.5 ? 1 : -1)); }

  /* one run through a list of P(right) values, one per trial */
  function simulate(pRights, seed, opt) {
    opt = opt || {};
    var r = rng(seed), g = gaussFrom(r), pb = [1 / 3, 1 / 3, 1 / 3];
    var out = { trials: [], PB: [pb] };
    for (var t = 0; t < pRights.length; t++) {
      var w = generateTrial(r, g, pRights[t], opt.zeta);
      var o = observe(w.m, pb, opt.beta, opt.zeta);
      var ch = choose(o.post, r);
      out.trials.push({ stim: w.stim, c: w.c, m: w.m, pi: o.pi, post: o.post, choice: ch, correct: ch === w.stim, pbBefore: pb });
      pb = updateBlock(w.stim, pb, opt.beta);
      out.PB.push(pb);
    }
    return out;
  }
  /* trials (counted from `start`, 1-based) until belief in `block` first reaches 0.9; null if never */
  function trialsTo90(PB, block, start) {
    start = start || 1;
    for (var k = start; k < PB.length; k++) if (PB[k][block] >= 0.9) return k - start + 1;
    return null;
  }
  function seq(pre, p0, post, p1) {
    var a = [], i;
    for (i = 0; i < pre; i++) a.push(p0);
    for (i = 0; i < post; i++) a.push(p1);
    return a;
  }
  function median(xs) { var s = xs.slice().sort(function (a, b) { return a - b; }); return s.length ? s[Math.floor(s.length / 2)] : null; }

  /* the poster's three numbers: flat start into 80/20, flat start into 50/50, and an 80/20 -> 20/80 reversal
     after 19 trials. Same definitions as poster_figs.py. */
  var CONDITIONS = [
    { key: "biased", label: "to learn a biased block", seqs: function () { return seq(0, 0, 120, 0.8); }, block: 0, start: 1 },
    { key: "unbiased", label: "to learn an unbiased block", seqs: function () { return seq(0, 0, 120, 0.5); }, block: 1, start: 1 },
    { key: "reversal", label: "to relearn after a reversal", seqs: function () { return seq(19, 0.8, 100, 0.2); }, block: 2, start: 20 }
  ];
  function runCondition(cond, runs, seed0) {
    var vals = [], never = 0, s = cond.seqs();
    for (var i = 0; i < runs; i++) {
      var v = trialsTo90(simulate(s, (seed0 + i * 7919) >>> 0).PB, cond.block, cond.start);
      if (v === null) never++; else vals.push(v);
    }
    return { values: vals, never: never, median: median(vals), runs: runs };
  }
  /* analytic P(lick right) for a stimulus of signed contrast c, given prior pi */
  function pLickRight(cSigned, pi, zeta) {
    var z2 = Math.pow(zeta, -2), s2 = Math.pow(SIGMA, -2), k = z2 / (s2 + z2), sd = Math.sqrt(1 / (s2 + z2));
    var thr = sd * PhiInv(1 - pi) / k;               // licks right when m > thr
    return 1 - Phi((thr - cSigned) / zeta);
  }

  root.WLModel = {
    C_LEVELS: C_LEVELS, C_PROBS: C_PROBS, SIGMA: SIGMA, BETA: BETA, ZETA: ZETA,
    rng: rng, gaussFrom: gaussFrom, Phi: Phi, blockOf: blockOf, pickContrast: pickContrast,
    generateTrial: generateTrial, computePrior: computePrior, observe: observe, observeDirection: observe, updateBlock: updateBlock, choose: choose,
    simulate: simulate, trialsTo90: trialsTo90, seq: seq, median: median,
    CONDITIONS: CONDITIONS, runCondition: runCondition, pLickRight: pLickRight
  };
})(typeof window !== "undefined" ? window : globalThis);
