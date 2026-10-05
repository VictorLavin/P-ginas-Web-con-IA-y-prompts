(() => {
  const $ = s => document.querySelector(s);
  const OPT = O.map(([id, c, n, d, r, t, k, e]) => ({ id, c, n, d, r, t, k, e }));
  const get = id => OPT.find(o => o.id === id);
  // multiplicadores por estado: [tamaño, arranque, RAM, seguridad, rendimiento]
  const M = { y: [1, 1, 1, 1, 1], m: [.1, .2, 0, .5, .8], n: [0, 0, 0, 0, 0] };
  const B = { size: 4, boot: 1.2, ram: 18, sec: 30, perf: 40, ...HOOKS.B };
  const PFX = HOOKS.pfx ?? 'CONFIG_';
  const MET = [['size', 'Tamaño del kernel', ' MB', 40, 1, 0], ['boot', 'Tiempo de arranque', ' s', 6, 2, 0], ['ram', 'RAM del kernel', ' MB', 160, 0, 0], ['sec', 'Seguridad', '/100', 100, 0, 1], ['perf', 'Rendimiento', '/100', 100, 0, 1]];
  let distroId = 'ubuntu';
  const curD = () => typeof DISTROS === 'undefined' ? null : DISTROS.find(x => x.id === distroId);
  MET.forEach(m => { if (HOOKS.labels && HOOKS.labels[m[0]]) m[1] = HOOKS.labels[m[0]]; });
  let st = {}, base, baseSt = {}, cur = 'desktop', filter = 'all', q = '', busy = false;
  const on = id => st[id] !== 'n';
  const clamp = v => Math.max(0, Math.min(100, v));
  const sg = v => (v > 0 ? '+' : '') + v;

  function log(t, c = '') {
    const p = $('#log');
    p.insertAdjacentHTML('beforeend', `<span class="${c}">${t}</span>\n`);
    p.scrollTop = p.scrollHeight;
  }

  // Cambia una opción propagando dependencias, como hace menuconfig
  function set(id, s, quiet) {
    const o = get(id);
    if (s === 'm' && (!o.t || st.MODULES === 'n')) s = 'y';
    if (st[id] === s) return;
    st[id] = s;
    if (!quiet) log(`${PFX}${id} → ${s}`, s === 'n' ? 'dim' : 'ok');
    if (s !== 'n') o.r.forEach(r => { if (!on(r)) { set(r, 'y', quiet); if (!quiet) log(`  ↳ ${PFX}${r} activado (dependencia)`, 'warn'); } });
    else OPT.forEach(x => { if (x.r.includes(id) && on(x.id)) { set(x.id, 'n', quiet); if (!quiet) log(`  ↳ ${PFX}${x.id} desactivado (dependía de ${id})`, 'warn'); } });
    if (id === 'MODULES' && s === 'n') OPT.forEach(x => { if (st[x.id] === 'm') { st[x.id] = 'y'; if (!quiet) log(`  ↳ ${PFX}${x.id} pasa a integrado (sin módulos)`, 'warn'); } });
  }

  function calc() {
    const t = { ...B };
    OPT.forEach(o => { const m = M[st[o.id]], e = o.e; t.size += e[0] * m[0]; t.boot += e[1] * m[1]; t.ram += e[2] * m[2]; t.sec += e[3] * m[3]; t.perf += e[4] * m[4]; });
    t.sec = clamp(t.sec); t.perf = clamp(t.perf);
    return t;
  }

  function check() {
    const err = [], warn = [], info = [];
    OPT.forEach(o => { if (o.k && !on(o.id)) err.push(o.k); });
    const all = HOOKS.warn(on, curD());
    warn.push(...all.filter(w => w[0] !== 'ℹ'));
    info.push(...all.filter(w => w[0] === 'ℹ'));
    return { err, warn, info };
  }

  const flash = c => {
    const el = document.querySelector(`.blk[data-c="${c}"]`);
    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  };

  function renderTop() {
    $('#presets').innerHTML = Object.entries(PRE).map(([k, p]) => `<button data-k="${k}" class="${k === cur ? 'on' : ''}">${p.n}</button>`).join('');
    $('#cats').innerHTML = ['all', ...Object.keys(CATS)].map(c => `<button data-c="${c}" style="--c:${c === 'all' ? '#dcebf2' : CATS[c][3]}" class="${filter === c ? 'on' : ''}">${c === 'all' ? 'Todas' : CATS[c][0]}</button>`).join('');
  }

  function renderOpts() {
    const f = OPT.filter(o => (filter === 'all' || o.c === filter) && (!q || (o.id + o.n + o.d + CATS[o.c][0]).toLowerCase().includes(q)));
    $('#opts').innerHTML = f.map(o => {
      const e = o.e, ch = [];
      if (e[0]) ch.push(`<span>📦 ${e[0]} MB</span>`);
      if (e[3]) ch.push(`<span class="${e[3] > 0 ? 'g' : 'b'}">🛡️ ${sg(e[3])}</span>`);
      if (e[4]) ch.push(`<span class="${e[4] > 0 ? 'g' : 'b'}">⚡ ${sg(e[4])}</span>`);
      const segs = ['n', ...(o.t ? ['m'] : []), 'y'].map(s => `<button data-id="${o.id}" data-s="${s}" class="${st[o.id] === s ? 'on' : ''}" aria-pressed="${st[o.id] === s}">${(HOOKS.lbl || {})[s] || s}</button>`).join('');
      return `<div class="opt ${on(o.id) ? '' : 'off'}" style="--c:${CATS[o.c][3]}"><div class="oh"><div><span class="on-n">${o.n}</span><span class="id">${PFX}${o.id}${o.k ? ' <span class="lock">🔒 crítico</span>' : ''}${o.r.length ? ' (requiere ' + o.r.join(', ') + ')' : ''}</span></div><div class="seg">${segs}</div></div><div class="od">${o.d}</div><div class="chips">${ch.join('')}</div></div>`;
    }).join('') || '<p class="hint">Ninguna opción coincide con la búsqueda.</p>';
  }

  function renderArch() {
    const bad = check().err.length > 0, A = HOOKS.arch(on, curD());
    const cat = (c, cls) => {
      const l = OPT.filter(o => o.c === c), a = l.filter(o => on(o.id)).length, crit = l.some(o => o.k && !on(o.id));
      return `<div class="blk ${cls} ${crit ? 'bad' : a ? '' : 'off'} ${filter === c ? 'sel' : ''}" data-c="${c}" style="--c:${CATS[c][3]}"><b>${CATS[c][1]} ${CATS[c][0]}</b><small>${CATS[c][2]}</small><div class="mini"><i style="width:${a / l.length * 100}%"></i></div><small>${a} de ${l.length} activas</small></div>`;
    };
    const F = '<div class="flow"></div>', W = (a, x) => `<div class="blk w ${x || ''}" style="--c:#dcebf2"><b>${a[0]}</b><small>${x ? 'No llega a arrancar' : a[1]}</small></div>`;
    $('#arch').innerHTML = W(A.user, bad ? 'bad' : '') + F + W(A.sys) + F +
      ['cpu', 'mem', 'fs', 'net'].map(c => cat(c, 's3')).join('') + ['sec', 'drv', 'dbg'].map(c => cat(c, '')).join('') + F + W(A.hw);
  }

  function renderMeters() {
    const t = calc(), col = v => v >= 70 ? '#7ee0b0' : v >= 45 ? '#ffb454' : '#ff6b6b';
    const dl = (k, dp) => { const d = t[k] - base[k]; return Math.abs(d) < .05 ? ['', '='] : [(hb(k) ? d > 0 : d < 0) ? 'up' : 'down', (d > 0 ? '+' : '') + d.toFixed(dp)]; };
    const hb = k => MET.find(m => m[0] === k)[5];
    const gauges = MET.filter(m => m[5]).map(([k, l]) => { const v = Math.round(t[k]), [c, x] = dl(k, 0); return `<div class="g"><svg viewBox="0 0 64 64" width="96" role="img" aria-label="${l} ${v} de 100"><circle cx="32" cy="32" r="26" fill="none" stroke="#1d3a50" stroke-width="6"/><circle cx="32" cy="32" r="26" fill="none" stroke="${col(v)}" stroke-width="6" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="${163.4 * (1 - v / 100)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="16" font-weight="600" fill="#dcebf2" font-family="monospace">${v}</text></svg><div>${l}</div><i class="${c}">${x}</i></div>`; }).join('');
    const bars = MET.filter(m => !m[5]).map(([k, l, u, mx, dp]) => { const [c, x] = dl(k, dp); return `<div><div class="mh"><span>${l}</span><b>${t[k].toFixed(dp)}${u}</b><i class="${c}">${x}</i></div><div class="bar"><span class="lb" style="width:${Math.min(100, t[k] / mx * 100)}%"></span></div></div>`; }).join('');
    $('#meters').innerHTML = `<p class="hint" style="grid-column:1/-1">Cambios respecto al preset «${PRE[cur].n}»</p><div class="gauges">${gauges}</div>${bars}`;
  }

  function renderVerdict() {
    const { err, warn, info } = check();
    const h = err.length ? `<div class="v bad">❌ El sistema no consiguió arrancar<small>${HOOKS.panic || 'Kernel panic'}: ${err[0]}</small></div>`
      : warn.length ? '<div class="v warn">⚠️ El sistema arranca pero puede haber errores</div>'
      : '<div class="v ok">✅ Arranca sin problemas</div>';
    const items = [...err.slice(1), ...warn, ...info];
    $('#verdict').innerHTML = h + (items.length ? `<ul>${items.map(w => `<li>${w}</li>`).join('')}</ul>` : '');
  }

  function renderDiff() {
    const d = OPT.filter(o => st[o.id] !== baseSt[o.id]);
    $('#diff').innerHTML = d.length ? '<ul>' + d.map(o => `<li><code>${PFX}${o.id}</code> ${baseSt[o.id]} → <b class="${on(o.id) ? 'g' : 'b'}">${st[o.id]}</b></li>`).join('') + '</ul>' : '<p class="hint">Sin cambios respecto al preset.</p>';
  }

  let pts = [], fls = [], paused = false;
  // Animación por JavaScript: no depende de CSS ni de SMIL, y se mueve siempre
  function tick(ms) {
    if (!paused) {
      const t = ms / 1000;
      pts.forEach(({ c, ph, v }) => { const f = (t / 1.4 + ph) % 1; c.setAttribute('cx', v[0] + (v[2] - v[0]) * f); c.setAttribute('cy', v[1] + (v[3] - v[1]) * f); c.setAttribute('opacity', Math.sin(Math.PI * f).toFixed(2)); });
      fls.forEach(p => p.setAttribute('stroke-dashoffset', -((t * 28) % 14)));
    }
    requestAnimationFrame(tick);
  }

  const POS = { cpu: [110, 60], mem: [350, 45], fs: [590, 85], net: [590, 250], sec: [350, 265], drv: [110, 240], dbg: [350, 155] };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dbs = (t, c) => { const e = $('#dbstatus'); e.textContent = t; e.className = c; e.hidden = false; };

  // Datos que se envían al servlet (y que acaban en las tablas boot_event y boot_issue)
  function bootPayload(t, err, warn, info, message) {
    const config = {};
    OPT.forEach(o => { if (on(o.id)) config[o.id] = st[o.id]; });
    const issues = [...err.map(m => ({ severity: 'error', message: m })), ...warn.map(m => ({ severity: 'warning', message: m })), ...info.map(m => ({ severity: 'info', message: m.replace(/^ℹ\s*/, '') }))];
    return { os: HOOKS.os, distro: curD() ? curD().n : null, preset: PRE[cur].n, result: err.length ? 'failed' : warn.length ? 'warning' : 'ok', bootSeconds: +t.boot.toFixed(2), security: Math.round(t.sec), performance: Math.round(t.perf), sizeMb: +t.size.toFixed(1), ramMb: Math.round(t.ram), message, config, issues };
  }

  async function renderHistory() {
    const box = $('#history');
    if (!box || typeof KernelAPI === 'undefined') return;
    try {
      const [rows, s] = await Promise.all([KernelAPI.list(HOOKS.os), KernelAPI.stats(HOOKS.os)]);
      $('#stats').innerHTML = `<span>${s.total} arranques</span><span class="ok">${s.ok} correctos</span><span class="warn">${s.warning} con avisos</span><span class="bad">${s.failed} fallidos</span><span>media ${s.avgSeconds} s</span>` +
        (s.topIssues.length ? `<ul class="top">${s.topIssues.map(i => `<li class="${i.severity}">${i.count}× ${esc(i.message)}</li>`).join('')}</ul>` : '');
      const lbl = { ok: 'Correcto', warning: 'Con avisos', failed: 'Fallido' };
      box.innerHTML = rows.length ? `<table><thead><tr><th>Nº</th><th>Fecha</th><th>Sistema</th><th>Resultado</th><th>Tiempo</th><th>Problema principal</th></tr></thead><tbody>${rows.map(r => {
        const top = r.issues.find(i => i.severity === 'error') || r.issues.find(i => i.severity === 'warning');
        return `<tr><td>${r.id}</td><td>${esc(r.createdAt)}</td><td>${esc(r.distro || r.os)}</td><td><b class="${r.result}">${lbl[r.result]}</b></td><td>${r.bootSeconds} s</td><td>${top ? esc(top.message) : '—'}</td></tr>`;
      }).join('')}</tbody></table>` : '<p class="hint">Todavía no hay arranques guardados. Pulsa «Simular arranque» en el laboratorio.</p>';
    } catch (e) {
      $('#stats').innerHTML = '';
      box.innerHTML = '<p class="hint">Sin conexión con el servidor. Arranca MySQL y Tomcat (mira el README) y recarga la página.</p>';
    }
  }

  function renderInfo() {
    if (filter === 'all') { $('#info').innerHTML = '<p class="hint" style="margin-top:14px">Pulsa un bloque del diagrama para ver qué hace y con qué se relaciona.</p>'; return; }
    const act = OPT.filter(o => o.c === filter && on(o.id)).map(o => PFX + o.id);
    const rel = EDGES.filter(e => e.includes(filter)).map(e => CATS[e[0] === filter ? e[1] : e[0]][0]);
    $('#info').innerHTML = `<div class="card" style="--c:${CATS[filter][3]}"><small>Subsistema</small><h3>${CATS[filter][1]} ${CATS[filter][0]}</h3><p>${INFO[filter]}</p><p><b>Interactúa con:</b> ${rel.join(', ')}.</p><p><b>Activas:</b> ${act.join(', ') || 'ninguna'}</p></div>`;
  }

  function renderGraph() {
    const bad = new Set(OPT.filter(o => o.k && !on(o.id)).map(o => o.c));
    const chg = new Set([...OPT.filter(o => st[o.id] !== baseSt[o.id]).map(o => o.c), ...bad]);
    const f1 = n => n.toFixed(1);
    const idle = EDGES.filter(([a, b]) => !chg.has(a) && !chg.has(b)).map(([a, b]) => `<line x1="${POS[a][0]}" y1="${POS[a][1]}" x2="${POS[b][0]}" y2="${POS[b][1]}"/>`).join('');
    const flows = [];
    EDGES.forEach(([a, b]) => { if (chg.has(a)) flows.push([a, b]); if (chg.has(b)) flows.push([b, a]); });
    const arrows = flows.map(([a, b]) => {
      const [x1, y1] = POS[a], [x2, y2] = POS[b], dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const t = Math.min(62 / Math.abs(dx || 1e-9), 24 / Math.abs(dy || 1e-9)), o = chg.has(a) && chg.has(b) ? 9 : 0, nx = -dy / len * o, ny = dx / len * o;
      const sx = x1 + dx * (t + 4 / len) + nx, sy = y1 + dy * (t + 4 / len) + ny, ex = x2 - dx * (t + 3 / len) + nx, ey = y2 - dy * (t + 3 / len) + ny, c = bad.has(a) ? 'err' : '';
      return `<path class="fl ${c}" d="M${f1(sx)} ${f1(sy)}L${f1(ex)} ${f1(ey)}"/>` + [0, .33, .66].map(ph => `<circle class="pt ${c}" r="${ph ? 3.5 : 4.5}" opacity="0" data-ph="${ph}" data-p="${f1(sx)},${f1(sy)},${f1(ex)},${f1(ey)}"/>`).join('');
    }).join('');
    const defs = '<defs><marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--cy)"/></marker><marker id="ae" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--co)"/></marker></defs>';
    const nodes = Object.keys(CATS).map(c => {
      const l = OPT.filter(o => o.c === c), a = l.filter(o => on(o.id)).length;
      return `<g class="node ${chg.has(c) ? 'ch' : ''} ${a ? '' : 'off'}" data-c="${c}" transform="translate(${POS[c][0]} ${POS[c][1]})" style="--c:${CATS[c][3]}"><rect x="-62" y="-24" width="124" height="48" rx="12"/><text y="-3">${CATS[c][0]}</text><text y="14" class="s">${a}/${l.length} activas</text></g>`;
    }).join('');
    $('#graph').innerHTML = `<svg viewBox="0 0 700 310" role="img" aria-label="Grafo de dependencias entre subsistemas">${defs}${idle}${arrows}${nodes}</svg>`;
    pts = [...document.querySelectorAll('#graph .pt')].map(c => ({ c, ph: +c.dataset.ph, v: c.dataset.p.split(',').map(Number) }));
    fls = [...document.querySelectorAll('#graph path.fl')];
    $('#gcount').textContent = chg.size ? `${chg.size} subsistema${chg.size > 1 ? 's' : ''} afectado${chg.size > 1 ? 's' : ''}` : 'Sin cambios: mueve alguna opción del laboratorio.';
    $('#gpaths').innerHTML = flows.map(([a, b]) => `<span>${CATS[a][0]} → ${CATS[b][0]}</span>`).join('');
  }

  function renderConcepts() {
    $('#concepts').innerHTML = Object.keys(CATS).map(c => `<article style="--c:${CATS[c][3]}"><h3>${CATS[c][1]} ${CATS[c][0]}</h3><p>${INFO[c]}</p><code>${OPT.filter(o => o.c === c).slice(0, 4).map(o => PFX + o.id).join(', ')}</code></article>`).join('');
  }

  function render() { $('#bootmsg').hidden = true; $('#dbstatus').hidden = true; renderTop(); renderOpts(); renderArch(); renderInfo(); renderMeters(); renderVerdict(); renderDiff(); renderGraph(); }

  function load(k) {
    cur = k;
    OPT.forEach(o => st[o.id] = 'n');
    PRE[k].on.forEach(id => set(id, 'y', 1));
    PRE[k].m.forEach(id => set(id, 'm', 1));
    base = calc(); baseSt = { ...st };
    $('#log').textContent = '';
    log(`Preset «${PRE[k].n}» cargado.`, 'ok');
    log('Cambia opciones a la izquierda o pulsa «Simular arranque».', 'dim');
    render();
  }

  async function boot() {
    if (busy) return;
    busy = true; $('#bootmsg').hidden = true; $('#dbstatus').hidden = true; $('#boot').disabled = true; $('#log').textContent = ''; $('#prog i').style.width = '0';
    const { err, warn, info } = check(), t = calc(), L = [];
    let clk = 0;
    const p = (m, c = '') => { clk += Math.random() * .09 + .01; L.push([`[${clk.toFixed(6).padStart(10)}] ${m}`, c]); };
    HOOKS.boot({ on, get, t, p, L, err, warn, distro: curD() });
    for (const [i, [m, c]] of L.entries()) { log(m, c); $('#prog i').style.width = ((i + 1) / L.length * 100) + '%'; await new Promise(r => setTimeout(r, 70)); }
    const bm = $('#bootmsg'), li = a => a.map(w => `<small>• ${w}</small>`).join('');
    bm.className = err.length ? 'bad' : warn.length ? 'warn' : '';
    bm.innerHTML = err.length ? `❌ El sistema no consiguió arrancar<small>${err[0]}</small>` : warn.length ? `⚠️ El sistema arranca pero puede haber errores${li(warn)}` : '✅ ' + HOOKS.ok({ distro: curD() }) + li(info);
    bm.hidden = false;
    if (typeof KernelAPI !== 'undefined') {
      const msg = err.length ? 'El sistema no consiguió arrancar' : warn.length ? 'El sistema arranca pero puede haber errores' : HOOKS.ok({ distro: curD() });
      dbs('💾 Guardando el arranque en MySQL…', '');
      KernelAPI.save(bootPayload(t, err, warn, info, msg))
        .then(r => { dbs(`💾 Arranque nº ${r.id} guardado en MySQL`, 'ok'); renderHistory(); })
        .catch(e => dbs(`⚠️ No se pudo guardar en MySQL: ${e.message}. ¿Están Tomcat y MySQL en marcha?`, 'bad'));
    }
    busy = false; $('#boot').disabled = false;
  }

  $('#opts').onclick = e => {
    const b = e.target.closest('button[data-s]');
    if (!b || busy) return;
    const prev = { ...st };
    set(b.dataset.id, b.dataset.s);
    render();
    OPT.filter(o => prev[o.id] !== st[o.id]).forEach(o => flash(o.c));
  };
  $('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { filter = b.dataset.c; render(); } };
  ['#arch', '#graph'].forEach(sel => $(sel).onclick = e => {
    const b = e.target.closest('[data-c]');
    if (b) { filter = filter === b.dataset.c ? 'all' : b.dataset.c; render(); $('aside').scrollTop = 0; }
  });
  $('#presets').onclick = e => { const b = e.target.closest('[data-k]'); if (b && !busy) load(b.dataset.k); };
  $('#q').oninput = e => { q = e.target.value.toLowerCase().trim(); renderOpts(); };
  $('#boot').onclick = boot;
  $('#reset').onclick = () => { if (!busy) load(cur); };
  $('#export').onclick = () => {
    const x = HOOKS.exp(OPT, st, on), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([x.text], { type: 'text/plain' }));
    a.download = x.name;
    a.click();
    log(`${x.name} exportado.`, 'ok');
  };

  if ($('#imp')) $('#imp').onchange = async e => {
    const f = e.target.files[0];
    if (!f || busy) return;
    const found = {};
    (await f.text()).split('\n').forEach(l => { const m = l.match(/^CONFIG_(\w+)=([ym])/); if (m && get(m[1])) found[m[1]] = m[2]; });
    OPT.forEach(o => st[o.id] = 'n');
    Object.entries(found).forEach(([k, v]) => set(k, v, 1));
    log(`Importado ${f.name}: ${Object.keys(found).length} opciones reconocidas.`, 'ok');
    e.target.value = '';
    render();
  };

  $('#gpause').onclick = e => { paused = !paused; e.target.textContent = paused ? '▶ Reanudar animación' : '⏸ Pausar animación'; };
  requestAnimationFrame(tick);
  if ($('#distro') && typeof DISTROS !== 'undefined') {
    $('#distro').innerHTML = DISTROS.map(d => `<option value="${d.id}">${d.n}</option>`).join('');
    $('#distro').onchange = e => { distroId = e.target.value; render(); log(`Distribución: ${curD().n}`, 'ok'); };
  }
  renderConcepts();
  renderHistory();
  load('desktop');
})();
