const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const $ = id => document.getElementById(id);
const charts = {};
const C = () => ({ex:css('--ex'),im:css('--im'),lab:css('--lab'),ink:css('--ink'),mute:css('--mute'),line:css('--line')});
const bgPlugin = {id:'bg',beforeDraw(ch){const x=ch.ctx;x.save();x.globalCompositeOperation='destination-over';x.fillStyle='#fff';x.fillRect(0,0,ch.width,ch.height);x.restore()}};
function draw(id, cfg){
  if(charts[id]) charts[id].destroy();
  const c = C(), big = document.body.classList.contains('present');
  Chart.defaults.color = c.ink; Chart.defaults.font.size = big?18:14;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.borderColor = c.line; Chart.defaults.maintainAspectRatio = false;
  cfg.plugins = (cfg.plugins||[]).concat(bgPlugin);
  charts[id] = new Chart($(id), cfg);
  const box = $(id).parentElement;
  if(!box.querySelector('.save')){
    const b = document.createElement('button'); b.className='save'; b.textContent='PNG 저장'; b.title='차트를 이미지로 저장';
    b.onclick = () => {const a=document.createElement('a');a.href=charts[id].toBase64Image('image/png',1);a.download=id+'.png';a.click()};
    box.appendChild(b);
  }
}
const guide = (id, read, interp) => { $('g-'+id).innerHTML = `<p><b>읽는 법</b>${read}</p><p><b>해석</b>${interp}</p>` };
const pearson = (a,b)=>{const n=a.length,ma=a.reduce((s,v)=>s+v)/n,mb=b.reduce((s,v)=>s+v)/n;
  let sab=0,sa=0,sb=0;a.forEach((v,i)=>{sab+=(v-ma)*(b[i]-mb);sa+=(v-ma)**2;sb+=(b[i]-mb)**2});return sab/Math.sqrt(sa*sb)};
const label = {ex:'수출률(%)',im:'수입률(%)',empI:'취업유발계수(명/10억원)',hireI:'고용유발계수(명/10억원)',emp:'취업계수(명/10억원)'};
const short = l => l.replace(/\(.*\)/,'');
const maxBy = (arr,f) => arr.reduce((a,b)=>f(b)>f(a)?b:a);
const minBy = (arr,f) => arr.reduce((a,b)=>f(b)<f(a)?b:a);

// ---------- 1. 산점도 ----------
const labelPlugin = {id:'pl',afterDatasetsDraw(ch){const {ctx}=ch;ctx.save();ctx.fillStyle=css('--ink');ctx.font=`${document.body.classList.contains('present')?15:13}px sans-serif`;
  ch.getDatasetMeta(0).data.forEach((p,i)=>ctx.fillText(SECTORS[i].n,p.x+8,p.y+4));ctx.restore()}};
function scatter(){
  const xk=$('sx').value, yk=$('sy').value;
  const xs=SECTORS.map(s=>xk==='ex'?s.ex[3]:s.im[3]), ys=SECTORS.map(s=>s[yk]);
  const r=pearson(xs,ys), a=Math.abs(r), strength=a<.3?'약한':a<.6?'보통 수준의':'뚜렷한', dir=r<0?'반대 방향(음)':'같은 방향(양)';
  const items=SECTORS.map((s,i)=>({n:s.n,x:xs[i],y:ys[i]}));
  const mx=maxBy(items,o=>o.x), my=maxBy(items,o=>o.y);
  draw('cScatter',{type:'scatter',plugins:[labelPlugin],
    data:{datasets:[{data:items.map(o=>({x:o.x,y:o.y})),backgroundColor:C()[xk==='ex'?'ex':'im'],pointRadius:7}]},
    options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:t=>`${items[t.dataIndex].n}: (${t.parsed.x}, ${t.parsed.y})`}}},
      layout:{padding:{right:110}},
      scales:{x:{title:{display:true,text:label[xk]}},y:{title:{display:true,text:label[yk]},beginAtZero:true}}}});
  guide('scatter',`점 하나가 한 부문입니다. 오른쪽일수록 ${short(label[xk])}이 높고, 위쪽일수록 ${short(label[yk])}가 큽니다.`,
   `${short(label[xk])}이 가장 높은 부문은 ${mx.n}(${mx.x}%)로 ${short(label[yk])}는 ${mx.y}입니다. ${short(label[yk])}가 가장 높은 부문은 ${my.n}(${my.y})이고 ${short(label[xk])}은 ${my.x}%입니다. 상관계수는 ${r.toFixed(2)}로 두 값이 ${strength} ${dir} 관계를 보입니다. (상관관계는 인과관계가 아닙니다.)`);
}

// ---------- 2. 대외거래 ----------
function trade(){
  const c=C();
  draw('cTrade',{data:{labels:YEARS,datasets:[
    {type:'bar',label:'수출(조원)',data:TRADE.exports,backgroundColor:c.ex,yAxisID:'y'},
    {type:'bar',label:'수입(조원)',data:TRADE.imports,backgroundColor:c.im,yAxisID:'y'},
    {type:'line',label:'대외거래 비중(%)',data:TRADE.share,borderColor:c.ink,backgroundColor:c.ink,yAxisID:'y1'}]},
    options:{scales:{y:{title:{display:true,text:'조원'}},y1:{position:'right',min:20,max:35,grid:{drawOnChartArea:false},title:{display:true,text:'%'}}}}});
  const pk=TRADE.share.indexOf(Math.max(...TRADE.share));
  guide('trade','막대는 수출·수입 금액(왼쪽 축, 조원), 검은 선은 총공급 대비 수출입 비중(오른쪽 축, %)입니다.',
    `대외거래 비중은 ${YEARS[0]}년 ${TRADE.share[0]}%에서 ${YEARS[pk]}년 ${TRADE.share[pk]}%까지 올랐다가 2023년 ${TRADE.share[3]}%로 내려갔습니다. 2023년 수출은 ${TRADE.exports[3]}조원, 수입은 ${TRADE.imports[3]}조원으로 둘 다 전년보다 줄었습니다.`);
  rate(); comp();
}
function rate(){
  const m=$('tm').value, yi=+$('ty').value, nm=m==='ex'?'수출률':'수입률';
  const rows=SECTORS.map(s=>({n:s.n,v:s[m][yi]})).sort((a,b)=>b.v-a.v);
  draw('cRate',{type:'bar',data:{labels:rows.map(r=>r.n),datasets:[{label:nm+'(%)',data:rows.map(r=>r.v),backgroundColor:C()[m]}]},
    options:{indexAxis:'y',plugins:{legend:{display:false},subtitle:{display:true,text:`전체 평균 ${TOTAL[m][yi]}%`}}}});
  guide('rate',`막대가 길수록 해당 부문 ${m==='ex'?'산출':'공급'} 중 ${m==='ex'?'수출':'수입'}이 차지하는 비중이 큽니다. 위쪽 부제는 전체 평균입니다.`,
    `${YEARS[yi]}년 ${nm}이 가장 높은 부문은 ${rows[0].n}(${rows[0].v}%), 다음은 ${rows[1].n}(${rows[1].v}%)이며 전체 평균 ${TOTAL[m][yi]}%와 비교됩니다.`);
}
function comp(){
  const c=C(), ex=maxBy(SECTORS,s=>s.exS), im=maxBy(SECTORS,s=>s.imS);
  const imSorted=[...SECTORS].sort((a,b)=>b.imS-a.imS);
  draw('cComp',{type:'bar',data:{labels:SECTORS.map(s=>s.n),datasets:[
    {label:'수출품 구성(%)',data:SECTORS.map(s=>s.exS),backgroundColor:c.ex},
    {label:'수입품 구성(%)',data:SECTORS.map(s=>s.imS),backgroundColor:c.im}]}});
  guide('comp','같은 색 막대를 모두 더하면 100%입니다. 파랑은 수출 전체 중, 금색은 수입 전체 중 각 부문의 몫입니다.',
    `수출은 ${ex.n} 비중이 ${ex.exS}%로 가장 크고, 수입은 ${im.n}(${im.imS}%)에 이어 ${imSorted[1].n}(${imSorted[1].imS}%)이 큽니다. 수출은 공산품에, 수입은 원자재(광산품)와 공산품에 몰려 있습니다.`);
}

// ---------- 3. 노동구조 ----------
function labor(){
  const c=C(), gap=maxBy(SECTORS,s=>s.emp-s.hire);
  draw('cCoef',{type:'bar',data:{labels:SECTORS.map(s=>s.n),datasets:[
    {label:'취업계수',data:SECTORS.map(s=>s.emp),backgroundColor:c.lab},
    {label:'고용계수(임금근로자)',data:SECTORS.map(s=>s.hire),backgroundColor:'#8a97a8'}]},options:{indexAxis:'y'}});
  guide('coef','총산출 10억원을 만드는 데 필요한 인원(명)입니다. 취업계수에는 자영업자·무급가족종사자가 포함되고, 고용계수는 임금근로자만 셉니다.',
    `두 막대의 차이가 클수록 자영업·무급가족 비중이 높은 부문입니다. 차이가 가장 큰 부문은 ${gap.n}(취업 ${gap.emp}명, 고용 ${gap.hire}명)입니다.`);
  fd();
  draw('cShare',{type:'bar',data:{labels:['취업유발비중','고용유발비중'],datasets:FD.items.map((n,i)=>({label:n,data:[FD.empShare[i],FD.hireShare[i]],backgroundColor:['#16996a','#7a4fc4','#2f5fd0'][i]}))},
    options:{indexAxis:'y',scales:{x:{stacked:true,max:100},y:{stacked:true}}}});
  guide('share','막대 하나가 전체 취업자(또는 임금근로자) 100%를 소비·투자·수출로 나눈 것입니다.',
    `수출이 유발한 취업자는 전체의 ${FD.empShare[2]}%로 소비(${FD.empShare[0]}%)의 3분의 1 수준입니다. 수출 비중이 29.4%임을 고려하면 수출은 일자리 기여가 상대적으로 작습니다.`);
}
function fd(){
  const m=$('fm').value, c=C(), nm=m==='empI'?'취업유발계수':'고용유발계수';
  draw('cFD',{type:'bar',data:{labels:FD.years,datasets:FD.items.map((n,i)=>({label:n,data:FD[m][i],backgroundColor:['#16996a','#7a4fc4','#2f5fd0'][i]}))},
    options:{scales:{y:{beginAtZero:true,title:{display:true,text:'명/10억원'}}}}});
  const s=FD[m][0][2], x=FD[m][2][2];
  guide('fd',`${nm}는 최종수요 10억원이 늘 때 전 산업에서 직·간접으로 생기는 인원(명)입니다. 막대가 높을수록 같은 금액으로 일자리를 많이 만듭니다.`,
    `2023년 소비는 ${s}명, 수출은 ${x}명으로 같은 금액이면 소비가 약 ${(s/x).toFixed(1)}배 많은 일자리를 만듭니다. 3개 항목 모두 2021년 이후 소폭 줄었습니다.`);
}

// ---------- 4. 고용 시뮬레이터(대분류 계수) ----------
function sim(){
  const a=+$('amt').value||0, c=C();
  const rows=FD.items.map((n,i)=>({n,emp:a*FD.empI[i][2],hire:a*FD.hireI[i][2],va:a*FD.va23[i],imp:a*FD.imp23[i]}));
  $('amtTxt').textContent=`= ${(a/1000).toLocaleString()}조원`;
  $('simTable').innerHTML='<tr><th>최종수요 항목</th><th>취업자(명)</th><th>임금근로자(명)</th><th>부가가치(십억원)</th><th>수입유발(십억원)</th></tr>'+
    rows.map(r=>`<tr><td>${r.n}</td><td class="num">${Math.round(r.emp).toLocaleString()}</td><td class="num">${Math.round(r.hire).toLocaleString()}</td><td class="num">${Math.round(r.va).toLocaleString()}</td><td class="num">${Math.round(r.imp).toLocaleString()}</td></tr>`).join('');
  draw('cSim',{type:'bar',data:{labels:rows.map(r=>r.n),datasets:[{label:'취업자(명)',data:rows.map(r=>Math.round(r.emp)),backgroundColor:c.lab}]},options:{plugins:{legend:{display:false}}}});
  guide('sim','같은 금액(십억원)에 2023년 항목별 유발계수를 곱한 단순 추정입니다. 부가가치는 국산 최종수요 기준, 수입유발은 항목별 수입유발계수를 썼습니다.',
    `${a.toLocaleString()}십억원이 소비에 쓰이면 취업자 ${Math.round(rows[0].emp).toLocaleString()}명, 수출에 쓰이면 ${Math.round(rows[2].emp).toLocaleString()}명이 생깁니다. 수출은 수입유발이 ${Math.round(rows[2].imp).toLocaleString()}십억원으로 가장 커서 국내에 남는 부가가치가 적습니다.`);
}

// ---------- 5. 요약 ----------
function home(){
  const ex=SECTORS.filter(s=>s.ex[3]>=30).map(s=>s.n).join('·');
  $('kpis').innerHTML=[
   ['대외거래 비중',TRADE.share[3]+'%','수출입/총공급, 전년 31.5%'],
   ['수출률 · 수입률',TOTAL.ex[3]+'% · '+TOTAL.im[3]+'%','수출액/총산출 · 수입액/총공급'],
   ['취업유발계수 (소비 vs 수출)',FD.empI[0][2]+'명 vs '+FD.empI[2][2]+'명','최종수요 10억원당'],
   ['수출품 중 공산품','81.3%','조립가공 46.6% · 기초소재 30.1%']
  ].map(k=>`<div>${k[0]}<b>${k[1]}</b>${k[2]}</div>`).join('');
  $('findings').innerHTML=`<p><b>1.</b> 2023년 대외거래 비중은 29.6%로 전년보다 1.9%p 낮아졌습니다. 수출과 수입이 모두 줄었기 때문입니다.</p>
   <p><b>2.</b> 수출률이 30% 이상인 부문은 ${ex}입니다. 이들 부문의 취업유발계수는 상대적으로 낮습니다.</p>
   <p><b>3.</b> 같은 10억원이면 소비가 수출보다 취업자를 약 1.9배 더 만들지만, 수출은 외화 획득과 산업 기반 측면에서 의미가 큽니다.</p>`;
}

// ---------- 메뉴·발표 모드 ----------
const GROUPS=[
 {k:'요약',panes:[['home','핵심 요약']]},
 {k:'분석',panes:[['scatter','수출률 × 일자리'],['trade','대외거래'],['labor','노동구조']]},
 {k:'시뮬레이션',panes:[['sim','소비·투자·수출 비교'],['shock','380부문 수요충격']]},
 {k:'자료',panes:[['exp','원자료 탐색'],['ask','탐구 질문·한계']]}];
const ORDER=GROUPS.flatMap(g=>g.panes.map(p=>p[0]));
const renderers={home,scatter,trade,labor,sim,exp:()=>{},shock:()=>{},ask:()=>{}};
let current='home';
function go(id){
  current=id;
  const g=GROUPS.find(g=>g.panes.some(p=>p[0]===id));
  $('groups').innerHTML=GROUPS.map(x=>`<button role="tab" data-g="${x.k}" aria-selected="${x===g}">${x.k}</button>`).join('');
  $('subnav').innerHTML=g.panes.length>1?g.panes.map(p=>`<button role="tab" data-p="${p[0]}" aria-selected="${p[0]===id}">${p[1]}</button>`).join(''):'';
  document.body.dataset.t=g.k;
  document.querySelectorAll('.pane').forEach(p=>p.hidden=p.id!==id);
  history.replaceState(null,'','#'+id); window.scrollTo(0,0);
  renderers[id]();
}
$('groups').addEventListener('click',e=>{const k=e.target.dataset.g; if(k) go(GROUPS.find(g=>g.k===k).panes[0][0])});
$('subnav').addEventListener('click',e=>{const p=e.target.dataset.p; if(p) go(p)});
$('present').addEventListener('click',()=>{
  const on=!document.body.classList.contains('present');
  document.body.classList.toggle('present',on); $('present').setAttribute('aria-pressed',on);
  $('present').textContent=on?'발표 모드 끄기':'발표 모드';
  if(on&&document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
  if(!on&&document.fullscreenElement) document.exitFullscreen();
  renderers[current]();
});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('present')) $('present').click()});
document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('present')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const i=ORDER.indexOf(current);
  if(e.key==='ArrowRight'&&i<ORDER.length-1) go(ORDER[i+1]);
  if(e.key==='ArrowLeft'&&i>0) go(ORDER[i-1]);
});

$('ty').innerHTML=YEARS.map((y,i)=>`<option value="${i}"${i===3?' selected':''}>${y}</option>`).join('');
['sx','sy'].forEach(i=>$(i).addEventListener('change',scatter));
['tm','ty'].forEach(i=>$(i).addEventListener('change',rate));
$('fm').addEventListener('change',fd);
$('amt').addEventListener('input',sim);
go(ORDER.includes(location.hash.slice(1))?location.hash.slice(1):'home');
