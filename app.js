(function(){ 'use strict'; const DATA_URL='https://script.google.com/macros/s/AKfycbwgn9wMf-aMhkL_9ONO7AFPpOhDqj2ZMHzDHPgpYnzTqcqlTYToxxDCKL1R-tlMdVgU/exec'; let DATA=null,DETAIL=null,HISTORY=null,charts={},trendPeriod=12,trendType='line',trendSeries={rate:true,capa:true},weeklyFilter='changed',weeklyRegion='all',weeklySearch='',historyWeek='',historyRegion='all',historySearch='',historyFilter='all',historyPlantId='',resizeTimer=null; const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)]; const pct=v=>v==null?'—':(v*100).toFixed(1)+'%'; const pp=v=>v==null?'—':(v>=0?'+':'')+(v*100).toFixed(1)+'%p'; const capa=v=>v==null?'—':(v/10000).toLocaleString('ko-KR',{maximumFractionDigits:1})+'만톤'; const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim(); const cls=v=>v>.0005?'up':v<-.0005?'down':'flat';
const REGION_KO={Jilin:'지린',Heilongjiang:'헤이룽장',Liaoning:'랴오닝',Gansu:'간쑤',Xinjiang:'신장',Ningxia:'닝샤',Shaanxi:'산시',Tianjin:'톈진',Hebei:'허베이',Shandong:'산둥',Anhui:'안후이',Shanghai:'상하이',Zhejiang:'저장',Jiangsu:'장쑤',Hubei:'후베이',Hunan:'후난',Fujian:'푸젠',Guangdong:'광둥',Guangxi:'광시',Hainan:'하이난'};
const regionKo=v=>REGION_KO[v]||v;
const statusKo=s=>{
  s=String(s||'').trim();
  if(!s)return '사유 미기재';
  if(/预计|计划/.test(s)&&/停车|停产/.test(s))return '가동 중단 예정';
  if(/重启/.test(s)&&!/尚未|未重启|推迟/.test(s))return '재가동 진행/완료';
  if(/恢复/.test(s))return '생산 회복';
  if(/停车|停产/.test(s))return /检修/.test(s)?'보수·가동 중단':'가동 중단';
  if(/检修/.test(s))return '정기보수';
  if(/降负|下调负荷/.test(s))return '부하 하향';
  if(/提负/.test(s))return '부하 상향';
  if(/低负荷|偏低负荷/.test(s))return '저부하 운전';
  if(/生产正常|正常生产|正常|平稳运行/.test(s))return '정상 가동';
  return '운영상태';
};
const shortWeek=w=>String(w||'').slice(5).replace('-','/');
const chartFont=()=>Math.max(11,Math.min(14,Math.round(window.innerWidth/115))); function destroy(id){if(charts[id]){charts[id].destroy();delete charts[id]}} function signedCapa(v){return (v>=0?'+':'')+capa(v)} function selectedRows(){let rows=[...DATA.national];if(trendPeriod!=='all')rows=rows.slice(-Number(trendPeriod));return rows} function rateAxisRange(values){ if(!values.length)return {min:0,max:1}; const lo=Math.min(...values),hi=Math.max(...values); let min=Math.max(0,Math.floor((lo-.30)*20)/20); let max=Math.min(1,Math.ceil((hi+.05)*20)/20); if(max-min<.20){max=Math.min(1,min+.20);if(max-min<.20)min=Math.max(0,max-.20)} return {min,max}; } function capaAxisRange(values){ if(!values.length)return {}; const lo=Math.min(...values),hi=Math.max(...values),range=Math.max(hi-lo,1); const pad=Math.max(range*.28,250000); const step=100000; return {min:Math.max(0,Math.floor((lo-pad)/step)*step),max:Math.ceil((hi+pad)/step)*step}; } function baseChartOpts(yFmt){ const fs=chartFont(); return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},animation:{duration:360},plugins:{legend:{display:false},tooltip:{backgroundColor:'#07111f',titleColor:'#fff',bodyColor:'#dbe7f5',padding:11,displayColors:false,titleFont:{size:fs},bodyFont:{size:fs},callbacks:{label:c=>c.dataset.label+': '+(c.dataset._fmt?c.dataset._fmt(c.raw):c.raw)}}},scales:{x:{grid:{display:false},ticks:{color:css('--muted'),font:{size:fs},maxRotation:0,autoSkip:true,maxTicksLimit:9}},y:{grid:{color:css('--line')},ticks:{color:css('--muted'),font:{size:fs},callback:yFmt}}}}; } function lineChart(id,labels,values,label,fmt,color,min,max){ destroy(id);let opt=baseChartOpts(v=>fmt(v));if(min!=null)opt.scales.y.min=min;if(max!=null)opt.scales.y.max=max; let ds={label,data:values,borderColor:color,backgroundColor:color+'14',pointRadius:values.length>20?0:3,pointHoverRadius:5,borderWidth:2.4,tension:.36,cubicInterpolationMode:'monotone',fill:true};ds._fmt=fmt; charts[id]=new Chart($(id),{type:'line',data:{labels,datasets:[ds]},options:opt}); } function barChart(id,labels,values,label,fmt,color,horizontal=false){ destroy(id);let opt=baseChartOpts(v=>fmt(v)); if(horizontal){opt.indexAxis='y';opt.scales.y.grid.display=false;delete opt.scales.y.ticks.callback;opt.scales.y.ticks.autoSkip=false;opt.scales.y.ticks.font={size:chartFont()};opt.scales.x.grid.color=css('--line');opt.scales.x.ticks.callback=v=>fmt(v);} let ds={label,data:values,backgroundColor:color,borderRadius:6,borderSkipped:false};ds._fmt=fmt; charts[id]=new Chart($(id),{type:'bar',data:{labels,datasets:[ds]},options:opt}); } function signedHorizontalBar(id,items){ destroy(id); const labels=items.map(x=>x.region),values=items.map(x=>x.delta),fs=chartFont(); let maxAbs=Math.max(.01,...values.map(v=>Math.abs(v)));maxAbs=Math.ceil(maxAbs*100/2)*2/100; const ds={label:'지역 가동률 변화',data:values,backgroundColor:values.map(v=>v>=0?css('--up'):css('--down')),borderRadius:6,borderSkipped:false};ds._fmt=pp; charts[id]=new Chart($(id),{type:'bar',data:{labels,datasets:[ds]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',animation:{duration:360},plugins:{legend:{display:false},tooltip:{backgroundColor:'#07111f',titleColor:'#fff',bodyColor:'#dbe7f5',displayColors:false,padding:11,titleFont:{size:fs},bodyFont:{size:fs},callbacks:{label:c=>'전주 대비 '+pp(c.raw)}}},scales:{y:{grid:{display:false},ticks:{color:css('--muted'),font:{size:fs},autoSkip:false}},x:{min:-maxAbs,max:maxAbs,grid:{color:ctx=>ctx.tick.value===0?css('--muted'):css('--line'),lineWidth:ctx=>ctx.tick.value===0?1.5:1},ticks:{color:css('--muted'),font:{size:fs},callback:v=>(v*100).toFixed(0)+'%p'}}}}}); } function regionalDeltas(){ const map=new Map(DATA.regions.map(r=>[r.region,{region:r.region,capa:r.capa,deltaOnline:0}])); DATA.changes.forEach(c=>{if(c.rate_prev==null||c.rate_cur==null)return;let r=map.get(c.region);if(!r)return;r.deltaOnline+=(Number(c.capa)||0)*(Number(c.rate_cur)-Number(c.rate_prev));}); return [...map.values()].map(r=>({...r,delta:r.capa?r.deltaOnline/r.capa:0})).filter(r=>Math.abs(r.delta)>.00005).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,10); } function renderTrendChart(){ const rows=selectedRows(),labels=rows.map(x=>x.week),rateVals=rows.map(x=>x.avg_rate),capaVals=rows.map(x=>x.online_capa),fs=chartFont(); destroy('#trend-chart'); const datasets=[]; if(trendSeries.rate){let ds={type:trendType,label:'가동률',data:rateVals,yAxisID:'yRate',borderColor:css('--brand'),backgroundColor:trendType==='line'?css('--brand')+'16':css('--brand'),borderWidth:2.5,pointRadius:trendType==='line'?(rows.length>24?0:3):0,pointHoverRadius:5,tension:.36,cubicInterpolationMode:'monotone',fill:false,borderRadius:trendType==='bar'?5:0,borderSkipped:false};ds._fmt=pct;datasets.push(ds)} if(trendSeries.capa){let ds={type:trendType,label:'가동 Capa',data:capaVals,yAxisID:'yCapa',borderColor:css('--cyan'),backgroundColor:trendType==='line'?css('--cyan')+'18':css('--cyan'),borderWidth:2.5,pointRadius:trendType==='line'?(rows.length>24?0:3):0,pointHoverRadius:5,tension:.36,cubicInterpolationMode:'monotone',fill:false,borderRadius:trendType==='bar'?5:0,borderSkipped:false};ds._fmt=capa;datasets.push(ds)} const rr=rateAxisRange(rateVals),cr=capaAxisRange(capaVals); charts['#trend-chart']=new Chart($('#trend-chart'),{type:trendType,data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},animation:{duration:380},plugins:{legend:{display:true,position:'top',align:'end',labels:{color:css('--text'),usePointStyle:true,boxWidth:9,boxHeight:9,padding:16,font:{size:fs,weight:'600'}}},tooltip:{backgroundColor:'#07111f',titleColor:'#fff',bodyColor:'#dbe7f5',padding:12,displayColors:true,titleFont:{size:fs},bodyFont:{size:fs},callbacks:{label:c=>c.dataset.label+': '+(c.dataset._fmt?c.dataset._fmt(c.raw):c.raw)}}},scales:{x:{grid:{display:false},ticks:{color:css('--muted'),font:{size:fs},maxRotation:0,autoSkip:true,maxTicksLimit:10}},yRate:{display:trendSeries.rate,position:'left',min:rr.min,max:rr.max,grid:{color:css('--line')},title:{display:true,text:'가동률',color:css('--brand'),font:{size:fs,weight:'700'}},ticks:{color:css('--brand'),font:{size:fs},callback:v=>(v*100).toFixed(0)+'%'}},yCapa:{display:trendSeries.capa,position:'right',min:cr.min,max:cr.max,grid:{drawOnChartArea:false},title:{display:true,text:'가동 Capa',color:css('--cyan'),font:{size:fs,weight:'700'}},ticks:{color:css('--cyan'),font:{size:fs},callback:v=>(v/10000).toLocaleString('ko-KR',{maximumFractionDigits:0})+'만'}}}}}); } function activateTab(id){$$('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));setTimeout(()=>Object.values(charts).forEach(c=>c.resize()),20)} $$('.tab-btn').forEach(b=>b.onclick=()=>activateTab(b.dataset.tab)); $('#refresh').onclick=()=>location.reload(); $('#theme').onclick=()=>{document.documentElement.setAttribute('data-theme','dark');try{localStorage.setItem('sm-dash-theme','dark')}catch(e){}}; function renderMeta(){let m=(DATA.generated_at?'마지막 갱신 '+new Date(DATA.generated_at).toLocaleString('ko-KR'):'실시간 DB')+'<br>'+DATA.facility_count+'개 설비 · '+DATA.regions.length+'개 지역';$('#latest').textContent='Latest '+DATA.w_cur;['overview','trend','regions','changes','history'].forEach(x=>{const el=$('#'+x+'-meta');if(el)el.innerHTML=m})} function renderKpis(){let n=DATA.national,cur=n.at(-1),prev=n.at(-2)||cur,rd=cur.avg_rate-prev.avg_rate,cd=cur.online_capa-prev.online_capa,rc=DATA.changes.filter(x=>x.rate_changed).length;let rows=[['National operating rate',pct(cur.avg_rate),pp(rd),'전주 '+pct(prev.avg_rate),cls(rd)],['Operating capacity',capa(cur.online_capa),signedCapa(cd),'전주 '+capa(prev.online_capa),cls(cd)],['Installed capacity',capa(DATA.total_capa_latest),DATA.facility_count+'개 설비',DATA.regions.length+'개 지역','flat'],['Weekly movers',DATA.changes.length+'개','가동률 '+rc+'개','상태만 '+(DATA.changes.length-rc)+'개','flat']];$('#kpis').innerHTML=rows.map(r=>`<div class="card kpi"><div class="kpi-label">${r[0]}</div><div class="kpi-value tabnums">${r[1]}</div><div class="kpi-foot"><span class="${r[4]}">${r[2]}</span><span>${r[3]}</span></div></div>`).join('')} function renderOverview(){
  let n=DATA.national.slice(-12),v=n.map(x=>x.avg_rate),avg=v.reduce((a,b)=>a+b,0)/v.length;
  $('#mini').innerHTML=[['현재',pct(v.at(-1))],['12W 평균',pct(avg)],['12W 최고',pct(Math.max(...v))],['12W 최저',pct(Math.min(...v))]].map(x=>`<div class="mini-stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  let sm=DATA.status_mix,total=Object.values(sm).reduce((a,b)=>a+b,0),defs=[['good','정상 가동','--green'],['warning','저부하·감산','--amber'],['serious','정기보수','--orange'],['critical','가동 중단','--red']],start=0,parts=[];
  defs.forEach(d=>{let share=(sm[d[0]]||0)/total*100;parts.push(`${css(d[2])} ${start}% ${start+share}%`);start+=share});
  $('#ring').style.background=`conic-gradient(${parts.join(',')})`;$('#ring-total').textContent=capa(total);
  $('#status-list').innerHTML=defs.map(d=>{let val=sm[d[0]]||0;return `<div class="status-row"><span class="dot" style="background:${css(d[2])}"></span><span>${d[1]} <small>${capa(val)}</small></span><b>${pct(val/total)}</b></div>`}).join('');
  const regionDelta={};
  DATA.changes.forEach(c=>{if(c.rate_prev==null||c.rate_cur==null)return;const r=DATA.regions.find(x=>x.region===c.region);if(!r||!r.capa)return;regionDelta[c.region]=(regionDelta[c.region]||0)+(Number(c.capa)||0)*(Number(c.rate_cur)-Number(c.rate_prev))/r.capa;});
  $('#regions-quick').innerHTML=DATA.regions.slice(0,8).map(r=>{const d=regionDelta[r.region]||0,prev=r.rate-d;return `<div class="region-row"><div class="region-name">${esc(r.region)}</div><div class="track"><div class="fill" style="width:${Math.max(1,r.rate*100)}%"></div></div><div class="region-val"><b>${pct(prev)} → ${pct(r.rate)}</b><small class="${cls(d)}">${pp(d)}</small></div></div>`}).join('');
  const movers=[...DATA.changes].map(c=>({...c,impact:(Number(c.capa)||0)*((Number(c.rate_cur)||0)-(Number(c.rate_prev)||0))})).filter(c=>Math.abs(c.impact)>1).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)).slice(0,7);
  $('#changes-quick').innerHTML=movers.length?movers.map(c=>`<div class="change-item"><div><div class="change-name">${esc(c.company)}</div><div class="change-meta">${esc(c.region)} · ${capa(c.capa)}</div><div class="change-status">${pct(c.rate_prev)} → ${pct(c.rate_cur)} · ${esc(c.status_cur||'')}</div></div><div class="change-value ${cls(c.impact)}">${signedCapa(c.impact)}</div></div>`).join(''):'<div class="empty">이번 주 가동 Capa 변동 없음</div>';
} function renderTrendStats(){ const rows=selectedRows(),rv=rows.map(r=>r.avg_rate),cv=rows.map(r=>r.online_capa),rLast=rv.at(-1),cLast=cv.at(-1); $('#trend-title').textContent='National operating rate & capacity'; const visible=[];if(trendSeries.rate)visible.push('가동률(좌축)');if(trendSeries.capa)visible.push('가동 Capa(우축)'); $('#trend-sub').textContent=(visible.join(' + ')||'지표 선택')+' · 선택기간 자동 확대'; $('#trend-stats').innerHTML=[['현재 가동률',pct(rLast)],['기간 가동률 범위',pct(Math.min(...rv))+' ~ '+pct(Math.max(...rv))],['현재 가동 Capa',capa(cLast)],['기간 Capa 범위',capa(Math.min(...cv))+' ~ '+capa(Math.max(...cv))]].map(x=>`<div class="mini-stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join(''); const periodLabel=trendPeriod==='all'?'전체':trendPeriod+'W';$('#trend-period-note').textContent=periodLabel+' · '+rows.length+'개 관측주'; } function renderRegions(){let regs=DATA.regions.map(r=>({...r,online:r.capa*r.rate})),hi=[...regs].sort((a,b)=>b.rate-a.rate)[0],lo=[...regs].sort((a,b)=>a.rate-b.rate)[0],big=[...regs].sort((a,b)=>b.capa-a.capa)[0];$('#region-summary').innerHTML=[['Highest operating rate',hi.region,pct(hi.rate)],['Largest capacity',big.region,capa(big.capa)],['Lowest operating rate',lo.region,pct(lo.rate)]].map(x=>`<div class="card kpi"><div class="kpi-label">${x[0]}</div><div class="kpi-value region-kpi-name">${esc(x[1])}</div><div class="kpi-foot"><span class="flat">${x[2]}</span></div></div>`).join('');renderRegionTable()} function renderRegionTable(){let sort=$('#region-sort').value,regs=DATA.regions.map(r=>({...r,online:r.capa*r.rate})).sort((a,b)=>b[sort]-a[sort]);$('#region-body').innerHTML=regs.map((r,i)=>`<tr><td><span class="rank">${i+1}</span>${esc(r.region)}</td><td>${r.count}</td><td>${capa(r.capa)}</td><td><span class="chip">${pct(r.rate)}</span></td><td>${capa(r.online)}</td></tr>`).join('')} $('#region-sort').onchange=renderRegionTable; function weeklyRows(){
  if(!DETAIL||!Array.isArray(DETAIL.rows)) return [];
  return DETAIL.rows.map(r=>{const pr=Number(r.rate_prev)||0,cr=Number(r.rate_cur)||0,c=Number(r.capa)||0;return {...r,pr,cr,delta:cr-pr,prevOnline:c*pr,curOnline:c*cr,impact:c*(cr-pr),statusChanged:(r.status_prev||'')!==(r.status_cur||'')};});
}
function weeklyMatch(r){
  if(weeklyRegion!=='all'&&r.region_ko!==weeklyRegion)return false;
  if(weeklySearch){const q=weeklySearch.toLowerCase();if(!(`${r.company_en} ${r.company_cn} ${r.region_ko}`.toLowerCase().includes(q)))return false;}
  if(weeklyFilter==='all')return true;
  if(weeklyFilter==='changed')return Math.abs(r.delta)>.0005||r.statusChanged;
  if(weeklyFilter==='up')return r.delta>.0005;
  if(weeklyFilter==='down')return r.delta<-.0005;
  if(weeklyFilter==='stop')return r.pr>.0005&&r.cr<=.0005;
  if(weeklyFilter==='restart')return r.pr<=.0005&&r.cr>.0005;
  return true;
}
function setupWeeklyControls(rows){
  const sel=$('#facility-region');
  if(sel&&sel.options.length===1){[...new Set(rows.map(r=>r.region_ko))].sort((a,b)=>a.localeCompare(b,'ko')).forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;sel.appendChild(o);});}
}
function renderChanges(){
  const base=weeklyRows();
  if(!base.length){
    $('#weekly-detail-kpis').innerHTML='<div class="card kpi"><div class="kpi-label">상세 비교 데이터</div><div class="kpi-value">연결 대기</div><div class="kpi-foot"><span>facilities.json 확인 필요</span></div></div>';
    $('#weekly-body').innerHTML='<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--muted)">68개 상세 비교 데이터를 불러오지 못했습니다.</td></tr>';return;
  }
  setupWeeklyControls(base);
  $('#weekly-prev-head').textContent='전주 '+(DETAIL.w_prev||DATA.w_prev);
  $('#weekly-cur-head').textContent='금주 '+(DETAIL.w_cur||DATA.w_cur);
  const changed=base.filter(r=>Math.abs(r.delta)>.0005||r.statusChanged).length,up=base.filter(r=>r.delta>.0005).length,down=base.filter(r=>r.delta<-.0005).length,net=base.reduce((a,r)=>a+r.impact,0);
  const k=[['전체 설비',base.length+'개','전주 '+(DETAIL.w_prev||DATA.w_prev)+' → 금주 '+(DETAIL.w_cur||DATA.w_cur),'flat'],['변동 설비',changed+'개','가동률·상태 변경','flat'],['가동 상승 / 하락',up+' / '+down+'개','전주 대비','flat'],['가동 Capa 순증감',signedCapa(net),pp((DATA.national.at(-1).avg_rate-DATA.national.at(-2).avg_rate)),'전국 '+pct(DATA.national.at(-1).avg_rate),cls(net)]];
  $('#weekly-detail-kpis').innerHTML=k.map(x=>`<div class="card kpi"><div class="kpi-label">${x[0]}</div><div class="kpi-value tabnums">${x[1]}</div><div class="kpi-foot"><span class="${x[3]}">${x[2]}</span></div></div>`).join('');
  const arr=base.filter(weeklyMatch).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)||Math.abs(b.delta)-Math.abs(a.delta)||b.capa-a.capa);
  $('#weekly-filter-sub').textContent=`전체 ${base.length}개 중 ${arr.length}개 표시 · 가동 Capa 영향도 큰 순`;
  $('#weekly-foot').textContent=`기준: ${DETAIL.prev_date||DETAIL.w_prev} → ${DETAIL.cur_date||DETAIL.w_cur} · 가동 Capa = 명목 Capa × 가동률`;
  $('#weekly-body').innerHTML=arr.length?arr.map(r=>{
    const factor=(r.status_prev||'')===(r.status_cur||'')?esc(r.status_cur||'—'):`<span class="from">${esc(r.status_prev||'—')}</span><span class="arrow">→</span>${esc(r.status_cur||'—')}`;
    return `<tr>
      <td class="weekly-company" data-label="업체"><b>${esc(r.company_en)}</b><small>${esc(r.company_cn)}</small></td>
      <td class="weekly-region" data-label="지역">${esc(r.region_ko)}</td>
      <td data-label="Capa">${capa(r.capa)}</td>
      <td data-label="전주 ${esc(DETAIL.w_prev||DATA.w_prev)}">${pct(r.pr)}</td>
      <td data-label="금주 ${esc(DETAIL.w_cur||DATA.w_cur)}"><b>${pct(r.cr)}</b></td>
      <td data-label="가동률 Δ"><span class="weekly-delta ${cls(r.delta)}">${pp(r.delta)}</span></td>
      <td data-label="전주 가동 Capa">${capa(r.prevOnline)}</td>
      <td data-label="금주 가동 Capa">${capa(r.curOnline)}</td>
      <td data-label="가동 Capa Δ"><span class="weekly-delta ${cls(r.impact)}">${signedCapa(r.impact)}</span></td>
      <td class="weekly-factor" data-label="요인 / 상태">${factor}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--muted)">조건에 해당하는 설비가 없습니다.</td></tr>';
}
$$('#change-filter .seg').forEach(b=>b.onclick=()=>{$$('#change-filter .seg').forEach(x=>x.classList.remove('active'));b.classList.add('active');weeklyFilter=b.dataset.filter;renderChanges()});
if($('#facility-region'))$('#facility-region').onchange=e=>{weeklyRegion=e.target.value;renderChanges()};
if($('#facility-search'))$('#facility-search').oninput=e=>{weeklySearch=e.target.value.trim();renderChanges()};

function historyPlantRows(){
  if(!HISTORY||!Array.isArray(HISTORY.plants)||!HISTORY.weeks?.length)return [];
  const wi=Math.max(0,HISTORY.weeks.indexOf(historyWeek||HISTORY.weeks.at(-1)));
  return HISTORY.plants.map(p=>{
    const cur=p.history[wi]||{},prev=wi>0?(p.history[wi-1]||{}):{};
    const cr=cur.rate==null?null:Number(cur.rate),pr=prev.rate==null?null:Number(prev.rate);
    const cc=cur.capa==null?0:Number(cur.capa),pc=prev.capa==null?0:Number(prev.capa);
    const curOnline=cr==null?0:cc*cr,prevOnline=pr==null?0:pc*pr;
    const delta=(cr==null||pr==null)?null:cr-pr;
    const impact=curOnline-prevOnline;
    const changed=wi>0&&(Math.abs((delta||0))>.0005||cc!==pc||String(cur.status_cn||'')!==String(prev.status_cn||''));
    return {...p,wi,cur,prev,cr,pr,cc,pc,curOnline,prevOnline,delta,impact,changed};
  });
}
function setupHistoryControls(){
  if(!HISTORY||!HISTORY.weeks?.length)return;
  const week=$('#history-week');
  if(week&&week.options.length===0){
    [...HISTORY.weeks].reverse().forEach(w=>{const o=document.createElement('option');o.value=w;o.textContent=w;week.appendChild(o)});
  }
  if(!historyWeek)historyWeek=HISTORY.weeks.at(-1);
  if(week)week.value=historyWeek;
  const reg=$('#history-region');
  if(reg&&reg.options.length===1){
    [...new Set(HISTORY.plants.map(p=>p.region_ko))].sort((a,b)=>a.localeCompare(b,'ko')).forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;reg.appendChild(o)});
  }
}
function historyMatch(r){
  if(historyRegion!=='all'&&r.region_ko!==historyRegion)return false;
  if(historySearch){
    const q=historySearch.toLowerCase();
    if(!(`${r.company_en} ${r.company_cn} ${r.region_ko}`.toLowerCase().includes(q)))return false;
  }
  if(historyFilter==='all')return true;
  if(historyFilter==='changed')return r.changed;
  if(historyFilter==='up')return r.delta!=null&&r.delta>.0005;
  if(historyFilter==='down')return r.delta!=null&&r.delta<-.0005;
  if(historyFilter==='stop')return r.pr!=null&&r.pr>.0005&&r.cr!=null&&r.cr<=.0005;
  if(historyFilter==='restart')return r.pr!=null&&r.pr<=.0005&&r.cr!=null&&r.cr>.0005;
  return true;
}
function renderHistoryPlantChart(){
  if(!HISTORY||!HISTORY.plants?.length)return;
  let p=HISTORY.plants.find(x=>x.id===historyPlantId);
  if(!p){
    const rows=historyPlantRows().sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
    p=rows[0]||HISTORY.plants[0];
    historyPlantId=p?.id||'';
  }
  if(!p)return;
  const vals=p.history.map(x=>x.rate),valid=vals.filter(v=>v!=null),rr=rateAxisRange(valid);
  const sub=$('#history-plant-sub');
  if(sub)sub.textContent=`${p.company_en} · ${p.region_ko} · 전체 ${HISTORY.weeks.length}주`;
  lineChart('#history-plant-chart',HISTORY.weeks.map(shortWeek),vals,'가동률',pct,css('--brand'),rr.min,rr.max);
}
function renderHistory(){
  if(!HISTORY){
    $('#history-kpis').innerHTML='<div class="card kpi"><div class="kpi-label">History</div><div class="kpi-value">연결 대기</div></div>';
    return;
  }
  setupHistoryControls();
  const wi=Math.max(0,HISTORY.weeks.indexOf(historyWeek)),sum=HISTORY.summaries[wi],prevSum=wi>0?HISTORY.summaries[wi-1]:null;
  const rd=prevSum?sum.avg_rate-prevSum.avg_rate:null,cd=prevSum?sum.online_capa-prevSum.online_capa:null;
  const k=[
    ['전국 가동률',pct(sum.avg_rate),prevSum?pp(rd):'첫 관측주',prevSum?'전주 '+pct(prevSum.avg_rate):HISTORY.weeks[wi],rd==null?'flat':cls(rd)],
    ['가동 Capa',capa(sum.online_capa),prevSum?signedCapa(cd):'—','총 Capa '+capa(sum.total_capa),cd==null?'flat':cls(cd)],
    ['가동 중단 설비',sum.stopped+'개','68개 설비 기준',historyWeek,'flat'],
    ['저부하 설비',sum.low+'개','0% 초과 · 80% 미만',historyWeek,'flat']
  ];
  $('#history-kpis').innerHTML=k.map(r=>`<div class="card kpi"><div class="kpi-label">${r[0]}</div><div class="kpi-value tabnums">${r[1]}</div><div class="kpi-foot"><span class="${r[4]}">${r[2]}</span><span>${r[3]}</span></div></div>`).join('');
  const rows=historyPlantRows(),filtered=rows.filter(historyMatch).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)||Math.abs(b.delta||0)-Math.abs(a.delta||0)||b.cc-a.cc);
  $('#history-prev-head').textContent=wi>0?'전주 '+shortWeek(HISTORY.weeks[wi-1]):'전주 없음';
  $('#history-cur-head').textContent='선택주 '+shortWeek(historyWeek);
  $('#history-table-sub').textContent=`${historyWeek} · 전체 68개 중 ${filtered.length}개 표시 · 직전 주차 자동 비교`;
  $('#history-body').innerHTML=filtered.length?filtered.map(r=>{
    const d=r.delta==null?'—':pp(r.delta),curRate=r.cr==null?'—':pct(r.cr),prevRate=r.pr==null?'—':pct(r.pr);
    const status=r.cur.status_cn||'';
    return `<tr data-plant-id="${esc(r.id)}" class="${r.id===historyPlantId?'selected':''}">
      <td class="weekly-company" data-label="업체"><b>${esc(r.company_en)}</b><small>${esc(r.company_cn)}</small></td>
      <td class="weekly-region" data-label="지역">${esc(r.region_ko)}</td>
      <td data-label="Capa">${capa(r.cc)}</td>
      <td data-label="전주">${prevRate}</td>
      <td data-label="선택주"><b>${curRate}</b></td>
      <td data-label="가동률 Δ"><span class="weekly-delta ${r.delta==null?'flat':cls(r.delta)}">${d}</span></td>
      <td data-label="선택주 가동 Capa">${capa(r.curOnline)}</td>
      <td class="history-status" data-label="상태 / 요인"><span class="kr">${esc(statusKo(status))}</span><span class="cn">${esc(status||'사유 미기재')}</span></td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--muted)">조건에 해당하는 설비가 없습니다.</td></tr>';
  $$('#history-body tr[data-plant-id]').forEach(tr=>tr.onclick=()=>{historyPlantId=tr.dataset.plantId;renderHistory();});
  const movers=rows.filter(r=>wi>0&&Math.abs(r.impact)>1).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)).slice(0,7);
  $('#history-movers-sub').textContent=wi>0?`${shortWeek(HISTORY.weeks[wi-1])} → ${shortWeek(historyWeek)} · 가동 Capa 영향`:'첫 관측주';
  $('#history-movers').innerHTML=movers.length?movers.map(r=>`<div class="change-item"><div><div class="change-name">${esc(r.company_en)}</div><div class="change-meta">${esc(r.region_ko)} · ${pct(r.pr)} → ${pct(r.cr)}</div><div class="change-status">${esc(statusKo(r.cur.status_cn))} · ${esc(r.cur.status_cn||'사유 미기재')}</div></div><div class="change-value ${cls(r.impact)}">${signedCapa(r.impact)}</div></div>`).join(''):'<div class="empty">직전 비교 주차가 없습니다.</div>';
  renderHistoryPlantChart();
}
if($('#history-week'))$('#history-week').onchange=e=>{historyWeek=e.target.value;renderHistory()};
if($('#history-region'))$('#history-region').onchange=e=>{historyRegion=e.target.value;renderHistory()};
if($('#history-search'))$('#history-search').oninput=e=>{historySearch=e.target.value.trim();renderHistory()};
$$('#history-filter .seg').forEach(b=>b.onclick=()=>{$$('#history-filter .seg').forEach(x=>x.classList.remove('active'));b.classList.add('active');historyFilter=b.dataset.filter;renderHistory()});

$$('#trend-series .seg').forEach(b=>b.onclick=()=>{const key=b.dataset.series;const other=key==='rate'?'capa':'rate';if(trendSeries[key]&& !trendSeries[other])return;trendSeries[key]=!trendSeries[key];b.classList.toggle('active',trendSeries[key]);b.setAttribute('aria-pressed',String(trendSeries[key]));renderTrendStats();renderCharts()}); $$('#chart-type .seg').forEach(b=>b.onclick=()=>{$$('#chart-type .seg').forEach(x=>x.classList.remove('active'));b.classList.add('active');trendType=b.dataset.type;renderCharts()}); $$('#period .seg').forEach(b=>b.onclick=()=>{$$('#period .seg').forEach(x=>x.classList.remove('active'));b.classList.add('active');trendPeriod=b.dataset.period;renderTrendStats();renderCharts()}); function renderCharts(){ if(!DATA)return; let n=DATA.national.slice(-12); lineChart('#overview-chart',n.map(x=>x.week),n.map(x=>x.avg_rate),'가동률',pct,css('--brand'),0,1); renderTrendChart(); const rd=regionalDeltas();signedHorizontalBar('#regional-delta-chart',rd.length?rd:[{region:'변동 없음',delta:0}]); let rows=selectedRows(),d=rows.map((x,i)=>i?x.avg_rate-rows[i-1].avg_rate:0),maxAbs=Math.max(.005,...d.map(v=>Math.abs(v)))*1.2; destroy('#delta-chart');let opt=baseChartOpts(v=>(v*100).toFixed(1)+'%p');opt.scales.y.min=-maxAbs;opt.scales.y.max=maxAbs;opt.plugins.tooltip.callbacks.label=c=>'전주 대비 '+pp(c.raw);let ds={label:'주간 변화',data:d,backgroundColor:d.map(v=>v>=0?css('--up'):css('--down')),borderRadius:6,borderSkipped:false};ds._fmt=pp;charts['#delta-chart']=new Chart($('#delta-chart'),{type:'bar',data:{labels:rows.map(x=>x.week),datasets:[ds]},options:opt}); let regs=DATA.regions.map(r=>({...r,online:r.capa*r.rate}));let rr=[...regs].sort((a,b)=>b.rate-a.rate);barChart('#region-rate-chart',rr.map(x=>x.region),rr.map(x=>x.rate),'가동률',pct,css('--brand'),true);let rc=[...regs].sort((a,b)=>b.capa-a.capa);barChart('#region-capa-chart',rc.map(x=>x.region),rc.map(x=>x.online),'가동 Capa',capa,css('--cyan'),true); } function renderAll(){renderMeta();renderKpis();renderOverview();renderTrendStats();renderRegions();renderChanges();renderHistory();renderCharts();$('#loading').style.display='none'} window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(DATA)renderCharts()},180)}); Promise.all([
  fetch(DATA_URL+'?_='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
  fetch('facilities.json?_='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch('history.json?_='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
]).then(([d,detail,history])=>{
  if(d.error)throw Error(d.error);
  d.regions=(d.regions||[]).map(r=>({...r,region:regionKo(r.region)}));
  d.changes=(d.changes||[]).map(c=>({...c,region:regionKo(c.region)}));
  DATA=d;DETAIL=detail;HISTORY=history;
  if(HISTORY?.weeks?.length)historyWeek=HISTORY.weeks.at(-1);
  renderAll();
}).catch(e=>{$('#loading').style.display='none';let b=$('#banner');b.textContent='데이터 연결 실패: '+e.message;b.classList.add('show')}); })();