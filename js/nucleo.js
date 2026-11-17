/* ---------------------------------------------------------------
   NÚCLEO — toda la lógica que no toca la pantalla: combinaciones,
   nombres, porciones y macros, filtros, plato del día, listas de
   compras y el pedido de receta. Corre igual en el navegador y en
   Node (lo usan las pruebas).
   --------------------------------------------------------------- */

const N = (() => {

  const MODOS = {
    bajar:    { id: 'bajar',    n: 'Bajar',    kcal: 550, aceite: [5],          verd: 1.2,  extras: 0.75 },
    mantener: { id: 'mantener', n: 'Mantener', kcal: 750, aceite: [10],         verd: 1,    extras: 1 },
    subir:    { id: 'subir',    n: 'Subir',    kcal: 950, aceite: [15, 20, 25, 30], verd: 0.85, extras: 1 }
  };
  const PROTEINA_OBJETIVO = 50;
  const MAX_VERDURAS = 3;

  const I = INGREDIENTES;
  const L = s => (s || '').split(/\s+/).filter(Boolean);
  const GRUPO = {};
  PROTEINAS.forEach(p => { GRUPO[p.id] = p; });
  const ESTILO = {};
  ESTILOS.forEach(e => { ESTILO[e.id] = e; });
  const TRIOS_N = TRIOS.map(L);

  /* ---------- platos normalizados ---------- */

  function normalizar(d) {
    const g = GRUPO[d.g];
    const o = Object.assign({}, d);
    o.ing = d.ing || g.ing;
    o.fijos = L(d.fijos).map(x => { const [i, gr] = x.split(':'); return { i, g: +gr }; });
    o.c = L(d.c); o.v = L(d.v); o.vd = L(d.vd); o.vf = L(d.vf); o.s = L(d.s);
    o.eq = L(d.eq); o.tags = L(d.tags);
    o.cn = d.cn !== 0;
    o.sn = d.sn !== 0;
    o.sd = d.sd != null ? !!d.sd : !!g.sd;
    o.ac = d.ac == null ? 1 : d.ac;
    o.vg = d.vg == null ? 1 : d.vg;
    o.rec = d.rec == null ? 1 : d.rec;
    o.lim = {};
    L(d.lc).forEach(x => { const [i, r] = x.split(':'); o.lim[i] = r.split('-').map(Number); });
    return o;
  }

  const platos = PLATOS.map(normalizar);
  const porId = {};
  platos.forEach(d => { porId[d.id] = d; });

  /* ---------- azar determinista ---------- */

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function azar(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ymd(f) {
    const p = n => String(n).padStart(2, '0');
    return f.getFullYear() + '-' + p(f.getMonth() + 1) + '-' + p(f.getDate());
  }

  /* ---------- combinaciones ---------- */

  /* Una combinación: { p: plato, c: carbohidrato, v: [verduras], s: salsa } */

  function comboBase(d) {
    return { p: d, c: d.c[0], v: d.vd.slice(), s: d.s[0] };
  }

  function comboDe(d, c, v, s) {
    const k = comboBase(d);
    if (c && d.c.includes(c)) k.c = c;
    if (s && d.s.includes(s)) k.s = s;
    if (v) {
      const vs = v.filter(x => d.v.includes(x) && !d.vf.includes(x)).slice(0, MAX_VERDURAS - d.vf.length);
      if (vs.length + d.vf.length >= 1 || !d.v.length) k.v = vs;
    }
    return k;
  }

  function valida(k) {
    const d = k.p;
    if (!d.c.includes(k.c) || !d.s.includes(k.s)) return false;
    if (k.v.some(x => !d.v.includes(x))) return false;
    if (k.v.length + d.vf.length > MAX_VERDURAS) return false;
    return k.v.length + d.vf.length >= 1;
  }

  function clave(k) { return [k.p.id, k.c, k.v.join(','), k.s].join('|'); }

  function desdeClave(txt) {
    const [id, c, v, s] = String(txt || '').split('|');
    const d = porId[id];
    if (!d) return null;
    return comboDe(d, c, v ? v.split(',').filter(Boolean) : null, s);
  }

  /* Una variante distinta del plato según la semilla: para que las
     sugerencias no sean siempre la misma combinación. */
  function variar(d, semilla) {
    const r = azar(hash(semilla + ':' + d.id));
    const k = comboBase(d);
    k.c = d.c[Math.floor(r() * Math.min(3, d.c.length))];
    k.s = r() < 0.55 ? d.s[0] : d.s[Math.floor(r() * d.s.length)];
    const max = MAX_VERDURAS - d.vf.length;
    const opciones = [d.vd];
    TRIOS_N.forEach(t => {
      const sirve = t.filter(x => d.v.includes(x) && !d.vf.includes(x));
      if (sirve.length === t.length || sirve.length >= 2) opciones.push(sirve.slice(0, max));
    });
    const elegida = opciones[Math.floor(r() * opciones.length)];
    if (elegida.length + d.vf.length >= 1) k.v = elegida.slice(0, max);
    return k;
  }

  /* ---------- nombre ---------- */

  function unir(xs) {
    if (xs.length <= 1) return xs.join('');
    const ult = xs[xs.length - 1];
    const y = /^h?i/i.test(ult) ? ' e ' : ' y ';
    return xs.slice(0, -1).join(', ') + y + ult;
  }

  /* principal: "Pollo a la crema"   resto: "fideos, brócoli y espinaca" */
  function partes(k) {
    const d = k.p, carbo = I[k.c], salsa = SALSAS[k.s];
    let frag = d.sn && salsa && salsa.frag ? salsa.frag : '';
    let base = d.n;
    const resto = [];
    if (base.includes('{S}')) {
      const sinS = base.replace('{S}', '');
      if (frag && /^con /.test(frag) && / con /.test(sinS.replace('{C} con', '{C}'))) frag = 'y ' + frag.slice(4);
      base = base.replace('{S}', frag ? ' ' + frag : '');
    } else if (/^con /.test(frag)) {
      resto.push(frag.slice(4));
    } else if (frag) {
      base += ' ' + frag;
    }
    const carboAdentro = base.includes('{C}');
    const principal = base.replace('{C}', base.indexOf('{C}') === 0 ? carbo.tit : carbo.tit.toLowerCase());
    if (!carboAdentro && d.cn) resto.push(carbo.n);
    k.v.forEach(v => resto.push(I[v].n));
    return { principal, resto };
  }

  function nombre(k) {
    const { principal, resto } = partes(k);
    if (!resto.length) return principal;
    const lista = unir(resto);
    if (!/ con /.test(principal)) return principal + ' con ' + lista;
    if (/ y |,/.test(principal)) return principal + ', con ' + lista;
    return principal + (resto.length === 1 ? ' y ' : ', ') + lista;
  }

  function nombrePrincipal(k) { return partes(k).principal; }
  function acompanamiento(k) {
    const r = partes(k).resto;
    return r.length ? 'con ' + unir(r) : '';
  }

  /* ---------- tiempo, equipo, vajilla ---------- */

  function tiempo(k) {
    const d = k.p;
    return d.todoEnUno ? d.min : Math.max(d.min, I[k.c].min || 0);
  }
  function recipientes(k) {
    const d = k.p;
    return d.rec + (d.todoEnUno ? 0 : (I[k.c].olla || 0));
  }
  function equipo(k) {
    const d = k.p;
    const eq = d.eq.slice();
    if (!d.todoEnUno) L(I[k.c].eq).forEach(e => { if (!eq.includes(e)) eq.push(e); });
    return eq;
  }
  function esFrio(k) { return !!k.p.frio && !(I[k.c].min > 0); }
  function conSalsa(k) { return !!SALSAS[k.s].sal; }
  function esExpress(k) { return tiempo(k) <= 15 && recipientes(k) <= 1; }

  /* ---------- porciones y macros ---------- */

  const r10 = x => Math.max(10, Math.round(x / 10) * 10);

  function factorVerduras(n) { return n <= 1 ? 1.8 : n === 2 ? 1.25 : n === 3 ? 1 : 0.85; }

  /* La proteína nunca baja al subir de objetivo: lo que crece es la
     guarnición. Por eso Mantener parte de los gramos de Bajar, y Subir
     de los de Mantener. */
  const ANTERIOR = { mantener: 'bajar', subir: 'mantener' };
  const memo = new Map();

  function porciones(k, modoId) {
    const m = MODOS[modoId] || MODOS.mantener;
    const key = clave(k) + '#' + m.id;
    let por = memo.get(key);
    if (!por) {
      const previo = ANTERIOR[m.id] ? porciones(k, ANTERIOR[m.id]) : null;
      por = resolver(k, m, previo ? previo.items[0].g : 0);
      if (memo.size > 4000) memo.clear();
      memo.set(key, por);
    }
    return por;
  }

  function resolver(k, m, minProteina) {
    const d = k.p;
    const fijos = [];
    d.fijos.forEach(f => fijos.push({ id: f.i, g: (I[f.i].u || I[f.i].magro) ? f.g : r5(f.g * m.extras), rol: 'extra' }));
    const vs = d.vf.concat(k.v);
    const fv = factorVerduras(vs.length) * m.verd * d.vg;
    vs.forEach(v => fijos.push({ id: v, g: Math.min(r10(I[v].po * fv), I[v].tope || 999), rol: 'verdura' }));
    const salsa = SALSAS[k.s];

    let kcal0 = salsa.g * salsa.kcal / 100;
    let p0 = salsa.g * salsa.p / 100;
    fijos.forEach(f => { kcal0 += f.g * I[f.id].kcal / 100; p0 += f.g * I[f.id].p / 100; });

    const ip = I[d.ing], ic = I[k.c];
    const limP = d.lim[d.ing] || ip.lim, limC = d.lim[k.c] || ic.lim;
    const pasoP = ip.paso || 10, pasoC = ic.paso || 10;
    const aceites = Array.from(new Set(m.aceite.map(a => Math.round(a * d.ac))));
    let mejor = null;
    aceites.forEach((ac, n) => {
      const kcalAc = ac * I.aceite.kcal / 100;
      for (let gp = Math.max(limP[0], minProteina); gp <= limP[1]; gp += pasoP) {
        for (let gc = limC[0]; gc <= limC[1]; gc += pasoC) {
          const kc = kcal0 + kcalAc + gp * ip.kcal / 100 + gc * ic.kcal / 100;
          const pr = p0 + gp * ip.p / 100 + gc * ic.p / 100;
          const e = error(kc, pr, m) + n * 0.002;
          if (!mejor || e < mejor.e) mejor = { e, gp, gc, kc, pr, ac };
        }
      }
    });
    const aceite = mejor.ac;

    const items = [{ id: d.ing, g: mejor.gp, rol: 'proteina' }, { id: k.c, g: mejor.gc, rol: 'carbo' }]
      .concat(fijos.filter(f => f.rol === 'verdura'))
      .concat(fijos.filter(f => f.rol === 'extra'));
    items.forEach(it => { it.txt = textoItem(it); });
    const extra = completar(mejor.kc, mejor.pr, m);
    return {
      items,
      salsa: { id: k.s, n: salsa.n, g: salsa.g },
      aceite,
      kcal: mejor.kc, p: mejor.pr,
      completar: extra ? extra.items : [],
      kcalTotal: mejor.kc + (extra ? extra.kcal : 0),
      pTotal: mejor.pr + (extra ? extra.p : 0),
      kcalObjetivo: m.kcal, pObjetivo: PROTEINA_OBJETIVO
    };
  }

  /* Qué tan lejos queda del objetivo. Pasarse de proteína casi no
     cuenta: lo que importa es no quedar corto. */
  function error(kc, pr, m, sobra) {
    const dp = (pr - PROTEINA_OBJETIVO) / PROTEINA_OBJETIVO;
    return Math.pow((kc - m.kcal) / m.kcal, 2) + (dp < 0 ? 1 : (sobra == null ? 0.12 : sobra)) * dp * dp;
  }

  /* Si el plato, con porciones normales, queda más de un 10% corto,
     elige hasta tres complementos (fruta, yogur, frutos secos…) que lo
     acerquen al objetivo. Devuelve null si no hace falta nada. */
  const COMBOS_COMPL = (() => {
    const out = [], C = COMPLEMENTOS, n = C.length;
    for (let a = 0; a < n; a++) {
      out.push([C[a]]);
      for (let b = a + 1; b < n; b++) {
        out.push([C[a], C[b]]);
        for (let c = b + 1; c < n; c++) out.push([C[a], C[b], C[c]]);
      }
    }
    return out.map(items => ({
      items,
      kcal: items.reduce((s, x) => s + x.kcal, 0),
      p: items.reduce((s, x) => s + x.p, 0)
    }));
  })();

  function completar(kc, pr, m) {
    if (kc >= m.kcal * 0.9 && pr >= PROTEINA_OBJETIVO * 0.9) return null;
    const sobra = pr >= PROTEINA_OBJETIVO;
    const puntos = (k2, p2, items) => error(k2, p2, m, 0) + items.length * 0.0015 +
      (sobra ? 0.004 * (p2 - pr) : 0);
    let mejor = null, e0 = puntos(kc, pr, []);
    COMBOS_COMPL.forEach(x => {
      const e = puntos(kc + x.kcal, pr + x.p, x.items);
      if (e < e0) { e0 = e; mejor = x; }
    });
    return mejor;
  }

  function textoCompletar(por) {
    return por.completar.length ? unir(por.completar.map(x => x.n)) : '';
  }

  const FRACC = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  function enUnidades(g, u) {
    const paso = u.frac ? 0.25 : 0.5;
    const n = Math.max(paso, Math.round(g / u.g / paso) * paso);
    const ent = Math.floor(n), fr = n - ent;
    const num = (ent ? String(ent) : '') + (fr ? FRACC[fr] : '');
    return { n, txt: num + ' ' + (n > 1 ? u.pl : u.s) };
  }

  function textoItem(it) {
    const ing = I[it.id];
    if (it.rol === 'proteina' || it.rol === 'extra') {
      if (ing.u) {
        const u = enUnidades(it.g, ing.u);
        return ing.u.s === 'huevo' ? u.txt : u.txt + ' de ' + sinPlural(ing.n) + ' (' + it.g + ' g)';
      }
      return it.g + ' g de ' + ing.n + (it.rol === 'proteina' && ing.t === 'prot' ? ' (en crudo)' : '');
    }
    if (it.rol === 'carbo') {
      if (ing.u) {
        const u = enUnidades(it.g, ing.u);
        if (ing.med) return it.g + ' g de ' + ing.n + ' ' + ing.med + ' (≈ ' + u.txt + ')';
        return u.txt + (ing.u.s === 'tapa' ? ' de tarta' : ing.u.s === 'pan' ? ' de hamburguesa o figazza' : ing.u.s === 'rebanada' ? ' de pan lactal' : ing.u.s === 'tortilla' ? ' de trigo' : '');
      }
      if (ing.med === 'crudo') return it.g + ' g de ' + (it.id === 'batata' ? 'batata' : 'papa') + ' (en crudo)';
      let t = it.g + ' g de ' + ing.n + (ing.med ? ' ' + ing.med : '');
      if (ing.seco) t += ' (≈ ' + r5(it.g * ing.seco) + ' g ' + (ing.secoN || 'en crudo') + ')';
      return t;
    }
    return it.g + ' g de ' + ing.n;
  }
  const r5 = x => Math.max(5, Math.round(x / 5) * 5);
  function sinPlural(n) { return n.replace(/^milanesas de /, '').replace(/ al natural$/, ''); }

  function textoAceite(g) {
    if (!g) return '';
    if (g <= 3) return 'apenas un rocío de aceite';
    if (g <= 6) return '1 cucharadita de aceite';
    if (g <= 11) return '1 cucharada de aceite';
    if (g <= 16) return '1½ cucharadas de aceite';
    return '2 cucharadas de aceite';
  }

  function redondeados(por) {
    return {
      kcal: Math.round(por.kcal / 10) * 10, p: Math.round(por.p),
      kcalTotal: Math.round(por.kcalTotal / 10) * 10, pTotal: Math.round(por.pTotal)
    };
  }

  /* ---------- filtros ---------- */

  /* f: { t, sd, eq:[], sarten, vajilla, salsa, nunca, favs, frio, express,
          via, top, g, e, tags:[] }
     ctx: { favoritos, hechos } */
  function pasaPlato(d, f, ctx) {
    ctx = ctx || {};
    if (f.sd && !d.sd) return false;
    if (f.vajilla && d.vaj !== 'poca') return false;
    if (f.eq && f.eq.some(e => !d.eq.includes(e))) return false;
    if (f.nunca && ctx.hechos && ctx.hechos[d.id]) return false;
    if (f.favs && !(ctx.favoritos && ctx.favoritos[d.id])) return false;
    if (f.via && !d.via) return false;
    if (f.g && d.g !== f.g) return false;
    if (f.e && d.e !== f.e) return false;
    if (f.frio && !d.frio) return false;
    if (f.tags && f.tags.some(t => t !== 'salsa' && !d.tags.includes(t))) return false;
    return true;
  }

  function pasaCombo(k, f) {
    if (f.t && tiempo(k) > f.t) return false;
    if (f.sarten && recipientes(k) > 1) return false;
    if (f.express && !esExpress(k)) return false;
    if ((f.salsa || (f.tags && f.tags.includes('salsa'))) && !conSalsa(k)) return false;
    if (f.frio && !esFrio(k)) return false;
    return true;
  }

  /* La combinación sugerida de un plato que cumple los filtros, o null. */
  function sugerir(d, f, ctx, base) {
    f = f || {};
    if (!pasaPlato(d, f, ctx)) return null;
    const k0 = base || comboBase(d);
    if (pasaCombo(k0, f)) return k0;
    const carbos = [k0.c].concat(d.c.filter(c => c !== k0.c));
    const salsas = [k0.s].concat(d.s.filter(s => s !== k0.s));
    for (const c of carbos) for (const s of salsas) {
      const k = { p: d, c, v: k0.v, s };
      if (pasaCombo(k, f)) return k;
    }
    return null;
  }

  function buscar(f, ctx, lista) {
    const out = [];
    (lista || platos).forEach(d => { const k = sugerir(d, f, ctx); if (k) out.push(k); });
    return out;
  }

  /* ---------- armador ---------- */

  function armador(sel) {
    return platos.filter(d =>
      (!sel.g || d.g === sel.g) &&
      (!sel.e || d.e === sel.e) &&
      (!sel.c || d.c.includes(sel.c)) &&
      (!sel.s || d.s.includes(sel.s)) &&
      (sel.v || []).every(v => d.v.includes(v) || d.vf.includes(v)));
  }

  function comboArmador(d, sel) {
    const v = (sel.v || []).filter(x => d.v.includes(x));
    return comboDe(d, sel.c, v.length ? v : null, sel.s);
  }

  /* ---------- tengo esto ---------- */

  const claveCompra = id => (I[id] && I[id].ck) || id;
  const enAlacena = id => !!(I[id] && I[id].al);

  function opcionesTengo() {
    const prot = [], verd = [], otros = [];
    const visto = {};
    const poner = (arr, id) => { const k = claveCompra(id); if (!visto[k] && !enAlacena(id)) { visto[k] = 1; arr.push(k); } };
    platos.forEach(d => { if (I[d.ing].t === 'prot') poner(prot, d.ing); });
    platos.forEach(d => d.v.concat(d.vf).forEach(v => poner(verd, v)));
    platos.forEach(d => {
      d.c.forEach(c => poner(otros, c));
      d.fijos.forEach(f => poner(otros, f.i));
      d.s.forEach(s => SALSAS[s].comp.forEach(c => { if (I[c].t === 'alac') poner(otros, c); }));
    });
    return { prot, verd, otros };
  }

  function nombreCompra(k) {
    if (k === 'papa') return 'papa';
    const ing = I[k];
    return ing ? (ing.nc || ing.n) : k;
  }

  function tengo(sel, f, ctx) {
    const S = new Set(sel);
    const out = [];
    platos.forEach(d => {
      if (!pasaPlato(d, f || {}, ctx)) return;
      const faltan = [], usados = new Set();
      const pedir = id => {
        const k = claveCompra(id);
        if (S.has(k)) usados.add(k);
        else if (!enAlacena(id)) faltan.push(k);
      };
      pedir(d.ing);
      d.fijos.forEach(x => pedir(x.i));
      d.vf.forEach(pedir);

      let c = d.c.find(x => S.has(claveCompra(x)));
      if (!c) c = d.c.find(enAlacena) || d.c[0];
      pedir(c);

      let v = d.v.filter(x => S.has(x)).slice(0, MAX_VERDURAS - d.vf.length);
      if (!v.length && !d.vf.length) {
        const deAlacena = d.v.find(enAlacena);
        v = [deAlacena || d.vd[0] || d.v[0]];
      }
      v.forEach(pedir);

      let s = null, peor = 99;
      d.s.forEach(x => {
        const n = SALSAS[x].comp.filter(c2 => !S.has(claveCompra(c2)) && !enAlacena(c2)).length;
        if (n < peor) { peor = n; s = x; }
      });
      SALSAS[s].comp.forEach(pedir);

      const unicos = Array.from(new Set(faltan));
      if (!usados.size || unicos.length > 1) return;
      const k = { p: d, c, v, s };
      if (!pasaCombo(k, f || {})) return;
      const r = { k, ok: unicos.length === 0, usados: usados.size };
      if (!r.ok) {
        const falta = unicos[0];
        r.falta = nombreCompra(falta);
        r.reemplazo = REEMPLAZOS[falta] || null;
        if (!r.reemplazo && I[falta] && I[falta].t === 'verd') {
          const otras = d.v.filter(x => x !== falta).slice(0, 3).map(x => I[x].n);
          if (otras.length) r.reemplazo = unir(otras).replace(/ y ([^,]+)$/, ' o $1');
        }
      }
      out.push(r);
    });
    out.sort((a, b) => (b.ok - a.ok) || (b.usados - a.usados) || (tiempo(a.k) - tiempo(b.k)));
    return out;
  }

  /* ---------- plato del día y orden por gusto ---------- */

  function peso(d, ctx) {
    ctx = ctx || {};
    let w = 1;
    if (d.top) w *= 1.3;
    const voto = ctx.votos && ctx.votos[d.id];
    if (voto > 0) w *= 2.2;
    if (voto < 0) w *= 0.08;
    if (ctx.favoritos && ctx.favoritos[d.id]) w *= 1.6;
    return w;
  }

  function elegirDelDia(fecha, ctx, excluir) {
    const fuera = new Set(excluir || []);
    const cand = platos.filter(d => !fuera.has(d.id)).map(d => {
      const u = (hash(fecha + '#' + d.id) + 1) / 4294967297;
      return { d, orden: -Math.log(u) / peso(d, ctx) };
    }).sort((a, b) => a.orden - b.orden);
    const elegidos = [], grupos = new Set(), estilos = new Set();
    for (const x of cand) {
      if (elegidos.length === 3) break;
      if (grupos.has(x.d.g) || estilos.has(x.d.e)) continue;
      elegidos.push(x.d); grupos.add(x.d.g); estilos.add(x.d.e);
    }
    return elegidos;
  }

  function platoDelDia(fecha, ctx) {
    const f = new Date(fecha + 'T12:00:00');
    f.setDate(f.getDate() - 1);
    const ayer = elegirDelDia(ymd(f), ctx, []).map(d => d.id);
    return elegirDelDia(fecha, ctx, ayer).map(d => variar(d, fecha));
  }

  function puntaje(d, ctx) {
    ctx = ctx || {};
    const voto = (ctx.votos && ctx.votos[d.id]) || 0;
    const hechos = (ctx.hechos && ctx.hechos[d.id]) || 0;
    const fav = ctx.favoritos && ctx.favoritos[d.id] ? 1 : 0;
    return voto * 4 + fav * 3 + Math.min(hechos, 6) * 0.5 + (d.top ? 1 : 0);
  }

  function losDeSiempre(ctx) {
    ctx = ctx || {};
    return platos
      .filter(d => d.top || (ctx.favoritos && ctx.favoritos[d.id]))
      .filter(d => !(ctx.votos && ctx.votos[d.id] < 0 && !(ctx.favoritos && ctx.favoritos[d.id])))
      .sort((a, b) => puntaje(b, ctx) - puntaje(a, ctx));
  }

  /* ---------- listas de compras ---------- */

  /* Devuelve renglones { id, n, sec, cant, al }. cant es texto o ''. */
  function comprasDeCombo(k, modoId, sinCantidades) {
    const por = porciones(k, modoId);
    const filas = {};
    const poner = (id, cant, g) => {
      const key = claveCompra(id);
      const ing = I[id];
      if (!filas[key]) filas[key] = { id: key, n: mayus(nombreCompra(key)), sec: ing.sec, al: !!ing.al, g: 0, u: ing.u || null, cant: '' };
      if (g) filas[key].g += g;
      if (cant != null) filas[key].cantFija = cant;
    };
    por.items.forEach(it => {
      const ing = I[it.id];
      if (it.rol === 'carbo' && ing.seco) poner(it.id, null, r5(it.g * ing.seco));
      else poner(it.id, null, it.g);
    });
    SALSAS[k.s].comp.forEach(c => { if (!filas[claveCompra(c)]) poner(c, '', 0); });
    if (por.aceite) poner('aceite', '', 0);
    return Object.values(filas).map(fl => {
      if (!sinCantidades && fl.g) fl.cant = fl.u ? enUnidades(fl.g, fl.u).txt : fl.g + ' g';
      return fl;
    });
  }

  function mayus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Suma una lista a otra. Las cantidades en gramos se acumulan. */
  function sumarCompras(base, extra) {
    const m = {};
    base.forEach(x => { m[x.id] = Object.assign({}, x); });
    extra.forEach(x => {
      if (!m[x.id]) { m[x.id] = Object.assign({}, x); return; }
      const y = m[x.id];
      if (y.g && x.g) { y.g += x.g; y.cant = y.u ? enUnidades(y.g, y.u).txt : y.g + ' g'; }
      else if (!y.g && x.g) { y.g = x.g; y.cant = x.cant; }
    });
    return Object.values(m);
  }

  function porSeccion(filas) {
    return SECCIONES.map(s => ({
      sec: s,
      items: filas.filter(x => x.sec === s.id && !x.al).sort((a, b) => a.n.localeCompare(b.n, 'es'))
    })).filter(g => g.items.length);
  }
  function deAlacena(filas) {
    return filas.filter(x => x.al).sort((a, b) => a.n.localeCompare(b.n, 'es'));
  }

  function textoCompras(titulo, filas) {
    const out = ['🛒 ' + titulo, ''];
    porSeccion(filas).forEach(g => {
      out.push(g.sec.n.toUpperCase());
      g.items.forEach(x => out.push('• ' + x.n + (x.cant ? ' — ' + x.cant : '')));
      out.push('');
    });
    const al = deAlacena(filas);
    if (al.length) out.push('Revisar que haya en casa: ' + al.map(x => x.n.toLowerCase()).join(', ') + '.');
    return out.join('\n').trim();
  }

  /* Qué conviene tener: sale de los favoritos y de lo más cocinado.
     Sin cantidades: es una lista de "qué tener", no un plan semanal. */
  function listaSugerida(ctx) {
    ctx = ctx || {};
    const fav = ctx.favoritos || {}, hechos = ctx.hechos || {}, ult = ctx.combos || {};
    let base = platos.filter(d => fav[d.id] || hechos[d.id])
      .sort((a, b) => puntaje(b, ctx) - puntaje(a, ctx)).slice(0, 10);
    let origen = 'tus favoritos y lo que más cocinás';
    if (base.length < 3) {
      base = losDeSiempre(ctx).slice(0, 8);
      origen = 'los de siempre (todavía no marcaste favoritos)';
    }
    let filas = [];
    base.forEach(d => {
      const k = (ult[d.id] && desdeClave(ult[d.id])) || comboBase(d);
      filas = sumarCompras(filas, comprasDeCombo(k, 'mantener', true));
    });
    filas.forEach(x => { x.cant = ''; x.g = 0; });
    return { filas, platos: base, origen };
  }

  /* ---------- recetas fijas: desayunos y recomendaciones ---------- */

  const INDICE_MODO = { bajar: 0, mantener: 1, subir: 2 };

  const desayunos = DESAYUNOS.map(d => Object.assign({}, d, {
    eq: L(d.eq),
    items: L(d.items).map(x => {
      const [id, q] = x.split(':');
      const qs = q.split('/').map(Number);
      return { id, q: qs.length === 1 ? [qs[0], qs[0], qs[0]] : qs };
    })
  }));
  const desayunoPorId = {};
  desayunos.forEach(d => { desayunoPorId[d.id] = d; });

  function cantidad(q, a) {
    const ent = Math.floor(q), fr = q - ent;
    return (ent ? String(ent) : '') + (fr ? FRACC[fr] : '') + ' ' + (q > 1 ? a.n[1] : a.n[0]);
  }

  /* Lo que lleva un desayuno para un objetivo, con sus calorías. */
  function porcionDesayuno(d, modoId) {
    const i = INDICE_MODO[modoId] == null ? 1 : INDICE_MODO[modoId];
    const items = [];
    let kcal = 0, p = 0;
    d.items.forEach(it => {
      const q = it.q[i], a = ALIM[it.id];
      if (!q) return;
      kcal += q * a.kcal; p += q * a.p;
      items.push({ id: it.id, q, txt: cantidad(q, a) });
    });
    return { items, kcal: Math.round(kcal / 10) * 10, p: Math.round(p) };
  }

  const recetas = RECETAS.map(r => Object.assign({}, r, { ing: r.ing.split(';').map(x => x.trim()).filter(Boolean) }));
  const recetaPorId = {};
  recetas.forEach(r => { recetaPorId[r.id] = r; });

  function textoReceta(r) {
    return [r.n, '', 'Ingredientes:'].concat(r.ing.map(x => '• ' + mayus(x)))
      .concat(['', 'Pasos:']).concat(r.p.map((x, i) => (i + 1) + '. ' + x)).join('\n');
  }

  /* ---------- pedido de receta ---------- */

  function promptReceta(k, modoId, personas) {
    const m = MODOS[modoId] || MODOS.mantener;
    const por = porciones(k, modoId);
    const r = redondeados(por);
    const n = personas || 1;
    const eq = equipo(k).map(e => EQUIPOS[e].n.toLowerCase());
    const lineas = por.items.map(it => '- ' + it.txt);
    lineas.push('- Salsa ' + por.salsa.n.toLowerCase() + ': unos ' + por.salsa.g + ' g');
    if (por.aceite) lineas.push('- ' + mayus(textoAceite(por.aceite)) + ' (' + por.aceite + ' g)');
    return [
      'Necesito la receta de: ' + nombre(k) + '.',
      'Es para ' + n + (n === 1 ? ' persona' : ' personas') + '.',
      '',
      'Ingredientes y cantidades' + (n === 1 ? '' : ' POR PERSONA') + ' (respetalas, son las de mi plan):',
      lineas.join('\n'),
      '',
      'Con estas cantidades el plato da ≈ ' + r.p + ' g de proteína y ≈ ' + r.kcal + ' kcal' +
        (por.completar.length ? ' (lo completo aparte con ' + textoCompletar(por) + ')' : '') +
        '. No sumes ingredientes con calorías sin avisarme.',
      '',
      'Tengo hornalla, horno eléctrico, microondas y air fryer.' +
        (eq.length ? ' Para este plato pensaba usar: ' + unir(eq) + '.' : ' Este plato es frío: no hay que cocinar.'),
      'Tiempo: lo ideal es que esté listo en unos ' + tiempo(k) + ' minutos.',
      '',
      'Restricciones (importantes):',
      '- Sin zanahoria.',
      '- Sin picante: nada de ají, chili ni pimienta en cantidad.',
      '- Sin cilantro, sin romero y sin especias fuertes.',
      '- No me gusta la comida seca: que quede jugoso.',
      '',
      'Cómo quiero la receta:',
      '- Paso a paso simple y numerado: soy torpe cocinando.',
      '- Lo más rápida posible y ensuciando poca vajilla (decime qué recipientes uso).',
      '- En cada paso: el fuego, el tiempo y cómo me doy cuenta de que está listo.',
      '- Si algo se puede hacer mientras otra cosa se cocina, avisame.'
    ].join('\n');
  }

  return {
    MODOS, PROTEINA_OBJETIVO, MAX_VERDURAS, GRUPO, ESTILO, I, L,
    platos, porId, hash, azar, ymd,
    comboBase, comboDe, valida, clave, desdeClave, variar,
    nombre, nombrePrincipal, acompanamiento, unir, mayus,
    tiempo, recipientes, equipo, esFrio, conSalsa, esExpress,
    porciones, redondeados, textoAceite, textoCompletar, enUnidades,
    pasaPlato, pasaCombo, sugerir, buscar,
    armador, comboArmador,
    opcionesTengo, nombreCompra, tengo, claveCompra, enAlacena,
    platoDelDia, losDeSiempre, puntaje,
    comprasDeCombo, sumarCompras, porSeccion, deAlacena, textoCompras, listaSugerida,
    promptReceta,
    desayunos, desayunoPorId, porcionDesayuno, recetas, recetaPorId, textoReceta
  };
})();
