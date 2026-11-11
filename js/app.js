/* Pick one folder:  Courses/ -> Course/ -> "1. Section"/ -> "1. Lesson.mp4", "1. Lesson.vtt", "1. Slides.pdf" */
const $ = s => document.querySelector(s);
const collator = new Intl.Collator(undefined, {numeric:true, sensitivity:'base'});
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ext = n => (n.match(/\.([^.]+)$/) || [,''])[1].toLowerCase();
const base = n => n.replace(/\.[^.]+$/, '');
const has = (list, n) => list.split(' ').includes(ext(n));
/* order by the number at the start of the name (1, 2, … 10), then by name */
const num = n => { const m = n.match(/^\s*[\[(]?\s*(?:section|part|lesson|chapter|module|lecture)?\s*(\d+)/i); return m ? +m[1] : null; };
const cmp = (a, b) => { const x = num(a), y = num(b);
  if (x !== null && y !== null && x !== y) return x - y;
  if ((x === null) !== (y === null)) return x === null ? 1 : -1;
  return collator.compare(a, b); };
const byName = (a, b) => cmp(a.name, b.name);
const NUM = /^\s*[\[(]?\s*(?:section\s*)?(\d+)\s*[\])]?\s*[._:\-–—]*\s*(.*)$/i;
const pretty = n => { const m = n.match(NUM); return m && m[2] ? +m[1] + '. ' + m[2] : n; };   /* "005 Title", "1 - Title", "[7] Title" become "5. Title" */
const secTitle = (n, i) => { const m = n.match(NUM);
  return m ? ('Section ' + +m[1] + (m[2] ? ': ' + m[2] : '')) : 'Section ' + (i + 1) + ': ' + n; };
const fmt = s => { const m = Math.max(1, Math.round(s / 60)); return m >= 60 ? Math.floor(m / 60) + 'hr ' + (m % 60) + 'min' : m + 'min'; };
const TEXT = 'txt md json csv log js ts py java c cpp cs go rb php sql xml yml yaml ini css';
const kind = n => has('mp4 webm mkv mov m4v avi ogv', n) ? 'video' : has('mp3 wav m4a ogg flac aac opus', n) ? 'audio'
  : has('png jpg jpeg gif webp svg avif', n) ? 'image' : ext(n) === 'pdf' ? 'pdf' : ext(n) === 'docx' ? 'docx'
  : has('html htm', n) ? 'html' : has(TEXT, n) ? 'text' : 'other';
const P = {
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  code: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M10 12l-2 2 2 2M14 12l2 2-2 2"/>',
  zip: '<path d="M4 8h16v12H4zM3 4h18v4H3zM10 12h4"/>',
  video: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
  audio: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-9 9"/>'
};
const icon = n => { const k = kind(n), t = has('zip rar 7z tar gz', n) ? 'zip' : k === 'html' ? 'code' : P[k] ? k : 'file';
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[t]}</svg>`; };
const SKIN = `<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@100..900&display=swap" rel="stylesheet"><style>html,body{background:#fff!important;color:#111}body,body :not(pre):not(code):not(pre *):not(code *){font-family:'Google Sans Flex','Google Sans',system-ui,sans-serif!important}</style>`;
const skin = t => /<\/head>/i.test(t) ? t.replace(/<\/head>/i, () => SKIN + '</head>') : SKIN + t;
const INTRO = '\u0000';
const TONES = ['#0a0a0a', '#1f3a5f', '#2e5e4e', '#7a3b3b', '#4a3f6b', '#8a6a2f'];

let rootName = '', courses = [], C = null, cur = -1, urls = [], token = 0;
const picker = $('#picker'), FSA = 'showDirectoryPicker' in window;

function idb(mode, val) {
  return new Promise((res, rej) => {
    const o = indexedDB.open('local-courses', 1);
    o.onupgradeneeded = () => o.result.createObjectStore('k');
    o.onerror = () => rej(o.error);
    o.onsuccess = () => {
      const s = o.result.transaction('k', mode === 'get' ? 'readonly' : 'readwrite').objectStore('k');
      const r = mode === 'get' ? s.get('root') : s.put(val, 'root');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    };
  });
}

/* ---- read folders ---- */
async function entries(h) { const out = []; for await (const e of h.values()) out.push(e); return out.sort(byName); }
async function fromHandle(h) {
  rootName = h.name;
  return (await entries(h)).filter(e => e.kind === 'directory').map(d => ({
    name: d.name,
    async load() {
      const secs = [], loose = [];
      for (const e of await entries(d)) {
        if (e.kind === 'file') loose.push({name: e.name, get: () => e.getFile()});
        else {
          const files = [];
          const walk = async dir => { for (const x of await entries(dir)) x.kind === 'file' ? files.push({name: x.name, get: () => x.getFile()}) : await walk(x); };
          await walk(e); secs.push({name: e.name, files});
        }
      }
      if (loose.length) secs.push({name: INTRO, files: loose});
      return secs;
    }
  }));
}
function fromFileList(fl) {
  const map = new Map();
  for (const f of fl) {
    const p = f.webkitRelativePath.split('/'); rootName = p[0];
    if (p.length < 3) continue;
    const c = map.get(p[1]) || map.set(p[1], new Map()).get(p[1]), sec = p.length === 3 ? INTRO : p[2];
    (c.get(sec) || c.set(sec, []).get(sec)).push({name: f.name, get: async () => f});
  }
  return [...map].map(([name, secs]) => ({name, load: async () => [...secs].map(([n, files]) => ({name: n, files}))})).sort(byName);
}

/* ---- start / dashboard ---- */
async function start() {
  $('#back').hidden = true; $('#change').hidden = true; $('#course').style.display = 'none'; $('#home').style.display = '';
  $('#title').textContent = 'My Courses';
  let saved = null; if (FSA) try { saved = await idb('get'); } catch (e) {}
  $('#home').innerHTML = `<div class="center"><div><h2>Learn from your computer</h2>
    <p>Choose the folder that holds your courses. Each course is a folder with numbered section folders inside, and each section holds numbered videos, subtitles and resources. Files are read straight from your disk.</p>
    ${saved ? `<button class="btn pri" id="resume">Open “${esc(saved.name)}”</button> ` : ''}
    <button class="btn ${saved ? '' : 'pri'}" id="pick">Choose folder</button></div></div>`;
  $('#pick').onclick = choose;
  if (saved) $('#resume').onclick = async () => {
    if (await saved.requestPermission({mode: 'read'}) === 'granted') load(await fromHandle(saved)); else choose();
  };
}
async function choose() {
  if (FSA) {
    try { const h = await showDirectoryPicker({mode: 'read'}); try { await idb('put', h); } catch (e) {} load(await fromHandle(h)); }
    catch (e) { if (e.name !== 'AbortError') alert('Could not open that folder. Browsers block system folders such as Documents or Downloads; pick a subfolder instead.'); }
  } else picker.click();
}
picker.onchange = () => { if (picker.files.length) load(fromFileList(picker.files)); picker.value = ''; };
$('#change').onclick = start;
function load(list) { courses = list; $('#change').hidden = false; location.hash.startsWith('#/course/') ? route() : showDashboard(); }
function showDashboard() {
  stop(); C = null; $('#course').style.display = 'none'; $('#home').style.display = '';
  $('#back').hidden = true; $('#title').textContent = 'My Courses'; document.title = 'My Courses';
  $('#home').innerHTML = `<div class="wrap"><h2>Your courses</h2><p class="sub">${courses.length} course${courses.length === 1 ? '' : 's'} in “${esc(rootName)}”</p>
    <input class="search" id="q" placeholder="Search courses" aria-label="Search courses"><div class="grid" id="g"></div></div>`;
  const draw = t => {
    $('#g').innerHTML = courses.map((c, i) => [c, i]).filter(([c]) => c.name.toLowerCase().includes(t.toLowerCase())).map(([c, i]) => {
      let h = 0; for (const ch of c.name) h = (h * 31 + ch.charCodeAt(0)) % 360;
      return `<button class="card" data-i="${i}"><div class="thumb" style="background:${TONES[h % TONES.length]}">${esc(c.name.trim()[0] || '?').toUpperCase()}</div><b>${esc(c.name)}</b></button>`;
    }).join('') || '<p class="msg">No courses found. Pick a folder whose subfolders are courses.</p>';
    document.querySelectorAll('.card').forEach(b => b.onclick = () => location.hash = '#/course/' + b.dataset.i);
  };
  draw(''); $('#q').oninput = e => draw(e.target.value);
}

/* ---- progress ---- */
const doneKey = () => 'done:' + rootName + '/' + C.name;
const getDone = () => { try { return JSON.parse(localStorage.getItem(doneKey()) || '[]'); } catch (e) { return []; } };
const fid = f => f.sec + '/' + f.name;
function setDone(i, v) {
  const f = C.flat[i], d = getDone().filter(x => x !== fid(f)); if (v) d.push(fid(f));
  try { localStorage.setItem(doneKey(), JSON.stringify(d)); } catch (e) {}
  document.querySelector(`.lec[data-i="${i}"] .ck`).checked = v; updateSec(f.secIdx);
}
function updateSec(n) {
  const s = C.sections[n], d = getDone(), done = s.items.filter(f => d.includes(fid(f))).length, t = s.items.reduce((a, f) => a + (f.dur || 0), 0);
  document.querySelector(`.sec[data-n="${n}"] small`).textContent = `${done} / ${s.items.length}` + (t ? ' | ' + fmt(t) : '');
}

/* ---- course ---- */
async function showCourse(n) {
  stop(); const c = courses[n]; if (!c) return showDashboard();
  $('#home').style.display = 'none'; $('#course').style.display = 'block'; $('#back').hidden = false;
  $('#title').textContent = c.name; document.title = c.name;
  $('#stage').className = 'stage'; $('#ft').textContent = ''; $('#fs').textContent = '';
  $('#toc').innerHTML = '<p class="msg" style="padding:18px">Loading content…</p>';
  const raw = (await c.load()).sort((a, b) => a.name === INTRO ? -1 : b.name === INTRO ? 1 : byName(a, b));
  const me = C = {name: c.name, sections: [], flat: []};
  for (const s of raw) {
    const files = s.files.filter(f => !f.name.startsWith('.')).sort(byName);
    const subs = files.filter(f => has('vtt srt', f.name)), rest = files.filter(f => !has('vtt srt', f.name));
    let vids = rest.filter(f => kind(f.name) === 'video'), others = rest.filter(f => kind(f.name) !== 'video');
    if (!vids.length) { vids = rest; others = []; }   /* a section with no videos: its files become lessons */
    else {   /* a numbered document with no video of the same number (e.g. a coding challenge .html) is a lesson too */
      const seen = new Set(vids.map(f => num(f.name))), own = [];
      for (const o of others) { const x = num(o.name); if (kind(o.name) !== 'other' && x !== null && !seen.has(x)) { seen.add(x); own.push(o); } }
      vids = vids.concat(own).sort(byName); others = others.filter(o => !own.includes(o));
    }
    if (!vids.length) continue;
    const secIdx = C.sections.length, secName = s.name === INTRO ? 'Introduction' : s.name;
    const items = vids.map(f => {
      const it = {...f, secIdx, sec: secName, res: [], i: C.flat.length,
        sub: subs.find(x => base(x.name) === base(f.name)) || subs.find(x => num(x.name) !== null && num(x.name) === num(f.name))};
      C.flat.push(it); return it;
    });
    for (const o of others) {   /* resources belong to the lesson with the same number */
      const x = num(o.name); let t = x !== null && items.find(it => num(it.name) === x);
      if (!t) { t = items[0]; for (const it of items) if (cmp(it.name, o.name) <= 0) t = it; }
      t.res.push(o);
    }
    C.sections.push({name: secName, items});
  }
  if (!C.flat.length) { $('#toc').innerHTML = '<p class="msg" style="padding:18px">This course has no files yet.</p>'; return; }
  const done = getDone();
  $('#toc').innerHTML = C.sections.map((s, n) => `<div class="sec closed" data-n="${n}"><button class="sh" aria-expanded="false"><span><b>${esc(secTitle(s.name, n))}</b><small></small></span><i>▾</i></button><ul>
    ${s.items.map(f => `<li class="lec" data-i="${f.i}"><div class="lr"><input type="checkbox" class="ck" aria-label="Mark as complete" ${done.includes(fid(f)) ? 'checked' : ''}>
      <div class="lb"><button class="lt">${esc(pretty(base(f.name)))}</button><div class="lm"><span class="du">${kind(f.name) === 'video' ? '<span></span>' : icon(f.name)}</span>
      ${f.res.length ? `<button class="rb" aria-expanded="false">Resources (${f.res.length}) ▾</button>` : ''}</div></div></div>
      ${f.res.length ? `<ul class="rs" hidden>${f.res.map((r, j) => `<li><button class="ri" data-j="${j}">${icon(r.name)}<span>${esc(pretty(base(r.name)))}</span></button></li>`).join('')}</ul>` : ''}</li>`).join('')}</ul></div>`).join('');
  C.sections.forEach((_, n) => updateSec(n));
  const first = C.flat.findIndex(f => !done.includes(fid(f)));
  play(first < 0 ? 0 : first, true);
  durations(me);
}
$('#toc').onclick = e => {
  const t = e.target, lec = t.closest('.lec'), sh = t.closest('.sh');
  if (sh) { const closed = sh.parentElement.classList.toggle('closed'); sh.setAttribute('aria-expanded', !closed); }
  else if (t.closest('.rb')) { const ul = lec.querySelector('.rs'); ul.hidden = !ul.hidden; t.closest('.rb').setAttribute('aria-expanded', !ul.hidden); }
  else if (t.closest('.ri')) openRes(+lec.dataset.i, +t.closest('.ri').dataset.j);
  else if (t.closest('.lt')) play(+lec.dataset.i);
  else if (t.classList.contains('ck')) setDone(+lec.dataset.i, t.checked);
};
async function durations(c) {   /* fills in the minutes shown next to each video */
  const q = c.flat.filter(f => kind(f.name) === 'video'); let k = 0;
  const w = async () => { while (k < q.length && C === c) {
    const f = q[k++];
    try {
      const u = URL.createObjectURL(await f.get()), v = document.createElement('video');
      v.preload = 'metadata'; await new Promise(r => { v.onloadedmetadata = r; v.onerror = r; v.src = u; }); URL.revokeObjectURL(u);
      if (isFinite(v.duration) && v.duration > 0 && C === c) { f.dur = v.duration; document.querySelector(`.lec[data-i="${f.i}"] .du span`).textContent = fmt(f.dur); updateSec(f.secIdx); }
    } catch (e) {}
  } };
  await Promise.all([w(), w(), w()]);
}

/* ---- playback ---- */
function stop() { urls.forEach(URL.revokeObjectURL); urls = []; token++; $('#stage').innerHTML = ''; }
const url = f => { const u = URL.createObjectURL(f); urls.push(u); return u; };
function mark(i, rb) {
  document.querySelectorAll('.lec').forEach(l => l.classList.toggle('on', +l.dataset.i === i));
  document.querySelectorAll('.ri').forEach(b => b.classList.toggle('on', b === rb));
}
function play(i, quiet) {
  cur = i; mark(i);
  if (!quiet) { const l = document.querySelector(`.lec[data-i="${i}"]`); l.closest('.sec').classList.remove('closed'); l.closest('.sec').querySelector('.sh').setAttribute('aria-expanded', 'true'); l.scrollIntoView({block: 'nearest'}); }
  show(C.flat[i], i, true);
}
async function openRes(i, j) {
  const r = C.flat[i].res[j], k = kind(r.name);
  if (k === 'other') {   /* zip and similar: save to disk */
    const u = URL.createObjectURL(await r.get()), a = document.createElement('a'); a.href = u; a.download = r.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); return;
  }
  cur = i; mark(i, document.querySelector(`.lec[data-i="${i}"] .ri[data-j="${j}"]`)); show(r, i, false);
}
async function show(f, i, lesson) {
  stop(); const my = token, st = $('#stage'), k = kind(f.name);
  st.className = 'stage' + (['pdf', 'docx', 'html', 'text'].includes(k) ? ' doc' : '');
  $('#ft').textContent = pretty(base(f.name)); $('#fs').textContent = secTitle(C.flat[i].sec, C.flat[i].secIdx);
  $('#prev').disabled = i === 0; $('#next').disabled = i === C.flat.length - 1;
  st.textContent = 'Loading…';
  try {
    const file = await f.get(); if (my !== token) return; const u = url(file);
    if (k === 'video' || k === 'audio') {
      let track = '';
      if (lesson && f.sub) try {
        let t = await (await f.sub.get()).text();
        if (ext(f.sub.name) === 'srt') t = 'WEBVTT\n\n' + t.replace(/\r/g, '').replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
        track = `<track kind="subtitles" src="${url(new Blob([t], {type: 'text/vtt'}))}" srclang="en" label="Subtitles" default>`;
      } catch (e) {}
      if (my !== token) return;
      st.innerHTML = `<${k} controls autoplay playsinline src="${u}">${track}</${k}>`;
      st.firstChild.onended = () => { if (lesson) { setDone(i, true); if (cur < C.flat.length - 1) play(cur + 1); } };
      st.firstChild.onerror = () => { st.innerHTML = `<div class="note">Your browser can’t play .${esc(ext(f.name))} files. Converting the video to .mp4 fixes this.</div>`; };
      return;
    }
    if (lesson) setDone(i, true);
    let html;
    if (k === 'image') html = `<img alt="" src="${u}">`;
    else if (k === 'pdf') html = `<iframe title="${esc(f.name)}" src="${u}"></iframe>`;
    else if (k === 'html') html = `<iframe class="hf" title="${esc(f.name)}" sandbox="allow-scripts allow-popups" src="${url(new Blob([skin(await file.text())], {type: 'text/html;charset=utf-8'}))}"></iframe>`;
    else if (k === 'text') html = `<div class="page"><pre>${esc(await file.text())}</pre></div>`;
    else if (k === 'docx' && window.mammoth) html = `<div class="page">${(await mammoth.convertToHtml({arrayBuffer: await file.arrayBuffer()})).value}</div>`;
    else html = `<div class="note">There’s no in-page preview for .${esc(ext(f.name))} files.</div>`;
    if (my === token) st.innerHTML = html;
  } catch (e) { if (my === token) st.innerHTML = '<div class="note">Couldn’t read this file. If you moved or renamed it, choose the folder again.</div>'; }
}

/* ---- routing ---- */
function route() {
  if (!courses.length) return start();
  const m = location.hash.match(/^#\/course\/(\d+)/);
  m ? showCourse(+m[1]) : showDashboard();
}
$('#back').onclick = () => location.hash = '#/';
$('#prev').onclick = () => play(cur - 1);
$('#next').onclick = () => play(cur + 1);
addEventListener('hashchange', route);
location.hash = '#/'; start();
