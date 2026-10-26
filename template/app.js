const root = document.documentElement;

// ----- checkpoints toggle -----
const cpBtn = document.getElementById('cpToggle');
function syncCp(){
  const hidden = root.classList.contains('hide-checkpoints');
  cpBtn.setAttribute('aria-pressed', hidden);
  cpBtn.textContent = hidden ? 'แสดงแบบทดสอบ' : 'ซ่อนแบบทดสอบ';
}
syncCp();
cpBtn.addEventListener('click', () => {
  const hidden = root.classList.toggle('hide-checkpoints');
  syncCp();
  try { localStorage.setItem('hideCheckpoints', hidden ? '1' : '0'); } catch (e) {}
});

// ----- theme: auto → light → dark -----
const themeBtn = document.getElementById('themeBtn');
const THEMES = ['auto', 'light', 'dark'], LABEL = {auto: '◐ Auto', light: '☀ Light', dark: '☾ Dark'};
function setTheme(t){
  if (t === 'auto') delete root.dataset.theme; else root.dataset.theme = t;
  themeBtn.textContent = LABEL[t];
  try { t === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', t); } catch (e) {}
}
setTheme(root.dataset.theme || 'auto');
themeBtn.addEventListener('click', () => setTheme(THEMES[(THEMES.indexOf(root.dataset.theme || 'auto') + 1) % 3]));

// ----- mobile nav -----
document.getElementById('navBtn').addEventListener('click', () => root.classList.toggle('nav-open'));
document.querySelectorAll('nav.side a').forEach(a => a.addEventListener('click', () => root.classList.remove('nav-open')));

// ----- sidebar filter -----
const navFilter = document.getElementById('navFilter');
const noMatch = Object.assign(document.createElement('div'), {className: 'nomatch hidden', textContent: 'ไม่พบบทเรียน'});
document.querySelector('nav.side > ul').after(noMatch);
navFilter.addEventListener('input', () => {
  const q = navFilter.value.trim().toLowerCase();
  let any = false;
  document.querySelectorAll('nav.side .dom').forEach(d => {
    const domHit = d.querySelector('summary').textContent.toLowerCase().includes(q);
    let hits = 0;
    d.querySelectorAll('details ul li').forEach(li => {
      const hit = !q || domHit || li.textContent.toLowerCase().includes(q);
      li.classList.toggle('hidden', !hit); hits += hit;
    });
    d.classList.toggle('hidden', !hits);
    if (q) d.querySelector('details').open = hits > 0;
    any ||= hits > 0;
  });
  noMatch.classList.toggle('hidden', any);
});

// ----- active lesson in sidebar -----
const links = new Map([...document.querySelectorAll('nav.side details ul a')].map(a => [a.hash.slice(1), a]));

// ----- mark lessons as read (checkbox in sidebar) -----
const RKEY = 'read:' + root.dataset.course;
let readSet = new Set();
try { readSet = new Set(JSON.parse(localStorage.getItem(RKEY) || '[]')); } catch (e) {}
function updateReadCounts(){
  document.querySelectorAll('nav.side .dom').forEach(d => {
    const as = [...d.querySelectorAll('details ul a')], n = as.filter(a => readSet.has(a.hash.slice(1))).length;
    const sm = d.querySelector('.dname small');
    sm.dataset.base ||= sm.textContent;
    sm.textContent = sm.dataset.base + (n ? ` · อ่านแล้ว ${n}/${as.length}` : '');
  });
}
links.forEach((a, id) => {
  const c = document.createElement('span');
  c.className = 'rd'; c.tabIndex = 0; c.setAttribute('role', 'checkbox'); c.title = 'ทำเครื่องหมายว่าอ่านแล้ว';
  const sync = () => { const on = readSet.has(id); c.setAttribute('aria-checked', on); a.classList.toggle('read', on); };
  const toggle = e => {
    e.preventDefault(); e.stopPropagation();
    readSet.has(id) ? readSet.delete(id) : readSet.add(id);
    try { localStorage.setItem(RKEY, JSON.stringify([...readSet])); } catch (err) {}
    sync(); updateReadCounts();
  };
  c.addEventListener('click', toggle);
  c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggle(e); });
  a.prepend(c); sync();
});
updateReadCounts();
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  links.forEach(a => a.classList.remove('active'));
  const a = links.get(e.target.id);
  if (!a) return;
  a.classList.add('active');
  const dom = a.closest('.dom');
  document.querySelectorAll('nav.side .dom').forEach(d => d.classList.toggle('current', d === dom));
  if (!navFilter.value) dom.querySelector('details').open = true;
  a.scrollIntoView({block: 'nearest'});
}), {rootMargin: '-60px 0px -70% 0px'});
document.querySelectorAll('section.lesson').forEach(s => io.observe(s));

// ----- quiz: choose answers, score, keep progress in localStorage -----
// progress แยกตามคอร์ส: quiz:<slug>
const QKEY = 'quiz:' + root.dataset.course;
let store = {};
try {
  if (!localStorage.getItem(QKEY) && localStorage.getItem('quiz') && root.dataset.course === 'claude-developer-foundations')
    localStorage.setItem(QKEY, localStorage.getItem('quiz'));  // ย้าย progress จากเวอร์ชันคอร์สเดียว
  store = JSON.parse(localStorage.getItem(QKEY) || '{}');
} catch (e) {}
const save = () => { try { localStorage.setItem(QKEY, JSON.stringify(store)); } catch (e) {} };
const LETTERS = 'ABCDEFGH';
const quizzes = [];

document.querySelectorAll('section.lesson').forEach(sec => {
  sec.querySelectorAll('.checkpoint').forEach((cp, i) => {
    const key = sec.id + '#' + i, ol = cp.querySelector(':scope > ol[type="A"]');
    const det = cp.querySelector('details'), ans = det && det.querySelector('p > strong');
    // เฉลยแบบ "B" หรือ "A, C, E" / "A และ B" → ตรวจอัตโนมัติ, นอกนั้น (เรียงลำดับ/จับคู่) → ให้ประเมินตัวเอง
    const m = ans && ans.textContent.trim().match(/^[A-H](\s*(,|และ)\s*[A-H])*$/);
    const q = {key, cp, sec, det};
    quizzes.push(q);
    if (ol && m) autoQuiz(q, ol, new Set(m[0].match(/[A-H]/g)));
    else if (det) selfQuiz(q);
  });
});

function bar(parent){ const d = document.createElement('div'); d.className = 'qbar'; parent.appendChild(d); return d; }
function btn(label, fn){ const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); return b; }

function autoQuiz(q, ol, correct){
  const multi = correct.size > 1, items = [...ol.children];
  ol.classList.add('quiz');
  items.forEach((li, i) => { li.dataset.l = LETTERS[i]; li.tabIndex = 0; li.setAttribute('role', multi ? 'checkbox' : 'radio'); });
  q.det.hidden = true;
  const b = bar(q.cp);
  if (multi) b.append(Object.assign(document.createElement('span'), {className: 'verdict', textContent: `เลือก ${correct.size} ข้อ`}));
  const check = btn('ตรวจคำตอบ', () => grade([...ol.querySelectorAll('.picked')].map(li => li.dataset.l)));
  if (multi) b.append(check);

  function grade(picks){
    if (!picks.length) return;
    const ok = picks.length === correct.size && picks.every(l => correct.has(l));
    store[q.key] = {ok, pick: picks}; save(); render(); refresh();
  }
  function pick(li){
    if (q.cp.classList.contains('done')) return;
    if (multi) li.classList.toggle('picked');
    else grade([li.dataset.l]);
  }
  items.forEach(li => {
    li.addEventListener('click', () => pick(li));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(li); } });
  });
  function render(){
    const st = store[q.key];
    items.forEach(li => li.classList.remove('picked', 'right', 'wrong'));
    q.cp.classList.toggle('done', !!st);
    q.cp.classList.toggle('correct', !!st && st.ok);
    q.cp.classList.toggle('incorrect', !!st && !st.ok);
    q.det.hidden = !st; q.det.open = !!st;
    b.replaceChildren();
    if (!st) {
      if (multi) b.append(Object.assign(document.createElement('span'), {className: 'verdict', textContent: `เลือก ${correct.size} ข้อ`}), check);
      return;
    }
    items.forEach(li => {
      const l = li.dataset.l, chosen = st.pick.includes(l);
      if (correct.has(l)) li.classList.add('right'); else if (chosen) li.classList.add('wrong');
      li.setAttribute('aria-checked', chosen);
    });
    b.append(Object.assign(document.createElement('span'), {className: 'verdict ' + (st.ok ? 'ok' : 'no'), textContent: st.ok ? 'ถูกต้อง ✓' : 'ยังไม่ถูก'}),
             btn('ลองใหม่', () => { delete store[q.key]; save(); render(); refresh(); }));
  }
  q.render = render; render();
}

function selfQuiz(q){
  // ข้อเรียงลำดับ/จับคู่: เปิดเฉลยแล้วให้กดบอกเองว่าตอบถูกไหม
  const b = bar(q.det);
  function render(){
    const st = store[q.key];
    q.cp.classList.toggle('done', !!st);
    q.cp.classList.toggle('correct', !!st && st.ok);
    q.cp.classList.toggle('incorrect', !!st && !st.ok);
    b.replaceChildren();
    if (st) b.append(Object.assign(document.createElement('span'), {className: 'verdict ' + (st.ok ? 'ok' : 'no'), textContent: st.ok ? 'ตอบถูก ✓' : 'ตอบผิด'}),
                     btn('ล้าง', () => { delete store[q.key]; save(); render(); refresh(); }));
    else b.append(Object.assign(document.createElement('span'), {className: 'verdict', textContent: 'คุณตอบถูกไหม?'}),
                  btn('ถูก', () => { store[q.key] = {ok: true}; save(); render(); refresh(); }),
                  btn('ผิด', () => { store[q.key] = {ok: false}; save(); render(); refresh(); }));
  }
  q.render = render; render();
}

function refresh(){
  const per = {};
  let done = 0, right = 0;
  quizzes.forEach(q => {
    const p = per[q.sec.id] ||= {n: 0, done: 0, right: 0}, st = store[q.key];
    p.n++;
    if (st) { p.done++; done++; if (st.ok) { p.right++; right++; } }
  });
  links.forEach((a, id) => {
    const p = per[id]; if (!p) return;
    let s = a.querySelector('.badge');
    if (!s) { s = document.createElement('span'); s.className = 'badge'; a.append(s); }
    s.textContent = `${p.right}/${p.n}`;
    s.classList.toggle('full', p.right === p.n);
  });
  const total = quizzes.length;
  document.getElementById('progText').textContent = `${done}/${total} ข้อ · ถูก ${right}` + (done ? ` (${Math.round(right / done * 100)}%)` : '');
  document.getElementById('progBar').style.width = (done / total * 100) + '%';
  document.querySelectorAll('nav.side .dom').forEach(d => {
    let n = 0, r = 0;
    d.querySelectorAll('details ul a').forEach(a => { const p = per[a.hash.slice(1)]; if (p) { n += p.n; r += p.right; } });
    d.querySelector('.ring').style.setProperty('--p', n ? r / n * 100 : 0);
  });
  document.getElementById('sideProg').textContent = `${Math.round(right / total * 100)}%`;
  document.getElementById('sideBar').style.width = (right / total * 100) + '%';
  document.getElementById('hdrProg').textContent = `${right}/${total} ✓`;
}
document.getElementById('resetAll').addEventListener('click', () => {
  if (!confirm('ล้าง progress ของแบบทดสอบทั้งหมด?')) return;
  store = {}; save(); quizzes.forEach(q => q.render && q.render()); refresh();
});
refresh();

// ----- code: highlight + language label + copy -----
if (window.hljs) {
  hljs.configure({languages: ['python', 'typescript', 'javascript', 'json', 'bash', 'shell', 'yaml', 'http', 'markdown', 'xml']});
  document.querySelectorAll('pre code').forEach(el => {
    const r = hljs.highlightAuto(el.textContent);
    el.innerHTML = r.value;
    if (r.language && r.relevance > 2) el.parentElement.dataset.lang = r.language;
  });
}
document.querySelectorAll('pre').forEach(pre => {
  const b = document.createElement('button');
  b.className = 'copy'; b.type = 'button'; b.textContent = 'Copy';
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.querySelector('code').textContent); b.textContent = 'Copied'; }
    catch (e) { b.textContent = 'คัดลอกไม่ได้'; }
    setTimeout(() => b.textContent = 'Copy', 1500);
  });
  pre.appendChild(b);
});
