/* ---------------------------------------------------------------
   FUERZA DE VOLUNTAD — cartas, enemigos, reliquias y eventos.
   Editable a mano: acá están todos los números del balance.

   Vocabulario
     Voluntad    la vida del jugador
     Calma       bloqueo: absorbe daño y se pierde al empezar tu turno
     Convicción  cada ataque hace +1 de daño por punto
     Temple      cada carta de calma da +1 por punto
     Expuesto    recibe 50% más de daño
     Débil       hace 25% menos de daño

   Cartas: los pares [a, b] son el valor normal y el mejorado.
     t  tipo: ataque | defensa | habilidad | poder | estorbo
     c  costo de energía ('X' = toda)      r  rareza: 0 inicial, 1, 2, 3
     d  daño   v  veces   todos  pega a todos los enemigos
     b  calma  rob  roba  ene  energía  vul / deb  aplica al enemigo
     fz / des  convicción / temple propios   cura  recupera voluntad
     ag agotar (no vuelve en este combate)   pod  [poder, cantidad]
     fx efecto especial   tx  texto del efecto especial
   --------------------------------------------------------------- */

const JUEGO = (() => {

  const CARTAS = {
    /* ---------- iniciales ---------- */
    no:        { n: 'Decir que no',         t: 'ataque',  c: 1, r: 0, d: [6, 9] },
    respirar:  { n: 'Respirar hondo',       t: 'defensa', c: 1, r: 0, b: [5, 8] },
    agua:      { n: 'Vaso de agua',         t: 'habilidad', c: 0, r: 0, rob: [1, 2] },
    objetivo:  { n: 'Recordar el objetivo', t: 'ataque',  c: 2, r: 0, d: [8, 10], vul: [2, 3] },

    /* ---------- ataques ---------- */
    doble:     { n: 'Doble negativa',       t: 'ataque',  c: 1, r: 1, d: [5, 7], v: [2, 2] },
    caminar:   { n: 'Salir a caminar',      t: 'ataque',  c: 1, r: 1, d: [7, 10], rob: [1, 1] },
    tema:      { n: 'Cambiar de tema',      t: 'ataque',  c: 1, r: 1, d: [8, 10], deb: [1, 2] },
    realidad:  { n: 'Golpe de realidad',    t: 'ataque',  c: 2, r: 1, d: [15, 20] },
    alacena:   { n: 'Vaciar la alacena',    t: 'ataque',  c: 1, r: 1, d: [5, 8], todos: 1 },
    reflejo:   { n: 'Reflejo',              t: 'ataque',  c: 0, r: 1, d: [4, 6] },
    constancia:{ n: 'Constancia',           t: 'ataque',  c: 1, r: 1, d: [6, 8],
                 fx: (G, m, c) => { c.extra = (c.extra || 0) + (m ? 4 : 3); },
                 tx: m => 'Cada vez que la jugás, gana +' + (m ? 4 : 3) + ' de daño en este combate.' },
    circuito:  { n: 'Circuito',             t: 'ataque',  c: 2, r: 2, d: [5, 7], v: [3, 3] },
    timon:     { n: 'Golpe de timón',       t: 'ataque',  c: [1, 0], r: 2, d: [0, 0],
                 dmg: (G) => G.k.calma, tx: () => 'Hace tanto daño como Calma tengas.' },
    todo:      { n: 'Todo o nada',          t: 'ataque',  c: 3, r: 2, d: [28, 36] },
    heladera:  { n: 'Limpiar la heladera',  t: 'ataque',  c: 2, r: 2, d: [10, 14], todos: 1, vul: [1, 1] },
    racha:     { n: 'Racha',                t: 'ataque',  c: 1, r: 2, d: [4, 6],
                 veces: (G) => G.k.ataquesTurno + 1, tx: () => 'Pega una vez por cada ataque jugado este turno, contando este.' },
    quiebre:   { n: 'Punto de quiebre',     t: 'ataque',  c: 2, r: 3, d: [12, 16], ag: 1,
                 fx: (G, m, c, e) => { if (e && e.hp <= 0) G.maxVoluntad(m ? 5 : 4); },
                 tx: m => 'Si termina con el enemigo, ganás ' + (m ? 5 : 4) + ' de Voluntad máxima.' },
    contodo:   { n: 'Con todo',             t: 'ataque',  c: 'X', r: 3, d: [8, 11],
                 veces: (G, m, x) => x, tx: () => 'Pega una vez por cada punto de energía gastado.' },

    /* ---------- defensas ---------- */
    plato:     { n: 'Plato servido',        t: 'defensa', c: 1, r: 1, b: [8, 11] },
    dientes:   { n: 'Lavarse los dientes',  t: 'defensa', c: 1, r: 1, b: [5, 8], rob: [1, 1] },
    diez:      { n: 'Contar hasta diez',    t: 'defensa', c: 2, r: 1, b: [13, 17] },
    saciedad:  { n: 'Saciedad',             t: 'defensa', c: 1, r: 1, b: [5, 7],
                 fx: (G, m) => G.yo('reserva', m ? 7 : 5), tx: m => 'El turno que viene empezás con ' + (m ? 7 : 5) + ' de Calma.' },
    gondola:   { n: 'Esquivar la góndola',  t: 'defensa', c: 0, r: 1, b: [3, 5] },
    muralla:   { n: 'Muralla',              t: 'defensa', c: 2, r: 2, b: [10, 14],
                 fx: (G) => G.yo('retener', 1), tx: () => 'La Calma no se pierde al empezar tu próximo turno.' },
    capas:     { n: 'Agenda llena',         t: 'defensa', c: 1, r: 2, b: [0, 0],
                 blq: (G, m) => (m ? 3 : 2) * G.k.mano.length, tx: m => 'Ganá ' + (m ? 3 : 2) + ' de Calma por cada carta en la mano.' },
    blindaje:  { n: 'Blindaje',             t: 'defensa', c: [2, 1], r: 3, b: [0, 0],
                 fx: (G) => G.calmaDirecta(G.k.calma), tx: () => 'Duplica tu Calma.' },
    hierro:    { n: 'Voluntad de hierro',   t: 'defensa', c: 2, r: 3, b: [26, 34], ag: 1 },

    /* ---------- habilidades ---------- */
    mate:      { n: 'Tomar mate',           t: 'habilidad', c: 1, r: 1, rob: [2, 3] },
    exponer:   { n: 'Poner en evidencia',   t: 'habilidad', c: 0, r: 1, vul: [1, 2], rob: [1, 1] },
    avisar:    { n: 'Avisarle a alguien',   t: 'habilidad', c: 1, r: 1, deb: [2, 3], b: [4, 6] },
    aire:      { n: 'Segundo aire',         t: 'habilidad', c: 1, r: 2, ene: [2, 3], ag: 1 },
    ordenar:   { n: 'Ordenar la cocina',    t: 'habilidad', c: [1, 0], r: 2, rob: [1, 1],
                 fx: (G) => G.agotarEstorbos(), tx: () => 'Agotá los estorbos de tu mano y robá una carta por cada uno.' },
    dormir:    { n: 'Dormir bien',          t: 'habilidad', c: 1, r: 2, cura: [6, 9], ag: 1 },
    foco:      { n: 'Foco',                 t: 'habilidad', c: [1, 0], r: 2,
                 fx: (G) => G.yo('doble', 1), tx: () => 'Tu próximo ataque de este turno se juega dos veces.' },
    reencuadre:{ n: 'Reencuadre',           t: 'habilidad', c: 1, r: 2, b: [6, 9],
                 fx: (G) => G.limpiar(), tx: () => 'Te saca Expuesto y Débil.' },
    semana:    { n: 'Preparar la semana',   t: 'habilidad', c: 1, r: 3, rob: [4, 5], ag: 1 },

    /* ---------- poderes ---------- */
    motivacion:{ n: 'Motivación',           t: 'poder', c: 1, r: 2, fz: [2, 3] },
    postura:   { n: 'Postura',              t: 'poder', c: 1, r: 2, des: [2, 3] },
    rutina:    { n: 'Rutina',               t: 'poder', c: 1, r: 2, pod: ['rutina', [3, 4]],
                 tx: m => 'Al terminar cada turno ganás ' + (m ? 4 : 3) + ' de Calma.' },
    furia:     { n: 'Furia serena',         t: 'poder', c: 1, r: 2, pod: ['furia', [3, 5]],
                 tx: m => 'Cada vez que ganás Calma, un enemigo al azar recibe ' + (m ? 5 : 3) + ' de daño.' },
    hidratacion:{ n: 'Hidratación',         t: 'poder', c: [2, 1], r: 3, pod: ['hidratacion', [1, 1]],
                 tx: () => 'Robás una carta más cada turno.' },
    disciplina:{ n: 'Disciplina',           t: 'poder', c: 3, r: 3, pod: ['disciplina', [2, 3]],
                 tx: m => 'Al empezar cada turno ganás ' + (m ? 3 : 2) + ' de Convicción.' },
    ayuno:     { n: 'Hambre controlada',    t: 'poder', c: [1, 0], r: 3, pod: ['ayuno', [1, 1]],
                 tx: () => 'Tenés 1 de energía más cada turno, pero perdés 2 de Voluntad al empezarlo.' },

    /* ---------- estorbos (los meten los enemigos) ---------- */
    antojo:    { n: 'Antojo',   t: 'estorbo', c: null, r: -1, tx: () => 'No se puede jugar. Ocupa lugar en la mano.' },
    culpa:     { n: 'Culpa',    t: 'estorbo', c: null, r: -1, tx: () => 'No se puede jugar. Si termina el turno en tu mano, perdés 2 de Voluntad.' },
    excusa:    { n: 'Excusa',   t: 'estorbo', c: 1,    r: -1, ag: 1, tx: () => 'No hace nada. Jugala para sacártela de encima.' }
  };

  const MAZO_INICIAL = ['no', 'no', 'no', 'no', 'no', 'respirar', 'respirar', 'respirar', 'respirar', 'agua', 'objetivo'];

  /* Enemigos. hp: [mín, máx] en dificultad normal.
     Movimientos: i intención, d daño, v veces, b calma propia,
     fz convicción propia, todosFz a todos los enemigos, cura,
     vul / deb / cans al jugador (cans = 1 de energía menos el turno que viene),
     carta: [estorbo, cuántos, dónde]  (donde: descarte | robo | mano)
     inv: id del enemigo que invoca.
     sig(e, k): devuelve la clave del próximo movimiento.                */
  const ciclo = (inicio, lista) => e => (e.turnos < inicio.length ? inicio[e.turnos] : lista[(e.turnos - inicio.length) % lista.length]);

  const ENEMIGOS = {
    picoteo: {
      n: 'Picoteo', hp: [38, 44], arte: { l: 3, c: '#E3B04B', g: 30 },
      mov: {
        bocadito: { n: 'Un bocadito', i: 'ataque', d: 5, v: 2 },
        otro:     { n: 'Otro más', i: 'ataque', d: 3, v: 3 },
        paquete:  { n: 'Abrir el paquete', i: 'mejora', fz: 2, b: 5 }
      },
      sig: ciclo([], ['bocadito', 'otro', 'paquete'])
    },
    aburrimiento: {
      n: 'Aburrimiento', hp: [44, 50], arte: { l: 4, c: '#8C96A8', g: 45 },
      mov: {
        bostezo: { n: 'Bostezo', i: 'molestia', b: 8, carta: ['antojo', 1, 'descarte'] },
        zapping: { n: 'Zapping', i: 'ataque', d: 9 },
        heladera:{ n: 'Abrir la heladera', i: 'ataque', d: 6, v: 2 }
      },
      sig: ciclo([], ['bostezo', 'zapping', 'heladera'])
    },
    golosina: {
      n: 'Golosina', hp: [17, 21], arte: { l: 5, c: '#E07A9B', g: 0 },
      mov: {
        tentar:  { n: 'Tentar', i: 'ataque', d: 5 },
        azucar:  { n: 'Pico de azúcar', i: 'ataque+molestia', d: 3, deb: 1 }
      },
      sig: (e) => ((e.turnos + e.idx) % 2 ? 'azucar' : 'tentar')
    },
    hambre: {
      n: 'Hambre nocturna', hp: [62, 70], arte: { l: 6, c: '#6C7BD9', g: 30 },
      mov: {
        rugido:  { n: 'Rugido', i: 'mejora', fz: 3 },
        zarpazo: { n: 'Zarpazo', i: 'ataque', d: 8 },
        vueltas: { n: 'Dar vueltas en la cama', i: 'ataque', d: 5, v: 2, fz: 1 }
      },
      sig: ciclo(['rugido'], ['zarpazo', 'vueltas'])
    },
    ansiedad: {
      n: 'Ansiedad', hp: [58, 66], arte: { l: 7, c: '#C56BD9', g: 12 },
      mov: {
        rumiar:  { n: 'Rumiar', i: 'molestia', deb: 2, carta: ['culpa', 1, 'descarte'] },
        nudo:    { n: 'Nudo en el estómago', i: 'ataque', d: 11 },
        espiral: { n: 'Espiral', i: 'ataque+molestia', d: 7, vul: 2 }
      },
      sig: ciclo([], ['rumiar', 'nudo', 'espiral'])
    },
    publicidad: {
      n: 'Publicidad', hp: [54, 62], arte: { l: 8, c: '#E0703C', g: 22 },
      mov: {
        oferta:  { n: 'Oferta 2×1', i: 'ataque+molestia', d: 4, v: 2, carta: ['antojo', 1, 'robo'] },
        jingle:  { n: 'Jingle pegadizo', i: 'molestia', vul: 2, b: 6 },
        bombardeo:{ n: 'Bombardeo', i: 'ataque', d: 14 }
      },
      sig: ciclo([], ['oferta', 'jingle', 'bombardeo'])
    },
    delivery: {
      n: 'Delivery 23 h', hp: [84, 92], arte: { l: 4, c: '#E0504B', g: 0 },
      mov: {
        camino:  { n: 'Pedido en camino', i: 'defensa', b: 10 },
        casi:    { n: 'Ya casi llega', i: 'mejora', fz: 2, b: 6 },
        timbre:  { n: 'Timbre', i: 'ataque', d: 22 },
        promo:   { n: 'Promo de medianoche', i: 'ataque+molestia', d: 9, carta: ['antojo', 1, 'mano'] }
      },
      sig: ciclo([], ['camino', 'casi', 'timbre', 'promo'])
    },
    estres: {
      n: 'Estrés', hp: [70, 78], arte: { l: 9, c: '#D94F70', g: 10 },
      mov: {
        presion: { n: 'Presión', i: 'ataque+molestia', d: 8, cans: 1 },
        lunes:   { n: 'Lunes', i: 'ataque', d: 13 },
        mail:    { n: 'Mail urgente', i: 'molestia', deb: 2, vul: 2, b: 8 }
      },
      sig: ciclo([], ['mail', 'presion', 'lunes'])
    },
    cumple: {
      n: 'Cumpleaños de oficina', hp: [52, 58], arte: { l: 10, c: '#E8B84A', g: 18 },
      mov: {
        dale:    { n: '¡Dale, una porción!', i: 'mejora', todosFz: 1, b: 6 },
        insistir:{ n: 'Insistir', i: 'ataque', d: 11 },
        traer:   { n: 'Traer más torta', i: 'especial', inv: 'porcion', b: 8 }
      },
      sig: (e, k) => {
        const porciones = k.enemigos.filter(x => x.hp > 0 && x.id === 'porcion').length;
        if (e.turnos % 3 === 2 && porciones < 2) return 'traer';
        return e.turnos % 3 === 0 ? 'dale' : 'insistir';
      }
    },
    porcion: {
      n: 'Porción de torta', hp: [14, 17], arte: { l: 3, c: '#F0D48A', g: 60 },
      mov: { mirar: { n: 'Mirarte', i: 'ataque', d: 4 } },
      sig: () => 'mirar'
    },

    /* ---------- jefes ---------- */
    tentacion: {
      n: 'La Tentación', jefe: 1, hp: [136, 136], arte: { l: 12, c: '#E0445F', g: 15 },
      mov: {
        susurro: { n: 'Susurro', i: 'molestia', vul: 2, deb: 2 },
        vidriera:{ n: 'Vidriera', i: 'ataque', d: 12 },
        hoy:     { n: 'Solo por hoy', i: 'ataque+molestia', d: 7, v: 2, carta: ['antojo', 1, 'descarte'] },
        seria:   { n: 'Se pone seria', i: 'mejora', fz: 3, b: 12 },
        ahora:   { n: 'Ahora o nunca', i: 'ataque', d: 20 },
        mordisco:{ n: 'Mordisco', i: 'ataque', d: 7, v: 3 },
        seducir: { n: 'Seducir', i: 'molestia', b: 14, carta: ['culpa', 2, 'descarte'] }
      },
      sig: (e) => {
        if (e.hp > e.maxHp / 2 && !e.mem.fase2) return ['susurro', 'vidriera', 'hoy'][e.turnos % 3];
        if (!e.mem.fase2) { e.mem.fase2 = 1; e.mem.t0 = e.turnos + 1; return 'seria'; }
        return ['ahora', 'mordisco', 'seducir'][(e.turnos - e.mem.t0) % 3];
      }
    },
    atracon: {
      n: 'El Atracón', jefe: 1, hp: [138, 138], arte: { l: 5, c: '#D9722E', g: 36 },
      mov: {
        abrir:   { n: 'Abrir la heladera', i: 'mejora', fz: 2, b: 12 },
        arrasar: { n: 'Arrasar', i: 'ataque', d: 13 },
        fondo:   { n: 'Sin fondo', i: 'ataque', d: 4, v: 3 },
        atracon: { n: 'Atracón', i: 'ataque', d: 24 }
      },
      sig: (e) => (e.turnos >= 9 && e.turnos % 3 === 2 ? 'atracon' : ['abrir', 'arrasar', 'fondo'][e.turnos % 3])
    },
    autoengano: {
      n: 'El Autoengaño', jefe: 1, hp: [132, 132], arte: { l: 6, c: '#4FB3A5', g: 0 },
      mov: {
        manana:  { n: 'Mañana empiezo', i: 'molestia', carta: ['excusa', 2, 'robo'], b: 10 },
        merezco: { n: 'Me lo merezco', i: 'ataque', d: 14, cura: 8 },
        tanto:   { n: 'No es para tanto', i: 'molestia', b: 12, deb: 2 },
        total:   { n: 'Total, ya está', i: 'ataque', d: 9, v: 2, fz: 1 }
      },
      sig: ciclo([], ['manana', 'merezco', 'tanto', 'total'])
    }
  };

  /* Encuentros por nivel. */
  const ENCUENTROS = {
    1: [['picoteo'], ['aburrimiento'], ['golosina', 'golosina']],
    2: [['hambre'], ['ansiedad'], ['publicidad'], ['golosina', 'golosina', 'golosina']],
    3: [['delivery'], ['estres'], ['cumple', 'porcion']],
    jefe: [['tentacion'], ['atracon'], ['autoengano']]
  };

  /* Reliquias: pasivas. Los ganchos los resuelve el motor por id. */
  const RELIQUIAS = {
    botella:   { n: 'Botella de agua',   ic: '💧', tx: 'En el primer turno de cada combate robás 2 cartas más.' },
    diario:    { n: 'Diario de comidas', ic: '📓', tx: 'Empezás cada combate con 8 de Calma.' },
    zapatillas:{ n: 'Zapatillas',        ic: '👟', tx: 'Tu primer ataque de cada combate hace 8 más de daño.' },
    balanza:   { n: 'Balanza',           ic: '⚖️', tx: 'Empezás cada combate con 1 de Convicción.' },
    tupper:    { n: 'Tupper',            ic: '🍱', tx: 'Empezás cada combate con 1 de Temple.' },
    alarma:    { n: 'Alarma',            ic: '⏰', tx: 'En el primer turno de cada combate tenés 1 de energía más.' },
    lista:     { n: 'Lista de compras',  ic: '📝', tx: 'Después de cada combate recuperás 6 de Voluntad.' },
    foto:      { n: 'Foto del objetivo', ic: '🖼️', tx: 'Con la mitad de la Voluntad o menos, tus ataques hacen 3 más de daño.' },
    cepillo:   { n: 'Cepillo de dientes', ic: '🪥', tx: 'Cuando robás un estorbo se agota y robás otra carta.' },
    mancuerna: { n: 'Mancuerna',         ic: '🏋️', tx: 'Cada 3 ataques que jugás en un turno ganás 1 de Convicción.' },
    termo:     { n: 'Termo',             ic: '🧉', tx: 'Al terminar el turno ganás 3 de Calma por cada punto de energía sin usar.' },
    vianda:    { n: 'Vianda lista',      ic: '🥡', tx: 'Tenés 10 más de Voluntad máxima.' },
    auriculares:{ n: 'Auriculares',      ic: '🎧', tx: 'Los enemigos empiezan cada combate con 1 de Expuesto.' },
    abanico:   { n: 'Reloj de arena',    ic: '⏳', tx: 'Cada 3 cartas de defensa que jugás en un turno ganás 4 de Calma.' },
    ancla:     { n: 'Ancla',             ic: '⚓', tx: 'Cuando tu Voluntad baja de la mitad por primera vez en un combate, ganás 12 de Calma.' }
  };

  /* Eventos. Cada opción: t texto, d detalle, fx(R) con la API de recorrido. */
  const EVENTOS = {
    oficina: {
      n: 'Cumpleaños en la oficina', tx: 'Hay torta en la cocina y todos insisten.',
      ops: [
        { t: 'Decir que no', d: 'Mejorá una carta al azar.', fx: R => R.mejorarAzar(1) },
        { t: 'Aceptar una porción', d: 'Perdés 8 de Voluntad. Ganás una reliquia.', fx: R => { R.perder(8); R.reliquia(); } }
      ]
    },
    gimnasio: {
      n: 'El gimnasio está abierto', tx: 'Tenés una hora libre y pocas ganas.',
      ops: [
        { t: 'Entrenar', d: 'Perdés 6 de Voluntad. Elegí una carta entre tres poco comunes.', fx: R => { R.perder(6); R.ofrecer(2); } },
        { t: 'Descansar', d: 'Recuperás 14 de Voluntad.', fx: R => R.curar(14) }
      ]
    },
    super: {
      n: 'Supermercado con hambre', tx: 'Entraste a comprar dos cosas.',
      ops: [
        { t: 'Solo lo de la lista', d: 'Sacá una carta de tu mazo.', fx: R => R.quitar() },
        { t: 'Recorrer las góndolas', d: 'Ganás 45 de oro. Un Antojo entra a tu mazo.', fx: R => { R.oro(45); R.sumar('antojo'); } }
      ]
    },
    insomnio: {
      n: 'Noche de insomnio', tx: 'Son las tres de la mañana y la heladera queda cerca.',
      ops: [
        { t: 'Quedarte en la cama', d: 'Mejorá dos cartas al azar. Perdés 7 de Voluntad.', fx: R => { R.mejorarAzar(2); R.perder(7); } },
        { t: 'Levantarte a tomar agua', d: 'Recuperás 8 de Voluntad.', fx: R => R.curar(8) }
      ]
    },
    amigo: {
      n: 'Un amigo que también se cuida', tx: 'Te cuenta qué le está funcionando.',
      ops: [
        { t: 'Escuchar', d: 'Elegí una carta entre tres raras.', fx: R => R.ofrecer(3) },
        { t: 'Pedirle que te acompañe', d: 'Ganás 10 de Voluntad máxima.', fx: R => R.maxVoluntad(10) }
      ]
    },
    balanza: {
      n: 'La balanza', tx: 'Subiste sin pensarlo demasiado.',
      ops: [
        { t: 'Mirar el número', d: 'A suerte: ganás una reliquia o perdés 10 de Voluntad.', fx: R => { if (R.azar() < 0.55) R.reliquia(); else R.perder(10); } },
        { t: 'Bajarte', d: 'Ganás 25 de oro.', fx: R => R.oro(25) }
      ]
    }
  };

  /* Dificultad: multiplicadores sobre la vida y el daño de los enemigos. */
  const DIFICULTADES = [
    { id: 0, n: 'Leve',   hp: 0.88, dmg: 0.9,  vol: 80 },
    { id: 1, n: 'Normal', hp: 1,    dmg: 1,    vol: 75 },
    { id: 2, n: 'Alta',   hp: 1.08, dmg: 1.06, vol: 72 },
    { id: 3, n: 'Brutal', hp: 1.16, dmg: 1.12, vol: 70 }
  ];

  const PRECIOS = { carta: [0, 45, 70, 120], reliquia: 110, quitar: 60 };
  const ORO = { inicial: 50, combate: { 1: [24, 30], 2: [28, 36], 3: [36, 46] } };
  const RAREZA = [0, 60, 33, 7];   // probabilidad de cada rareza en las recompensas

  return { CARTAS, MAZO_INICIAL, ENEMIGOS, ENCUENTROS, RELIQUIAS, EVENTOS, DIFICULTADES, PRECIOS, ORO, RAREZA };
})();
