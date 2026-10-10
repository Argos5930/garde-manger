/* Garde-manger : moteur nutritionnel (sans IA).
   Données : table Ciqual 2025 (ANSES, Licence Ouverte), base de recettes de l'application.
   Fonctionne dans le navigateur et sous Node (pour les tests). */
(function (root) {
  "use strict";

  const N = {}; // espace public
  let ING = [], BYKEY = {}, PHRASES = [], RECIPES = [], CIQUAL = null;

  /* ---------- Texte ---------- */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/œ/g, "oe").replace(/æ/g, "ae")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9%]+/g, " ")
      .split(" ").filter(Boolean)
      .map(w => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w))
      .join(" ");
  }
  N.norm = norm;

  /* ---------- Initialisation ---------- */
  N.init = function (ingredients, recettes) {
    ING = ingredients;
    BYKEY = {};
    PHRASES = [];
    for (const i of ING) {
      BYKEY[i.k] = i;
      const set = new Set([norm(i.l), norm(i.k.replace(/_/g, " ")), ...i.s.map(norm)]);
      // libellé sans parenthèse
      set.add(norm(i.l.replace(/\(.*?\)/g, "")));
      for (const p of set) if (p && p.length > 1) PHRASES.push([p, i.k]);
    }
    PHRASES.sort((a, b) => b[0].length - a[0].length);
    RECIPES = recettes || [];
    for (const r of RECIPES) r._n = N.dish(r.ing);
  };
  N.setCiqual = function (c) { CIQUAL = c; for (const a of c.aliments) a._n = norm(a[1]); };
  N.hasCiqual = () => !!CIQUAL;
  N.ing = k => BYKEY[k];
  N.ingredients = () => ING;
  N.recipes = () => RECIPES;
  N.recipe = id => RECIPES.find(r => r.id === id);

  /* ---------- Reconnaissance d'ingrédients ---------- */
  // Renvoie toutes les clés trouvées dans un texte, sans chevauchement (plus longue d'abord).
  N.findIngredients = function (text) {
    let t = " " + norm(text) + " ";
    const found = [];
    for (const [p, k] of PHRASES) {
      const needle = " " + p + " ";
      let idx = t.indexOf(needle);
      while (idx >= 0) {
        if (!found.some(f => f.k === k)) found.push({ k, pos: idx });
        t = t.slice(0, idx) + " " + "#".repeat(p.length) + " " + t.slice(idx + needle.length);
        idx = t.indexOf(needle);
      }
    }
    return found.sort((a, b) => a.pos - b.pos).map(f => f.k);
  };
  N.matchIngredient = function (text) {
    const f = N.findIngredients(text);
    return f.length ? f[0] : null;
  };

  // Recherche plein texte dans Ciqual (repli quand le dictionnaire ne connaît pas l'aliment)
  N.ciqualSearch = function (text, n) {
    if (!CIQUAL) return [];
    const words = norm(text).split(" ").filter(w => w.length > 2 && !STOP.has(w));
    if (!words.length) return [];
    const res = [];
    for (const a of CIQUAL.aliments) {
      const name = a._n;
      let s = 0;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if ((" " + name + " ").includes(" " + w + " ")) s += 3;
        else if (name.includes(w)) s += 1;
      }
      if (!s) continue;
      if (name.startsWith(words[0])) s += 2;
      if (/\bcru\b|\bcrue\b/.test(name)) s += 0.5;
      if (/prepare|preemballe|restauration/.test(name)) s -= 0.5;
      s -= name.split(" ").length * 0.05;
      res.push([s, a]);
    }
    res.sort((x, y) => y[0] - x[0]);
    return res.slice(0, n || 5).map(([s, a]) => ({ code: a[0], nom: a[1], n: a.slice(4, 12).map(v => v ?? 0), score: s, groupe: CIQUAL.groupes[a[2]] }));
  };
  const STOP = new Set(["de", "du", "des", "la", "le", "les", "un", "une", "au", "aux", "et", "en", "pour", "avec", "sans", "ou", "frai", "fraiche", "frais", "bien", "petit", "petite", "gros", "grosse", "environ", "bon", "bonne"]);

  /* ---------- Calcul nutritionnel ---------- */
  // item : [clé, grammes] ou {n:[...8 valeurs], g, fv}
  const FV = new Set(["legume", "fruit", "legumineuse"]);
  N.dish = function (items) {
    const t = { g: 0, kcal: 0, prot: 0, gluc: 0, lip: 0, suc: 0, fib: 0, ags: 0, sel: 0, fv: 0, red: 0 };
    for (const it of items || []) {
      let n, g, fv, red = false;
      if (Array.isArray(it)) { const i = BYKEY[it[0]]; if (!i) continue; n = i.n; g = +it[1] || 0; fv = FV.has(i.cat); red = i.cat === "viande_rouge" || i.cat === "charcuterie"; }
      else { n = it.n; g = +it.g || 0; fv = !!it.fv; }
      if (!n || !g) continue;
      const f = g / 100;
      t.g += g; t.kcal += n[0] * f; t.prot += n[1] * f; t.gluc += n[2] * f; t.lip += n[3] * f;
      t.suc += n[4] * f; t.fib += n[5] * f; t.ags += n[6] * f; t.sel += n[7] * f;
      if (fv) t.fv += g;
      if (red) t.red += g;
    }
    t.fvPct = t.g ? (t.fv / t.g) * 100 : 0;
    t.ns = N.nutriScore(t);
    return t;
  };

  // Méthode de calcul du Nutri-Score (version 2023, aliments généraux), appliquée à 100 g du plat.
  const pts = (v, th) => th.reduce((p, x) => (v > x ? p + 1 : p), 0);
  const TH = {
    kj: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
    suc: [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51],
    ags: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    sel: Array.from({ length: 20 }, (_, i) => +(0.2 * (i + 1)).toFixed(1)),
    prot: [2.4, 4.8, 7.2, 9.6, 12, 14, 17],
    fib: [3.0, 4.1, 5.2, 6.3, 7.4]
  };
  N.nutriScore = function (t) {
    if (!t.g) return { score: null, grade: null };
    const k = 100 / t.g;
    const kj = t.kcal * k * 4.184;
    const neg = pts(kj, TH.kj) + pts(t.suc * k, TH.suc) + pts(t.ags * k, TH.ags) + pts(t.sel * k, TH.sel);
    const fvp = t.fvPct > 80 ? 5 : t.fvPct > 60 ? 2 : t.fvPct > 40 ? 1 : 0;
    const prot = pts(t.prot * k, TH.prot), fib = pts(t.fib * k, TH.fib);
    let protPts = neg >= 11 && fvp < 5 ? 0 : prot;
    if (t.red && t.red / t.g > 0.2) protPts = Math.min(protPts, 2); // viande rouge : protéines plafonnées (règle 2023)
    const pos = fib + fvp + protPts;
    const score = neg - pos;
    const grade = score <= 0 ? "A" : score <= 2 ? "B" : score <= 10 ? "C" : score <= 18 ? "D" : "E";
    return { score, grade };
  };

  /* ---------- Quantités ---------- */
  N.gramsFor = function (key, qty, unit) {
    const i = BYKEY[key];
    const u = (unit || "").toLowerCase();
    if (!i) return null;
    if (qty == null) qty = 1;
    if (u === "g") return qty;
    if (u === "kg") return qty * 1000;
    if (u === "ml") return qty;
    if (u === "cl") return qty * 10;
    if (u === "dl") return qty * 100;
    if (u === "l") return qty * 1000;
    if (u === "cas") return qty * (i.u.cas || 15);
    if (u === "cac") return qty * (i.u.cac || 5);
    if (u === "pincee") return qty * (i.u.pincee || 0.5);
    if (u && i.u[u]) return qty * i.u[u];
    if (u === "verre") return qty * 200;
    if (u === "pot") return qty * 125;
    if (u === "boite") return qty * (i.u.boite || 400);
    if (u === "sachet") return qty * (i.u.sachet || 10);
    if (u === "noix") return qty * 10;
    if (u === "botte") return qty * (i.u.botte || 250);
    // nombre sans unité : on prend le poids d'une pièce, sinon la portion type
    return qty * (i.u.pc || i.u.tranche || i.u.gousse || i.pt || 50);
  };

  // Affichage d'une quantité de courses lisible
  N.shopQty = function (key, grams) {
    const i = BYKEY[key];
    if (!i || i.r === "P" || !grams) return "";
    const pc = i.u.pc || i.u.boite || i.u.tranche;
    if (i.u.boite && grams >= i.u.boite * 0.4) { const n = Math.ceil(grams / i.u.boite - 0.15); return `${Math.max(1, n)} boîte${n > 1 ? "s" : ""} (${roundG(grams)})`; }
    if (i.u.pc && ["oeuf", "citron", "avocat", "pomme", "poire", "banane", "orange", "kiwi", "poivron", "courgette", "aubergine", "concombre", "oignon", "oignon_rouge", "echalote", "tortilla", "galette_sarrasin", "pain_burger", "pate_brisee", "pate_feuilletee", "pate_pizza", "mozzarella", "cuisse_poulet", "saumon", "potiron", "chou_fleur", "brocoli", "chou", "salade", "tomate", "carotte", "clementine", "mangue", "pomme_de_terre", "yaourt", "tofu"].includes(key)) {
      const n = Math.max(1, Math.round(grams / i.u.pc + 0.2));
      return `${n} (≈ ${roundG(grams)})`;
    }
    if (i.u.tranche && ["jambon", "jambon_cru", "saumon_fume", "cheddar"].includes(key)) {
      const n = Math.ceil(grams / i.u.tranche - 0.1); return `${n} tranche${n > 1 ? "s" : ""}`;
    }
    if (i.u.gousse) { const n = Math.ceil(grams / i.u.gousse - 0.1); return `${n} gousse${n > 1 ? "s" : ""}`; }
    return roundG(grams, ["lait", "creme_liquide", "lait_coco", "vin_blanc", "vin_rouge", "jus_fruit", "soda", "biere"].includes(key));
  };
  function roundG(g, liquid) {
    const u = liquid ? ["ml", "L"] : ["g", "kg"];
    if (g >= 1000) return (Math.round(g / 100) / 10).toString().replace(".", ",") + " " + u[1];
    if (g >= 100) return Math.round(g / 10) * 10 + " " + u[0];
    return Math.max(5, Math.round(g / 5) * 5) + " " + u[0];
  }
  N.roundG = roundG;

  /* ---------- Lecture d'une recette collée ---------- */
  const FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
  const UNIT_RX = [
    [/^(kg|kilos?|kilogrammes?)\b/, "kg"], [/^(g|gr|grs|grammes?)\b/, "g"],
    [/^(cl|centilitres?)\b/, "cl"], [/^(ml|millilitres?)\b/, "ml"], [/^(dl|decilitres?)\b/, "dl"], [/^(l|litres?)\b/, "l"],
    [/^(c\.? ?a\.? ?s\.?|cas|cs|c\.s\.?|cuil+[eè]res? a soupe|cuil+eres? a soupe|c a soupe|c\. a soupe|cuil\.? a soupe|tbsp)\b/, "cas"],
    [/^(c\.? ?a\.? ?c\.?|cac|cc|c\.c\.?|cuil+eres? a cafe|c a cafe|c\. a cafe|cuil\.? a cafe|tsp)\b/, "cac"],
    [/^(pincees?)\b/, "pincee"], [/^(sachets?)\b/, "sachet"], [/^(boites?|conserves?)\b/, "boite"],
    [/^(tranches?)\b/, "tranche"], [/^(gousses?)\b/, "gousse"], [/^(bottes?|bouquets?)\b/, "botte"],
    [/^(verres?|tasses?|bols?)\b/, "verre"], [/^(pots?)\b/, "pot"], [/^(noix|noisette)\b(?= de beurre)/, "noix"],
    [/^(poignees?)\b/, "poignee"], [/^(carres?)\b/, "carre"], [/^(boules?)\b/, "boule"], [/^(brins?|branches?)\b/, "branche"]
  ];
  function parseQty(s) {
    s = s.replace(/[½¼¾⅓⅔]/g, m => " " + FRAC[m]);
    let m = s.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:a|à|-|–)\s*(\d+(?:[.,]\d+)?)/);
    if (m) return [(parseFloat(m[1].replace(",", ".")) + parseFloat(m[2].replace(",", "."))) / 2, s.slice(m[0].length)];
    m = s.match(/^\s*(\d+)\s*\/\s*(\d+)/);
    if (m) return [+m[1] / +m[2], s.slice(m[0].length)];
    m = s.match(/^\s*(\d+(?:[.,]\d+)?)(?:\s+(0?\.\d+))?/);
    if (m) return [parseFloat(m[1].replace(",", ".")) + (m[2] ? parseFloat(m[2]) : 0), s.slice(m[0].length)];
    m = s.match(/^\s*(un|une|deux|trois|quatre|cinq|six|demi|1\/2)\b/i);
    if (m) { const map = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, demi: 0.5 }; return [map[m[1].toLowerCase()] || 1, s.slice(m[0].length)]; }
    return [null, s];
  }
  N.parseLine = function (raw) {
    let s = raw.replace(/^[\s\-•*·▪◦–—]+/, "").trim();
    let [qty, rest] = parseQty(s);
    let r = rest.trim();
    const rn = r.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    let unit = "";
    for (const [rx, u] of UNIT_RX) { const m = rn.match(rx); if (m) { unit = u; r = r.slice(m[0].length); break; } }
    r = r.replace(/^\s*(d'|de |des |du |d’)/i, "").trim();
    const name = r.replace(/\(.*?\)/g, " ").trim();
    const key = N.matchIngredient(name) || N.matchIngredient(raw);
    let grams = null, source = null, n = null, fv = false;
    if (key) {
      grams = N.gramsFor(key, qty, unit);
      const ci = BYKEY[key];
      if (ci.cat === "condiment" && !["g", "kg", "ml", "cl", "dl", "l"].includes(unit)) grams = Math.min(grams, unit === "cas" ? 15 : 6);
      if (key === "oeuf" && /jaune/i.test(raw)) grams = (qty || 1) * 18;
      if (key === "oeuf" && /blanc/i.test(raw)) grams = (qty || 1) * 35;
      if (qty == null && !unit) grams = BYKEY[key].cat === "condiment" ? 1 : grams;
      source = { type: "dict", key, label: BYKEY[key].l };
      n = BYKEY[key].n; fv = FV.has(BYKEY[key].cat);
    } else if (CIQUAL) {
      const c = N.ciqualSearch(name, 1)[0];
      if (c && c.score >= 3) {
        const base = { g: 1, kg: 1000, ml: 1, cl: 10, dl: 100, l: 1000, cas: 15, cac: 5, pincee: 0.5, verre: 200, pot: 125, boite: 400, sachet: 10, tranche: 30, gousse: 5 }[unit];
        grams = (qty == null ? 1 : qty) * (base || 50);
        source = { type: "ciqual", code: c.code, label: c.nom };
        n = c.n; fv = /fruits, legumes/.test(norm(c.groupe));
      }
    }
    return { raw: raw.trim(), qty, unit, name, key, grams, source, n, fv };
  };
  N.parseRecipe = function (text) {
    const lines = String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let titre = "", portions = null, ings = [], etapes = [];
    let mode = "head";
    const rxPort = /(?:pour|portions?|personnes?|parts?|couverts?)\D{0,20}?(\d{1,2})|(\d{1,2})\s*(?:personnes?|portions?|parts?|pers\b)/i;
    for (const l of lines) {
      const ln = norm(l);
      if (!portions) { const m = l.match(rxPort); if (m) portions = +(m[1] || m[2]); }
      if (/^(ingredient|liste de|ce qu il (te|vous) faut)/.test(ln)) { mode = "ing"; continue; }
      if (/^(preparation|etape|instruction|recette|realisation|deroule|methode)\b/.test(ln) && ln.split(" ").length < 5) { mode = "steps"; continue; }
      const looksIng = /^[\s\-•*·]*([\d½¼¾⅓⅔]|un |une |quelques )/i.test(l) && l.length < 90;
      if (mode === "steps") { etapes.push(l.replace(/^(\d+[.)-]|etape \d+[:.]?|[-•*])\s*/i, "")); continue; }
      if (mode === "head" && !titre && !looksIng && l.length < 80 && !rxPort.test(l)) { titre = l; continue; }
      if (looksIng || mode === "ing") {
        const p = N.parseLine(l);
        if (p.key || p.source || looksIng) { ings.push(p); mode = mode === "head" ? "ing" : mode; continue; }
      }
      if (mode === "ing" && l.length > 90) { mode = "steps"; etapes.push(l); }
    }
    return { titre: titre || "Recette importée", portions: portions || null, ings, etapes };
  };
  N.recipeFromParsed = function (p, portions) {
    const per = Math.max(1, portions || p.portions || 2);
    const items = p.ings.filter(i => i.grams && i.n).map(i => ({ n: i.n, g: i.grams / per, fv: i.fv, key: i.key }));
    return { per, items, nut: N.dish(items) };
  };

  /* ---------- Version plus légère ---------- */
  const LIGHT = {
    creme: "Remplace la crème fraîche épaisse par de la crème légère à 15 %, ou par moitié yaourt à la grecque : même onctuosité, deux fois moins de gras.",
    creme_liquide: "Prends de la crème liquide légère, ou allonge la sauce avec un peu de lait.",
    lardons: "Remplace les lardons par des dés de jambon, ou réduis-les de moitié : ils apportent beaucoup de sel et de gras.",
    saucisse: "Prends des saucisses de volaille, ou garde la recette pour une fois par semaine maximum.",
    boeuf_hache15: "Choisis un steak haché à 5 % de matières grasses.",
    mayonnaise: "Mélange moitié mayonnaise, moitié yaourt grec avec une pointe de moutarde.",
    pates: "Passe aux pâtes complètes, ou moitié-moitié : plus de fibres, tu tiens plus longtemps.",
    riz: "Essaie le riz complet ou semi-complet, plus riche en fibres.",
    riz_basmati: "Essaie le riz complet ou semi-complet, plus riche en fibres.",
    pain: "Prends du pain complet ou aux céréales.",
    pain_mie: "Prends du pain de mie complet.",
    semoule: "La semoule complète a le même goût et trois fois plus de fibres.",
    sucre: "Retire un tiers du sucre : on ne voit presque pas la différence, surtout avec de la vanille ou de la cannelle.",
    pate_feuilletee: "La pâte brisée est un peu moins grasse que la feuilletée ; une pâte maison à l'huile d'olive encore moins.",
    chorizo: "Réduis le chorizo de moitié et ajoute du paprika fumé pour garder le goût.",
    frites: "Fais des frites au four avec une cuillère d'huile : trois fois moins de gras.",
    chips: "Remplace les chips par des pois chiches grillés au four ou des bâtonnets de légumes."
  };
  N.lighter = function (items, nut) {
    // items : [{key, g}] par portion
    const out = [];
    const byKey = {};
    for (const it of items) if (it.key) byKey[it.key] = (byKey[it.key] || 0) + it.g;
    for (const k in byKey) if (LIGHT[k]) out.push(LIGHT[k]);
    const fat = (byKey.beurre || 0) + (byKey.huile_olive || 0) + (byKey.huile_colza || 0);
    if (fat > 15) out.push("Il y a beaucoup de matière grasse : divise le beurre ou l'huile par deux, une poêle antiadhésive suffit.");
    const cheese = ["emmental", "comte", "parmesan", "cheddar", "raclette", "mozzarella", "chevre", "feta", "camembert"].reduce((s, k) => s + (byKey[k] || 0), 0);
    if (cheese > 40) out.push("Réduis le fromage d'un tiers et choisis-en un plus goûteux (comté affiné, parmesan) : on en met moins pour autant de saveur.");
    if (nut && nut.fvPct < 30) out.push("Ajoute une bonne poignée de légumes (épinards, courgette, poivron) ou sers avec une salade : le plat devient plus rassasiant et mieux noté.");
    if (nut && nut.g && (nut.sel / nut.g) * 100 > 1.2) out.push("Le plat est salé : ne sale pas l'eau de cuisson et remplace une partie du sel par des herbes ou du citron.");
    return out.slice(0, 5);
  };

  /* ---------- Analyse d'une habitude ---------- */
  // Compositions types de plats courants (portion habituelle), pour les habitudes
  const COMMON = [
    [/carbonara/, "Pâtes carbonara", [["pates", 110], ["lardons", 60], ["creme", 40], ["oeuf", 30], ["parmesan", 20]]],
    [/bolognaise|bolo\b/, "Pâtes bolognaise", [["pates", 110], ["boeuf_hache15", 100], ["tomate_concassee", 120], ["oignon", 30], ["huile_olive", 5], ["emmental", 15]]],
    [/tartiflette/, "Tartiflette", [["pomme_de_terre", 300], ["lardons", 70], ["raclette", 110], ["oignon", 40], ["creme", 40]]],
    [/raclette/, "Raclette", [["pomme_de_terre", 250], ["raclette", 180], ["jambon_cru", 40], ["jambon", 45], ["cornichon", 20]]],
    [/jambon beurre/, "Sandwich jambon-beurre", [["pain", 125], ["jambon", 50], ["beurre", 15]]],
    [/steak frite|steak hache frite/, "Steak haché frites", [["boeuf_hache15", 125], ["frites", 200], ["ketchup", 15]]],
    [/pate au beurre|pates au beurre/, "Pâtes au beurre", [["pates", 110], ["beurre", 15], ["emmental", 20]]],
    [/quiche/, "Quiche lorraine", [["quiche_ind", 200], ["salade", 30]]],
    [/croque/, "Croque-monsieur", [["pain_mie", 80], ["jambon", 45], ["emmental", 30], ["beurre", 10]]],
    [/hamburger|burger/, "Burger frites", [["burger", 220], ["frites", 150]]],
    [/mcdo|fast food|fastfood/, "Menu fast-food", [["burger", 220], ["frites", 115], ["soda", 400]]],
    [/sushi|maki/, "Sushis", [["riz", 90], ["saumon", 60], ["sauce_soja", 15], ["avocat", 20]]],
    [/tacos/, "Tacos (fast-food)", [["tortilla", 120], ["poulet", 120], ["frites", 100], ["cheddar", 40], ["mayonnaise", 30]]],
    [/couscous/, "Couscous", [["semoule", 90], ["pois_chiches", 60], ["carotte", 80], ["courgette", 80], ["navet", 50], ["saucisse", 80], ["cuisse_poulet", 100]]],
    [/lasagne/, "Lasagnes", [["lasagne", 80], ["boeuf_hache15", 100], ["tomate_concassee", 120], ["lait", 120], ["emmental", 30], ["beurre", 10]]],
    [/nouilles instantan|ramen instant|yum yum/, "Nouilles instantanées", [["nouilles", 85], ["huile_colza", 15], ["bouillon", 6]]]
  ];
  const MEAT_RED = new Set(["viande_rouge"]);
  N.analyzeHabit = function (text, freq, moment, mealTarget) {
    freq = +freq || 1;
    // 1. une recette de la base ?
    const tn = norm(text), tw = new Set(tn.split(" ").filter(w => w.length > 2 && !STOP.has(w)));
    let best = null, bestS = 0;
    for (const r of RECIPES) {
      const rw = new Set(norm(r.nom).split(" ").filter(w => w.length > 2 && !STOP.has(w)));
      let inter = 0; for (const w of tw) if (rw.has(w)) inter++;
      const s = inter / Math.max(tw.size, 1);
      if (s > bestS) { bestS = s; best = r; }
    }
    let items, source;
    const keys = N.findIngredients(text);
    const common = COMMON.find(([rx]) => rx.test(tn));
    if (common) { items = common[2].map(([k, g]) => ({ key: k, g })); source = { type: "recette", nom: common[1] + " (composition habituelle)" }; }
    else if (best && bestS >= 0.75 && !/allege|legere|maison/.test(norm(best.nom))) { items = best.ing.map(([k, g]) => ({ key: k, g })); source = { type: "recette", nom: best.nom }; }
    else if (keys.length) {
      items = keys.map(k => ({ key: k, g: BYKEY[k].pt }));
      source = { type: "ingredients", noms: keys.map(k => BYKEY[k].l) };
    } else if (CIQUAL) {
      const c = N.ciqualSearch(text, 1)[0];
      if (c && c.score >= 3) {
        const g = /snack|biscuit|confiserie|chocolat|chips|viennoiserie/.test(norm(c.nom + " " + c.groupe)) ? 50 : 250;
        items = [{ n: c.n, g, fv: /fruits, legumes/.test(norm(c.groupe)) }]; source = { type: "ciqual", nom: c.nom };
      }
    }
    if (!items || !items.length) return null;
    const nut = N.dish(items.map(it => it.key ? [it.key, it.g] : it));
    const cats = {}; for (const it of items) if (it.key) { const c = BYKEY[it.key].cat; cats[c] = (cats[c] || 0) + it.g; }
    const pos = [], warn = [], steps = [];
    const isMeal = moment === "déjeuner" || moment === "dîner";
    // repères du PNNS
    const red = (cats.viande_rouge || 0) * freq, charc = (cats.charcuterie || 0) * freq;
    if (red > 500) { warn.push(`Environ ${Math.round(red)} g de viande rouge par semaine avec cette seule habitude : le repère est de 500 g maximum.`); steps.push("Remplace une fois sur deux la viande rouge par de la volaille, du poisson ou des lentilles."); }
    else if (red > 0) pos.push("La quantité de viande rouge reste sous le repère de 500 g par semaine.");
    if (charc > 150) { warn.push(`Environ ${Math.round(charc)} g de charcuterie par semaine : le repère est de 150 g maximum, à cause du sel et des nitrites.`); steps.push("Remplace la charcuterie par du poulet, des œufs ou du thon deux fois sur trois."); }
    if (isMeal && !(cats.legume || cats.fruit || cats.legumineuse) && nut.fvPct < 15) { warn.push("Il n'y a quasiment pas de légumes dans ce repas."); steps.push("Ajoute une portion de légumes : une poignée d'épinards, une poêlée surgelée, une salade ou des crudités en entrée."); }
    if (cats.legume || cats.fruit) pos.push("Il y a des légumes ou des fruits.");
    if (cats.legumineuse) pos.push("Les légumineuses apportent fibres et protéines végétales : le repère est d'en manger au moins deux fois par semaine.");
    if (cats.poisson_gras) pos.push("Le poisson gras apporte des oméga-3 : une fois par semaine, c'est le repère.");
    if (cats.feculent_complet) pos.push("Les céréales complètes rassasient plus longtemps.");
    if (cats.feculent_raffine && !cats.feculent_complet && freq >= 3) { warn.push("Les féculents sont raffinés (pâtes, riz ou pain blancs)."); steps.push("Passe aux pâtes, au riz ou au pain complets au moins une fois sur deux."); }
    if (cats.plat_prepare && freq >= 2) { warn.push("C'est un produit ultra-transformé ou de restauration rapide, souvent riche en gras, sel et additifs."); steps.push("Garde-le pour une fois par semaine et teste sa version maison (voir les alternatives)."); }
    if ((cats.sucre || 0) > 0 && freq >= 4) { warn.push("Les produits sucrés reviennent souvent."); steps.push("Remplace ce produit sucré un jour sur deux par un fruit, un yaourt nature ou une poignée de noix."); }
    const sucS = items.reduce((s, it) => it.key && BYKEY[it.key].cat === "sucre" ? s + BYKEY[it.key].n[4] * it.g / 100 : s, 0);
    if (sucS > 6) { warn.push(`Environ ${Math.round(sucS)} g de sucres par portion, l'équivalent de ${Math.max(1, Math.round(sucS / 5))} morceau${sucS >= 7.5 ? "x" : ""} de sucre.`); steps.push(moment === "petit-déjeuner" ? "Mélange moitié céréales sucrées, moitié flocons d'avoine ou muesli sans sucre ajouté, puis passe progressivement à plus de flocons." : "Garde ce produit sucré pour une fois sur deux et remplace-le par un fruit ou un yaourt nature."); }
    if (moment === "petit-déjeuner" && !(cats.fruit) && !(cats.oeuf || cats.laitier || cats.oleagineux || cats.fromage)) steps.push("Ajoute un fruit et un laitage ou une poignée d'oléagineux : tu tiendras mieux jusqu'au déjeuner.");
    else if (moment === "petit-déjeuner" && !cats.fruit) steps.push("Ajoute un fruit frais : c'est le moment le plus simple pour en caser un.");
    const cheese = cats.fromage || 0;
    if (cheese > 60) warn.push("Beaucoup de fromage : riche en graisses saturées et en sel.");
    if (nut.sel > 2.5) warn.push(`Environ ${nut.sel.toFixed(1).replace(".", ",")} g de sel par portion, soit la moitié du repère de 5 g par jour.`);
    if (cats.proteine || cats.volaille || cats.oeuf || cats.poisson) pos.push("Bonne source de protéines.");
    if (isMeal && mealTarget) {
      if (nut.kcal > mealTarget * 1.35) warn.push(`Environ ${Math.round(nut.kcal)} kcal par portion, nettement plus que ton repère de ${Math.round(mealTarget)} kcal pour un repas.`);
      else if (nut.kcal < mealTarget * 0.55) warn.push(`Seulement ${Math.round(nut.kcal)} kcal environ : risque d'avoir faim avant le repas suivant.`);
    }
    const g = nut.ns.grade;
    const freqTxt = { A: "aussi souvent que tu veux", B: "plusieurs fois par semaine sans problème", C: "2 à 3 fois par semaine", D: "une fois par semaine", E: "occasionnellement, une fois tous les quinze jours" }[g] || "";
    let verdict;
    if (warn.length >= 3 || g === "D" || g === "E") verdict = "À rééquilibrer : ce plat pèse lourd s'il revient souvent.";
    else if ((g === "A" || g === "B") && warn.length <= 1) verdict = "Bonne habitude, équilibrée dans l'ensemble.";
    else verdict = "Correct, avec un ou deux points à ajuster.";
    // alternatives : recettes mieux notées qui partagent des ingrédients ou la même famille
    const myKeys = new Set(items.map(i => i.key).filter(Boolean));
    const fast = !!cats.plat_prepare || /kebab|burger|pizza|nugget|frite|tacos|croque|mcdo|fast/.test(tn);
    const rank = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    const alts = RECIPES.filter(r => r._n.ns.grade && rank[r._n.ns.grade] < (rank[g] ?? 5) && r.cat !== "dessert")
      .map(r => {
        let s = 0; for (const [k] of r.ing) if (myKeys.has(k)) s += 2;
        if (fast && r.tags.includes("fast-food-maison")) s += 3;
        const rw = norm(r.nom).split(" "); for (const w of tw) if (rw.includes(w)) s += 2;
        if (moment === "petit-déjeuner" ? r.cat === "petit-dej" : r.cat !== "petit-dej") s += 1;
        return [s, r];
      }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0] || rank[a[1]._n.ns.grade] - rank[b[1]._n.ns.grade]).slice(0, 3).map(x => x[1]);
    if (!steps.length && (g === "D" || g === "E")) steps.push("Teste une des alternatives ci-dessous une fois sur deux.");
    if (!steps.length && warn.length) steps.push("Commence par une seule modification cette semaine, celle qui te coûte le moins.");
    return { source, nut, grade: g, verdict, pos: [...new Set(pos)].slice(0, 3), warn: warn.slice(0, 4), petitPas: steps[0] || "Rien à changer pour l'instant : garde cette habitude.", frequence: freqTxt, alts, items };
  };

  /* ---------- Frigo ---------- */
  N.fromFridge = function (text, opts) {
    const have = new Set(N.findIngredients(text));
    const pantry = new Set(["sel", "poivre", "huile_olive", "huile_colza", "epices", "eau", "vinaigre", "bouillon", "sucre", "farine"]);
    return RECIPES.map(r => {
      const need = r.ing.filter(([k]) => !pantry.has(k));
      const ok = need.filter(([k]) => have.has(k) || sameFamily(k, have));
      const miss = need.filter(x => !ok.includes(x)).map(([k]) => BYKEY[k].l);
      return { r, ok: ok.length, miss, ratio: ok.length / Math.max(need.length, 1) };
    }).filter(x => x.ok > 0 && (x.ok >= 2 || x.ratio >= 0.5) && (!opts || !opts.vege || x.r.vege))
      .sort((a, b) => (b.ok - 0.6 * b.miss.length) - (a.ok - 0.6 * a.miss.length) || b.ratio - a.ratio).slice(0, 8);
  };
  const FAM = [["pates", "pates_completes"], ["riz", "riz_basmati", "riz_complet", "riz_micro", "riz_arborio"], ["semoule", "semoule_complete"], ["pain", "pain_complet", "pain_mie"], ["boeuf_hache", "boeuf_hache15"], ["poulet", "dinde"], ["creme", "creme_legere", "creme_liquide"], ["tomate", "tomate_cerise"], ["emmental", "comte"], ["lentilles", "lentilles_cuites"], ["yaourt", "yaourt_grec", "fromage_blanc"]];
  function sameFamily(k, have) { for (const f of FAM) if (f.includes(k) && f.some(x => have.has(x))) return true; return false; }

  /* ---------- Batch cooking ---------- */
  N.batchPlan = function (recs) {
    const items = recs.map(r => ({ r, prep: r.t_prep || 10, passive: r.t_passif || 0, active: Math.max(0, (r.t_cuisson || 0) - (r.t_passif || 0)) }));
    // Ce qui cuit longtemps sans surveillance d'abord
    items.sort((a, b) => b.passive - a.passive || b.active - a.active);
    const steps = []; let t = 0, oven = false;
    const fmt = m => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
    const busyUntil = [];
    steps.push({ t: 0, txt: "Sors tous les ingrédients, lave les légumes, prépare les boîtes et un grand plan de travail." });
    t = 5;
    for (const it of items) {
      const m = it.r.mode;
      steps.push({ t, txt: `${it.r.nom} : préparation (épluchage, découpe), environ ${it.prep} min.` });
      t += it.prep;
      if (it.passive > 0) {
        const where = m === "four" ? "au four" : "sur le feu, à feu doux";
        if (m === "four" && !oven) { steps.push({ t, txt: "Préchauffe le four." }); oven = true; }
        if (it.active) { steps.push({ t, txt: `${it.r.nom} : cuisson active (saisir, faire revenir), ${it.active} min.` }); t += it.active; }
        steps.push({ t, txt: `${it.r.nom} : lance la cuisson ${where}, ${it.passive} min. Pendant ce temps, enchaîne la suite.` });
        busyUntil.push({ end: t + it.passive, nom: it.r.nom });
      } else if (it.active > 0) {
        steps.push({ t, txt: `${it.r.nom} : cuisson, ${it.active} min.` });
        t += it.active;
      }
    }
    const end = Math.max(t, ...busyUntil.map(b => b.end), 0);
    for (const b of busyUntil.sort((a, c) => a.end - c.end)) steps.push({ t: b.end, txt: `${b.nom} : fin de cuisson. Laisse tiédir, puis mets en boîtes.` });
    steps.push({ t: end + 10, txt: "Range au réfrigérateur dans les deux heures, en boîtes peu profondes. Étiquette avec le nom et la date." });
    steps.sort((a, b) => a.t - b.t);
    const cons = recs.map((r, i) => ({ nom: r.nom, frigo: r.frigo || 0, congel: !!r.congel, jour: i }));
    return { duree: end + 10, steps: steps.map(s => ({ quand: fmt(s.t), txt: s.txt })), cons };
  };

  N.version = "1.0";
  if (typeof module !== "undefined" && module.exports) module.exports = N; else root.Nutri = N;
})(typeof self !== "undefined" ? self : this);
