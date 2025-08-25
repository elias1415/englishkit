
/* English Kit v3 Pro — PLUS (no login) */
const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>Array.from(p.querySelectorAll(s));

// ---------- State ----------
const state={
  who: localStorage.getItem('ek3_name')||'',
  profiles: JSON.parse(localStorage.getItem('ek3_profiles')||'{}'),
  voiceName: localStorage.getItem('ek3_voice')||'',
  rate: parseFloat(localStorage.getItem('ek3_rate')||'1.0'),
  pitch: parseFloat(localStorage.getItem('ek3_pitch')||'1.0'),
  showAr: (localStorage.getItem('showAr')||'0')==='1',
  lastRoute: localStorage.getItem('ek3_last_route')||'',
  srs: JSON.parse(localStorage.getItem('ek3_srs')||'{}'),
  placement: JSON.parse(localStorage.getItem('ek3_place')||'{}')
};
function ensureProfile(n){ if(!state.profiles[n]) state.profiles[n]={lessons:{},exams:{}}; }
function saveProfiles(){ localStorage.setItem('ek3_profiles', JSON.stringify(state.profiles)); }
function saveSRS(){ localStorage.setItem('ek3_srs', JSON.stringify(state.srs)); }
function rememberRoute(h){ if(h && !h.includes('/home')){ state.lastRoute=h; localStorage.setItem('ek3_last_route', h); } }
function resumeLast(){ if(state.lastRoute) location.hash=state.lastRoute; else alert('لا يوجد مسار سابق.'); }

// ---------- Arabic cleaner (strong) ----------
const AR_DIAC=/[\u064B-\u065F\u0670\u0640]/g;
const AR_HINTS=/\s*[\(（]\s*خاط(?:ئ|ئه|ئة|ا|ية)?\s*[\)）]|\b(?:خاطئة|خاطئ|خطأ)\b/gu;
const PUNC=/[،,.!?؛:]/;
function isArabicWord(t){ return /^[\u0600-\u06FF0-9A-Za-z\-]+$/.test(t); }
function normalizeForCompare(w){ return w.replace(AR_DIAC,''); }
function normalizeVerbish(w){ const s=w.replace(AR_DIAC,''); const verbish=/^(?:سوف|سن|س)?(?:أ|ن)[\u0621-\u064A]{2,}$/.test(s); if(!verbish) return {verbish:false,stem:s}; const stem=s.replace(/^(?:سوف|سن|س)?(?:أ|ن)/,''); return {verbish:true,stem}; }
function dedupeArabicTokens(s){
  const parts=s.split(/(\s+|[،,.!?؛:])/); const out=[];
  let prevWord=null, prevStem=null, prevIsVerb=false;
  for(const tok of parts){
    if(!tok) continue;
    if(/^\s+$/.test(tok) || PUNC.test(tok)){ out.push(tok); if(PUNC.test(tok)){ prevWord=null;prevStem=null;prevIsVerb=false;} continue; }
    if(!isArabicWord(tok)){ out.push(tok); prevWord=null;prevStem=null;prevIsVerb=false; continue; }
    const norm=normalizeForCompare(tok); const {verbish,stem}=normalizeVerbish(norm);
    if(prevWord && norm===prevWord) continue;
    if(prevIsVerb && verbish && stem===prevStem && stem.length>=2) continue;
    out.push(tok); prevWord=norm; prevStem=stem; prevIsVerb=verbish;
  }
  let res=out.join("").replace(/\s+/g," ").trim().replace(/\s+([،,.!?؛:])/g,"$1").replace(/([،,.!?؛:])([^\s])/g,"$1 $2");
  res=res.replace(/\b([\u0600-\u06FFA-Za-z0-9]+)\s+\1\b/g,"$1");
  return res.trim();
}
function cleanArabic(str){
  if(!str) return "";
  let s=String(str).replace(AR_HINTS," ");
  s=dedupeArabicTokens(s);
  if(!/[\.؟!…]$/.test(s)) s+=".";
  return s;
}

// ---------- EN collocation fixer ----------
const FIXES=[
  {re:/\bhypothesize\b.*\blibrary\b/i, en:"We form a hypothesis about the experiment", ar:"نضع فرضية للتجربة"},
  {re:/\bcollaborate\b.*\blibrary\b/i, en:"We collaborate on the project", ar:"نتعاون في المشروع"},
  {re:/\bcritique\b.*\bcounsel(or)?\b/i, en:"We critique the presentation", ar:"ننتقد العرض"},
  {re:/\bnegotiate\b.*\blab\b/i, en:"We negotiate the lab schedule", ar:"نتفاوض على جدول المختبر"},
  {re:/\bcoordinate\b.*\btextbook\b/i, en:"We coordinate the syllabus", ar:"ننسق الخطة الدراسية"},
  {re:/\bsynthesize\b.*\blibrary\b/i, en:"We synthesize the literature", ar:"نستخلص الأدبيات العلمية"},
  {re:/\brevise\b.*\breference\b/i, en:"We review the reference", ar:"نراجع المرجع"},
];
function fixPair(en, ar){
  let outEn=(en||"").trim();
  let outAr=cleanArabic(ar||"");
  for(const f of FIXES){
    if(f.re.test(outEn)){
      const keepDate=/\bby Friday\.?$/i.test(outEn);
      outEn=f.en+(keepDate?" by Friday.":".");
      const subjMatch=outAr.match(/^(?:أنا|نحن|هم)\s+/);
      const subj=subjMatch?subjMatch[0].trim():"نحن";
      outAr=cleanArabic((subj+" "+f.ar).replace(/\s+/g," ").trim());
      return {en:outEn, ar:outAr};
    }
  }
  if(!/[.!?]$/.test(outEn)) outEn+=".";
  return {en:outEn, ar:outAr};
}

// ---------- TTS ----------
let VOICES=[];
function loadVoices(){ try{ if(!('speechSynthesis'in window)) return; VOICES=speechSynthesis.getVoices().filter(v=>/^en(-|_)/i.test(v.lang)||/English/i.test(v.name)); const sel=$("#voiceSel"); if(sel){ sel.innerHTML=VOICES.map(v=>`<option value="${v.name}">${v.name} (${v.lang})</option>`).join(""); if(state.voiceName){sel.value=state.voiceName}else if(VOICES[0]){sel.value=state.voiceName=VOICES[0].name;} } }catch(e){} }
if('speechSynthesis'in window){ window.speechSynthesis.onvoiceschanged=loadVoices; setTimeout(loadVoices,200); }
function speak(t){ if(!('speechSynthesis'in window)){alert('TTS غير مدعوم');return;} const u=new SpeechSynthesisUtterance(t); const v=VOICES.find(x=>x.name===($("#voiceSel")?.value||state.voiceName)); if(v)u.voice=v; u.rate=parseFloat($("#rate")?.value||state.rate||1.0); u.pitch=parseFloat($("#pitch")?.value||state.pitch||1.0); u.lang=(v?.lang||'en-US'); speechSynthesis.cancel(); speechSynthesis.speak(u); }
function stopSpeak(){ if('speechSynthesis'in window) speechSynthesis.cancel(); }
function saveTTS(){ state.voiceName=$("#voiceSel")?.value||state.voiceName; state.rate=parseFloat($("#rate")?.value||1.0); state.pitch=parseFloat($("#pitch")?.value||1.0); localStorage.setItem('ek3_voice',state.voiceName); localStorage.setItem('ek3_rate',String(state.rate)); localStorage.setItem('ek3_pitch',String(state.pitch)); }

// ---------- UI helpers ----------
function mount(v){ const r=$("#view"); r.innerHTML=""; r.appendChild(v); }
function go(h){ location.hash=h; }
function allLessons(){ try{ if(typeof LESSONS!=='undefined') return LESSONS; }catch(e){} try{ if(window && window.LESSONS) return window.LESSONS; }catch(e){} return []; }
function lessonsBy(track, level){ try{ return allLessons().filter(x=>x.track===track && x.level===level); }catch(e){ return []; } }
function toggleAr(){ state.showAr=!state.showAr; localStorage.setItem('showAr', state.showAr?'1':'0'); document.documentElement.classList.toggle('show-ar', state.showAr); const btn=$("#arToggleTxt"); if(btn) btn.textContent = state.showAr ? 'إخفاء الترجمة' : 'إظهار الترجمة'; }

// ---------- SRS ----------
function srsKey(kind, lessonId, index){ return `${kind}:${lessonId}:${index}`; }
function schedule(id, grade){ // 0 again,1 hard,2 good,3 easy
  const now=Date.now();
  const x=state.srs[id]||{ ease:250, interval:0, reps:0, due:now };
  x.reps++;
  x.ease=Math.max(130, x.ease + [-20,-5,0,10][grade]);
  if(grade===0){ x.interval=1; }
  else if(x.interval===0){ x.interval=[1,2,4,7][grade]; }
  else { x.interval=Math.round(x.interval * (x.ease/200)); }
  x.due= now + x.interval*24*3600*1000;
  state.srs[id]=x; saveSRS();
}
function dueToday(){ const now=Date.now(); return Object.keys(state.srs).filter(k=> state.srs[k].due <= now); }
function fetchItemByKey(key){
  const [kind, lessonId, idxStr]=key.split(':'); const idx=parseInt(idxStr||'0',10);
  const L=allLessons().find(x=>x.id===lessonId); if(!L) return null;
  if(kind==='q'){ const q=L.mcqs?.[idx]; if(!q) return null; const f=fixPair(q.q_en||'', q.q_ar||''); return {type:'q', en:f.q_en||f.en, ar:f.q_ar||f.ar, opts:q.opts||[]};
  } else if(kind==='p'){ const p=L.phrases?.[idx]; if(!p) return null; const f=fixPair(p.en||'', p.ar||''); return {type:'p', en:f.en, ar:f.ar};
  }
  return null;
}

// ---------- Placement ----------
function placeLevel(score){ if(score<8) return 'Beginner'; if(score<15) return 'Intermediate'; return 'Advanced'; }

// ---------- Views ----------
function miniNav(){
  return `<div class="card toolbar">
    <input id="nameInput" placeholder="اكتب اسمك" value="${state.who||''}">
    <button class="btn" onclick="const v=$('#nameInput').value.trim(); if(v){ localStorage.setItem('ek3_name',v); state.who=v; ensureProfile(v); saveProfiles(); alert('تم الحفظ ✅'); }">حفظ الاسم</button>
    <select id="voiceSel"></select>
    <label>السرعة <input id="rate" type="range" min="0.8" max="1.2" step="0.05" value="${state.rate}" oninput="saveTTS()"></label>
    <label>النبرة <input id="pitch" type="range" min="0.8" max="1.2" step="0.05" value="${state.pitch}" oninput="saveTTS()"></label>
    <button class="chip" onclick="speak('Hello! This is a voice test.')">تجربة الصوت</button>
    <button class="chip" onclick="stopSpeak()">إيقاف</button>
  </div>`;
}
function renderHome(){
  const el=document.createElement('div');
  el.innerHTML=`${miniNav()}
    <div class="grid">
      <div class="card">
        <h3>مرحبًا ${state.who||''}</h3>
        <p class="muted">استكمال دراستك بضغطة: <button class="chip" onclick="resumeLast()">تابِع من حيث توقفت</button></p>
        <div class="chips">
          <button class="chip" onclick="go('#/list/Students/Beginner')">طلاب—مبتدئ</button>
          <button class="chip" onclick="go('#/list/Students/Intermediate')">طلاب—متوسط</button>
          <button class="chip" onclick="go('#/list/Students/Advanced')">طلاب—محترف</button>
          <button class="chip" onclick="go('#/list/Workplace/Beginner')">عمل—مبتدئ</button>
          <button class="chip" onclick="go('#/list/Workplace/Intermediate')">عمل—متوسط</button>
          <button class="chip" onclick="go('#/list/Workplace/Advanced')">عمل—محترف</button>
        </div>
      </div>
    </div>`;
  setTimeout(()=>{ document.documentElement.classList.toggle('show-ar', state.showAr); const t=$("#arToggleTxt"); if(t) t.textContent = state.showAr?'إخفاء الترجمة':'إظهار الترجمة'; loadVoices(); },80);
  return el;
}
function renderList(track, level){
  const el=document.createElement('div');
  el.innerHTML=`${miniNav()}
  <div class="card">
    <div class="toolbar">
      <h3 style="margin:0">${track==='Students'?'الطلاب':'العمل'} — ${level}</h3>
      <input id="search" type="search" placeholder="بحث عن درس" oninput="filterLessons(this.value)">
    </div>
    <div class="list" id="list"></div>
    <div class="filters" id="examsBar"></div>
  </div>`;
  const arr=lessonsBy(track, level);
  const list=$("#list", el);
  if(!arr.length){ list.innerHTML='<div class="muted">تعذّر تحميل الدروس — تأكد من assets/data.js.</div>'; return el; }
  function renderItems(a){
    list.innerHTML='';
    a.forEach(L=>{ const d=document.createElement('div'); d.className='item'; d.innerHTML=`<div><a href="#/lesson/${L.id}">${L.title}</a> <span class="badge">${L.level}</span></div>`; list.appendChild(d); });
  }
  window.filterLessons=(q)=>{ const s=(q||'').trim(); if(!s){ renderItems(arr); return; } const filtered=arr.filter(L=> (L.title||'').includes(s)); renderItems(filtered); };
  renderItems(arr);
  // exams buttons
  const wraps=Math.ceil(arr.length/5); const bar=$("#examsBar", el); bar.innerHTML='<b>اختبارات الوحدة:</b> ';
  for(let i=0;i<wraps;i++){ const b=document.createElement('button'); b.className='chip'; b.textContent=`${i*5+1}–${Math.min((i+1)*5,arr.length)}`; b.onclick=()=>go(`#/exam/unit/${track}/${level}/${i*5}`); bar.appendChild(b); }
  const finalBtn=document.createElement('button'); finalBtn.className='chip'; finalBtn.textContent='امتحان شامل'; finalBtn.onclick=()=>go(`#/exam/final/${track}/${level}`); bar.appendChild(finalBtn);
  return el;
}
function renderLesson(id){
  const L=allLessons().find(x=>x.id===id);
  const el=document.createElement('div'); if(!L){ el.className='card'; el.textContent='الدرس غير موجود'; return el; }
  const phrRows=(L.phrases||[]).map((p,i)=>{ const f=fixPair(p.en||'', p.ar||''); const key=srsKey('p', L.id, i); return `<tr><td dir="ltr"><button class="play" onclick="speak('${f.en.replace(/'/g,"\\'")}')">🔊</button> ${f.en}</td><td class="ar">${cleanArabic(f.ar)}</td><td><button class="chip" onclick="schedule('${key}',2)">✔️ تذكّر لاحقًا</button></td></tr>`; }).join("");
  const vrows=(L.verbs||[]).map(v=>`<tr><td dir="ltr">${v.base||''}</td><td class="ar">${cleanArabic(v.ar||'')}</td><td dir="ltr">${v.forms||''}</td><td class="ar">${cleanArabic(v.usage||'')}</td><td class="ar">${cleanArabic(v.pron||'')}</td></tr>`).join("") || "<tr><td colspan='5'>لا توجد أفعال.</td></tr>";
  const qs=(L.mcqs||[]).map((m,i)=>{ const fq=fixPair(m.q_en||'', m.q_ar||''); const opts=(m.opts||[]).map((o,j)=>`<li><label><input type="radio" name="q${i}" value="${j}"> <span dir="ltr">${o.en||''}</span> — <span class="ar">${cleanArabic(o.ar||'')}</span></label></li>`).join(""); return `<div class="card"><div><b>${i+1}.</b> ${fq.ar}<br><span class="muted" dir="ltr">${fq.en}</span></div><ol>${opts}</ol><div class="srs-btns"><button class="btn" onclick="gradeQ('${L.id}',${i})">تحقّق</button> <button class="chip" onclick="reportLine('${L.id}','q',${i})">أبلغ عن خطأ</button></div><div id="fb${i}" class="muted"></div></div>`; }).join("");
  el.innerHTML=`<div class="card"><a class="chip" href="javascript:history.back()">رجوع</a> <h3>${L.title} <span class="badge">${L.level}</span></h3>
    <h3>العبارات الأساسية</h3>
    <table><tr><th>English</th><th class="ar">العربية</th><th>مراجعة</th></tr>${phrRows}</table>
    <h3>شرح الأفعال</h3>
    <table><tr><th>Base</th><th class="ar">بالعربية</th><th>Forms</th><th class="ar">الاستخدام</th><th class="ar">ملاحظة نطق</th></tr>${vrows}</table>
    <h3>أسئلة</h3>${qs || '<div class="muted">لا توجد أسئلة.</div>'}
  </div>`;
  setTimeout(loadVoices,60);
  return el;
}
function gradeQ(lessonId, idx){
  const L=allLessons().find(x=>x.id===lessonId); if(!L) return;
  const q=L.mcqs?.[idx]; if(!q) return;
  const chosen=$$(`input[name="q${idx}"]:checked`)[0]?.value;
  const fb=$("#fb"+idx);
  if(chosen==null){ fb.textContent='اختر إجابة أولًا.'; return; }
  const correctIdx=q.answer??0;
  if(parseInt(chosen,10)===correctIdx){ fb.textContent='إجابة صحيحة!'; schedule(srsKey('q', lessonId, idx), 3); }
  else { fb.textContent='إجابة غير صحيحة — أضفناها لمراجعات اليوم.'; schedule(srsKey('q', lessonId, idx), 0); }
}

// Exams
function examKey(kind, track, level, startIdx){ return `${kind}-${track}-${level}-${startIdx??'all'}`; }
function buildQuestions(lessons,maxCount){
  const qs=[];
  for(const L of lessons){ for(let i=0;i<(L.mcqs||[]).length;i++){ const q=L.mcqs[i]; const fq=fixPair(q.q_en||'', q.q_ar||''); const opts=(q.opts||[]).map(o=>({en:o.en||'', ar:cleanArabic(o.ar||'')})); qs.push({q_en:fq.en,q_ar:fq.ar,opts,answer:q.answer??0,src:L.id, qIndex:i}); } }
  for(let i=qs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [qs[i],qs[j]]=[qs[j],qs[i]]; }
  return qs.slice(0, Math.min(maxCount, qs.length));
}
function renderExam(kind,track,level,startIdx){
  const all=lessonsBy(track,level);
  let ref=[], title="";
  if(kind==='unit'){ const s=parseInt(startIdx||'0',10); ref=all.slice(s,s+5); title=`اختبار الوحدة — ${track==='Students'?'طلاب':'عمل'} — ${level} — ${s+1}–${Math.min(s+5,all.length)}`; }
  else { ref=all; title=`الامتحان الشامل — ${track==='Students'?'طلاب':'عمل'} — ${level}`; }
  const qs=buildQuestions(ref, kind==='unit'?12:30);
  const el=document.createElement('div');
  el.innerHTML=`<div class="card"><h3>${title}</h3><div id="exam"></div>
    <div class="filters"><button class="btn" id="finishBtn">إنهاء الاختبار</button> <button class="btn" onclick="go('#/list/${track}/${level}')">رجوع</button></div>
    <div id="result" class="muted"></div></div>`;
  const container=$("#exam",el);
  container.innerHTML=qs.map((m,i)=>{
    const opts=(m.opts||[]).map((o,j)=>`<li><label><input type="radio" name="e${i}" value="${j}"> <span dir="ltr">${o.en||''}</span> — <span class="ar">${o.ar}</span></label></li>`).join("");
    return `<div class="card"><div><b>${i+1}.</b> ${m.q_ar}<br><span class="muted" dir="ltr">${m.q_en}</span></div><ol>${opts}</ol></div>`;
  }).join("");
  $("#finishBtn",el).onclick=()=>{
    if(!state.who){ alert('أدخل اسمك أولًا'); return; }
    let correct=0;
    for(let i=0;i<qs.length;i++){
      const v=$$(`input[name="e${i}"]:checked`, el)[0]?.value;
      if(v!=null && parseInt(v,10)===qs[i].answer){ correct++; schedule(srsKey('q', qs[i].src, qs[i].qIndex), 3); }
      else { schedule(srsKey('q', qs[i].src, qs[i].qIndex), 0); }
    }
    ensureProfile(state.who); state.profiles[state.who].exams[examKey(kind,track,level,startIdx??'all')]={score:correct,total:qs.length,at:new Date().toISOString()}; saveProfiles();
    $("#result",el).innerHTML=`النتيجة: <b>${correct}/${qs.length}</b> — ${(correct*100/qs.length).toFixed(0)}%`;
  };
  return el;
}

// SRS view
function renderSRS(){
  const keys=dueToday();
  const el=document.createElement('div');
  el.innerHTML=`<div class="card"><h3>مراجعات اليوم</h3><div id="srsList"></div></div>`;
  const list=$("#srsList", el);
  if(!keys.length){ list.innerHTML='<div class="muted">لا يوجد عناصر للمراجعة الآن.</div>'; return el; }
  function cardFor(k){
    const it=fetchItemByKey(k); if(!it) return '';
    if(it.type==='p'){
      return `<div class="card"><div dir="ltr">${it.en}</div><div class="ar">${it.ar}</div>
        <div class="srs-btns">
          <button class="chip" onclick="schedule('${k}',0); rerenderSRS()">Again</button>
          <button class="chip" onclick="schedule('${k}',1); rerenderSRS()">Hard</button>
          <button class="chip" onclick="schedule('${k}',2); rerenderSRS()">Good</button>
          <button class="chip" onclick="schedule('${k}',3); rerenderSRS()">Easy</button>
        </div></div>`;
    } else {
      const opts=(it.opts||[]).map(o=> `<li><span dir="ltr">${o.en||''}</span> — <span class="ar">${cleanArabic(o.ar||'')}</span></li>`).join("");
      return `<div class="card"><div>${it.ar}</div><div class="muted" dir="ltr">${it.en}</div><ol>${opts}</ol>
        <div class="srs-btns">
          <button class="chip" onclick="schedule('${k}',0); rerenderSRS()">Again</button>
          <button class="chip" onclick="schedule('${k}',1); rerenderSRS()">Hard</button>
          <button class="chip" onclick="schedule('${k}',2); rerenderSRS()">Good</button>
          <button class="chip" onclick="schedule('${k}',3); rerenderSRS()">Easy</button>
        </div></div>`;
    }
  }
  window.rerenderSRS=()=>{ mount(renderSRS()); };
  list.innerHTML=keys.map(cardFor).join("");
  return el;
}

// Placement view
function renderPlacement(){
  const all=allLessons();
  const pool=[];
  for(const L of all){
    for(let i=0;i<(L.mcqs||[]).length;i++){
      const q=L.mcqs[i]; const fq=fixPair(q.q_en||'', q.q_ar||''); const opts=(q.opts||[]).map(o=>({en:o.en||'', ar:cleanArabic(o.ar||'')}));
      pool.push({q_en:fq.en,q_ar:fq.ar,opts,answer:q.answer??0, src:L.id, qIndex:i});
    }
  }
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  const qs=pool.slice(0,20);
  const el=document.createElement('div');
  el.innerHTML=`<div class="card"><h3>اختبار تمهيدي (20 سؤالًا)</h3><div id="pl"></div><button class="btn" id="plDone">إنهاء</button><div id="plRes" class="muted"></div></div>`;
  $("#pl", el).innerHTML=qs.map((m,i)=>{
    const opts=(m.opts||[]).map((o,j)=>`<li><label><input type="radio" name="pl${i}" value="${j}"> <span dir="ltr">${o.en||''}</span> — <span class="ar">${o.ar}</span></label></li>`).join("");
    return `<div class="card"><div>${m.q_ar}</div><div class="muted" dir="ltr">${m.q_en}</div><ol>${opts}</ol></div>`;
  }).join("");
  $("#plDone", el).onclick=()=>{
    let score=0; for(let i=0;i<qs.length;i++){ const v=$$(`input[name="pl${i}"]:checked`, el)[0]?.value; if(v!=null && parseInt(v,10)===qs[i].answer) score++; }
    const level=placeLevel(score);
    state.placement={level,score}; localStorage.setItem('ek3_place', JSON.stringify(state.placement));
    $("#plRes", el).innerHTML=`نتيجتك ${score}/20 → نقترح البدء بمستوى <b>${level}</b>. يمكنك تغييره من قائمة الدروس متى شئت.`;
  };
  return el;
}

// Report
async function reportLine(lessonId, kind, idx){
  const L=allLessons().find(x=>x.id===lessonId);
  const payload={ lessonId, kind, idx, user: state.who||null, route: location.hash||'', ua: navigator.userAgent };
  try{
    await fetch('/.netlify/functions/report', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    alert('شكرًا! تم إرسال البلاغ.');
  }catch(e){ console.log('report failed', e); alert('تعذر الإرسال.'); }
}

// Router
function router(){
  try{
    const h=location.hash||"#/home";
    rememberRoute(h);
    const p=h.split("/").slice(1);
    if(p[0]==="home"){ mount(renderHome()); return; }
    if(p[0]==="list"){ mount(renderList(p[1]||"Students", p[2]||"Beginner")); return; }
    if(p[0]==="lesson"){ mount(renderLesson(p[1])); return; }
    if(p[0]==="exam"){ mount(renderExam(p[1], p[2], p[3], p[4])); return; }
    if(p[0]==="srs"){ mount(renderSRS()); return; }
    if(p[0]==="placement"){ mount(renderPlacement()); return; }
    mount(renderHome());
  }catch(e){
    const el=document.createElement('div'); el.className='card'; el.textContent='خطأ أثناء التحميل — تحقق من data.js/app.js'; mount(el);
  }
}
window.addEventListener('hashchange', router);
window.addEventListener('load', ()=>{ document.documentElement.classList.toggle('show-ar', state.showAr); const t=$("#arToggleTxt"); if(t) t.textContent = state.showAr?'إخفاء الترجمة':'إظهار الترجمة'; router(); });
