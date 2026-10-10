/* Garde-manger : interface. Toutes les données restent dans le téléphone (localStorage). */
(function () {
"use strict";
const VERSION = "1.0.0";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Math.round(n).toLocaleString("fr-FR");
const dec = (n, d = 1) => (+n).toFixed(d).replace(".", ",");
const N = window.Nutri;

/* ---------- Données fixes ---------- */
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const RAYONS = { L: "Fruits & légumes", F: "Crèmerie & frais", V: "Viande, poisson, traiteur", E: "Épicerie", S: "Surgelés", B: "Boulangerie", D: "Divers", P: "À vérifier dans le placard" };
const CATS = [["tout", "Tout"], ["plat", "Plats"], ["salade", "Salades"], ["soupe", "Soupes"], ["petit-dej", "Petit-déj"], ["dessert", "Desserts"]];
const STORES = {
  discount: { f: { L: .85, F: .8, V: .85, E: .75, S: .8, B: .8 }, tip: "En hard-discount, prends les marques du magasin, les légumineuses en conserve et les légumes surgelés nature : même qualité nutritionnelle pour beaucoup moins cher. Le choix en frais est plus réduit, vise les légumes de saison." },
  super: { f: { L: 1, F: 1, V: 1, E: 1, S: 1, B: 1 }, tip: "Compare toujours le prix au kilo (en petit sous le prix). Les marques distributeur et le rayon vrac (riz, lentilles, flocons d'avoine) font souvent gagner 20 à 30 %." },
  proxi: { f: { L: 1.25, F: 1.2, V: 1.3, E: 1.3, S: 1.25, B: 1.1 }, tip: "En supérette, les prix sont plus élevés : achète le frais qui manque et garde l'épicerie et les surgelés pour un plus grand magasin." },
  bio: { f: { L: 1.35, F: 1.4, V: 1.6, E: 1.45, S: 1.5, B: 1.3 }, tip: "En bio, le vrac et les légumes de saison limitent l'écart de prix. La viande y coûte cher : c'est l'occasion de remplacer un plat sur deux par des légumineuses." },
  marche: { f: { L: .9, F: 1.15, V: 1.2, E: 1.3, S: 1.3, B: 1.1 }, tip: "Au marché, va-y en fin de matinée pour les prix cassés et achète ce qui est de saison. L'épicerie sèche et les surgelés seront moins chers en supermarché." }
};
const TREATS = [["Carré de chocolat noir", 55], ["Verre de vin (12 cl)", 100], ["Bière (25 cl)", 110], ["Cocktail", 200], ["Paquet de chips (45 g)", 240], ["Glace 2 boules", 250], ["Croissant", 270], ["Pain au chocolat", 300], ["Part de gâteau", 350], ["Crêpe au Nutella", 350], ["Pizza entière au resto", 900], ["Burger frites au resto", 1000], ["Kebab frites", 1100], ["Raclette (assiette)", 1100]];
const SEASON = {
  1: { l: ["Betterave", "Carotte", "Céleri", "Chou", "Chou de Bruxelles", "Endive", "Mâche", "Navet", "Panais", "Poireau", "Potiron", "Salsifis", "Topinambour"], f: ["Citron", "Clémentine", "Kiwi", "Orange", "Pamplemousse", "Poire", "Pomme"] },
  2: { l: ["Betterave", "Carotte", "Céleri", "Chou", "Endive", "Épinard", "Mâche", "Navet", "Panais", "Poireau", "Radis noir", "Salsifis", "Topinambour"], f: ["Citron", "Kiwi", "Orange", "Pamplemousse", "Poire", "Pomme"] },
  3: { l: ["Betterave", "Carotte", "Chou", "Endive", "Épinard", "Mâche", "Navet", "Poireau", "Radis", "Salsifis"], f: ["Citron", "Kiwi", "Orange", "Pamplemousse", "Poire", "Pomme"] },
  4: { l: ["Asperge", "Blette", "Carotte", "Chou-fleur", "Épinard", "Laitue", "Navet nouveau", "Petits pois", "Poireau", "Radis"], f: ["Citron", "Kiwi", "Pamplemousse", "Pomme", "Rhubarbe"] },
  5: { l: ["Artichaut", "Asperge", "Blette", "Carotte", "Concombre", "Épinard", "Fève", "Laitue", "Petits pois", "Radis"], f: ["Cerise", "Fraise", "Rhubarbe"] },
  6: { l: ["Artichaut", "Aubergine", "Brocoli", "Concombre", "Courgette", "Fève", "Haricot vert", "Laitue", "Petits pois", "Poivron", "Radis", "Tomate"], f: ["Abricot", "Cerise", "Fraise", "Framboise", "Melon", "Pêche"] },
  7: { l: ["Aubergine", "Brocoli", "Concombre", "Courgette", "Fenouil", "Haricot vert", "Laitue", "Maïs", "Poivron", "Tomate"], f: ["Abricot", "Cassis", "Cerise", "Framboise", "Melon", "Mûre", "Myrtille", "Nectarine", "Pêche", "Prune"] },
  8: { l: ["Aubergine", "Brocoli", "Concombre", "Courgette", "Fenouil", "Haricot vert", "Maïs", "Poivron", "Tomate"], f: ["Figue", "Melon", "Mirabelle", "Mûre", "Myrtille", "Nectarine", "Pêche", "Poire", "Prune", "Raisin"] },
  9: { l: ["Aubergine", "Brocoli", "Carotte", "Champignons", "Courge", "Courgette", "Épinard", "Fenouil", "Haricot vert", "Poireau", "Poivron", "Tomate"], f: ["Figue", "Mirabelle", "Mûre", "Noisette", "Poire", "Pomme", "Prune", "Quetsche", "Raisin"] },
  10: { l: ["Betterave", "Blette", "Brocoli", "Carotte", "Céleri", "Champignons", "Chou", "Courge", "Épinard", "Fenouil", "Navet", "Panais", "Poireau", "Potimarron", "Potiron", "Radis noir", "Salsifis", "Topinambour"], f: ["Châtaigne", "Coing", "Figue", "Noisette", "Noix", "Poire", "Pomme", "Raisin"] },
  11: { l: ["Betterave", "Brocoli", "Carotte", "Céleri", "Chou", "Chou de Bruxelles", "Courge", "Endive", "Épinard", "Mâche", "Navet", "Panais", "Poireau", "Potiron", "Salsifis", "Topinambour"], f: ["Châtaigne", "Clémentine", "Coing", "Kiwi", "Noix", "Poire", "Pomme"] },
  12: { l: ["Betterave", "Carotte", "Céleri", "Chou", "Chou de Bruxelles", "Courge", "Endive", "Mâche", "Navet", "Panais", "Poireau", "Potiron", "Salsifis", "Topinambour"], f: ["Châtaigne", "Clémentine", "Kiwi", "Mandarine", "Orange", "Poire", "Pomme"] }
};
const MONTH = new Date().getMonth() + 1;

/* ---------- État et sauvegarde ---------- */
const KEY = "garde-manger-v2";
const DEFAULT = {
  v: 2, exemple: true,
  p: { sexe: "h", age: 30, taille: 175, poids: 72, act: "1.375", obj: "maintien" },
  f: { niv: "1", temps: "40", cat: "tout", vege: false, saison: false, batch: false, light: false },
  pdays: [5], semaine: [], habitudes: [], plaisirs: {}, carnet: [],
  courses: { mag: "super", pers: 1, coche: {}, extra: [] }, scans: []
};
const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(DEFAULT);
function merge(o) {
  if (!o || typeof o !== "object") return;
  S = Object.assign(clone(DEFAULT), o);
  S.p = Object.assign({}, DEFAULT.p, o.p); S.f = Object.assign({}, DEFAULT.f, o.f);
  S.courses = Object.assign({}, DEFAULT.courses, o.courses);
  for (const k of ["semaine", "habitudes", "carnet", "scans", "pdays"]) if (!Array.isArray(S[k])) S[k] = clone(DEFAULT[k]);
  if (!Array.isArray(S.courses.extra)) S.courses.extra = [];
}
function load() { try { const raw = localStorage.getItem(KEY); if (raw) merge(JSON.parse(raw)); } catch (e) {} }
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Enregistrement impossible : la mémoire du navigateur est pleine ou bloquée."); }
  }, 300);
}
async function askPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      const ok = already || await navigator.storage.persist();
      $("#g-persist").textContent = ok ? "Stockage protégé : Android ne supprimera pas tes données pour faire de la place." : "Android peut effacer ces données s'il manque de place : installe l'appli sur l'écran d'accueil pour les protéger, et garde une sauvegarde.";
    }
  } catch (e) {}
}

/* ---------- Petits outils ---------- */
let toastEl;
function toast(t) {
  if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
  toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastEl._t); toastEl._t = setTimeout(() => (toastEl.hidden = true), 2600);
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) {
    const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {} ta.remove(); return ok;
  }
}
function askClaude(prompt) {
  copyText(prompt).then(ok => toast(ok ? "Question copiée. Si elle n'apparaît pas dans Claude, colle-la." : "Ouvre Claude et pose ta question."));
  const url = "https://claude.ai/new?q=" + encodeURIComponent(prompt.slice(0, 6000));
  window.open(url, "_blank", "noopener");
}
function profileText() {
  const c = calc();
  return `Mon profil : ${S.p.sexe === "h" ? "homme" : "femme"}, ${S.p.age} ans, ${S.p.taille} cm, ${S.p.poids} kg, objectif « ${({ maintien: "garder mon poids", perte: "perdre doucement", prise: "prendre du poids / du muscle" })[S.p.obj]} », environ ${fmt(c.day)} kcal par jour. En cuisine, je ${({ 1: "ne sais pas cuisiner", 2: "me débrouille", 3: "aime cuisiner" })[S.f.niv]}.`;
}
const gradeBadge = (g, lg) => { g = String(g || "").toUpperCase(); const ok = "ABCDE".includes(g) && g; return `<span class="grade ${lg ? "lg " : ""}g-${ok || "X"}" title="${ok ? "Note " + ok : "Note inconnue"}">${ok || "?"}</span>`; };
const isSeason = r => !r.saison || !r.saison.length || r.saison.includes(MONTH);
const totalTime = r => (r.t_prep || 0) + (r.t_cuisson || 0);
const timeTxt = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? " " + String(m % 60).padStart(2, "0") : ""}` : `${m} min`;
const NIV = ["", "Facile", "Intermédiaire", "Pour cuisiner"];

/* ---------- Chargement des données ---------- */
let ciqualPromise = null;
function loadCiqual() {
  if (!ciqualPromise) ciqualPromise = fetch("data/ciqual.json").then(r => r.json()).then(c => { N.setCiqual(c); return true; }).catch(() => false);
  return ciqualPromise;
}

/* ---------- Objectif ---------- */
function calc() {
  const p = S.p, w = +p.poids || 70, h = +p.taille || 170, a = +p.age || 30;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sexe === "h" ? 5 : -161);
  const tdee = bmr * (+p.act || 1.375);
  let day = tdee, adj = "";
  if (p.obj === "perte") { const d = Math.min(500, tdee * .15); day = tdee - d; adj = `un déficit de ${fmt(d)} kcal par jour, soit une perte d'environ ${dec(d * 7 / 7700)} kg par semaine`; }
  if (p.obj === "prise") { day = tdee + 300; adj = "un surplus de 300 kcal par jour, à associer à de la musculation pour que la prise soit surtout musculaire"; }
  const floor = p.sexe === "h" ? 1500 : 1200; let floored = false;
  if (day < floor) { day = floor; floored = true; }
  return { bmr, tdee, day, week: day * 7, adj, floored, prot: [w * 1.2, w * 1.6], eau: w * .033, meal: day * .35 };
}
function renderObjectif() {
  const p = S.p;
  $("#p-sexe").value = p.sexe; $("#p-age").value = p.age; $("#p-taille").value = p.taille; $("#p-poids").value = p.poids; $("#p-act").value = p.act; $("#p-obj").value = p.obj;
  $("#exTag").hidden = !S.exemple;
  const c = calc();
  $("#k-week").textContent = fmt(c.week) + " kcal";
  $("#k-day").textContent = fmt(c.day) + " kcal";
  $("#k-prot").textContent = `${Math.round(c.prot[0])}–${Math.round(c.prot[1])} g`;
  $("#k-eau").textContent = dec(c.eau) + " L";
  let t = `Au repos, ton corps dépense environ ${fmt(c.bmr)} kcal par jour ; avec ton activité, on arrive à ${fmt(c.tdee)} kcal.`;
  t += c.adj ? ` L'objectif choisi applique ${c.adj}.` : " C'est le niveau qui maintient ton poids.";
  if (c.floored) t += " Le résultat a été relevé au minimum conseillé : descendre plus bas fatigue et fait perdre du muscle.";
  $("#k-explain").textContent = t;
  $("#pdays").innerHTML = DAYS.map((d, i) => `<button class="chip" data-d="${i}" aria-pressed="${S.pdays.includes(i)}">${d}</button>`).join("");
  const P = c.week * .10, base = (c.week - P) / 7, n = S.pdays.length;
  const tots = DAYS.map((d, i) => { const pl = n ? (S.pdays.includes(i) ? P / n : 0) : P / 7; return { tot: base + pl, pl }; });
  const max = Math.max(...tots.map(x => x.tot));
  $("#bars").innerHTML = tots.map((x, i) => `<div class="bar"><span class="k num">${fmt(x.tot)}</span><div class="col" style="height:${x.tot / max * 78}%"><div class="pl" style="height:${x.pl / x.tot * 100}%"></div></div><span class="d">${DAYS[i]}</span></div>`).join("");
}
function bindObjectif() {
  ["#p-sexe", "#p-age", "#p-taille", "#p-poids", "#p-act", "#p-obj"].forEach(id => $(id).addEventListener("change", () => {
    S.p = { sexe: $("#p-sexe").value, age: +$("#p-age").value || 30, taille: +$("#p-taille").value || 170, poids: +$("#p-poids").value || 70, act: $("#p-act").value, obj: $("#p-obj").value };
    S.exemple = false; renderObjectif(); renderPlaisir(); renderPlats(); save();
  }));
  $("#pdays").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (!b) return; const d = +b.dataset.d; S.pdays = S.pdays.includes(d) ? S.pdays.filter(x => x !== d) : [...S.pdays, d]; renderObjectif(); save(); });
}

/* ---------- Plats ---------- */
let shown = 20;
function filtered() {
  const f = S.f, q = N.norm($("#f-q").value || "");
  return N.recipes().filter(r => r.niv <= +f.niv && totalTime(r) <= +f.temps
    && (f.cat === "tout" || r.cat === f.cat) && (!f.vege || r.vege) && (!f.saison || (r.saison && r.saison.includes(MONTH)))
    && (!f.batch || (r.frigo >= 3)) && (!f.light || r._n.kcal <= 450)
    && (!q || N.norm(r.nom + " " + r.ing.map(([k]) => N.ing(k).l).join(" ")).includes(q)))
    .sort((a, b) => "ABCDE".indexOf(a._n.ns.grade) - "ABCDE".indexOf(b._n.ns.grade) || totalTime(a) - totalTime(b));
}
function dishRow(r, extra) {
  return `<div class="dish" data-open="${esc(r.id)}">${gradeBadge(r._n.ns.grade)}<div style="min-width:0"><div class="t">${esc(r.nom)}</div><div class="meta"><span class="num">${timeTxt(totalTime(r))}</span> · <span class="num">${fmt(r._n.kcal)} kcal</span> · ${NIV[r.niv]}${r.vege ? " · végé" : ""}${r.frigo >= 3 ? " · se garde" : ""}</div>${extra || ""}</div><button class="btn ghost small" data-add="${esc(r.id)}">Ajouter</button></div>`;
}
function renderPlats() {
  const f = S.f;
  $("#f-niv").value = f.niv; $("#f-temps").value = f.temps;
  $("#f-cat").innerHTML = CATS.map(([k, l]) => `<button class="chip" data-cat="${k}" aria-pressed="${f.cat === k}">${l}</button>`).join("");
  $$("[data-flt]").forEach(b => b.setAttribute("aria-pressed", !!f[b.dataset.flt]));
  $("#mealTarget").textContent = `Pour toi, un déjeuner ou un dîner tourne autour de ${fmt(calc().meal)} kcal.`;
  const ds = filtered();
  $("#dishCount").textContent = ds.length ? `${ds.length} plat${ds.length > 1 ? "s" : ""} pour toi` : "Aucun plat";
  $("#dishList").innerHTML = ds.length ? ds.slice(0, shown).map(r => dishRow(r)).join("") : `<p class="note">Aucun plat ne correspond à tous ces filtres. Allonge le temps disponible ou retire un filtre.</p>`;
  $("#moreDishes").hidden = ds.length <= shown;
  renderWeek();
}
function weekDish(it) {
  if (it.rid) { const r = N.recipe(it.rid); if (r) return { nom: r.nom, kcal: r._n.kcal, grade: r._n.ns.grade, r }; }
  if (it.cid) { const c = S.carnet.find(x => x.id === it.cid); if (c) { const n = N.dish(c.items); return { nom: c.nom, kcal: n.kcal, grade: n.ns.grade, c }; } }
  if (it.legacy) return { nom: it.legacy.nom, kcal: it.legacy.kcal || 0, grade: it.legacy.g, legacy: it.legacy };
  return null;
}
function renderWeek() {
  const html = S.semaine.length ? S.semaine.map((it, i) => { const d = weekDish(it); return d ? `<div class="it"><span style="min-width:0">${esc(d.nom)} <span class="note num">· ${fmt(d.kcal)} kcal</span></span><button class="x" data-rm="${i}" aria-label="Retirer ${esc(d.nom)}">×</button></div>` : ""; }).join("") : `<p class="note">Rien pour l'instant. Touche « Ajouter » sur un plat.</p>`;
  $("#weekList").innerHTML = html; $("#batchWeek").innerHTML = html;
}
function addRecipe(id) { const r = N.recipe(id); if (!r) return; S.semaine.push({ rid: id }); afterWeek(); toast(`« ${r.nom} » ajouté à ta semaine`); }
function addCarnet(id) { const c = S.carnet.find(x => x.id === id); if (!c) return; S.semaine.push({ cid: id }); afterWeek(); toast(`« ${c.nom} » ajouté à ta semaine`); }
function afterWeek() { renderWeek(); renderCourses(); save(); }
function bindPlats() {
  ["#f-niv", "#f-temps"].forEach(id => $(id).addEventListener("change", () => { S.f.niv = $("#f-niv").value; S.f.temps = $("#f-temps").value; shown = 20; renderPlats(); save(); }));
  $("#f-q").addEventListener("input", () => { shown = 20; renderPlats(); });
  $("#f-cat").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; S.f.cat = b.dataset.cat; shown = 20; renderPlats(); save(); });
  $$("[data-flt]").forEach(b => b.addEventListener("click", () => { const k = b.dataset.flt; S.f[k] = !S.f[k]; shown = 20; renderPlats(); save(); }));
  $("#moreDishes").addEventListener("click", () => { shown += 20; renderPlats(); });
  $("#clearWeek").addEventListener("click", () => { S.semaine = []; S.courses.coche = {}; afterWeek(); });
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-add]"); if (a) { e.stopPropagation(); addRecipe(a.dataset.add); return; }
    const ac = e.target.closest("[data-addc]"); if (ac) { e.stopPropagation(); addCarnet(ac.dataset.addc); return; }
    const rm = e.target.closest("[data-rm]"); if (rm) { S.semaine.splice(+rm.dataset.rm, 1); afterWeek(); return; }
    const o = e.target.closest("[data-open]"); if (o) { openRecipe(o.dataset.open); return; }
    const oc = e.target.closest("[data-openc]"); if (oc) { openCarnet(oc.dataset.openc); return; }
    const cl = e.target.closest("[data-close]"); if (cl) { $("#sheet").close(); }
  });
}

/* ---------- Fiche recette ---------- */
function nutTable(n, per) {
  const rows = [["Énergie", fmt(n.kcal) + " kcal"], ["Protéines", dec(n.prot) + " g"], ["Glucides", dec(n.gluc) + " g"], ["dont sucres", dec(n.suc) + " g"], ["Lipides", dec(n.lip) + " g"], ["dont acides gras saturés", dec(n.ags) + " g"], ["Fibres", dec(n.fib) + " g"], ["Sel", dec(n.sel, 2) + " g"]];
  return `<table class="nut"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</tbody></table><p class="note">${per}. Fruits, légumes et légumineuses : ${Math.round(n.fvPct)} % du poids.</p>`;
}
function openSheet(html) { $("#sheetBody").innerHTML = html; const d = $("#sheet"); if (!d.open) d.showModal(); d.scrollTop = 0; }
$("#sheet") && $("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") $("#sheet").close(); });
function openRecipe(id) {
  const r = N.recipe(id); if (!r) return;
  const pers = Math.max(1, +S.courses.pers || 1);
  const ings = r.ing.map(([k, g]) => { const i = N.ing(k); const q = i.r === "P" && g < 3 ? "" : (N.shopQty(k, g * pers) || N.roundG(g * pers)); return `<li><span>${esc(i.l)}</span><span class="q">${esc(q)}</span></li>`; }).join("");
  const cons = r.frigo ? `Se garde ${r.frigo} jour${r.frigo > 1 ? "s" : ""} au réfrigérateur${r.congel ? ", et se congèle bien" : ""}.` : "À manger tout de suite.";
  openSheet(`<header><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${gradeBadge(r._n.ns.grade, true)}<div><h2>${esc(r.nom)}</h2><p class="note num">${timeTxt(totalTime(r))} · ${NIV[r.niv]} · ${fmt(r._n.kcal)} kcal / portion</p></div></div><button class="x" data-close aria-label="Fermer">×</button></header>
  <div class="row"><button class="btn" data-add="${esc(r.id)}">Ajouter à ma semaine</button><button class="btn ghost" id="sh-claude">Une variante avec Claude</button></div>
  <div><h3>Ingrédients pour ${pers} personne${pers > 1 ? "s" : ""}</h3><ul class="ingl">${ings}</ul><p class="note">Le nombre de personnes se règle dans l'onglet Courses.</p></div>
  <div><h3>Étapes</h3><ol class="steps">${r.etapes.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>
  <p class="note">${cons}</p>
  <details><summary>Valeurs nutritionnelles par portion</summary>${nutTable(r._n, "Calcul à partir de la table Ciqual 2025, ingrédients crus")}</details>`);
  $("#sh-claude").onclick = () => askClaude(`${profileText()}\nVoici une recette de mon appli : « ${r.nom} » (ingrédients par portion : ${r.ing.map(([k, g]) => N.ing(k).l + " " + Math.round(g) + " g").join(", ")}). Propose-moi une variante adaptée à mon profil, avec les quantités et les étapes.`);
}
function openCarnet(id) {
  const c = S.carnet.find(x => x.id === id); if (!c) return;
  const n = N.dish(c.items);
  const pers = Math.max(1, +S.courses.pers || 1);
  openSheet(`<header><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${gradeBadge(n.ns.grade, true)}<div><h2>${esc(c.nom)}</h2><p class="note num">${fmt(n.kcal)} kcal / portion · recette importée</p></div></div><button class="x" data-close aria-label="Fermer">×</button></header>
  <div class="row"><button class="btn" data-addc="${esc(c.id)}">Ajouter à ma semaine</button><button class="btn ghost" id="sh-del">Supprimer du carnet</button></div>
  <div><h3>Ingrédients pour ${pers} personne${pers > 1 ? "s" : ""}</h3><ul class="ingl">${c.items.map(i => `<li><span>${esc(i.label)}</span><span class="q">${esc(i.key ? (N.shopQty(i.key, i.g * pers) || N.roundG(i.g * pers)) : N.roundG(i.g * pers))}</span></li>`).join("")}</ul></div>
  ${c.etapes && c.etapes.length ? `<div><h3>Étapes</h3><ol class="steps">${c.etapes.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>` : ""}
  ${c.light && c.light.length ? `<div class="box"><span class="k">Pour une version plus légère</span><ul>${c.light.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
  <details><summary>Valeurs nutritionnelles par portion</summary>${nutTable(n, "Estimation à partir de la table Ciqual 2025")}</details>`);
  $("#sh-del").onclick = () => { S.carnet = S.carnet.filter(x => x.id !== id); S.semaine = S.semaine.filter(x => x.cid !== id); save(); renderCarnet(); afterWeek(); $("#sheet").close(); toast("Recette supprimée"); };
}

/* ---------- Courses ---------- */
function aggregate() {
  const pers = Math.max(1, +S.courses.pers || 1), st = STORES[S.courses.mag] || STORES.super;
  const m = new Map(); let cost = 0;
  const add = (id, name, r, g, euros, key, txt) => {
    const e = m.get(id) || { id, name, r, g: 0, cost: 0, key, txt: null };
    e.g += g; e.cost += euros; if (txt) e.txt = txt; m.set(id, e);
  };
  for (const it of S.semaine) {
    const d = weekDish(it); if (!d) continue;
    if (d.r) for (const [k, g] of d.r.ing) { const i = N.ing(k); add("k:" + k, i.l, i.r, g * pers, g * pers / 1000 * i.px * (st.f[i.r] || 1), k); }
    else if (d.c) for (const x of d.c.items) {
      if (x.key) { const i = N.ing(x.key); add("k:" + x.key, i.l, i.r, x.g * pers, x.g * pers / 1000 * i.px * (st.f[i.r] || 1), x.key); }
      else { const nm = x.label.split(",")[0]; add("c:" + nm.toLowerCase(), nm, "E", x.g * pers, x.g * pers / 1000 * 8 * (st.f.E || 1)); }
    }
    else if (d.legacy) for (const x of d.legacy.ing || []) add("l:" + String(x.n).toLowerCase() + "|" + x.u, x.n, x.r in RAYONS ? x.r : "E", (x.q || 0) * pers, (x.p || 0) * pers * (st.f[x.r] || 1), null, x.u);
  }
  for (const x of S.courses.extra) add("x:" + x.id, x.nom, x.r || "D", 0, 0);
  for (const e of m.values()) cost += e.cost;
  return { items: [...m.values()], cost };
}
function qtyText(e) {
  if (e.id.startsWith("x:")) return "";
  if (e.key) return e.r === "P" ? "" : N.shopQty(e.key, e.g);
  if (e.txt !== null && e.txt !== undefined) { const n = e.g; return !n ? "" : e.txt === "g" || e.txt === "ml" ? N.roundG(n, e.txt === "ml") : Math.ceil(n - 1e-9) + (e.txt && e.txt !== "pc" ? " " + e.txt : ""); }
  return e.g ? N.roundG(e.g) : "";
}
function renderCourses() {
  $("#c-mag").value = S.courses.mag; $("#c-pers").value = S.courses.pers;
  $("#c-tip").textContent = (STORES[S.courses.mag] || STORES.super).tip;
  const { items, cost } = aggregate();
  $("#c-nb").textContent = S.semaine.length;
  $("#c-cout").textContent = S.semaine.length ? Math.round(cost) + " €" : "–";
  if (!items.length) { $("#shopList").innerHTML = `<h2>Ta liste</h2><p class="note">Ajoute des plats à ta semaine (onglet Plats ou Importer) : la liste se remplit toute seule, quantités comprises.</p>`; return; }
  let html = "<h2>Ta liste</h2>";
  for (const r of Object.keys(RAYONS)) {
    const its = items.filter(e => e.r === r).sort((a, b) => a.name.localeCompare(b.name, "fr")); if (!its.length) continue;
    html += `<h3>${RAYONS[r]}</h3><ul>${its.map(e => { const on = !!S.courses.coche[e.id]; return `<li class="${on ? "done" : ""}"><label><input type="checkbox" data-ck="${esc(e.id)}" ${on ? "checked" : ""}><span class="n">${esc(e.name)}</span><span class="q">${esc(qtyText(e))}</span></label></li>`; }).join("")}</ul>`;
  }
  $("#shopList").innerHTML = html;
}
function listText() {
  const { items } = aggregate(); let t = "Liste de courses\n";
  for (const r of Object.keys(RAYONS)) { const its = items.filter(e => e.r === r && !S.courses.coche[e.id]); if (!its.length) continue; t += `\n${RAYONS[r]}\n` + its.map(e => `- ${e.name}${qtyText(e) ? " : " + qtyText(e) : ""}`).join("\n") + "\n"; }
  return t;
}
function addExtra(nom, r) { if (!nom) return; S.courses.extra.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nom, r: r || "D" }); renderCourses(); save(); }
function bindCourses() {
  $("#c-mag").addEventListener("change", () => { S.courses.mag = $("#c-mag").value; renderCourses(); save(); });
  $("#c-pers").addEventListener("change", () => { S.courses.pers = Math.max(1, Math.min(10, +$("#c-pers").value || 1)); renderCourses(); save(); });
  $("#shopList").addEventListener("change", e => { const c = e.target.closest("[data-ck]"); if (!c) return; if (c.checked) S.courses.coche[c.dataset.ck] = 1; else delete S.courses.coche[c.dataset.ck]; c.closest("li").classList.toggle("done", c.checked); save(); });
  $("#c-addBtn").addEventListener("click", () => { const v = $("#c-add").value.trim(); const k = N.matchIngredient(v); addExtra(v, k ? N.ing(k).r : "D"); $("#c-add").value = ""; });
  $("#c-add").addEventListener("keydown", e => { if (e.key === "Enter") $("#c-addBtn").click(); });
  $("#c-copy").addEventListener("click", async () => { toast(await copyText(listText()) ? "Liste copiée : colle-la dans tes notes ou un message." : "Copie impossible sur cet appareil."); });
  $("#c-clean").addEventListener("click", () => {
    const ids = Object.keys(S.courses.coche);
    S.courses.extra = S.courses.extra.filter(x => !S.courses.coche["x:" + x.id]);
    S.courses.coche = {}; renderCourses(); save(); toast(ids.length ? "Articles cochés retirés" : "Aucun article coché");
  });
}

/* ---------- Scanner ---------- */
const OFF = "https://world.openfoodfacts.org";
const OFF_FIELDS = "code,product_name_fr,product_name,brands,quantity,nutriscore_grade,nova_group,categories_tags,categories_hierarchy,image_front_small_url,nutriments,additives_tags,countries_tags";
let scanStream = null, scanLoop = null, zxReader = null;
function scanErr(t) { const el = $("#scanErr"); el.textContent = t || ""; el.hidden = !t; }
async function openScanner() {
  scanErr("");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { scanErr("La caméra n'est pas accessible ici. Ouvre l'appli installée ou Chrome, en HTTPS, ou tape le code-barres."); return; }
  const view = $("#scanView"), video = $("#scanVideo");
  view.hidden = false; $("#scanMsg").textContent = "Place le code-barres dans le cadre";
  try {
    if ("BarcodeDetector" in window) {
      const supported = await BarcodeDetector.getSupportedFormats().catch(() => []);
      const formats = ["ean_13", "ean_8", "upc_a", "upc_e"].filter(f => !supported.length || supported.includes(f));
      const det = new BarcodeDetector({ formats });
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = scanStream; await video.play();
      const tick = async () => {
        if (!scanStream) return;
        try { const codes = await det.detect(video); const c = codes.find(x => /^\d{8,14}$/.test(x.rawValue)); if (c) { gotCode(c.rawValue); return; } } catch (e) {}
        scanLoop = setTimeout(tick, 180);
      };
      tick();
    } else {
      $("#scanMsg").textContent = "Chargement du lecteur…";
      await loadScript("https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js");
      const hints = new Map(); hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
      zxReader = new ZXing.BrowserMultiFormatReader(hints);
      $("#scanMsg").textContent = "Place le code-barres dans le cadre";
      await zxReader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, video, (res) => { if (res && /^\d{8,14}$/.test(res.getText())) gotCode(res.getText()); });
    }
  } catch (e) {
    closeScanner();
    scanErr(e && e.name === "NotAllowedError" ? "Tu as refusé l'accès à la caméra. Autorise-le dans les réglages du site (icône à gauche de l'adresse) ou tape le code-barres." : "Impossible d'ouvrir la caméra. Tape le code-barres à la place.");
  }
}
function closeScanner() {
  clearTimeout(scanLoop); scanLoop = null;
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  if (zxReader) { try { zxReader.reset(); } catch (e) {} zxReader = null; }
  $("#scanVideo").srcObject = null; $("#scanView").hidden = true;
}
function gotCode(code) { try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} closeScanner(); lookupProduct(code); }
function loadScript(src) { return new Promise((ok, ko) => { if ([...document.scripts].some(s => s.src === src)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("script")); document.head.appendChild(s); }); }
async function offGet(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}
const pname = p => p.product_name_fr || p.product_name || "Produit sans nom";
const goodGrade = g => g && "abcde".includes(g) && g.length === 1;
async function lookupProduct(code) {
  scanErr(""); const out = $("#scanResult");
  out.innerHTML = `<div class="card"><p class="skel">Recherche du produit ${esc(code)}…</p></div>`;
  try {
    const j = await offGet(`${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}&lc=fr`);
    if (!j || j.status !== 1 || !j.product) { out.innerHTML = `<div class="card"><p>Ce code-barres (${esc(code)}) n'est pas encore dans Open Food Facts. Tu peux l'y ajouter avec l'application Open Food Facts, ou chercher le produit par son nom ci-dessus.</p></div>`; return; }
    showProduct(j.product);
  } catch (e) {
    out.innerHTML = `<div class="card"><p class="err">Pas de réponse d'Open Food Facts. Vérifie ta connexion et réessaie.</p></div>`;
  }
}
async function searchByName(q) {
  const out = $("#scanResult");
  out.innerHTML = `<div class="card"><p class="skel">Recherche de « ${esc(q)} »…</p></div>`;
  try {
    const j = await offGet(`${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&cc=fr&lc=fr&fields=code,product_name_fr,product_name,brands,nutriscore_grade,image_front_small_url`);
    const ps = (j.products || []).filter(p => p.code);
    out.innerHTML = ps.length ? `<div class="card"><h3>Résultats</h3><div class="list">${ps.map(altRow).join("")}</div></div>` : `<div class="card"><p>Aucun produit trouvé pour « ${esc(q)} ».</p></div>`;
  } catch (e) { out.innerHTML = `<div class="card"><p class="err">Pas de réponse d'Open Food Facts. Vérifie ta connexion et réessaie.</p></div>`; }
}
function altRow(p) {
  return `<div class="alt" data-code="${esc(p.code)}" style="cursor:pointer">${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="" loading="lazy">` : `<div class="ph"></div>`}<div style="min-width:0"><div class="k" style="line-height:1.25">${esc(pname(p))}</div><div class="note">${esc(p.brands || "")}</div></div>${gradeBadge(goodGrade(p.nutriscore_grade) ? p.nutriscore_grade : "")}</div>`;
}
function productKeys(p) {
  const keys = new Set();
  const cats = p.categories_tags || [];
  for (const i of N.ingredients()) if (i.off && cats.includes(i.off)) keys.add(i.k);
  for (const k of N.findIngredients(pname(p))) keys.add(k);
  return [...keys].filter(k => !["sel", "poivre", "eau", "epices"].includes(k));
}
function showProduct(p) {
  const g = goodGrade(p.nutriscore_grade) ? p.nutriscore_grade : "";
  const nm = p.nutriments || {};
  const kcal = nm["energy-kcal_100g"], sugar = nm.sugars_100g, salt = nm.salt_100g, fat = nm["saturated-fat_100g"];
  const nova = p.nova_group;
  const novaTxt = { 1: "aliment brut ou peu transformé", 2: "ingrédient culinaire", 3: "aliment transformé", 4: "aliment ultra-transformé" }[nova] || "";
  const adds = (p.additives_tags || []).length;
  const keys = productKeys(p);
  const recs = N.recipes().filter(r => r.ing.some(([k]) => keys.includes(k))).sort((a, b) => "ABCDE".indexOf(a._n.ns.grade) - "ABCDE".indexOf(b._n.ns.grade)).slice(0, 5);
  const ray = keys.length ? N.ing(keys[0]).r : "E";
  // historique
  S.scans = [{ code: p.code, nom: pname(p), marque: p.brands || "", ns: g, img: p.image_front_small_url || "" }, ...S.scans.filter(x => x.code !== p.code)].slice(0, 15);
  save(); renderScanHist();
  $("#scanResult").innerHTML = `<div class="card">
    <div class="prod">${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="">` : `<div class="ph"></div>`}<div style="min-width:0"><h2 style="font-size:1.15rem">${esc(pname(p))}</h2><p class="note">${esc([p.brands, p.quantity].filter(Boolean).join(" · "))}</p></div></div>
    <div class="row">${gradeBadge(g, true)}<div><div class="k">${g ? "Nutri-Score " + g.toUpperCase() : "Nutri-Score non calculé"}</div><div class="note">${nova ? "NOVA " + nova + " : " + novaTxt : "Niveau de transformation inconnu"}${adds ? ` · ${adds} additif${adds > 1 ? "s" : ""}` : ""}</div></div></div>
    ${kcal != null ? `<table class="nut"><tbody><tr><td>Énergie (100 g)</td><td>${fmt(kcal)} kcal</td></tr>${sugar != null ? `<tr><td>Sucres</td><td>${dec(sugar)} g</td></tr>` : ""}${fat != null ? `<tr><td>Graisses saturées</td><td>${dec(fat)} g</td></tr>` : ""}${salt != null ? `<tr><td>Sel</td><td>${dec(salt, 2)} g</td></tr>` : ""}</tbody></table>` : ""}
    <div class="row"><button class="btn" id="pr-add">Ajouter à ma liste</button><a class="btn ghost" href="https://fr.openfoodfacts.org/produit/${esc(p.code)}" target="_blank" rel="noopener">Fiche complète</a></div>
  </div>
  <div class="card"><h3>${g && g !== "a" ? "Mieux noté dans le même rayon" : "Autres produits du rayon"}</h3><div id="pr-alts" class="list"><p class="skel">Recherche…</p></div></div>
  <div class="card"><h3>Recettes avec ce produit</h3>${recs.length ? `<div class="list">${recs.map(r => dishRow(r)).join("")}</div>` : `<p class="note">Aucune recette de la base n'utilise ce type de produit.</p>`}
  <button class="btn ghost" id="pr-claude">Demander une recette à Claude</button></div>`;
  $("#pr-add").onclick = () => { addExtra(pname(p) + (p.brands ? " (" + p.brands.split(",")[0] + ")" : ""), ray); toast("Ajouté à ta liste de courses"); };
  $("#pr-claude").onclick = () => askClaude(`${profileText()}\nJ'ai acheté ce produit : « ${pname(p)} »${p.brands ? " de " + p.brands : ""} (Nutri-Score ${g ? g.toUpperCase() : "inconnu"}). Propose-moi deux recettes simples et équilibrées qui l'utilisent, avec quantités et étapes.`);
  loadAlternatives(p, g);
}
async function loadAlternatives(p, g) {
  const el = $("#pr-alts"); if (!el) return;
  const cats = (p.categories_hierarchy && p.categories_hierarchy.length ? p.categories_hierarchy : p.categories_tags || []).slice();
  if (!cats.length) { el.innerHTML = `<p class="note">Ce produit n'a pas de catégorie dans Open Food Facts : impossible de le comparer.</p>`; return; }
  const order = "abcde";
  const rank = x => goodGrade(x) ? order.indexOf(x) : 9;
  let found = [], tries = 0;
  for (let i = cats.length - 1; i >= 0 && tries < 2 && found.length < 3; i--, tries++) {
    try {
      const j = await offGet(`${OFF}/api/v2/search?categories_tags=${encodeURIComponent(cats[i])}&countries_tags=en:france&sort_by=unique_scans_n&page_size=60&fields=code,product_name_fr,product_name,brands,nutriscore_grade,nova_group,image_front_small_url`);
      const ps = (j.products || []).filter(x => x.code !== p.code && goodGrade(x.nutriscore_grade) && (pname(x) !== "Produit sans nom"));
      found = ps.filter(x => g ? rank(x.nutriscore_grade) < rank(g) : rank(x.nutriscore_grade) <= 1)
        .sort((a, b) => rank(a.nutriscore_grade) - rank(b.nutriscore_grade) || (a.nova_group || 5) - (b.nova_group || 5)).slice(0, 6);
    } catch (e) { el.innerHTML = `<p class="err">Pas de réponse d'Open Food Facts pour les alternatives.</p>`; return; }
  }
  if (!$("#pr-alts")) return;
  el.innerHTML = found.length ? found.map(altRow).join("") : (g === "a" ? `<p class="note">Ce produit a déjà la meilleure note de son rayon.</p>` : `<p class="note">Pas d'alternative mieux notée trouvée dans cette catégorie.</p>`);
}
function renderScanHist() {
  $("#scanHistCard").hidden = !S.scans.length;
  $("#scanHist").innerHTML = S.scans.map(s => `<div class="alt" data-code="${esc(s.code)}" style="cursor:pointer">${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy">` : `<div class="ph"></div>`}<div style="min-width:0"><div class="k" style="line-height:1.25">${esc(s.nom)}</div><div class="note">${esc(s.marque)}</div></div>${gradeBadge(s.ns)}</div>`).join("");
}
function bindScanner() {
  $("#scanBtn").addEventListener("click", openScanner);
  $("#scanClose").addEventListener("click", closeScanner);
  $("#scanGo").addEventListener("click", () => { const v = $("#scanCode").value.trim(); if (!v) return; if (/^\d{8,14}$/.test(v)) lookupProduct(v); else searchByName(v); });
  $("#scanCode").addEventListener("keydown", e => { if (e.key === "Enter") $("#scanGo").click(); });
  document.addEventListener("click", e => { const c = e.target.closest("[data-code]"); if (c) { lookupProduct(c.dataset.code); $("#scanResult").scrollIntoView({ behavior: "smooth", block: "start" }); } });
  document.addEventListener("visibilitychange", () => { if (document.hidden) closeScanner(); });
}

/* ---------- Habitudes ---------- */
function renderHabitudes() {
  const c = calc();
  $("#h-list").innerHTML = S.habitudes.length ? S.habitudes.map((h, i) => {
    const a = N.analyzeHabit(h.texte, h.freq, h.moment, c.meal);
    const head = `<div class="row" style="flex-wrap:nowrap">${gradeBadge(a ? a.grade : "")}<div style="min-width:0;flex:1"><div class="k">${esc(h.texte)}</div><div class="note">${h.freq >= 10 ? "plus d'une fois par jour" : h.freq + " fois par semaine"} · ${esc(h.moment)}${a ? ` · ≈ ${fmt(a.nut.kcal)} kcal` : ""}</div></div><button class="x" data-hrm="${i}" aria-label="Supprimer">×</button></div>`;
    if (!a) return `<div class="card">${head}<p>Je ne reconnais pas ce plat. Décris-le avec ses ingrédients principaux (« pâtes, crème, lardons »), ou demande à Claude.</p><button class="btn ghost small" data-hclaude="${i}">Demander à Claude</button></div>`;
    const src = a.source.type === "recette" ? `Calculé d'après la recette « ${a.source.nom} »` : a.source.type === "ciqual" ? `Calculé d'après « ${a.source.nom} » (Ciqual)` : `Ingrédients reconnus : ${a.source.noms.join(", ")}, en portions habituelles`;
    return `<div class="card">${head}
      <p>${esc(a.verdict)}</p>
      ${a.pos.length ? `<div class="box"><span class="k">Ce qui va bien</span><ul>${a.pos.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${a.warn.length ? `<div class="box warn"><span class="k">Ce qui coince</span><ul>${a.warn.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      <p><span class="k">Premier petit pas :</span> ${esc(a.petitPas)}</p>
      <p class="note">Fréquence raisonnable : ${esc(a.frequence)}.</p>
      ${a.alts.length ? `<div><span class="k">À essayer à la place</span><div class="list">${a.alts.map(r => dishRow(r)).join("")}</div></div>` : ""}
      <p class="note">${esc(src)}.</p>
      <button class="btn ghost small" data-hclaude="${i}">Approfondir avec Claude</button></div>`;
  }).join("") : `<div class="card"><p class="note">Tes analyses apparaîtront ici et resteront enregistrées sur ton téléphone.</p></div>`;
}
function bindHabitudes() {
  $("#h-btn").addEventListener("click", async () => {
    const t = $("#h-plat").value.trim(); if (!t) { $("#h-plat").focus(); return; }
    $("#h-err").hidden = true;
    if (!N.findIngredients(t).length) { $("#h-btn").disabled = true; await loadCiqual(); $("#h-btn").disabled = false; }
    S.habitudes.unshift({ texte: t, freq: +$("#h-freq").value, moment: $("#h-moment").value });
    S.habitudes = S.habitudes.slice(0, 30); $("#h-plat").value = ""; renderHabitudes(); save();
  });
  $("#h-plat").addEventListener("keydown", e => { if (e.key === "Enter") $("#h-btn").click(); });
  $("#h-list").addEventListener("click", e => {
    const b = e.target.closest("[data-hrm]"); if (b) { S.habitudes.splice(+b.dataset.hrm, 1); renderHabitudes(); save(); return; }
    const c = e.target.closest("[data-hclaude]"); if (c) {
      const h = S.habitudes[+c.dataset.hclaude]; const a = N.analyzeHabit(h.texte, h.freq, h.moment, calc().meal);
      askClaude(`${profileText()}\nJe mange souvent « ${h.texte} », ${h.freq >= 10 ? "plus d'une fois par jour" : h.freq + " fois par semaine"}, au ${h.moment}.${a ? ` Mon appli l'estime à environ ${fmt(a.nut.kcal)} kcal par portion, note ${a.grade}.` : ""} Est-ce une bonne habitude pour moi ? Qu'est-ce que je peux changer, concrètement et sans me priver, et par quoi le remplacer certains jours ?`);
    }
  });
}

/* ---------- Plaisir ---------- */
function renderPlaisir() {
  const c = calc(), P = c.week * .10;
  let used = 0; for (const [k, v] of Object.entries(S.plaisirs)) { const t = TREATS.find(x => x[0] === k); if (t) used += t[1] * v; }
  $("#pl-budget").textContent = fmt(P) + " kcal"; $("#pl-used").textContent = fmt(used) + " kcal";
  const g = $("#pl-gauge"); g.firstElementChild.style.width = Math.min(100, used / P * 100) + "%"; g.classList.toggle("over", used > P);
  $("#pl-msg").textContent = !used ? `Ta marge correspond à 10 % de ta semaine, soit par exemple ${Math.floor(P / 270)} croissants ou ${Math.floor(P / 100)} verres de vin. Touche les envies que tu prévois pour voir ce qui rentre (plusieurs touches pour en compter plusieurs).`
    : used <= P ? `Il te reste ${fmt(P - used)} kcal de marge cette semaine.`
    : `Tu dépasses ta marge de ${fmt(used - P)} kcal. Rien de grave sur une semaine : choisis ce qui compte le plus pour toi, ou compense en douceur avec deux dîners un peu plus légers.`;
  $("#treats").innerHTML = TREATS.map(([n, k]) => { const q = S.plaisirs[n] || 0; return `<button class="treat" data-tr="${esc(n)}" aria-pressed="${q > 0}"><span>${esc(n)}${q ? ` <b>×${q}</b>` : ""}</span><span class="num">≈ ${k} kcal</span></button>`; }).join("");
}
function bindPlaisir() {
  $("#treats").addEventListener("click", e => { const b = e.target.closest("[data-tr]"); if (!b) return; const n = b.dataset.tr; S.plaisirs[n] = ((S.plaisirs[n] || 0) + 1) % 4; if (!S.plaisirs[n]) delete S.plaisirs[n]; renderPlaisir(); save(); });
  $("#pl-reset").addEventListener("click", () => { S.plaisirs = {}; renderPlaisir(); save(); });
}

/* ---------- Frigo ---------- */
function bindFrigo() {
  $("#fr-go").addEventListener("click", () => {
    const t = $("#fr-in").value.trim(); if (!t) { $("#fr-in").focus(); return; }
    const known = N.findIngredients(t);
    const res = N.fromFridge(t, { vege: S.f.vege });
    $("#fr-out").innerHTML = (known.length ? `<p class="note">Reconnu : ${esc(known.map(k => N.ing(k).l).join(", "))}.</p>` : "") +
      (res.length ? `<div class="list">${res.map(x => dishRow(x.r, `<div class="meta">Tu as ${x.ok} ingrédient${x.ok > 1 ? "s" : ""} sur ${x.ok + x.miss.length}.${x.miss.length ? " Il manque : " + esc(x.miss.join(", ")) + "." : " Tu as tout !"}</div>`)).join("")}</div>` : `<p class="note">Aucun plat de la base ne colle. Demande à Claude, il sait improviser.</p>`);
  });
  $("#fr-claude").addEventListener("click", () => { const t = $("#fr-in").value.trim(); askClaude(`${profileText()}\nIl me reste : ${t || "(liste à compléter)"}. J'ai aussi sel, poivre, huile et épices courantes. Propose-moi trois recettes simples et équilibrées avec surtout ces ingrédients, avec étapes et temps.`); });
}

/* ---------- Batch ---------- */
function bindBatch() {
  $("#b-go").addEventListener("click", () => {
    const recs = S.semaine.map(it => { const d = weekDish(it); if (!d) return null; return d.r || { nom: d.nom, t_prep: 15, t_cuisson: 30, t_passif: 0, mode: "plaque", frigo: 3, congel: true }; }).filter(Boolean);
    if (!recs.length) { $("#b-out").innerHTML = `<p class="note">Ajoute d'abord des plats à ta semaine, depuis l'onglet Plats.</p>`; return; }
    const uniq = [...new Map(recs.map(r => [r.nom, r])).values()];
    const plan = N.batchPlan(uniq);
    const cons = uniq.map(r => `<li><b>${esc(r.nom)}</b> : ${r.frigo ? `${r.frigo} jour${r.frigo > 1 ? "s" : ""} au réfrigérateur` : "à manger le jour même, garde plutôt les éléments séparés"}${r.congel ? ", se congèle" : ""}.${r.frigo && r.frigo < 4 && r.congel ? " Congèle les portions prévues pour la fin de semaine." : ""}</li>`).join("");
    $("#b-out").innerHTML = `<div class="box"><p><span class="k">Durée estimée :</span> ${timeTxt(plan.duree)}</p><ol class="steps">${plan.steps.map(s => `<li><span class="num">${s.quand}</span> · ${esc(s.txt)}</li>`).join("")}</ol></div><div class="box"><span class="k">Conservation</span><ul>${cons}</ul></div>`;
  });
  $("#b-claude").addEventListener("click", () => {
    const noms = S.semaine.map(it => (weekDish(it) || {}).nom).filter(Boolean);
    askClaude(`${profileText()} Foyer : ${S.courses.pers} personne(s).\nPlats de ma semaine : ${noms.join(" ; ") || "(à choisir)"}.\nOrganise-moi une session de batch cooking le dimanche : ordre des tâches avec horaires, ce qui cuit en parallèle, et la conservation de chaque plat.`);
  });
}

/* ---------- Importer ---------- */
let imp = null;
function candidates(name) {
  const out = [];
  for (const k of N.findIngredients(name)) out.push({ type: "dict", key: k, label: N.ing(k).l });
  const words = N.norm(name).split(" ").filter(w => w.length > 3);
  for (const i of N.ingredients()) if (out.length < 6 && words.some(w => N.norm(i.l).includes(w)) && !out.some(o => o.key === i.k)) out.push({ type: "dict", key: i.k, label: i.l });
  for (const c of N.ciqualSearch(name, 5)) out.push({ type: "ciqual", code: c.code, label: c.nom, n: c.n, fv: /fruits, legumes/.test(N.norm(c.groupe)) });
  return out.slice(0, 10);
}
async function runImport(text) {
  $("#r-out").innerHTML = `<p class="skel">Lecture de la recette…</p>`;
  await loadCiqual();
  const p = N.parseRecipe(text);
  imp = { titre: p.titre, portions: p.portions || 2, etapes: p.etapes, lines: p.ings.map(l => ({ raw: l.raw, name: l.name, grams: l.grams ? Math.round(l.grams) : null, source: l.source, n: l.n, fv: l.fv, key: l.key, cands: null, skip: false })) };
  renderImport();
}
function impItems() {
  const per = Math.max(1, +imp.portions || 1);
  return imp.lines.filter(l => !l.skip && l.n && l.grams).map(l => ({ key: l.key || null, code: l.source && l.source.code || null, label: l.key ? N.ing(l.key).l : (l.source ? l.source.label : l.name), n: l.n, g: l.grams / per, fv: l.fv }));
}
function renderImport() {
  if (!imp) return;
  const items = impItems(); const nut = N.dish(items);
  const light = N.lighter(items, nut);
  const bad = imp.lines.filter(l => !l.skip && !l.n).length;
  $("#r-out").innerHTML = `<div class="grid2"><label class="f" style="grid-column:1/-1">Titre<input id="imp-t" value="${esc(imp.titre)}"></label><label class="f">Nombre de portions<input id="imp-p" type="number" min="1" max="20" value="${imp.portions}" inputmode="numeric"></label></div>
  <div class="row" style="flex-wrap:nowrap">${gradeBadge(nut.ns.grade, true)}<div style="min-width:0"><div class="k num">${fmt(nut.kcal)} kcal par portion</div><div class="note">${dec(nut.prot)} g de protéines · ${dec(nut.sel, 1)} g de sel · ${Math.round(nut.fvPct)} % de fruits et légumes</div></div></div>
  ${bad ? `<p class="err">${bad} ligne${bad > 1 ? "s" : ""} non reconnue${bad > 1 ? "s" : ""} : touche « Corriger » pour choisir l'aliment, sinon elle${bad > 1 ? "s" : ""} ne compte${bad > 1 ? "nt" : ""} pas.</p>` : ""}
  <div class="parse">${imp.lines.map((l, i) => `<div class="pl ${l.n || l.skip ? "" : "bad"}"><div style="min-width:0"><div>${esc(l.raw)}</div><div class="m">${l.skip ? "ignoré" : l.n ? "→ " + esc(l.key ? N.ing(l.key).l : l.source.label) : "non reconnu"}</div></div><div class="row" style="flex-wrap:nowrap"><input type="number" min="0" step="1" value="${l.grams ?? ""}" data-ig="${i}" aria-label="Grammes" placeholder="g"><span class="note">g</span></div>${l.cands ? `<select data-is="${i}"><option value="">Choisir l'aliment…</option>${l.cands.map((c, j) => `<option value="${j}">${esc(c.label)}${c.type === "ciqual" ? " (Ciqual)" : ""}</option>`).join("")}<option value="skip">Ignorer cette ligne</option></select>` : `<button class="btn ghost small" data-ifix="${i}" style="justify-self:start">Corriger</button>`}</div>`).join("")}</div>
  ${light.length ? `<div class="box"><span class="k">Pour une version plus légère</span><ul>${light.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
  <div class="row"><button class="btn" id="imp-save">Enregistrer dans mon carnet</button><button class="btn ghost" id="imp-claude">Demander à Claude</button></div>`;
}
function bindImporter() {
  $("#r-go").addEventListener("click", () => { const t = $("#r-in").value.trim(); if (t.length < 20) { $("#r-out").innerHTML = `<p class="note">Colle le texte complet de la recette, avec au moins la liste des ingrédients.</p>`; return; } runImport(t); });
  $("#r-out").addEventListener("change", e => {
    if (!imp) return;
    if (e.target.id === "imp-t") { imp.titre = e.target.value; return; }
    if (e.target.id === "imp-p") { imp.portions = Math.max(1, +e.target.value || 1); renderImport(); return; }
    const g = e.target.closest("[data-ig]"); if (g) { imp.lines[+g.dataset.ig].grams = +g.value || null; renderImport(); return; }
    const s = e.target.closest("[data-is]"); if (s) {
      const l = imp.lines[+s.dataset.is];
      if (s.value === "skip") { l.skip = true; }
      else if (s.value !== "") { const c = l.cands[+s.value]; l.skip = false;
        if (c.type === "dict") { const i = N.ing(c.key); l.key = c.key; l.n = i.n; l.fv = ["legume", "fruit", "legumineuse"].includes(i.cat); l.source = { type: "dict", key: c.key, label: i.l }; if (!l.grams) l.grams = Math.round(i.pt); }
        else { l.key = null; l.n = c.n; l.fv = c.fv; l.source = { type: "ciqual", code: c.code, label: c.label }; if (!l.grams) l.grams = 100; } }
      l.cands = null; renderImport();
    }
  });
  $("#r-out").addEventListener("click", e => {
    const f = e.target.closest("[data-ifix]"); if (f) { const l = imp.lines[+f.dataset.ifix]; l.cands = candidates(l.name || l.raw); renderImport(); return; }
    if (e.target.id === "imp-save") {
      const items = impItems(); if (!items.length) { toast("Aucun ingrédient reconnu : corrige au moins une ligne."); return; }
      const nut = N.dish(items);
      const c = { id: "c" + Date.now().toString(36), nom: imp.titre || "Recette importée", portions: imp.portions, items, etapes: imp.etapes, light: N.lighter(items, nut) };
      S.carnet.unshift(c); save(); renderCarnet(); imp = null; $("#r-in").value = ""; $("#r-out").innerHTML = `<p class="note">Recette rangée dans ton carnet.</p>`; toast("Recette enregistrée");
    }
    if (e.target.id === "imp-claude") askClaude(`${profileText()}\nVoici une recette que j'aimerais cuisiner :\n\n${$("#r-in").value.slice(0, 4000)}\n\nPeux-tu me proposer une version plus équilibrée qui garde le goût, avec les quantités pour ${imp ? imp.portions : 2} personnes ?`);
  });
}
function renderCarnet() {
  $("#carnet").innerHTML = S.carnet.length ? S.carnet.map(c => { const n = N.dish(c.items); return `<div class="dish" data-openc="${esc(c.id)}">${gradeBadge(n.ns.grade)}<div style="min-width:0"><div class="t">${esc(c.nom)}</div><div class="meta num">${fmt(n.kcal)} kcal / portion</div></div><button class="btn ghost small" data-addc="${esc(c.id)}">Ajouter</button></div>`; }).join("") : `<p class="note">Les recettes importées se rangent ici. Tu pourras les ajouter à ta semaine comme les autres plats.</p>`;
}

/* ---------- Saison ---------- */
function renderSaison(m) {
  m = m || MONTH;
  const sel = $("#s-month"); if (!sel.options.length) sel.innerHTML = MONTHS.map((n, i) => `<option value="${i + 1}">${n[0].toUpperCase() + n.slice(1)}</option>`).join("");
  sel.value = m; $("#s-title").textContent = `De saison en ${MONTHS[m - 1]}`;
  $("#s-leg").innerHTML = SEASON[m].l.map(x => `<li>${x}</li>`).join("");
  $("#s-fru").innerHTML = SEASON[m].f.map(x => `<li>${x}</li>`).join("");
}

/* ---------- Réglages ---------- */
function importData(o) {
  if (!o || typeof o !== "object") throw new Error("format");
  if (o.v === 2) { merge(o); return; }
  // export de la version dans Claude
  const n = clone(DEFAULT);
  if (o.p) n.p = Object.assign({}, n.p, o.p);
  n.exemple = !!o.exemple;
  if (o.f) { n.f.niv = o.f.niv || n.f.niv; n.f.vege = !!o.f.vege; }
  if (Array.isArray(o.pdays)) n.pdays = o.pdays;
  if (o.plaisirs) n.plaisirs = o.plaisirs;
  if (o.courses) { n.courses.mag = o.courses.mag || "super"; n.courses.pers = o.courses.pers || 1; }
  n.habitudes = (o.habitudes || []).map(h => ({ texte: h.plat || h.texte, freq: +h.freq || (h.freq === "plus d'une fois par jour" ? 10 : 3), moment: h.moment || "dîner" })).filter(h => h.texte);
  n.semaine = (o.semaine || []).map(d => ({ legacy: { nom: d.nom, kcal: d.kcal, g: d.g, ing: d.ing || [] } }));
  n.carnet = (o.carnet || []).map(c => ({ id: c.id || "c" + Math.random().toString(36).slice(2, 8), nom: c.nom, portions: 1, items: (c.ing || []).map(x => { const k = N.matchIngredient(x.n); return k ? { key: k, label: N.ing(k).l, n: N.ing(k).n, g: N.gramsFor(k, x.q, x.u) || 0, fv: ["legume", "fruit", "legumineuse"].includes(N.ing(k).cat) } : null; }).filter(Boolean), etapes: [], light: c.allege || [] }));
  merge(n);
}
function bindReglages() {
  $("#g-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `garde-manger-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Sauvegarde enregistrée dans tes téléchargements");
  });
  $("#g-importBtn").addEventListener("click", () => $("#g-file").click());
  $("#g-file").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try { importData(JSON.parse(await f.text())); save(); renderAll(); toast("Données restaurées"); } catch (err) { toast("Ce fichier n'est pas une sauvegarde Garde-manger."); }
    e.target.value = "";
  });
  $("#g-pasteGo").addEventListener("click", () => {
    try { importData(JSON.parse($("#g-paste").value.trim())); save(); renderAll(); $("#g-paste").value = ""; toast("Données importées"); } catch (err) { toast("Texte non reconnu : copie-le à nouveau depuis l'ancienne version."); }
  });
  $("#g-reset").addEventListener("click", () => { $("#g-resetOk").hidden = false; });
  $("#g-resetOk").addEventListener("click", () => { S = clone(DEFAULT); save(); renderAll(); $("#g-resetOk").hidden = true; toast("Données effacées"); });
  $("#g-version").textContent = `Version ${VERSION} · ${N.recipes().length} recettes · ${N.ingredients().length} ingrédients reliés à Ciqual`;
}

/* ---------- Onglets, installation, partage ---------- */
const TABS = $$("#tabs button");
function showTab(t) {
  if (!document.getElementById(t)) t = "objectif";
  TABS.forEach(b => b.setAttribute("aria-selected", b.dataset.t === t));
  $$("section.pane").forEach(s => (s.hidden = s.id !== t));
  const b = TABS.find(x => x.dataset.t === t); if (b) b.scrollIntoView({ inline: "center", block: "nearest" });
  try { localStorage.setItem("gm-tab", t); } catch (e) {}
  if (t !== "scanner") closeScanner();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) { showTab(b.dataset.t); window.scrollTo({ top: 0 }); history.replaceState(null, "", "#" + b.dataset.t); } });
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#installBtn").hidden = false; });
$("#installBtn").addEventListener("click", async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; $("#installBtn").hidden = true; });
window.addEventListener("appinstalled", () => { $("#installBtn").hidden = true; askPersist(); });
function handleShare() {
  const q = new URLSearchParams(location.search);
  const text = [q.get("title"), q.get("text")].filter(Boolean).join("\n").trim(), url = q.get("url") || "";
  if (!text && !url) return false;
  history.replaceState(null, "", location.pathname + "#importer");
  showTab("importer");
  const onlyUrl = !text || /^https?:\/\/\S+$/.test(text);
  if (onlyUrl) {
    $("#r-urlnote").hidden = false;
    $("#r-urlnote").textContent = `Seul le lien a été partagé (${url || text}). L'appli ne peut pas lire la page elle-même : ouvre la recette, sélectionne le texte des ingrédients et des étapes, puis partage cette sélection vers Garde-manger.`;
  } else { $("#r-in").value = text; runImport(text); }
  return true;
}

function renderAll() { renderObjectif(); renderPlats(); renderHabitudes(); renderPlaisir(); renderCourses(); renderCarnet(); renderScanHist(); renderSaison(); }

async function start() {
  load();
  try {
    const [ing, rec] = await Promise.all([fetch("data/ingredients.json").then(r => r.json()), fetch("data/recettes.json").then(r => r.json())]);
    N.init(ing, rec);
  } catch (e) { document.body.insertAdjacentHTML("afterbegin", `<p class="err" style="padding:16px">Les données n'ont pas pu être chargées. Vérifie ta connexion puis recharge la page.</p>`); return; }
  bindObjectif(); bindPlats(); bindScanner(); bindCourses(); bindHabitudes(); bindPlaisir(); bindFrigo(); bindBatch(); bindImporter(); bindReglages();
  $("#s-month").addEventListener("change", e => renderSaison(+e.target.value));
  $("#s-plats").addEventListener("click", () => { S.f.saison = true; S.f.cat = "tout"; renderPlats(); showTab("plats"); save(); });
  renderAll();
  if (!handleShare()) {
    let t = (location.hash || "").slice(1); if (!t) { try { t = localStorage.getItem("gm-tab") || ""; } catch (e) {} }
    showTab(t || "objectif");
  }
  if (S.habitudes.length || S.carnet.length) loadCiqual().then(() => renderHabitudes());
  askPersist();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
start();
})();
