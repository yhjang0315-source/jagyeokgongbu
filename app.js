/* ===================== DATA ===================== */
const FIELDS=(window.FIELDS||[]).filter(f=>f&&f.courses&&f.courses.length);
const LEVEL_NAMES=['입문','실무','시험'];
const CATS=[{id:'terms',name:'용어 학습'},{id:'calc',name:'계산 학습'},{id:'proc',name:'절차 학습'},{id:'law',name:'법령 학습'},{id:'exam',name:'기출 유형'}];
const catOf=c=>c.cat||(CATS.find(x=>x.id===c.id)?c.id:'law');
const lvName=(c,i)=>(c.levelNames||LEVEL_NAMES)[i];
const XP_PER_LEVEL=[10,15,20];
const XBTN=(kind,key)=>`<button class="xbtn" data-xk="${kind}" ${key?`data-xkey="${esc(key)}"`:''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>더 자세히 설명해주세요</button>`;
const ck=(f,c)=>f.id+'/'+c.id;   // 코스 키 (분야/코스)

/* ===================== STATE ===================== */
const KEY='jipgongbu_v2';
const dkey=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
const todayKey=()=>dkey(new Date());
const yesterdayKey=()=>{const d=new Date();d.setDate(d.getDate()-1);return dkey(d);};
let S={xp:0,streak:0,lastDay:null,todayXp:0,dayKey:null,done:{},wrong:{},answered:0,correct:0,pick:{fields:['re'],cats:['terms'],courses:[],levels:[0]},goal:50,lock:false,tips:true,v:5};
function load(){
  try{const r=localStorage.getItem(KEY);if(r)S=Object.assign(S,JSON.parse(r));
    else{const old=localStorage.getItem('jipgongbu_v1');if(old)S=Object.assign(S,JSON.parse(old));}}catch(e){}
  if(S.dayKey!==todayKey()){S.todayXp=0;S.dayKey=todayKey();}
  if(S.lastDay&&S.lastDay!==todayKey()&&S.lastDay!==yesterdayKey())S.streak=0;
  if(!S.v||S.v<3){S.lock=false;}
  if(!S.v||S.v<4){S.sel={re:{course:S.course||'terms',level:S.level||0}};S.field='re';}
  if(!S.v||S.v<5){  // 단일 선택 → 복수 선택 구조로 이전
    const f=S.field||'re';const st=(S.sel||{})[f]||{course:'terms',level:0};
    S.pick={fields:[f],cats:[],courses:[f+'/'+st.course],levels:[st.level]};
    delete S.sel;delete S.field;delete S.course;delete S.level;S.v=5;
  }
  normalizePick();
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}if(typeof cloudTouch==='function')cloudTouch();}

/* 선택 상태를 항상 유효하게 유지: 각 단계에 최소 1개, 존재하지 않는 항목 제거 */
function normalizePick(){
  const p=S.pick;
  p.fields=(p.fields||[]).filter(id=>FIELDS.some(f=>f.id===id));if(!p.fields.length)p.fields=[FIELDS[0].id];
  const fs=selFields();
  const availCats=CATS.filter(k=>fs.some(f=>f.courses.some(c=>catOf(c)===k.id))).map(k=>k.id);
  p.cats=(p.cats||[]).filter(id=>availCats.includes(id));
  if(!p.cats.length){ // 선택된 코스에서 유추, 없으면 첫 카테고리
    const fromCourses=availCourses(true).filter(x=>(p.courses||[]).includes(ck(x.f,x.c))).map(x=>catOf(x.c));
    p.cats=fromCourses.length?[...new Set(fromCourses)]:[availCats[0]];
  }
  const avail=availCourses();
  p.courses=(p.courses||[]).filter(k=>avail.some(x=>ck(x.f,x.c)===k));
  if(!p.courses.length)p.courses=avail.map(x=>ck(x.f,x.c));  // 카테고리를 고르면 그 안의 코스는 기본 전부 선택
  const availLv=[0,1,2].filter(i=>selCourses().some(x=>(x.c.levels[i]||[]).length));
  p.levels=(p.levels||[]).filter(i=>availLv.includes(i));
  if(!p.levels.length)p.levels=[availLv[0]??0];
}
function selFields(){return FIELDS.filter(f=>S.pick.fields.includes(f.id));}
function availCourses(ignoreCats){const out=[];selFields().forEach(f=>f.courses.forEach(c=>{if(ignoreCats||S.pick.cats.includes(catOf(c)))out.push({f,c});}));return out;}
function selCourses(){return availCourses().filter(x=>S.pick.courses.includes(ck(x.f,x.c)));}
function F(){return selFields()[0];}
load();

/* every lesson, flattened with its course and level */
const ALL=[];
FIELDS.forEach(f=>f.courses.forEach(c=>c.levels.forEach((units,lv)=>units.forEach((u,ui)=>u.lessons.forEach(l=>ALL.push({f,c,lv,u,ui,l,id:l.id}))))));
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const qid=(lid,i)=>lid+':'+i;
const fmt=n=>Number(n).toLocaleString('ko-KR');
const inSelField=e=>S.pick.fields.includes(e.f.id);

/* ===================== HOME ===================== */
function renderStats(){
  $('#st-streak').textContent=S.streak;$('#st-xp').textContent=S.xp;
  $('#goal-max').textContent=S.goal;
  $('#goal-now').textContent=Math.min(S.todayXp,S.goal);$('#goal-bar').style.width=Math.min(100,S.todayXp/S.goal*100)+'%';
}
/* 선택된 코스 × 단계 조합 목록 (경로 렌더링 단위) */
function curBlocks(){
  const out=[];
  selCourses().forEach(x=>S.pick.levels.forEach(lv=>{const units=x.c.levels[lv]||[];if(units.length)out.push({f:x.f,c:x.c,lv,units,path:ALL.filter(e=>e.f===x.f&&e.c===x.c&&e.lv===lv)});}));
  return out;
}
function renderBrand(){
  const fs=selFields();
  if(fs.length===1){const f=fs[0];$('#brand-name').textContent=f.brand||f.name;$('#brand-sub').textContent=f.sub||f.name;}
  else{$('#brand-name').textContent='자격공부';$('#brand-sub').textContent=fs.map(f=>f.name).join(' · ');}
}
function toggleIn(arr,v){const i=arr.indexOf(v);if(i<0)arr.push(v);else if(arr.length>1)arr.splice(i,1);}
function renderPicker(){
  normalizePick();renderBrand();
  const p=S.pick;
  const mf=$('#multi-field');if(mf){mf.classList.toggle('on',!!S.multiField);mf.setAttribute('aria-checked',!!S.multiField);}
  if(!S.multiField&&p.fields.length>1){p.fields=[p.fields[0]];p.cats=[];p.courses=[];normalizePick();}
  $('#seg-field').innerHTML=FIELDS.map(f=>`<button data-field="${f.id}" class="${p.fields.includes(f.id)?'on':''}" aria-pressed="${p.fields.includes(f.id)}">${esc(f.name)}</button>`).join('');
  const fs=selFields();
  const cats=CATS.filter(k=>fs.some(f=>f.courses.some(c=>catOf(c)===k.id)));
  $('#seg-cat').innerHTML=cats.map(k=>`<button data-cat="${k.id}" class="${p.cats.includes(k.id)?'on':''}" aria-pressed="${p.cats.includes(k.id)}">${esc(k.name)}</button>`).join('');
  const avail=availCourses();
  const onlyLaw=p.cats.length===1&&p.cats[0]==='law', onlyExam=p.cats.length===1&&p.cats[0]==='exam';
  $('#lbl-course').textContent=onlyExam?'시험':onlyLaw?'법 영역':'영역';
  $('#lbl-course').hidden=$('#seg-course').hidden=avail.length<2;
  $('#seg-course').innerHTML=avail.map(x=>{const k=ck(x.f,x.c);const on=p.courses.includes(k);const label=(fs.length>1?x.f.name+' · ':'')+x.c.name;return `<button data-course="${k}" class="${on?'on':''}" aria-pressed="${on}">${esc(label)}</button>`;}).join('');
  const sc=selCourses();
  const allExam=sc.length&&sc.every(x=>x.c.levelNames);
  $('#lbl-level').textContent=allExam?'단계':'난이도';
  document.querySelectorAll('#seg-level button').forEach((b,i)=>{
    const names=[...new Set(sc.map(x=>lvName(x.c,i)))];b.textContent=names.join('/')||LEVEL_NAMES[i];
    b.disabled=!sc.some(x=>(x.c.levels[i]||[]).length);b.classList.toggle('on',p.levels.includes(i));b.setAttribute('aria-pressed',p.levels.includes(i));
  });
  const blocks=curBlocks();const total=blocks.reduce((n,b)=>n+b.path.length,0),done=blocks.reduce((n,b)=>n+b.path.filter(e=>S.done[e.id]).length,0);
  const desc=sc.length===1?sc[0].c.desc:`${sc.length}개 코스를 함께 학습합니다.`;
  $('#course-desc').innerHTML=`${esc(desc)}${total?` <span class="lv lv2">레슨 ${done} / ${total} 완료</span>`:''}`;
}
$('#seg-field').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(S.multiField)toggleIn(S.pick.fields,b.dataset.field);else S.pick.fields=[b.dataset.field];S.pick.cats=[];S.pick.courses=[];normalizePick();save();renderPicker();renderPath();renderTerms();renderGuide();renderReview();});
$('#seg-cat').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;toggleIn(S.pick.cats,b.dataset.cat);S.pick.courses=[];normalizePick();save();renderPicker();renderPath();});
$('#seg-course').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;toggleIn(S.pick.courses,b.dataset.course);normalizePick();save();renderPicker();renderPath();});
$('#seg-level').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;toggleIn(S.pick.levels,+b.dataset.level);normalizePick();save();renderPicker();renderPath();});

const ICON_BOOK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3z"/><path d="M4 4v16"/></svg>';
const ICON_STAR='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6L22 9.3l-5.4 4.8L18.2 21 12 17.3 5.8 21l1.6-6.9L2 9.3l7.1-.7z"/></svg>';
const ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const ICON_CROWN='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>';
const ICON_LOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
function nodeState(l,pos,nextPos){
  const d=S.done[l.id];
  if(d)return d.best>=100?'perfect':'done';
  return (nextPos===-1||pos===nextPos)?'next':(pos<nextPos?'done':'locked');
}
/* 히든 퀘스트: 한 분야의 한 카테고리에 속한 모든 레슨을 완료하면 그 카테고리 전범위 퀴즈(20문제 이상)가 열린다 */
const QUEST_N=20;
function questId(f,cat){return 'hq:'+f.id+'/'+cat;}
function questLessons(f,cat){return ALL.filter(e=>e.f===f&&catOf(e.c)===cat);}
function questReady(f,cat){const ls=questLessons(f,cat);return ls.length>0&&ls.every(e=>S.done[e.id]);}
function questsFor(){ // 현재 선택된 분야 × 카테고리 중 조건을 만족하는 것
  const out=[];selFields().forEach(f=>S.pick.cats.forEach(cat=>{if(questReady(f,cat))out.push({f,cat,id:questId(f,cat),n:questLessons(f,cat).length});}));return out;}
function buildQuest(f,cat){
  const ls=questLessons(f,cat);let qs=[];ls.forEach(e=>e.l.q.forEach((q,i)=>qs.push({...q,lid:e.id,qi:i,lv:2})));
  const w=qs.filter(q=>S.wrong[qid(q.lid,q.qi)]),n=qs.filter(q=>!S.wrong[qid(q.lid,q.qi)]);
  const pick=shuffle(w).slice(0,Math.ceil(QUEST_N/2)).concat(shuffle(n));
  const take=Math.max(QUEST_N,Math.min(qs.length,QUEST_N));
  const chosen=pick.slice(0,Math.min(take,qs.length));
  // 20개 미만이면 전체를 두 번 섞지 않고 있는 만큼 출제
  const name=(CATS.find(k=>k.id===cat)||{}).name||cat;
  return {id:questId(f,cat),f,c:null,lv:2,l:{id:questId(f,cat),title:'히든 퀘스트 · '+name+' 전범위',tips:[{h:'히든 퀘스트',p:[`<em>${esc(f.name)}</em>의 <em>${esc(name)}</em> 레슨을 모두 끝냈어요. 이 카테고리 전체에서 뽑은 ${chosen.length}문제로 실력을 확인합니다.`,'틀린 적 있는 문제가 먼저 섞여 나옵니다. 한 번에 전부 맞히면 보라색 왕관이 붙어요.']}],q:chosen.map(q=>({...q,e:q.e}))},qsKeys:chosen.map(q=>q.lid+':'+q.qi)};
}
function renderQuests(){
  const qs=questsFor();if(!qs.length)return '';
  return `<div class="quests">${qs.map(x=>{const d=S.done[x.id];const st=d?(d.best>=100?'perfect':'done'):'next';const rs=S.resume&&S.resume[x.id];const name=(CATS.find(k=>k.id===x.cat)||{}).name||x.cat;
    return `<div class="quest ${st}${rs?' resume':''}"><div class="qbadge">HIDDEN QUEST</div><div class="node ${st}${rs?' resume':''}"><button data-quest="${x.id}" aria-label="히든 퀘스트 ${esc(name)}">${st==='perfect'?ICON_CROWN:st==='done'?ICON_CHECK:ICON_STAR}</button></div><div class="qtitle">${esc(x.f.name)} · ${esc(name)} 전범위 퀴즈</div><div class="qsub">${x.n}개 레슨 완료 · ${QUEST_N}문제 이상${rs?` · 이어서 ${rs.doneN}/${rs.total}`:d?` · ${d.best>=100?'만점':'최고 '+d.best+'%'}`:''}</div></div>`;}).join('')}</div>`;
}
function renderPath(){
  const blocks=curBlocks();
  if(!blocks.length){$('#path').innerHTML=`<div class="empty"><b>준비 중이에요</b>선택한 조합의 레슨은 곧 추가됩니다. 다른 카테고리나 단계를 골라보세요.</div>`;return;}
  const multi=blocks.length>1;
  $('#path').innerHTML=blocks.map(b=>{
    const nextPos=S.lock?b.path.findIndex(e=>!S.done[e.id]):-1;
    const head=multi?`<div class="block-head"><span class="bf">${esc(b.f.name)}</span> · ${esc(b.c.name)} · <span class="lv lv${b.lv+1}">${esc(lvName(b.c,b.lv))}</span></div>`:'';
    return head+b.units.map((u,ui)=>{
      const firstPos=b.path.findIndex(e=>e.u===u);
      const locked=nextPos!==-1&&firstPos>nextPos;
      return `<div class="unit"><div class="unit-head ${locked?'locked':''}"><div><div class="num">${ui+1}단원</div><h2>${esc(u.title)}</h2><p>${esc(u.desc)}</p></div></div>
      <div class="nodes">${u.lessons.map(l=>{const pos=b.path.findIndex(e=>e.l===l);
        const st=nodeState(l,pos,nextPos);
        const best=S.done[l.id]?S.done[l.id].best+'%':'';
        const rs=S.resume&&S.resume[l.id];
        const icon=st==='perfect'?ICON_CROWN:st==='done'?ICON_CHECK:st==='locked'?ICON_LOCK:ICON_BOOK;
        return `<div class="node ${st}${rs?' resume':''}"><button data-lesson="${l.id}" ${st==='locked'?'disabled':''} aria-label="${esc(l.title)}${st==='perfect'?' (만점)':st==='done'?' (완료)':''}">${icon}</button><div class="label">${esc(l.title)}</div>${rs?`<div class="sub resume">이어서 ${rs.doneN}/${l.q.length}</div>`:best?`<div class="sub">${st==='perfect'?'만점':'최고 '+best}</div>`:''}</div>`;}).join('')}</div></div>`;
    }).join('');
  }).join('')+renderQuests();
}
$('#path').addEventListener('click',e=>{
  const qb=e.target.closest('button[data-quest]');
  if(qb){const [,rest]=qb.dataset.quest.split('hq:');const [fid,cat]=rest.split('/');const f=FIELDS.find(x=>x.id===fid);startLesson(buildQuest(f,cat));return;}
  const b=e.target.closest('button[data-lesson]');if(!b||b.disabled)return;startLesson(ALL.find(x=>x.id===b.dataset.lesson));});

document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
  ['learn','review','terms','guide','settings'].forEach(t=>$('#tab-'+t).hidden=t!==b.dataset.tab);
  if(b.dataset.tab==='review')renderReview();if(b.dataset.tab==='guide')renderGuide();window.scrollTo(0,0);
}));

/* glossary: 선택된 분야 전체 합침 */
let termLv=0;
function GLOSSARY(){const fs=selFields();const rows=[];fs.forEach(f=>(f.glossary||[]).forEach(t=>rows.push({t,f})));return rows;}
function renderTerms(){
  const q=$('#term-q').value.trim().toLowerCase();
  const multi=selFields().length>1;
  const rows=GLOSSARY().filter(({t})=>(!termLv||(t[3]||1)===termLv)&&(!q||t[0].toLowerCase().includes(q)||t[2].toLowerCase().includes(q)));
  $('#terms-lead').textContent=`${selFields().map(f=>f.name).join(' · ')} 레슨에 나오는 핵심 용어를 한 줄로 정리했어요.`;
  $('#term-list').innerHTML=rows.map(({t,f})=>`<div class="term"><div class="t"><b>${esc(t[0])}</b>${multi?`<span class="cat bf">${esc(f.name)}</span>`:''}<span class="cat">${esc(t[1])}</span><span class="lv lv${t[3]||1}">${LEVEL_NAMES[(t[3]||1)-1]}</span></div><p>${esc(t[2])}</p>${XBTN('term',f.id+'|'+t[0])}</div>`).join('')||'<p class="lead">검색 결과가 없어요.</p>';
}
$('#term-q').addEventListener('input',renderTerms);
$('#term-filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;termLv=+b.dataset.lv;document.querySelectorAll('#term-filters button').forEach(x=>x.classList.toggle('on',x===b));renderTerms();});
renderTerms();


/* field guide: 선택된 분야의 섹션을 이어서 표시. 키는 분야 id 포함 */
const GKEY='jipgongbu_guide';
let G={checks:{},open:{}};
try{const r=localStorage.getItem(GKEY);if(r)G=Object.assign(G,JSON.parse(r));}catch(e){}
function gsave(){try{localStorage.setItem(GKEY,JSON.stringify(G));}catch(e){}}
const CHEV='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
function GUIDE(){const out=[];selFields().forEach(f=>(f.guide||[]).forEach(sec=>out.push({...sec,_f:f,_k:f.id+':'+sec.id})));return out;}
const gk=(sec,i,k)=>sec._k+':'+i+':'+k;
function gcount(sec){let n=0,d=0;sec.items.forEach((it,i)=>(it.check||[]).forEach((_,k)=>{n++;if(G.checks[gk(sec,i,k)])d++;}));return [d,n];}
function renderGuide(){
  const g=GUIDE();const fs=selFields();const multi=fs.length>1;
  $('#guide-lead').textContent=multi?'선택한 분야의 현장 정보를 모아 보여줍니다. 체크 표시는 이 기기에 저장돼요.':(fs[0].guideLead||'실무에서 바로 꺼내 쓰는 정보. 체크 표시는 이 기기에 저장돼요.');
  $('#compass-card').hidden=!fs.some(f=>f.id==='re');
  $('#guide-reset').hidden=!g.length;
  if(!g.length){$('#guide-nav').innerHTML='';$('#guide-list').innerHTML=`<div class="empty"><b>준비 중이에요</b>선택한 분야의 현장 가이드는 곧 추가됩니다.</div>`;return;}
  $('#guide-nav').innerHTML=g.map(sec=>`<button data-go="${sec._k}">${multi?esc(sec._f.name)+' · ':''}${esc(sec.title)}</button>`).join('');
  $('#guide-list').innerHTML=g.map(sec=>{const [d,n]=gcount(sec);
    return `<section class="gsec ${G.open[sec._k]?'open':''}" data-k="${sec._k}"><button data-sec="${sec._k}" aria-expanded="${!!G.open[sec._k]}"><div>${multi?`<span class="bf">${esc(sec._f.name)}</span>`:''}<h3>${esc(sec.title)}</h3><small>${esc(sec.lead)}</small></div>${n?`<span class="gprog">${d}/${n}</span>`:''}${CHEV}</button>
    <div class="body">${sec.items.map((it,i)=>`<div class="gitem"><h4>${esc(it.h)}</h4>${it.p.map(p=>`<p>${p}</p>`).join('')}${it.check?`<div class="checks">${it.check.map((c,k)=>{const id=gk(sec,i,k);const on=!!G.checks[id];return `<label class="${on?'on':''}"><input type="checkbox" data-ck="${id}" ${on?'checked':''}>${esc(c)}</label>`;}).join('')}</div>`:''}</div>`).join('')}</div></section>`;}).join('');
}
$('#guide-nav').addEventListener('click',e=>{const b=e.target.closest('button[data-go]');if(!b)return;G.open[b.dataset.go]=true;gsave();renderGuide();document.querySelector(`.gsec[data-k="${b.dataset.go}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});});
$('#guide-list').addEventListener('click',e=>{const b=e.target.closest('button[data-sec]');if(!b)return;const k=b.dataset.sec;G.open[k]=!G.open[k];gsave();renderGuide();});
$('#guide-list').addEventListener('change',e=>{const c=e.target.closest('input[data-ck]');if(!c)return;if(c.checked)G.checks[c.dataset.ck]=1;else delete G.checks[c.dataset.ck];gsave();c.closest('label').classList.toggle('on',c.checked);const sec=GUIDE().find(s=>c.dataset.ck.startsWith(s._k+':'));if(!sec)return;const [d,n]=gcount(sec);const pg=document.querySelector(`.gsec[data-k="${sec._k}"] .gprog`);if(pg)pg.textContent=d+'/'+n;});
twoStep($('#guide-reset'),'한 번 더 누르면 체크 표시가 모두 지워집니다',()=>{G.checks={};gsave();renderGuide();});

/* settings */
function renderSettings(){
  $('#set-goal').value=S.goal;
  $('#set-lock').classList.toggle('on',S.lock);$('#set-lock').setAttribute('aria-checked',S.lock);
  $('#set-tips').classList.toggle('on',S.tips);$('#set-tips').setAttribute('aria-checked',S.tips);
}
$('#set-goal').addEventListener('change',e=>{S.goal=+e.target.value;save();renderStats();});
$('#set-lock').addEventListener('click',()=>{S.lock=!S.lock;save();renderSettings();renderPath();});
$('#set-tips').addEventListener('click',()=>{S.tips=!S.tips;save();renderSettings();});
$('#multi-field').addEventListener('click',()=>{S.multiField=!S.multiField;save();renderPicker();renderPath();renderTerms();renderGuide();renderReview();});
twoStep($('#set-reset'),'정말 지울까요? 한 번 더 누르면 XP·기록이 모두 사라집니다',()=>{const keep={pick:S.pick,goal:S.goal,lock:S.lock,tips:S.tips,v:S.v};S={xp:0,streak:0,lastDay:null,todayXp:0,dayKey:todayKey(),done:{},wrong:{},answered:0,correct:0,...keep};save();renderStats();renderPicker();renderPath();renderReview();});
function twoStep(btn,askText,fn){const orig=btn.textContent;let armed=false,t=null;btn.addEventListener('click',()=>{if(!armed){armed=true;btn.textContent=askText;btn.classList.add('armed');t=setTimeout(()=>{armed=false;btn.textContent=orig;btn.classList.remove('armed');},4000);return;}clearTimeout(t);armed=false;btn.textContent=orig;btn.classList.remove('armed');fn();});}
renderSettings();

/* review: 선택된 분야 기준 */
function renderReview(){
  $('#rv-done').textContent=ALL.filter(e=>inSelField(e)&&S.done[e.id]).length;
  $('#rv-total').textContent=S.answered;
  $('#rv-acc').textContent=S.answered?Math.round(S.correct/S.answered*100)+'%':'–';
  $('#btn-hard').disabled=!ALL.some(e=>inSelField(e)&&e.l.q.some((_,i)=>S.wrong[qid(e.id,i)]));
}
function pool(onlyWrong){
  const mine=ALL.filter(inSelField);let src=mine.filter(e=>S.done[e.id]);if(!src.length)src=mine.slice(0,1);
  let qs=[];src.forEach(e=>e.l.q.forEach((q,i)=>qs.push({...q,lid:e.id,qi:i,lv:e.lv})));
  if(onlyWrong)return shuffle(qs.filter(q=>S.wrong[qid(q.lid,q.qi)])).slice(0,10);
  const w=qs.filter(q=>S.wrong[qid(q.lid,q.qi)]),n=qs.filter(q=>!S.wrong[qid(q.lid,q.qi)]);
  return shuffle(w).slice(0,4).concat(shuffle(n)).slice(0,10);
}
$('#btn-review').addEventListener('click',()=>startLesson(null,pool(false)));
$('#btn-hard').addEventListener('click',()=>startLesson(null,pool(true)));

/* ===================== LESSON ===================== */
let L=null;
function startLesson(entry,customQs){
  const mk=(q,i)=>({...q,lid:q.lid||entry.id,qi:q.qi??i,lv:entry.lv});  // 퀘스트처럼 여러 레슨에서 모은 문제는 원래 레슨 id를 유지
  const qs=customQs||entry.l.q.map(mk);
  const r=entry&&S.resume&&S.resume[entry.id];
  if(r&&!customQs){ // 이어서 하기: 저장된 문제 키로 복원
    const byKey=k=>{const p=k.lastIndexOf(':');const lid=k.slice(0,p),qi=+k.slice(p+1);const e=ALL.find(x=>x.id===lid);return e?{...e.l.q[qi],lid,qi,lv:entry.lv}:null;};
    const queue=r.rest.map(k=>typeof k==='number'?mk(entry.l.q[k],k):byKey(k)).filter(Boolean);
    L={entry,tips:[],tipIdx:0,queue,total:r.total||entry.l.q.length,doneN:r.doneN,firstTry:{...r.firstTry},cur:null,phase:'q',sel:null,earned:r.earned,review:false,checked:false};
  } else {
    const tips=(entry&&S.tips)?(entry.l.tips||[]):[];
    L={entry,tips,tipIdx:0,queue:shuffle(qs),total:qs.length,doneN:0,firstTry:{},cur:null,phase:tips.length?'tip':'q',sel:null,earned:0,review:!entry,checked:false};
  }
  $('#s-home').hidden=true;$('#s-result').hidden=true;$('#s-lesson').hidden=false;window.scrollTo(0,0);
  step();
}
$('#btn-quit').addEventListener('click',()=>{saveResume();goHome();});
/* 중간에 나가면 남은 문제와 진행 상황을 저장해 두고, 다음에 그 레슨을 열면 이어서 시작 */
function saveResume(){
  if(!L||L.review||!L.entry)return;
  if(!S.resume)S.resume={};
  if(L.phase==='tip'){delete S.resume[L.entry.id];save();return;}  // 개념 카드 단계면 저장할 것 없음
  // 채점 전인 현재 문제는 다시 풀어야 하므로 앞에 넣고, 채점이 끝난 문제는 이미 반영됨(정답은 doneN, 오답은 queue 뒤)
  const rest=(L.cur&&!L.checked?[L.cur]:[]).concat(L.queue).map(q=>q.lid+':'+q.qi);
  if(!rest.length){delete S.resume[L.entry.id];save();return;}
  S.resume[L.entry.id]={rest,total:L.total,doneN:L.doneN,firstTry:L.firstTry,earned:L.earned,at:Date.now()};
  save();
}
function goHome(){$('#s-lesson').hidden=true;$('#s-result').hidden=true;$('#s-home').hidden=false;renderStats();renderPicker();renderPath();renderReview();window.scrollTo(0,0);}

function setSheet(state,title,text){
  const sh=$('#sheet');sh.className='sheet'+(state?' '+state:'');
  $('#fb').hidden=!state;if(state){$('#fb-ico').textContent=state==='right'?'○':'×';$('#fb-title').textContent=title;$('#fb-text').innerHTML=text+XBTN('q');}
}
function setMain(label,enabled){const b=$('#btn-main');b.textContent=label;b.disabled=!enabled;}
function progress(){$('#l-bar').style.width=(L.doneN/L.total*100)+'%';$('#l-count').textContent=L.doneN+' / '+L.total;}

function step(){
  progress();setSheet(null);
  if(L.phase==='tip'){renderTip();return;}
  if(!L.queue.length){finish();return;}
  L.cur=L.queue.shift();L.sel=null;L.checked=false;renderQ();
}
function renderTip(){
  const t=L.tips[L.tipIdx];
  $('#qwrap').innerHTML=`<div class="tip"><div class="eyebrow">핵심 개념 ${L.tipIdx+1} / ${L.tips.length}</div><h3>${t.h}</h3>${t.p.map(p=>`<p>${p}</p>`).join('')}${t.ex?`<div class="ex">${t.ex}</div>`:''}${XBTN('tip')}<div class="dots">${L.tips.map((_,i)=>`<i class="${i===L.tipIdx?'on':''}"></i>`).join('')}</div></div>`;
  setMain(L.tipIdx<L.tips.length-1?'다음':'문제 풀기',true);
}
const EYEBROW={choice:'알맞은 답 고르기',tf:'맞으면 O, 틀리면 X',fill:'빈칸 채우기',match:'짝 맞추기',num:'계산해서 입력하기'};
function renderQ(){
  const q=L.cur,w=$('#qwrap');
  const head=`<div class="eyebrow">${q.src?esc(q.src)+' · ':''}${EYEBROW[q.t]}</div>`;
  const given=q.given?`<div class="given">${q.given}</div>`:'';
  if(q.t==='choice'){
    L.opts=shuffle(q.o.map((o,i)=>({o,i})));
    w.innerHTML=`${head}<div class="qtext">${esc(q.q)}</div>${given}<div class="opts">${L.opts.map((x,k)=>`<button class="opt" data-i="${x.i}"><span class="k ${q.o.length>4?'five':''}">${q.o.length>4?['①','②','③','④','⑤'][k]:k+1}</span><span>${esc(x.o)}</span></button>`).join('')}</div>`;
  } else if(q.t==='tf'){
    w.innerHTML=`${head}<div class="qtext">${esc(q.q)}</div>${given}<div class="tf"><button class="opt" data-i="1"><span class="mark">O</span>맞다</button><button class="opt" data-i="0"><span class="mark">X</span>틀리다</button></div>`;
  } else if(q.t==='fill'){
    const parts=q.q.split('___');
    w.innerHTML=`${head}<div class="qtext">${esc(parts[0])}<span class="blank empty" id="blank"></span>${esc(parts[1]||'')}</div>${given}<div class="bank">${shuffle(q.bank).map(b=>`<button class="chip" data-w="${esc(b)}">${esc(b)}</button>`).join('')}</div>`;
  } else if(q.t==='match'){
    L.left=shuffle(q.pairs.map((p,i)=>({t:p[0],i})));L.right=shuffle(q.pairs.map((p,i)=>({t:p[1],i})));L.pairedN=0;L.pick={};L.mistakes=0;
    w.innerHTML=`${head}<div class="qtext">${esc(q.q||'용어와 뜻을 연결하세요')}</div><div class="match">${L.left.map((x,k)=>`<button class="opt" data-side="l" data-i="${x.i}">${esc(x.t)}</button><button class="opt" data-side="r" data-i="${L.right[k].i}">${esc(L.right[k].t)}</button>`).join('')}</div>`;
  } else if(q.t==='num'){
    w.innerHTML=`${head}<div class="qtext">${esc(q.q)}</div>${given}<div class="numwrap" id="numwrap"><input id="num" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="답 입력"><span class="unit">${esc(q.unit||'')}</span></div>${q.hint?`<div class="hint">${q.hint}</div>`:''}`;
    const inp=$('#num');inp.addEventListener('input',()=>{L.sel=inp.value.trim();setMain('확인',!!L.sel);});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&L.sel&&!L.checked)$('#btn-main').click();});
    setTimeout(()=>inp.focus(),50);
  }
  setMain('확인',false);
}
$('#qwrap').addEventListener('click',e=>{
  if(!L||L.checked||L.phase==='tip')return;
  const q=L.cur;
  if(q.t==='choice'||q.t==='tf'){const b=e.target.closest('.opt');if(!b)return;document.querySelectorAll('#qwrap .opt').forEach(x=>x.classList.toggle('sel',x===b));L.sel=+b.dataset.i;setMain('확인',true);}
  else if(q.t==='fill'){
    const c=e.target.closest('.chip'),bl=$('#blank');
    if(c){document.querySelectorAll('.chip').forEach(x=>x.classList.remove('used'));c.classList.add('used');bl.textContent=c.dataset.w;bl.classList.remove('empty');L.sel=c.dataset.w;setMain('확인',true);}
    else if(e.target.closest('#blank')&&L.sel){document.querySelectorAll('.chip').forEach(x=>x.classList.remove('used'));bl.textContent='';bl.classList.add('empty');L.sel=null;setMain('확인',false);}
  }
  else if(q.t==='match'){
    const b=e.target.closest('.opt');if(!b||b.classList.contains('paired'))return;
    const side=b.dataset.side;
    document.querySelectorAll(`#qwrap .opt[data-side="${side}"]`).forEach(x=>x.classList.remove('sel'));
    b.classList.add('sel');L.pick[side]=b;
    if(L.pick.l&&L.pick.r){
      const l=L.pick.l,r=L.pick.r;
      if(l.dataset.i===r.dataset.i){l.classList.add('paired','right');r.classList.add('paired','right');L.pairedN++;}
      else{L.mistakes++;[l,r].forEach(x=>{x.classList.add('shake','wrong');setTimeout(()=>x.classList.remove('shake','wrong','sel'),400);});}
      L.pick={};
      if(L.pairedN===q.pairs.length){L.sel=L.mistakes===0;setMain('확인',true);}
    }
  }
});

$('#btn-main').addEventListener('click',()=>{
  if(L.phase==='tip'){if(L.tipIdx<L.tips.length-1){L.tipIdx++;renderTip();window.scrollTo(0,0);}else{L.phase='q';step();}return;}
  if(!L.checked){check();}else{step();window.scrollTo(0,0);}
});

function parseNum(s){return parseFloat(String(s).replace(/[,\s]/g,''));}
function check(){
  const q=L.cur;let ok;
  if(q.t==='choice')ok=L.sel===q.a;
  else if(q.t==='tf')ok=(L.sel===1)===q.a;
  else if(q.t==='fill')ok=L.sel===q.a;
  else if(q.t==='num'){const v=parseNum(L.sel);const tol=q.tol!=null?q.tol:Math.abs(q.a)*0.005;ok=!isNaN(v)&&Math.abs(v-q.a)<=tol;}
  else ok=L.sel===true;
  L.checked=true;
  const id=qid(q.lid,q.qi);
  if(!(id in L.firstTry)){L.firstTry[id]=ok;S.answered++;if(ok)S.correct++;}
  if(q.t==='choice'){document.querySelectorAll('#qwrap .opt').forEach(b=>{b.disabled=true;if(+b.dataset.i===q.a)b.classList.add('right');else if(+b.dataset.i===L.sel)b.classList.add('wrong');});}
  else if(q.t==='tf'){document.querySelectorAll('#qwrap .opt').forEach(b=>{b.disabled=true;if((+b.dataset.i===1)===q.a)b.classList.add('right');else if(+b.dataset.i===L.sel)b.classList.add('wrong');});}
  else if(q.t==='fill'){const bl=$('#blank');bl.style.color=ok?'var(--ok)':'var(--seal)';bl.style.borderColor=ok?'var(--ok)':'var(--seal)';}
  else if(q.t==='num'){$('#numwrap').classList.add(ok?'right':'wrong');$('#num').disabled=true;}
  const gain=L.review?5:XP_PER_LEVEL[q.lv||0];
  if(ok){
    L.doneN++;L.earned+=gain;S.xp+=gain;S.todayXp+=gain;delete S.wrong[id];
    setSheet('right',['정확해요!','좋아요!','맞았어요!','완벽해요!'][Math.random()*4|0]+' +'+gain+' XP',q.e||'모든 짝을 맞췄어요.');
  } else {
    S.wrong[id]=(S.wrong[id]||0)+1;L.queue.push(q);
    const right=q.t==='choice'?'정답: '+q.o[q.a]:q.t==='tf'?'정답: '+(q.a?'O (맞다)':'X (틀리다)'):q.t==='fill'?'정답: '+q.a:q.t==='num'?'정답: '+fmt(q.a)+(q.unit?' '+q.unit:''):'짝을 다시 확인해요';
    setSheet('wrong',right,q.e||'실수한 짝이 있었어요. 뒤에서 한 번 더 나옵니다.');
  }
  progress();save();
  setMain('계속',true);$('#btn-main').focus();
}

function finish(){
  const n=Object.keys(L.firstTry).length,c=Object.values(L.firstTry).filter(Boolean).length,acc=n?Math.round(c/n*100):0;
  if(!L.review&&S.resume)delete S.resume[L.entry.id];
  if(!L.review){const prev=S.done[L.entry.id];S.done[L.entry.id]={best:Math.max(acc,prev?prev.best:0)};const bonus=prev?5:20;L.earned+=bonus;S.xp+=bonus;S.todayXp+=bonus;}
  const tk=todayKey();if(S.lastDay!==tk){S.streak=(S.lastDay===yesterdayKey())?S.streak+1:1;S.lastDay=tk;}
  save();
  $('#r-brand').textContent=L.entry?(L.entry.f.brand||L.entry.f.name):'자격공부';
  $('#r-stamp').textContent=L.review?'복습':acc===100?'만점':'완료';
  $('#r-title').textContent=L.review?'복습 완료':L.entry.l.title;
  if(L.entry&&String(L.entry.id).startsWith('hq:'))$('#r-stamp').textContent=acc===100?'전범위 만점':'퀘스트 완료';
  $('#r-lead').textContent=acc===100?'한 번에 모두 맞혔어요. 자신 있게 넘어가도 좋아요.':acc>=70?'틀린 문제는 복습 탭에서 다시 나와요.':'헷갈리는 개념이 있네요. 핵심 개념을 한 번 더 읽고 복습해보세요.';
  $('#r-xp').textContent='+'+L.earned;$('#r-acc').textContent=acc+'%';$('#r-n').textContent=n;
  $('#s-lesson').hidden=true;$('#s-result').hidden=false;window.scrollTo(0,0);
  const st=$('.stamp');st.style.animation='none';st.offsetHeight;st.style.animation='';
}
$('#btn-home').addEventListener('click',goHome);


/* ===================== 더 자세히 설명 (Claude) ===================== */
let sampleFn=null, sampleTried=false;
async function getSample(){ if(sampleTried)return sampleFn; sampleTried=true; try{ if(window.claude&&typeof window.claude.use==='function'){ sampleFn=await window.claude.use('sample'); } }catch(e){ sampleFn=null; } return sampleFn; }
function apiKey(){ try{return localStorage.getItem('jipgongbu_apikey')||'';}catch(e){return '';} }
async function explainProvider(){ if(await getSample())return 'sample'; if(apiKey())return 'key'; return null; }
async function askClaude(prompt,onText){
  const sys='당신은 한국의 전문 자격(공인중개사·세무사·노무사·법무사·행정사·회계사·변리사·감정평가사) 학습 앱의 친절한 선생님입니다. 학습자는 초보자입니다. 쉬운 말로, 한 번에 하나씩, 구체적인 숫자 예시를 들어 설명하세요. 마크다운 기호(#, *, -) 없이 짧은 문단으로 쓰고, 전체 400자 안팎으로 답하세요. 법령·세율 등 수치는 "2026년 기준"임을 필요할 때 밝히고, 확실하지 않으면 확인이 필요하다고 말하세요.';
  const p=await explainProvider();
  if(p==='sample'){ const r=await sampleFn([{role:'user',content:sys+'\n\n'+prompt}],{onText:({text})=>onText(text),modelTier:'default',cache:true}); return r.text; }
  if(p==='key'){
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-opus-5',max_tokens:1500,system:sys,messages:[{role:'user',content:prompt}],output_config:{effort:'low'}})});
    if(!res.ok){const t=await res.text();throw new Error('API 오류 '+res.status+': '+t.slice(0,200));}
    const j=await res.json(); if(j.stop_reason==='refusal')throw new Error('이 질문에는 답하지 못했어요.');
    const text=(j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n'); onText(text); return text;
  }
  throw new Error('NO_PROVIDER');
}
let X={ctx:null,history:[],base:''};
function xContext(kind,key){
  const f=(L&&L.entry&&L.entry.f)||F();
  if(kind==='tip'&&L&&L.tips[L.tipIdx]){const t=L.tips[L.tipIdx];const plain=h=>String(h).replace(/<[^>]+>/g,'');return {title:t.h,text:`[분야] ${f.name}\n[레슨] ${L.entry.l.title}\n[개념 카드 제목] ${t.h}\n[내용]\n${t.p.map(plain).join('\n')}${t.ex?'\n[예]\n'+plain(t.ex):''}`};}
  if(kind==='q'&&L&&L.cur){const q=L.cur;const ans=q.t==='choice'?q.o[q.a]:q.t==='tf'?(q.a?'O':'X'):q.t==='fill'?q.a:q.t==='num'?String(q.a)+(q.unit||''):'(짝 맞추기)';const opts=q.t==='choice'?'\n[보기] '+q.o.join(' / '):'';return {title:'이 문제 해설',text:`[분야] ${f.name}\n[문제] ${q.q}${opts}\n[정답] ${ans}\n[해설] ${q.e||''}`};}
  if(kind==='term'&&key){const [fid,name]=key.split('|');const ff=FIELDS.find(x=>x.id===fid)||f;const t=(ff.glossary||[]).find(x=>x[0]===name);if(t)return {title:t[0],text:`[분야] ${ff.name}\n[용어] ${t[0]} (${t[1]}, ${LEVEL_NAMES[(t[3]||1)-1]})\n[한 줄 정의] ${t[2]}`};}
  return null;
}
function openX(kind,key){
  const ctx=xContext(kind,key);if(!ctx)return;
  X={ctx,history:[],base:ctx.text};
  $('#x-title').textContent=ctx.title;$('#xpanel').hidden=false;
  runX('위 내용을 처음 배우는 사람에게 더 자세히, 쉬운 말로 설명해 주세요. 왜 그런지 이유와 생활 속 예시 하나를 꼭 넣어 주세요.');
}
async function runX(ask){
  const body=$('#x-body');
  const p=await explainProvider();
  if(!p){body.innerHTML='<span class="err">이 버전에서는 AI 설명을 쓸 수 없어요.</span>\n\nclaude.ai에서 연 아티팩트 버전이면 바로 되고, 이 페이지에서는 설정 탭에 Anthropic API 키를 넣으면 됩니다.';return;}
  document.querySelectorAll('.xfoot .chip').forEach(b=>b.disabled=true);
  body.innerHTML='<span class="thinking">설명을 준비하는 중… (5~30초)</span>';
  const prompt=X.base+'\n\n[요청] '+ask+(X.history.length?'\n\n[지금까지 한 설명]\n'+X.history.map(h=>h.a).join('\n---\n')+'\n\n위 설명과 겹치지 않게 답하세요.':'');
  try{ const text=await askClaude(prompt,t=>{body.textContent=t;}); X.history.push({q:ask,a:text}); body.textContent=text; }
  catch(e){ const m=(e&&e.code==='not_granted')?'AI 설명 권한이 허용되지 않았어요.':(e&&e.code==='rate_limited')?'요청이 많아요. 잠시 후 다시 눌러 주세요.':(e&&e.message)||'설명을 가져오지 못했어요.'; body.innerHTML='<span class="err">'+esc(m)+'</span>'; }
  document.querySelectorAll('.xfoot .chip').forEach(b=>b.disabled=false);
}
document.addEventListener('click',e=>{const b=e.target.closest('.xbtn');if(!b)return;e.stopPropagation();openX(b.dataset.xk,b.dataset.xkey);});
$('#x-close').addEventListener('click',()=>{$('#xpanel').hidden=true;});
$('#xpanel').addEventListener('click',e=>{if(e.target===e.currentTarget)$('#xpanel').hidden=true;});
$('#xpanel .xfoot').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b||b.disabled)return;const m={'예시':'다른 구체적인 예시를 하나 더 들어 숫자와 함께 설명해 주세요.','비유':'일상생활의 비유 하나로 설명해 주세요.','시험':'시험에서 이 내용이 어떻게 출제되는지, 자주 나오는 함정과 외울 숫자를 정리해 주세요.','관련':'함께 알아두면 좋은 관련 용어 3개를 각각 한 문장으로 설명해 주세요.'};runX(m[b.dataset.x]);});
$('#apikey').addEventListener('change',e=>{try{if(e.target.value.trim())localStorage.setItem('jipgongbu_apikey',e.target.value.trim());else localStorage.removeItem('jipgongbu_apikey');}catch(x){}renderExplainStatus();});
async function renderExplainStatus(){
  const p=await explainProvider();
  $('#explain-status').textContent=p==='sample'?'사용 가능: claude.ai 아티팩트 안에서 Claude를 호출합니다. 첫 호출 때 허용 여부를 묻습니다.':p==='key'?'사용 가능: 저장된 API 키로 Anthropic API를 직접 호출합니다.':'현재 사용 불가: claude.ai 아티팩트로 열거나 아래에 API 키를 넣으세요.';
  $('#apikey-wrap').hidden=p==='sample'; if(apiKey())$('#apikey').value=apiKey();
}
renderExplainStatus();

/* ===================== 계정 · 기기 간 동기화 ===================== */
let dbNs=null, dbTried=false, acct=null, cloudTimer=null, syncing=false;
async function getDb(){ if(dbTried)return dbNs; dbTried=true; try{ if(window.claude&&typeof window.claude.use==='function')dbNs=await window.claude.use('db'); }catch(e){dbNs=null;} return dbNs; }
async function sha256(str){ const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function acctDoc(){ return dbNs.doc('accounts/'+acct.id); }
function snapshot(){ const s={...S}; delete s.pick; return {nick:acct.nick,state:s,guide:G,updatedAt:Date.now()}; }
function mergeState(remote){
  if(!remote||!remote.state)return;
  const r=remote.state;
  Object.entries(r.done||{}).forEach(([k,v])=>{const l=S.done[k];if(!l||v.best>l.best)S.done[k]=v;});
  Object.entries(r.wrong||{}).forEach(([k,v])=>{S.wrong[k]=Math.max(S.wrong[k]||0,v);});
  Object.entries(r.resume||{}).forEach(([k,v])=>{const l=S.resume&&S.resume[k];if(!l||(v.at||0)>(l.at||0)){S.resume=S.resume||{};S.resume[k]=v;}});
  S.xp=Math.max(S.xp,r.xp||0);S.streak=Math.max(S.streak,r.streak||0);S.answered=Math.max(S.answered,r.answered||0);S.correct=Math.max(S.correct,r.correct||0);
  if(r.lastDay&&(!S.lastDay||r.lastDay>S.lastDay))S.lastDay=r.lastDay;
  if(r.dayKey===S.dayKey)S.todayXp=Math.max(S.todayXp,r.todayXp||0);
  if(remote.guide){Object.assign(G.checks,remote.guide.checks||{});gsave();}
}
async function cloudPush(){ if(!acct||!dbNs||syncing)return; syncing=true; try{ await acctDoc().set(snapshot()); setAcctStatus('동기화됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})); }catch(e){ setAcctStatus('동기화 실패: '+(e.message||e.code||'')); } syncing=false; }
async function cloudPull(){ if(!acct||!dbNs)return false; try{ const snap=await acctDoc().get(); if(snap.exists){ mergeState(snap.data()); localStorage.setItem(KEY,JSON.stringify(S)); return true; } }catch(e){ setAcctStatus('불러오기 실패: '+(e.message||e.code||'')); } return false; }
function cloudTouch(){ if(!acct||!dbNs)return; clearTimeout(cloudTimer); cloudTimer=setTimeout(cloudPush,1500); }
function setAcctStatus(t){ const el=$('#acct-status'); if(el)el.textContent=t; }
function renderAcct(){
  const hasDb=!!dbNs;
  $('#acct-form').hidden=!hasDb||!!acct; $('#acct-on').hidden=!hasDb||!acct; $('#acct-code').hidden=hasDb;
  if(!hasDb){$('#acct-msg').textContent='';}
  if(acct){$('#acct-name').textContent=acct.nick;}
  let chip=document.querySelector('.stat.acct');
  if(acct&&hasDb){ if(!chip){chip=document.createElement('span');chip.className='stat acct';chip.title='로그인됨';document.querySelector('.stats').prepend(chip);} chip.textContent=acct.nick; }
  else if(chip)chip.remove();
}
async function login(nick,pin){
  nick=nick.trim();pin=pin.trim();
  if(nick.length<2){$('#acct-msg').textContent='닉네임은 2자 이상.';return;}
  if(pin.length<4){$('#acct-msg').textContent='PIN은 4자 이상.';return;}
  $('#acct-msg').textContent='확인 중…';
  const id=await sha256(nick.toLowerCase()+'\n'+pin);
  acct={id,nick};
  const existed=await cloudPull();
  await cloudPush();
  try{localStorage.setItem('jipgongbu_acct',JSON.stringify(acct));}catch(e){}
  $('#acct-msg').textContent='';
  renderAcct();renderStats();renderPicker();renderPath();renderReview();renderGuide();
  setAcctStatus(existed?'기존 계정의 기록을 합쳤어요':'새 계정을 만들었어요');
}
$('#acct-login').addEventListener('click',()=>login($('#acct-nick').value,$('#acct-pin').value));
$('#acct-pin').addEventListener('keydown',e=>{if(e.key==='Enter')$('#acct-login').click();});
$('#acct-logout').addEventListener('click',()=>{acct=null;try{localStorage.removeItem('jipgongbu_acct');}catch(e){}renderAcct();});
$('#acct-sync').addEventListener('click',async()=>{setAcctStatus('동기화 중…');await cloudPull();await cloudPush();renderStats();renderPicker();renderPath();renderReview();});
/* 동기화 코드 (db 없는 정적 버전) */
$('#code-export').addEventListener('click',async()=>{const code=btoa(unescape(encodeURIComponent(JSON.stringify({state:S,guide:G,updatedAt:Date.now()}))));$('#code-box').value=code;try{await navigator.clipboard.writeText(code);$('#code-export').textContent='복사됨';setTimeout(()=>$('#code-export').textContent='내 진행 코드 복사',1500);}catch(e){}});
$('#code-import').addEventListener('click',()=>{try{const obj=JSON.parse(decodeURIComponent(escape(atob($('#code-box').value.trim()))));mergeState(obj);save();renderStats();renderPicker();renderPath();renderReview();renderGuide();$('#code-import').textContent='불러왔어요';setTimeout(()=>$('#code-import').textContent='코드 붙여넣어 불러오기',1500);}catch(e){$('#code-import').textContent='코드가 올바르지 않아요';setTimeout(()=>$('#code-import').textContent='코드 붙여넣어 불러오기',2000);}});
(async()=>{ await getDb(); try{const r=localStorage.getItem('jipgongbu_acct');if(r&&dbNs){acct=JSON.parse(r);await cloudPull();renderStats();renderPicker();renderPath();renderReview();}}catch(e){} renderAcct(); if(acct&&dbNs)setAcctStatus('동기화됨'); })();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&acct&&dbNs)cloudPull().then(ok=>{if(ok){renderStats();renderPicker();renderPath();renderReview();}});});

renderStats();renderPicker();renderPath();renderReview();

/* ===================== 설치 프롬프트 (PWA) ===================== */
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;const b=$('#btn-install');if(b)b.hidden=false;});
const installBtn=$('#btn-install');
if(installBtn)installBtn.addEventListener('click',async()=>{if(!installEvt)return;installEvt.prompt();const r=await installEvt.userChoice;installEvt=null;installBtn.hidden=true;if(r&&r.outcome==='accepted')$('#install-hint').textContent='설치됐어요. 홈 화면·앱 목록에서 자격공부를 찾아보세요.';});
window.addEventListener('appinstalled',()=>{if(installBtn)installBtn.hidden=true;$('#install-hint').textContent='설치됐어요. 홈 화면·앱 목록에서 자격공부를 찾아보세요.';});

/* ===================== 시작 화면 ===================== */
(function(){const sp=document.getElementById('splash');if(!sp)return;const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen=false;try{seen=sessionStorage.getItem('jg_splash')==='1';sessionStorage.setItem('jg_splash','1');}catch(e){}
  setTimeout(()=>sp.classList.add('gone'),(seen||reduce)?0:900);})();
