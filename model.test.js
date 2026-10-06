// node model.test.js : the phone app's model must agree with the poster's Python numbers
require('./model.js'); const M = globalThis.WLModel; let fail = 0;
function check(name, ok, got) { console.log((ok ? 'PASS ' : 'FAIL ') + name + '  ' + got); if (!ok) fail++; }
const expect = { biased: [8, 0], unbiased: [18, 2], reversal: [66, 5] };   // poster medians; 2,000 runs keeps biased at exactly 8
for (const seed of [20261006, 12345, 777]) {
  for (const c of M.CONDITIONS) {
    const r = M.runCondition(c, 2000, seed), [m, tol] = expect[c.key];
    check(`${c.key} median seed ${seed}`, Math.abs(r.median - m) <= tol, `median ${r.median}, never ${r.never}/2000`);
  }
}
// posterior sanity: flat prior, m = 0 -> 0.5; strong right evidence -> > 0.9
check('flat prior, m=0', Math.abs(M.observe(0, [1/3,1/3,1/3]).post - 0.5) < 1e-9, M.observe(0, [1/3,1/3,1/3]).post);
check('strong right', M.observe(3, [1/3,1/3,1/3]).post > 0.9, M.observe(3, [1/3,1/3,1/3]).post.toFixed(3));
// block update: a right stimulus raises R-biased belief, stays normalized
const u = M.updateBlock(1, [1/3,1/3,1/3]); check('update normalized', Math.abs(u[0]+u[1]+u[2]-1) < 1e-12 && u[0] > u[1], u.map(x=>x.toFixed(3)).join(' '));
// station 01 curve (zeta .25, pi .8): strong left -> almost never right, zero contrast -> mostly right
const a = M.pLickRight(-1, 0.8, 0.25), b = M.pLickRight(0, 0.8, 0.25), c0 = M.pLickRight(0, 0.5, 0.25);
check('01 strong left', a < 0.01, a.toFixed(4)); check('01 faint goes with prior', b > 0.8, b.toFixed(3)); check('01 no prior is 50/50', Math.abs(c0 - 0.5) < 1e-6, c0.toFixed(3));
// timing for the 05 lever
let t = Date.now(); M.CONDITIONS.forEach(c => M.runCondition(c, 500, 1)); console.log('1500 runs in', Date.now() - t, 'ms');
process.exit(fail ? 1 : 0);
