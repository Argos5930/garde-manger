/* Garde-manger : composition du menu de la semaine avec des produits prêts à manger.
   Pur calcul, sans interface : testable sous Node. */
(function (root) {
  "use strict";
  const M = {};
  let N = null, PROD = [], BYID = {};

  M.init = function (nutri, produits) { N = nutri; M.setProducts(produits); };
  M.setProducts = function (list) { PROD = list; BYID = {}; for (const p of list) BYID[p.id] = p; };
  M.products = () => PROD;
  M.product = id => BYID[id];

  const ROLE_LABEL = { plat: "Plats complets", proteine: "Viandes, poissons, œufs, végétal", accomp: "Accompagnements", legume: "Légumes", fruit: "Fruits", laitier: "Laitages et fromages", dessert: "Desserts" };
  M.ROLE_LABEL = ROLE_LABEL;
  M.MODE_LABEL = { airfryer: "Air fryer", micro: "Micro-ondes", casserole: "Casserole", poele: "Poêle", four: "Four", sans: "Sans cuisson" };

  /* ---------- Nutrition d'un repas ---------- */
  // item : {k:"p", id, q} produit ; {k:"r", id, q} recette ; {k:"x", nom, kcal} repas libre
  M.itemNut = function (it) {
    if (it.k === "p") { const p = BYID[it.id]; if (!p) return null; return { n: p.n, g: p.portion * (it.q || 1), fv: p.fv }; }
    return null;
  };
  M.mealNut = function (meal) {
    const parts = [];
    let extraKcal = 0, red = 0, fam = {};
    for (const it of (meal && meal.items) || []) {
      if (it.k === "p") {
        const p = BYID[it.id]; if (!p) continue;
        const g = p.portion * (it.q || 1);
        parts.push({ n: p.n, g, fv: p.fv || false });
        if (p.famille && p.famille !== "aucune") fam[p.famille] = (fam[p.famille] || 0) + g;
      } else if (it.k === "r") {
        const r = N.recipe(it.id); if (!r) continue;
        for (const [k, g] of r.ing) { const i = N.ing(k); parts.push({ n: i.n, g: g * (it.q || 1), fv: ["legume", "fruit", "legumineuse"].includes(i.cat) }); if (["viande_rouge", "volaille", "poisson", "poisson_gras", "charcuterie", "oeuf", "legumineuse"].includes(i.cat)) fam[i.cat] = (fam[i.cat] || 0) + g * (it.q || 1); }
      } else if (it.k === "x") extraKcal += +it.kcal || 0;
    }
    const t = N.dish(parts);
    t.kcal += extraKcal; t.libre = extraKcal > 0; t.fam = fam;
    t.veg = (meal && meal.items || []).some(it => (it.k === "p" && BYID[it.id] && (BYID[it.id].veg || BYID[it.id].role === "legume")) || (it.k === "r" && N.recipe(it.id) && N.recipe(it.id)._n.fvPct >= 25));
    return t;
  };
  M.mealLabel = function (meal) {
    return ((meal && meal.items) || []).map(it => {
      if (it.k === "p") { const p = BYID[it.id]; return p ? p.nom : "?"; }
      if (it.k === "r") { const r = N.recipe(it.id); return r ? r.nom : "?"; }
      return it.nom || "Repas libre";
    }).join(" + ");
  };

  /* ---------- Génération ---------- */
  // Hasard reproductible
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  function pick(arr, w, rand) {
    let tot = 0; for (const x of arr) tot += w(x);
    let r = rand() * tot; for (const x of arr) { r -= w(x); if (r <= 0) return x; } return arr[arr.length - 1];
  }
  const GRADE_PEN = { A: 0, B: 3, C: 8, D: 16, E: 26 };
  const QS = [0.5, 0.75, 1, 1.25, 1.5];

  // opts : {target, fav:Set, excl:Set, used:{id:count}, famCount:{}, recettes:bool, rand}
  function pools(opts) {
    const ok = p => !opts.excl.has(p.id);
    const by = r => PROD.filter(p => p.role === r && ok(p));
    return { plat: by("plat"), proteine: by("proteine"), accomp: by("accomp"), legume: by("legume"), fruit: by("fruit"), laitier: by("laitier"), dessert: by("dessert") };
  }
  function weight(opts) {
    return p => (opts.fav.has(p.id) ? 5 : 1) * (p.mine ? 2 : 1) / (1 + 2 * (opts.used[p.id] || 0));
  }
  function bestQ(items, mainIdx, target) {
    // ajuste la quantité de l'élément principal pour approcher la cible
    let best = null;
    for (const q of QS) {
      const test = items.map((it, i) => i === mainIdx ? Object.assign({}, it, { q }) : it);
      const k = M.mealNut({ items: test }).kcal;
      const d = Math.abs(k - target);
      if (!best || d < best.d) best = { d, items: test, k };
    }
    return best;
  }
  M.candidate = function (opts) {
    const P = pools(opts), w = weight(opts), rand = opts.rand;
    const tpl = rand();
    let items = [], main = 0;
    if (opts.recettes && tpl < 0.18) {
      const rs = N.recipes().filter(r => r.niv === 1 && r.t_prep <= 15 && (r.cat === "plat" || r.cat === "salade") && !opts.excl.has(r.id));
      if (rs.length) { const r = pick(rs, x => (opts.fav.has(x.id) ? 5 : 1) / (1 + 2 * (opts.used[x.id] || 0)), rand); items = [{ k: "r", id: r.id, q: 1 }]; }
    }
    if (!items.length) {
      if (tpl < 0.55 && P.plat.length) {
        const pl = pick(P.plat, w, rand); items = [{ k: "p", id: pl.id, q: 1 }];
        if (!pl.veg && P.legume.length) items.push({ k: "p", id: pick(P.legume, w, rand).id, q: 1 });
      } else {
        const pr = pick(P.proteine, w, rand); items = [{ k: "p", id: pr.id, q: 1 }];
        if (P.accomp.length && rand() < 0.85) items.push({ k: "p", id: pick(P.accomp, w, rand).id, q: 1 });
        if (P.legume.length) items.push({ k: "p", id: pick(P.legume, w, rand).id, q: 1 });
      }
    }
    let b = bestQ(items, main, opts.target);
    // compléter avec un fruit, un laitage ou un dessert si on reste loin en dessous
    if (opts.target - b.k > 90) {
      const side = [...P.fruit, ...P.laitier, ...P.dessert.map(d => Object.assign({ _dessert: true }, d))];
      let bestS = null;
      for (let i = 0; i < 6 && side.length; i++) {
        const s = pick(side, x => w(x) * (x._dessert ? 0.4 : 1), rand);
        const it2 = [...b.items, { k: "p", id: s.id, q: 1 }];
        const k = M.mealNut({ items: it2 }).kcal; const d = Math.abs(k - opts.target);
        if (!bestS || d < bestS.d) bestS = { d, items: it2, k };
      }
      if (bestS && bestS.d < b.d) b = bestS;
    }
    if (b.k - opts.target > 150 && b.items.length > 1) {
      // réduire l'accompagnement si besoin
      const b2 = bestQ(b.items, 1, opts.target - 0); if (b2.d < b.d) b = b2;
    }
    const nut = M.mealNut({ items: b.items });
    return { items: b.items, nut };
  };
  M.score = function (c, opts) {
    const n = c.nut;
    let s = Math.abs(n.kcal - opts.target) / opts.target * 100;
    s += GRADE_PEN[n.ns.grade] ?? 10;
    for (const it of c.items) s += 25 * (opts.used[it.id] || 0) * (it === c.items[0] ? 1 : 0.4);
    if (!n.veg) s += 12;
    const f = n.fam || {};
    if (f.viande_rouge && (opts.famCount.viande_rouge || 0) >= 3) s += 20;
    if (f.charcuterie && (opts.famCount.charcuterie || 0) >= 2) s += 20;
    if ((f.poisson || f.poisson_gras) && (opts.famCount.poisson || 0) < 2) s -= 8;
    if (f.legumineuse && (opts.famCount.legumineuse || 0) < 2) s -= 5;
    for (const it of c.items) if (opts.fav.has(it.id)) s -= 6;
    return s;
  };
  M.propose = function (opts) {
    let cands = [];
    for (let i = 0; i < 70; i++) { const c = M.candidate(opts); c.score = M.score(c, opts); cands.push(c); }
    cands.sort((a, b) => a.score - b.score);
    // un peu de variété : on tire parmi les trois meilleurs
    return cands[Math.floor(opts.rand() * Math.min(3, cands.length))];
  };

  /* ---------- Semaine ---------- */
  M.SLOTS = []; for (let d = 0; d < 7; d++) for (const m of ["dej", "din"]) M.SLOTS.push(d + "-" + m);
  M.weekTarget = (dayKcal, pct) => dayKcal * 7 * (pct || 70) / 100;
  M.stats = function (slots) {
    let kcal = 0, fixed = 0, nFixed = 0, veg = 0, filled = 0; const fam = {}; const grades = [];
    for (const k of M.SLOTS) {
      const m = slots[k]; if (!m || !m.items || !m.items.length) continue;
      const n = M.mealNut(m); filled++; kcal += n.kcal;
      if (m.fixe) { fixed += n.kcal; nFixed++; }
      if (n.veg) veg++;
      for (const f in n.fam) if (n.fam[f] > 30) fam[f] = (fam[f] || 0) + 1;
      if (n.ns.grade && !n.libre) grades.push(n.ns.grade);
    }
    return { kcal, fixed, nFixed, veg, filled, fam, grades };
  };
  M.fill = function (slots, cfg) {
    // cfg : {dayKcal, pct, fav, excl, recettes, seed, only (clé d'un seul créneau à refaire)}
    const out = Object.assign({}, slots);
    const W = M.weekTarget(cfg.dayKcal, cfg.pct);
    const todo = cfg.only ? [cfg.only] : M.SLOTS.filter(k => !(out[k] && out[k].fixe));
    const keep = M.SLOTS.filter(k => !todo.includes(k) && out[k] && out[k].items && out[k].items.length);
    let used = {}, famCount = {}, budget = W;
    for (const k of keep) {
      const n = M.mealNut(out[k]); budget -= n.kcal;
      for (const it of out[k].items) used[it.id] = (used[it.id] || 0) + 1;
      for (const f in n.fam) if (n.fam[f] > 30) famCount[f] = (famCount[f] || 0) + 1;
    }
    for (const k of todo) delete out[k];
    const rand = rng(cfg.seed || Date.now());
    let left = todo.length;
    for (const k of todo) {
      const target = Math.max(350, Math.min(1300, budget / left));
      const c = M.propose({ target, fav: cfg.fav, excl: cfg.excl, used, famCount, recettes: cfg.recettes, rand });
      out[k] = { items: c.items, fixe: false };
      budget -= c.nut.kcal; left--;
      for (const it of c.items) used[it.id] = (used[it.id] || 0) + 1;
      for (const f in c.nut.fam) if (c.nut.fam[f] > 30) famCount[f] = (famCount[f] || 0) + 1;
    }
    return out;
  };

  /* ---------- Courses ---------- */
  // Renvoie [{id, nom, r, g, packs, packLabel, cost, ean}]
  M.shopping = function (slots, persFactor) {
    const m = new Map();
    for (const k of M.SLOTS) {
      const meal = slots[k]; if (!meal) continue;
      for (const it of meal.items || []) {
        if (it.k !== "p") continue;
        const p = BYID[it.id]; if (!p) continue;
        const g = p.portion * ((it.q || 1) + persFactor);
        const e = m.get(p.id) || { id: p.id, nom: p.nom, r: p.r, g: 0, pack: p.pack, packLabel: p.packLabel, px: p.px, ean: p.ean || null };
        e.g += g; m.set(p.id, e);
      }
    }
    return [...m.values()].map(e => {
      const packs = e.pack ? Math.max(1, Math.ceil(e.g / e.pack - 0.15)) : null;
      return Object.assign(e, { packs, cost: (packs && e.pack ? packs * e.pack : e.g) / 1000 * (e.px || 0) });
    });
  };
  M.recipeUses = function (slots, persFactor) {
    const out = [];
    for (const k of M.SLOTS) { const meal = slots[k]; if (!meal) continue; for (const it of meal.items || []) if (it.k === "r") out.push({ id: it.id, factor: (it.q || 1) + persFactor }); }
    return out;
  };

  if (typeof module !== "undefined" && module.exports) module.exports = M; else root.Menu = M;
})(typeof self !== "undefined" ? self : this);
