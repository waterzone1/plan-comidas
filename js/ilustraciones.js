/* ---------------------------------------------------------------
   ILUSTRACIONES — un set de dibujos planos y geométricos, uno por
   tipo de plato. El color de acento (a) es el de la proteína.
   Todo es SVG generado acá: no hay imágenes bajadas de ningún lado.
   --------------------------------------------------------------- */

const ILUS = (() => {

  const C = {
    plato: '#F7F2E8', borde: '#E2D9C8', verde: '#7FB069', verde2: '#5C8F4E', rojo: '#D9644A',
    ama: '#F0C75E', crema: '#F6E6BC', dorado: '#D9A14E', tostado: '#B9813F', marron: '#8B5E3C',
    oscuro: '#3B4048', hierro: '#565C66', blanco: '#FFFDF8', naranja: '#E9965A', salsa: '#C8553D',
    caldo: '#EFD18A', arroz: '#FBF7EC'
  };

  const plato = `<circle cx="60" cy="62" r="43" fill="${C.plato}"/><circle cx="60" cy="62" r="34" fill="none" stroke="${C.borde}" stroke-width="2"/>`;
  const sarten = `<rect x="86" y="57" width="32" height="9" rx="4.5" fill="${C.oscuro}"/><circle cx="52" cy="62" r="41" fill="${C.oscuro}"/><circle cx="52" cy="62" r="34" fill="${C.hierro}"/>`;
  const olla = `<rect x="6" y="54" width="18" height="14" rx="6" fill="${C.oscuro}"/><rect x="96" y="54" width="18" height="14" rx="6" fill="${C.oscuro}"/><circle cx="60" cy="62" r="42" fill="${C.oscuro}"/>`;
  const cuenco = `<circle cx="60" cy="62" r="43" fill="${C.blanco}"/><circle cx="60" cy="62" r="37" fill="${C.plato}"/>`;
  const fuente = `<rect x="12" y="26" width="96" height="72" rx="14" fill="${C.oscuro}"/><rect x="19" y="33" width="82" height="58" rx="9" fill="${C.hierro}"/>`;
  const brocoli = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="${C.verde}"/><circle cx="${x + 7}" cy="${y + 3}" r="5" fill="${C.verde2}"/><circle cx="${x + 1}" cy="${y + 8}" r="5" fill="${C.verde}"/>`;
  const hojas = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="6" fill="${C.verde}" transform="rotate(-25 ${x} ${y})"/><ellipse cx="${x + 8}" cy="${y + 7}" rx="10" ry="5" fill="${C.verde2}" transform="rotate(20 ${x + 8} ${y + 7})"/>`;
  const tomates = (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${C.rojo}"/><circle cx="${x + 10}" cy="${y + 4}" r="5" fill="${C.rojo}"/>`;
  const limon = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="${C.ama}"/><circle cx="${x}" cy="${y}" r="5" fill="${C.crema}"/>`;
  const marcas = (x, y, n) => Array.from({ length: n }, (_, i) =>
    `<line x1="${x + i * 9}" y1="${y}" x2="${x + i * 9 + 12}" y2="${y + 14}" stroke="#000" stroke-opacity=".22" stroke-width="3" stroke-linecap="round"/>`).join('');
  const migas = (pts) => pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.6" fill="${C.tostado}"/>`).join('');

  const T = {
    plancha: a => plato +
      `<path d="M30 60c0-14 13-21 27-19s24 11 22 24-15 18-28 16-21-8-21-21z" fill="${a}"/>` +
      marcas(40, 50, 3) + brocoli(74, 44) + limon(40, 86),

    bife: a => plato +
      `<path d="M28 62c-2-13 10-23 26-22 16 1 28 10 26 23s-14 19-29 18-21-7-23-19z" fill="${C.crema}"/>` +
      `<path d="M33 62c-1-10 8-17 21-17s22 8 21 18-11 15-23 14-18-6-19-15z" fill="${a}"/>` +
      marcas(42, 51, 3) + hojas(72, 82) + tomates(34, 86),

    pescado: a => plato +
      `<path d="M26 66c8-16 30-24 50-18 6 2 10 6 12 10-6 12-26 20-46 16-8-2-13-4-16-8z" fill="${a}"/>` +
      `<path d="M34 64c10-8 26-12 42-9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/>` +
      limon(42, 40) + hojas(70, 86),

    camarones: a => plato +
      [[44, 52, 0], [70, 58, 70], [50, 78, 200]].map(([x, y, r]) =>
        `<g transform="rotate(${r} ${x} ${y})"><path d="M${x - 10} ${y}a10 10 0 1 1 10 10" fill="none" stroke="${a}" stroke-width="8" stroke-linecap="round"/><path d="M${x} ${y + 10}l-7 4 2-7z" fill="${C.naranja}"/></g>`).join('') +
      `<circle cx="78" cy="82" r="3" fill="${C.verde}"/><circle cx="34" cy="70" r="3" fill="${C.verde}"/><circle cx="64" cy="38" r="3" fill="${C.verde2}"/>`,

    wok: a => `<circle cx="60" cy="62" r="44" fill="${C.oscuro}"/><circle cx="60" cy="62" r="36" fill="${C.hierro}"/>` +
      `<rect x="34" y="44" width="16" height="12" rx="3" fill="${a}" transform="rotate(-15 42 50)"/>` +
      `<rect x="62" y="40" width="16" height="12" rx="3" fill="${a}" transform="rotate(20 70 46)"/>` +
      `<rect x="46" y="68" width="16" height="12" rx="3" fill="${a}" transform="rotate(10 54 74)"/>` +
      `<rect x="30" y="64" width="20" height="5" rx="2.5" fill="${C.rojo}" transform="rotate(35 40 66)"/>` +
      `<rect x="66" y="62" width="20" height="5" rx="2.5" fill="${C.ama}" transform="rotate(-30 76 64)"/>` +
      `<rect x="50" y="54" width="18" height="5" rx="2.5" fill="${C.verde}" transform="rotate(-5 59 56)"/>` +
      brocoli(70, 76) +
      `<line x1="82" y1="14" x2="104" y2="52" stroke="${C.crema}" stroke-width="3.5" stroke-linecap="round"/><line x1="92" y1="12" x2="110" y2="50" stroke="${C.crema}" stroke-width="3.5" stroke-linecap="round"/>`,

    cacerola: a => sarten + `<circle cx="52" cy="62" r="30" fill="${C.salsa}"/>` +
      `<ellipse cx="42" cy="54" rx="11" ry="8" fill="${a}"/><ellipse cx="62" cy="58" rx="11" ry="8" fill="${a}" transform="rotate(30 62 58)"/><ellipse cx="48" cy="74" rx="11" ry="8" fill="${a}" transform="rotate(-20 48 74)"/>` +
      `<circle cx="66" cy="76" r="3" fill="${C.verde}"/><circle cx="34" cy="68" r="3" fill="${C.verde}"/><circle cx="54" cy="42" r="3" fill="${C.verde}"/>` +
      `<path d="M30 50q8-8 18-6" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>`,

    fuente: a => fuente +
      `<ellipse cx="46" cy="56" rx="17" ry="12" fill="${a}" transform="rotate(-15 46 56)"/>` + marcas(38, 48, 2) +
      `<circle cx="78" cy="48" r="8" fill="${C.dorado}"/><circle cx="84" cy="66" r="8" fill="${C.dorado}"/><circle cx="68" cy="76" r="8" fill="${C.dorado}"/>` +
      `<rect x="28" y="74" width="18" height="6" rx="3" fill="${C.rojo}"/><rect x="50" y="80" width="14" height="6" rx="3" fill="${C.verde}"/>`,

    crocante: a => plato +
      [[30, 46, -12], [56, 40, 8], [36, 66, 6], [62, 62, -8]].map(([x, y, r]) =>
        `<rect x="${x}" y="${y}" width="28" height="14" rx="7" fill="${C.dorado}" transform="rotate(${r} ${x + 14} ${y + 7})"/>`).join('') +
      migas([[38, 52], [48, 50], [64, 46], [74, 48], [44, 72], [54, 74], [70, 68], [80, 70]]) +
      `<circle cx="78" cy="86" r="10" fill="${C.blanco}"/><circle cx="78" cy="86" r="7" fill="${a}"/>` + hojas(38, 88),

    milanesa: a => plato +
      `<path d="M26 58c0-14 16-22 34-20s30 12 28 26-18 20-34 18-28-10-28-24z" fill="${C.dorado}"/>` +
      migas([[38, 54], [48, 46], [60, 52], [72, 50], [80, 60], [44, 66], [56, 70], [68, 68], [36, 62], [62, 60]]) +
      `<path d="M78 76l16 6-10 12z" fill="${C.ama}"/>` + hojas(34, 88) +
      `<circle cx="60" cy="90" r="4" fill="${a}"/>`,

    napolitana: a => plato +
      `<path d="M26 60c0-14 16-22 34-20s30 12 28 26-18 20-34 18-28-10-28-24z" fill="${C.dorado}"/>` +
      `<path d="M34 60c0-10 12-15 26-14s22 8 21 18-13 14-25 13-22-7-22-17z" fill="${C.salsa}"/>` +
      `<path d="M40 60c2-7 10-10 20-9s15 6 14 12-9 9-17 8-18-4-17-11z" fill="${C.crema}"/>` +
      `<circle cx="50" cy="58" r="2" fill="${C.verde2}"/><circle cx="62" cy="62" r="2" fill="${C.verde2}"/><circle cx="56" cy="66" r="2" fill="${C.verde2}"/>` +
      `<circle cx="84" cy="88" r="4" fill="${a}"/>` + hojas(30, 90),

    gratinado: a => fuente + `<rect x="19" y="33" width="82" height="58" rx="9" fill="${C.crema}"/>` +
      `<circle cx="38" cy="50" r="9" fill="${C.dorado}" opacity=".85"/><circle cx="66" cy="46" r="7" fill="${C.naranja}" opacity=".7"/><circle cx="82" cy="64" r="9" fill="${C.dorado}" opacity=".85"/><circle cx="52" cy="72" r="8" fill="${C.naranja}" opacity=".7"/><circle cx="32" cy="76" r="5" fill="${C.dorado}" opacity=".85"/>` +
      `<circle cx="74" cy="80" r="4" fill="${a}"/><circle cx="54" cy="54" r="4" fill="${a}"/>`,

    pasta: a => cuenco +
      [0, 1, 2, 3, 4].map(i => `<path d="M${30 + i * 3} ${50 + i * 6}q10-${10 - i} 20 0t20 0" fill="none" stroke="${C.ama}" stroke-width="5" stroke-linecap="round"/>`).join('') +
      `<path d="M44 52c6-8 22-8 28 0s2 18-8 20-22-2-24-10 0-6 4-10z" fill="${a}"/>` +
      `<ellipse cx="60" cy="56" rx="6" ry="3.5" fill="${C.verde}" transform="rotate(-30 60 56)"/><circle cx="52" cy="64" r="2" fill="${C.crema}"/><circle cx="66" cy="66" r="2" fill="${C.crema}"/>`,

    arroz: a => plato +
      `<path d="M26 66c0-16 15-26 34-26s34 10 34 26-15 20-34 20-34-4-34-20z" fill="${C.arroz}"/>` +
      [[38, 58], [50, 50], [64, 52], [76, 60], [44, 72], [58, 66], [72, 74], [56, 78]].map(([x, y], i) =>
        `<rect x="${x}" y="${y}" width="6" height="2.4" rx="1.2" fill="${C.borde}" transform="rotate(${i * 40} ${x + 3} ${y + 1})"/>`).join('') +
      `<rect x="40" y="60" width="12" height="9" rx="3" fill="${a}"/><rect x="62" y="58" width="12" height="9" rx="3" fill="${a}" transform="rotate(20 68 62)"/><rect x="52" y="72" width="12" height="9" rx="3" fill="${a}" transform="rotate(-15 58 76)"/>` +
      `<circle cx="36" cy="70" r="3" fill="${C.verde}"/><circle cx="80" cy="70" r="3" fill="${C.verde}"/><circle cx="58" cy="46" r="3" fill="${C.verde}"/><rect x="70" y="46" width="10" height="4" rx="2" fill="${C.rojo}"/>`,

    guiso: a => olla + `<circle cx="60" cy="62" r="34" fill="#C4683F"/>` +
      `<circle cx="46" cy="52" r="8" fill="${a}"/><circle cx="70" cy="56" r="8" fill="${a}"/><circle cx="54" cy="74" r="8" fill="${a}"/>` +
      `<circle cx="74" cy="76" r="5" fill="${C.ama}"/><circle cx="38" cy="68" r="5" fill="${C.ama}"/><circle cx="60" cy="42" r="4" fill="${C.verde}"/><circle cx="82" cy="64" r="3.5" fill="${C.verde}"/><circle cx="62" cy="62" r="3" fill="${C.marron}"/><circle cx="44" cy="80" r="3" fill="${C.marron}"/>`,

    sopa: a => cuenco + `<circle cx="60" cy="62" r="33" fill="${C.caldo}"/>` +
      `<path d="M38 56q8-8 16 0t16 0" fill="none" stroke="${C.blanco}" stroke-width="4" stroke-linecap="round"/><path d="M46 76q8-8 16 0t16 0" fill="none" stroke="${C.blanco}" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="62" y="46" width="13" height="9" rx="3" fill="${a}"/><rect x="40" y="62" width="13" height="9" rx="3" fill="${a}" transform="rotate(20 46 66)"/>` +
      `<circle cx="74" cy="66" r="3" fill="${C.verde}"/><circle cx="52" cy="46" r="3" fill="${C.verde}"/><circle cx="36" cy="74" r="3" fill="${C.ama}"/>`,

    albondigas: a => plato + `<path d="M28 64c0-14 14-22 32-22s32 8 32 22-14 20-32 20-32-6-32-20z" fill="${C.salsa}"/>` +
      `<circle cx="46" cy="56" r="10" fill="${a}"/><circle cx="70" cy="56" r="10" fill="${a}"/><circle cx="58" cy="72" r="10" fill="${a}"/>` +
      `<circle cx="43" cy="53" r="3" fill="#fff" opacity=".25"/><circle cx="67" cy="53" r="3" fill="#fff" opacity=".25"/><circle cx="55" cy="69" r="3" fill="#fff" opacity=".25"/>` +
      `<circle cx="80" cy="72" r="2.5" fill="${C.verde}"/><circle cx="36" cy="72" r="2.5" fill="${C.verde}"/>`,

    tarta: a => `<circle cx="60" cy="62" r="44" fill="${C.tostado}"/><circle cx="60" cy="62" r="44" fill="none" stroke="${C.dorado}" stroke-width="7" stroke-dasharray="9 5"/>` +
      `<circle cx="60" cy="62" r="33" fill="${C.crema}"/>` +
      `<circle cx="48" cy="52" r="6" fill="${a}"/><circle cx="70" cy="56" r="6" fill="${a}"/><circle cx="56" cy="74" r="6" fill="${a}"/><circle cx="74" cy="74" r="4" fill="${C.verde}"/><circle cx="42" cy="68" r="4" fill="${C.verde}"/><circle cx="60" cy="42" r="4" fill="${C.verde}"/>` +
      `<path d="M60 62L60 29M60 62L89 78M60 62L31 78" stroke="${C.tostado}" stroke-opacity=".5" stroke-width="2"/>`,

    tortilla: a => plato + `<circle cx="60" cy="62" r="32" fill="${C.dorado}"/><circle cx="60" cy="62" r="27" fill="${C.ama}"/>` +
      `<circle cx="50" cy="54" r="5" fill="${C.dorado}" opacity=".7"/><circle cx="70" cy="66" r="6" fill="${C.dorado}" opacity=".7"/><circle cx="54" cy="74" r="4" fill="${C.dorado}" opacity=".7"/>` +
      `<circle cx="66" cy="50" r="3.5" fill="${a}"/><circle cx="44" cy="66" r="3.5" fill="${C.verde}"/>` +
      `<path d="M60 62L60 30M60 62L88 76" stroke="${C.plato}" stroke-width="3"/>`,

    omelette: a => plato + `<path d="M26 66a34 26 0 0 1 68 0z" fill="${C.ama}"/><path d="M26 66a34 26 0 0 1 68 0" fill="none" stroke="${C.dorado}" stroke-width="3"/>` +
      `<path d="M32 66h56l-4 7c-14 5-34 5-48 0z" fill="${a}"/><path d="M40 70c8 4 32 4 40 0" fill="none" stroke="${C.crema}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="50" cy="54" r="2" fill="${C.verde2}"/><circle cx="64" cy="50" r="2" fill="${C.verde2}"/><circle cx="74" cy="58" r="2" fill="${C.verde2}"/>` + tomates(46, 86),

    huevo: a => plato + `<path d="M34 56c2-12 16-18 28-14s22 10 20 22-14 18-28 16-22-10-20-24z" fill="${C.blanco}"/>` +
      `<circle cx="58" cy="60" r="11" fill="${C.ama}"/><circle cx="54" cy="56" r="3" fill="#fff" opacity=".5"/>` +
      `<rect x="26" y="78" width="22" height="12" rx="6" fill="${a}" transform="rotate(-18 37 84)"/>` + hojas(76, 84),

    tostada: a => plato +
      [[28, 40, -8], [58, 52, 10]].map(([x, y, r]) =>
        `<g transform="rotate(${r} ${x + 16} ${y + 16})"><path d="M${x} ${y + 8}a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v20a4 4 0 0 1-4 4h-24a4 4 0 0 1-4-4z" fill="${C.tostado}"/><path d="M${x + 4} ${y + 9}a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v17a2 2 0 0 1-2 2h-20a2 2 0 0 1-2-2z" fill="${C.dorado}"/><ellipse cx="${x + 16}" cy="${y + 16}" rx="10" ry="8" fill="${C.ama}"/><circle cx="${x + 14}" cy="${y + 14}" r="3.5" fill="${a}"/></g>`).join('') +
      tomates(34, 86),

    sandwich: a => `<path d="M22 50a16 16 0 0 1 16-16h44a16 16 0 0 1 16 16v4H22z" fill="${C.dorado}"/>` +
      `<path d="M18 56q6 8 12 0t12 0 12 0 12 0 12 0 12 0 12 0v6H18z" fill="${C.verde}"/>` +
      `<rect x="22" y="62" width="76" height="11" rx="4" fill="${a}"/>` +
      `<rect x="24" y="73" width="72" height="6" rx="3" fill="${C.rojo}"/>` +
      `<path d="M22 81h76v4a10 10 0 0 1-10 10H32a10 10 0 0 1-10-10z" fill="${C.dorado}"/>` +
      migas([[40, 42], [56, 40], [72, 44], [84, 46]]),

    hamburguesa: a => `<path d="M22 52a38 24 0 0 1 76 0z" fill="${C.dorado}"/>` +
      [[42, 40], [56, 35], [70, 39], [82, 46], [34, 47]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.5" fill="${C.crema}"/>`).join('') +
      `<path d="M18 54q6 8 12 0t12 0 12 0 12 0 12 0 12 0 12 0v5H18z" fill="${C.verde}"/>` +
      `<path d="M20 60h80l-10 9H30z" fill="${C.ama}"/>` +
      `<rect x="20" y="62" width="80" height="14" rx="7" fill="${a}"/>` +
      `<rect x="24" y="76" width="72" height="5" rx="2.5" fill="${C.rojo}"/>` +
      `<path d="M22 83h76v3a10 10 0 0 1-10 10H32a10 10 0 0 1-10-10z" fill="${C.dorado}"/>`,

    wrap: a => `<g transform="rotate(-28 60 62)"><rect x="18" y="42" width="84" height="40" rx="20" fill="${C.crema}"/>` +
      `<ellipse cx="94" cy="62" rx="10" ry="19" fill="${C.verde}"/><ellipse cx="96" cy="62" rx="6" ry="13" fill="${a}"/><circle cx="96" cy="54" r="3" fill="${C.rojo}"/><circle cx="96" cy="70" r="3" fill="${C.ama}"/>` +
      `<path d="M30 46q10 16 0 32" fill="none" stroke="${C.dorado}" stroke-width="2.5" stroke-linecap="round"/><path d="M50 43q10 19 0 38" fill="none" stroke="${C.dorado}" stroke-width="2.5" stroke-linecap="round"/><circle cx="66" cy="54" r="3" fill="${C.dorado}" opacity=".6"/><circle cx="72" cy="70" r="2.5" fill="${C.dorado}" opacity=".6"/></g>`,

    taco: a => [[10, 50], [52, 64]].map(([x, y]) =>
      `<g transform="translate(${x} ${y})">` +
      `<path d="M2 3q5-11 11-3 5-12 12-3 6-11 12-2 6-10 11 0 5-8 8 8z" fill="${C.verde}"/>` +
      `<circle cx="16" cy="-2" r="5.5" fill="${a}"/><circle cx="30" cy="-4" r="5.5" fill="${a}"/><circle cx="43" cy="-1" r="5" fill="${C.rojo}"/><circle cx="7" cy="1" r="3.5" fill="${C.rojo}"/>` +
      `<path d="M0 3h58a29 29 0 0 1-58 0z" fill="${C.ama}"/><path d="M7 3h44a22 22 0 0 1-44 0z" fill="${C.dorado}" opacity=".35"/>` +
      `<circle cx="20" cy="14" r="1.8" fill="${C.tostado}"/><circle cx="36" cy="12" r="1.8" fill="${C.tostado}"/><circle cx="28" cy="22" r="1.8" fill="${C.tostado}"/></g>`).join(''),

    quesadilla: a => plato +
      [[60, 62, 0], [60, 62, 120], [60, 62, 240]].map(([x, y, r]) =>
        `<g transform="rotate(${r} ${x} ${y})"><path d="M60 58L38 26a40 40 0 0 1 44 0z" fill="${C.crema}"/><path d="M60 52L45 30a32 32 0 0 1 30 0z" fill="none" stroke="${C.dorado}" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="36" r="3" fill="${a}"/><circle cx="52" cy="32" r="2" fill="${C.verde}"/><circle cx="68" cy="32" r="2" fill="${C.rojo}"/></g>`).join(''),

    pizza: a => `<circle cx="60" cy="62" r="44" fill="${C.dorado}"/><circle cx="60" cy="62" r="37" fill="${C.salsa}"/><circle cx="60" cy="62" r="34" fill="${C.crema}"/>` +
      `<circle cx="46" cy="50" r="7" fill="${a}"/><circle cx="72" cy="54" r="7" fill="${a}"/><circle cx="54" cy="76" r="7" fill="${a}"/><circle cx="76" cy="76" r="5" fill="${C.rojo}"/><circle cx="40" cy="68" r="5" fill="${C.rojo}"/><circle cx="62" cy="40" r="5" fill="${C.rojo}"/>` +
      `<ellipse cx="60" cy="60" rx="5" ry="2.5" fill="${C.verde}" transform="rotate(30 60 60)"/><ellipse cx="68" cy="68" rx="5" ry="2.5" fill="${C.verde}" transform="rotate(-40 68 68)"/>` +
      `<path d="M60 62L60 18M60 62L98 84M60 62L22 84" stroke="${C.dorado}" stroke-opacity=".55" stroke-width="2"/>`,

    bowl: a => cuenco +
      `<path d="M60 62L60 29A33 33 0 0 1 91 73z" fill="${C.arroz}"/><path d="M60 62L91 73A33 33 0 0 1 43 90z" fill="${a}"/><path d="M60 62L43 90A33 33 0 0 1 28 53z" fill="${C.verde}"/><path d="M60 62L28 53A33 33 0 0 1 60 29z" fill="${C.ama}"/>` +
      `<circle cx="60" cy="62" r="9" fill="${C.blanco}"/><circle cx="60" cy="62" r="5" fill="${C.salsa}"/>` +
      `<circle cx="72" cy="48" r="1.6" fill="${C.borde}"/><circle cx="78" cy="58" r="1.6" fill="${C.borde}"/><circle cx="40" cy="70" r="3" fill="${C.verde2}"/><circle cx="46" cy="46" r="2.5" fill="${C.dorado}"/>`,

    ensalada: a => cuenco +
      `<ellipse cx="44" cy="50" rx="15" ry="9" fill="${C.verde}" transform="rotate(-30 44 50)"/><ellipse cx="74" cy="52" rx="15" ry="9" fill="${C.verde2}" transform="rotate(25 74 52)"/><ellipse cx="46" cy="76" rx="15" ry="9" fill="${C.verde2}" transform="rotate(20 46 76)"/><ellipse cx="74" cy="76" rx="15" ry="9" fill="${C.verde}" transform="rotate(-20 74 76)"/>` +
      `<circle cx="58" cy="46" r="6" fill="${C.rojo}"/><circle cx="80" cy="64" r="5" fill="${C.rojo}"/><circle cx="38" cy="64" r="5" fill="${C.rojo}"/>` +
      `<rect x="50" y="58" width="16" height="11" rx="4" fill="${a}"/><rect x="58" y="74" width="14" height="10" rx="4" fill="${a}" transform="rotate(20 65 79)"/><circle cx="66" cy="52" r="3" fill="${C.ama}"/>`,

    sushi: a => cuenco + `<circle cx="60" cy="62" r="33" fill="${C.arroz}"/>` +
      `<rect x="36" y="44" width="24" height="12" rx="6" fill="${a}" transform="rotate(-20 48 50)"/><rect x="58" y="52" width="24" height="12" rx="6" fill="${a}" transform="rotate(15 70 58)"/>` +
      `<circle cx="44" cy="72" r="7" fill="${C.verde}"/><circle cx="44" cy="72" r="4" fill="#CFE5B8"/><circle cx="60" cy="80" r="7" fill="${C.verde}"/><circle cx="60" cy="80" r="4" fill="#CFE5B8"/>` +
      `<path d="M70 70q8-4 14 2-6 8-14 6z" fill="${C.verde2}"/>` +
      migas([[52, 62], [66, 44], [78, 74], [36, 60], [56, 70]]) +
      `<line x1="84" y1="16" x2="104" y2="50" stroke="${C.oscuro}" stroke-width="3" stroke-linecap="round"/><line x1="92" y1="14" x2="110" y2="48" stroke="${C.oscuro}" stroke-width="3" stroke-linecap="round"/>`,

    papa: a => plato + `<ellipse cx="60" cy="64" rx="36" ry="24" fill="${C.marron}"/>` +
      `<path d="M30 62q30-22 60 0-30 16-60 0z" fill="${C.crema}"/>` +
      `<circle cx="48" cy="60" r="5" fill="${a}"/><circle cx="62" cy="58" r="5" fill="${a}"/><circle cx="74" cy="62" r="4" fill="${a}"/><circle cx="56" cy="66" r="3" fill="${C.ama}"/><circle cx="68" cy="67" r="2.5" fill="${C.verde}"/><circle cx="42" cy="64" r="2.5" fill="${C.verde}"/>`
  };

  function svg(tipo, color) {
    const dibujo = (T[tipo] || T.plancha)(color);
    return '<svg class="ilus" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + dibujo + '</svg>';
  }

  return { svg, tipos: Object.keys(T) };
})();
