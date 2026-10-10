/* China SM Intelligence · deterministic A4 canvas export v20261010b1.
   Native Canvas2D: independent of mobile CSS, viewport and html2canvas text metrics. */
(function(){
  'use strict';
  var SIZE={w:1240,h:1754};
  var C={navy:'#10284a',ink:'#132847',muted:'#60748f',pale:'#f5f8fd',line:'#dce5f2',blue:'#2862ed',cyan:'#2db6ee',red:'#d62737',green:'#139b55',amber:'#de8b06',orange:'#eb6715'};
  var REGIONS={Jilin:'지린',Heilongjiang:'헤이룽장',Liaoning:'랴오닝',Gansu:'간쑤',Xinjiang:'신장',Ningxia:'닝샤',Shaanxi:'산시',Tianjin:'톈진',Hebei:'허베이',Shandong:'산둥',Anhui:'안후이',Shanghai:'상하이',Zhejiang:'저장',Jiangsu:'장쑤',Hubei:'후베이',Hunan:'후난',Fujian:'푸젠',Guangdong:'광둥',Guangxi:'광시',Hainan:'하이난'};
  var getContext=function(){return typeof window.__SM_REPORT_CONTEXT__==='function'?window.__SM_REPORT_CONTEXT__():null};
  var comma=function(n,d){return Number(n).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d})};
  var rate=function(n){return n==null?'—':(100*Number(n)).toFixed(1)+'%'};
  var diff=function(n){return n==null?'—':(n>0?'+':'')+(100*Number(n)).toFixed(1)+'%p'};
  var capacity=function(n){return n==null?'—':comma(Number(n)/10000,1)+'만톤'};
  var capImpact=function(n){return (n>0?'+':'')+capacity(n)};
  var signedColor=function(n){return n>0.000001?C.red:n<-.000001?C.blue:C.muted};
  var safe=function(n){return Number.isFinite(Number(n))?Number(n):0};
  var currDate=function(d,details,h){var s=String((details&&details.cur_date)||(h&&h.weeks&&h.weeks[h.weeks.length-1])||d.w_cur||'');return /^\d\d\/\d\d$/.test(s)?String(new Date().getFullYear())+'-'+s.replace('/','-'):s};

  function round(ctx,x,y,w,h,r,fill,stroke){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.lineWidth=1.3;ctx.strokeStyle=stroke;ctx.stroke()}
  }
  function font(ctx,size,weight){ctx.font=(weight||'500')+' '+size+'px "Noto Sans KR", "IBM Plex Sans KR", "Malgun Gothic", Arial, sans-serif'}
  function text(ctx,s,x,y,maxW,size,weight,color,align,minSize){
    s=String(s==null?'':s);size=size||17;ctx.textBaseline='alphabetic';ctx.textAlign=align||'left';
    font(ctx,size,weight);if(maxW&&ctx.measureText(s).width>maxW){while(size>(minSize||size-3)&&ctx.measureText(s).width>maxW){size-=1;font(ctx,size,weight)}
      if(ctx.measureText(s).width>maxW){while(s.length>2&&ctx.measureText(s+'…').width>maxW)s=s.slice(0,-1);s+='…'} }
    ctx.fillStyle=color||C.ink;ctx.fillText(s,x,y);return size;
  }
  function line(ctx,x1,y1,x2,y2,color,width){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color||C.line;ctx.lineWidth=width||1;ctx.stroke()}
  function card(ctx,x,y,w,h){round(ctx,x,y,w,h,13,'#fff',C.line)}
  function heading(ctx,title,sub,x,y){text(ctx,title,x,y,950,26,'800',C.navy);if(sub)text(ctx,sub,x,y+27,950,16,'500',C.muted)}
  function dots(ctx,x,y,w,h,r,ratio,color){round(ctx,x,y,w,h,h/2,'#e8eef8');if(ratio>0)round(ctx,x,y,Math.max(2,w*Math.min(1,ratio)),h,h/2,color)}
  function ellipsis(ctx,label,x,y,w,size,color,weight){text(ctx,label,x,y,w,size,weight||'700',color||C.ink,'left',size-2)}
  function toast(message,ok){var el=document.getElementById('report-toast');if(!el){el=document.createElement('div');el.id='report-toast';el.className='report-toast';document.body.appendChild(el)}el.textContent=message;el.classList.toggle('error',ok===false);el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(function(){el.classList.remove('show')},4000)}
  function dateLabel(v){if(/^\d{4}-\d\d-\d\d$/.test(v))return v.slice(5).replace('-','/');return String(v||'')}

  function drawTrend(ctx,rows){
    var x=92,y=515,w=633,h=265;var vals=rows.map(function(a){return safe(a.avg_rate)*100});if(!vals.length)return;
    var min=Math.max(0,Math.floor((Math.min.apply(null,vals)-3)/5)*5),max=Math.min(100,Math.ceil((Math.max.apply(null,vals)+3)/5)*5);
    if(max-min<15){max=Math.min(100,min+15);min=Math.max(0,max-15)}
    for(var j=0;j<=4;j++){var v=min+(max-min)*j/4;var yy=y+h-(v-min)/(max-min)*h;line(ctx,x,yy,x+w,yy,'#e2e9f4',1);text(ctx,Math.round(v)+'%',x-13,yy+6,50,15,'500',C.muted,'right')}
    var points=rows.map(function(r,i){return {x:x+(rows.length===1?0:i/(rows.length-1)*w),y:y+h-(safe(r.avg_rate)*100-min)/(max-min)*h}});
    ctx.strokeStyle=C.blue;ctx.lineWidth=4.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach(function(p,i){if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)});ctx.stroke();
    points.forEach(function(p,i){ctx.beginPath();ctx.arc(p.x,p.y,i===points.length-1?5.5:4,0,2*Math.PI);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=2.7;ctx.strokeStyle=C.blue;ctx.stroke();if(i%2===0||i===points.length-1)text(ctx,dateLabel(rows[i].week),p.x,818,52,14,'500',C.muted,'center')});
    var last=points[points.length-1],r=rate(rows[rows.length-1].avg_rate),bx=Math.min(x+w-81,last.x-35),by=Math.max(y+2,last.y-49);
    round(ctx,bx,by,81,32,7,C.navy);text(ctx,r,bx+40.5,by+23,76,18,'800','#fff','center');
  }
  function calcRegions(d){var deltas={};(d.changes||[]).forEach(function(c){var rp=safe(c.rate_prev),rc=safe(c.rate_cur);deltas[c.region]=(deltas[c.region]||0)+safe(c.capa)*(rc-rp)});
    return(d.regions||[]).slice().sort(function(a,b){return safe(b.capa)-safe(a.capa)}).slice(0,8).map(function(r){return {label:REGIONS[r.region]||r.region,capa:safe(r.capa),rate:safe(r.rate),delta:r.capa?safe(deltas[r.region])/safe(r.capa):0}})}
  function getMovers(d){var total=safe(d.total_capa_latest)||1;var all=(d.changes||[]).map(function(c){return Object.assign({},c,{impact:safe(c.capa)*(safe(c.rate_cur)-safe(c.rate_prev)),delta:safe(c.rate_cur)-safe(c.rate_prev)})}).filter(function(c){return Math.abs(c.delta)>0.0005});return {up:all.filter(function(c){return c.impact>0}).sort(function(a,b){return b.impact-a.impact}),down:all.filter(function(c){return c.impact<0}).sort(function(a,b){return a.impact-b.impact}),total:total}}

  function drawMoversColumn(ctx,list,x,y,w,h,up){
    var accent=up?C.red:C.blue,title=(up?'상승':'하락')+' 기여 · '+list.length+'개';
    text(ctx,title,x,y+24,w,20,'800',accent);line(ctx,x,y+35,x+w,y+35,accent,2);
    var shown=list.slice(0,5);if(!shown.length){text(ctx,'해당 기여 설비 없음',x+6,y+110,w-12,18,'500',C.muted);return}
    var available=h-47,rowH=Math.min(133,Math.floor(available/shown.length));
    shown.forEach(function(c,i){
      var ry=y+42+i*rowH;var company=String(c.company||'-');
      var info=(REGIONS[c.region]||c.region||'')+' · Capa '+capacity(c.capa)+' · '+rate(c.rate_prev)+' → '+rate(c.rate_cur)+' ('+diff(c.delta)+')';
      text(ctx,company,x+4,ry+21,w-166,18,'800',C.ink,'left',16);text(ctx,capImpact(c.impact),x+w-4,ry+21,150,17,'800',accent,'right',15);
      text(ctx,info,x+4,ry+46,w-12,15,'500',C.muted,'left',14);
      var note=(c.status_prev&&c.status_cur&&c.status_prev!==c.status_cur)?String(c.status_prev)+' → '+String(c.status_cur):String(c.status_cur||c.status_prev||'');
      if(rowH>=85)text(ctx,note,x+4,ry+70,w-12,14,'500',C.muted,'left',13);
      if(i<shown.length-1)line(ctx,x+4,ry+rowH-3,x+w-4,ry+rowH-3,C.line,1);
    });
  }

  function draw(data,detail,history){
    if(!data||!Array.isArray(data.national)||!data.national.length)throw new Error('가동률 데이터가 없습니다.');
    var cvs=document.createElement('canvas');cvs.width=SIZE.w;cvs.height=SIZE.h;var g=cvs.getContext('2d');if(!g)throw new Error('Canvas2D 초기화 실패');
    g.fillStyle='#fff';g.fillRect(0,0,SIZE.w,SIZE.h);
    g.fillStyle=C.navy;g.fillRect(0,0,768,12);g.fillStyle=C.blue;g.fillRect(768,0,271,12);g.fillStyle=C.cyan;g.fillRect(1039,0,201,12);
    var dates=currDate(data,detail,history),nat=data.national,cur=nat[nat.length-1],prev=nat[nat.length-2]||cur;
    // Header: all text constrained to distinct, non-overlapping rectangular zones.
    text(g,'WEEKLY OPERATING SUMMARY',50,51,680,19,'800',C.blue);
    text(g,'China SM Operating Rate',50,112,825,48,'800',C.navy,'left',45);
    text(g,'중국 스티렌 설비 가동률 · 주간 수급 모니터링',50,150,790,19,'500',C.muted);
    text(g,'기준 주차',1190,65,248,17,'800',C.muted,'right');
    text(g,dates,1190,111,270,33,'800',C.navy,'right');
    text(g,'68 PLANTS  /  20 REGIONS',1190,150,270,14,'700',C.muted,'right');
    line(g,50,171,1190,171,C.line,2);

    // KPI cards: large figures, fixed internal baselines (no line-height reflow).
    var kpis=[['전국 평균 가동률',rate(cur.avg_rate),diff(safe(cur.avg_rate)-safe(prev.avg_rate))+'  전주 대비',signedColor(safe(cur.avg_rate)-safe(prev.avg_rate))],
      ['가동 Capa',capacity(cur.online_capa),capImpact(safe(cur.online_capa)-safe(prev.online_capa))+'  전주 대비',signedColor(safe(cur.online_capa)-safe(prev.online_capa))],
      ['총 설치 Capa',capacity(data.total_capa_latest),String(data.facility_count||68)+'개 설비',C.muted],
      ['변동 설비',(data.changes||[]).length+'개','가동률 '+(data.changes||[]).filter(function(c){return c.rate_changed}).length+' · 상태 '+(data.changes||[]).filter(function(c){return !c.rate_changed}).length,C.muted]];
    kpis.forEach(function(k,i){var x=50+i*289,y=190;round(g,x,y,273,149,12,C.pale,C.line);g.fillStyle=C.blue;g.fillRect(x+1,y+1,271,5);text(g,k[0],x+17,y+38,244,19,'700',C.muted);text(g,k[1],x+17,y+93,245,36,'800',C.navy,'left',30);text(g,k[2],x+17,y+124,244,16,'700',k[3],'left',14)});

    // National history chart and status mix.
    card(g,50,356,715,496);card(g,780,356,410,496);
    heading(g,'전국 가동률 추이','최근 12개 관측주 · Capa 가중 평균',77,403);text(g,rate(cur.avg_rate),736,406,160,31,'800',C.blue,'right');
    drawTrend(g,nat.slice(-12));
    heading(g,'Operating status mix','최신주 · 설비 Capa 기준',803,403);
    round(g,804,447,362,91,10,C.pale,C.line);text(g,capacity(data.total_capa_latest),985,493,344,31,'800',C.navy,'center');text(g,'총 설비 Capa',985,518,330,15,'500',C.muted,'center');
    var statuses=[['good','정상 가동',C.green],['warning','저부하·감산',C.amber],['serious','정기보수',C.orange],['critical','가동 중단',C.red]], mix=data.status_mix||{};
    var sum=Object.keys(mix).reduce(function(a,k){return a+safe(mix[k])},0)||1;
    statuses.forEach(function(a,i){var x=805,y=550+i*72,n=safe(mix[a[0]]),share=n/sum;
      g.fillStyle=a[2];g.fillRect(x,y+2,8,9);text(g,a[1],x+19,y+18,195,17,'800',C.ink);text(g,(share*100).toFixed(1)+'%',1165,y+18,110,17,'800',C.ink,'right');
      dots(g,x,y+29,360,9,5,share,a[2]);text(g,capacity(n),x,y+56,345,14,'500',C.muted);
    });

    // Regional 4 x 2 tiles, each clipped to its own designated space.
    card(g,50,866,1140,369);heading(g,'지역별 가동 현황','설비 Capa 상위 8개 지역 · 전주 대비 변화',75,911);
    var regions=calcRegions(data);regions.forEach(function(r,i){var col=i%4,row=Math.floor(i/4),x=75+col*277,y=949+row*134;
      round(g,x,y,263,122,10,C.pale,C.line);
      text(g,r.label,x+14,y+29,126,19,'800',C.ink);text(g,capacity(r.capa),x+248,y+28,112,13,'500',C.muted,'right');
      text(g,rate(r.rate),x+14,y+77,143,30,'800',C.navy);text(g,diff(r.delta),x+249,y+77,100,15,'800',signedColor(r.delta),'right');
      dots(g,x+14,y+94,233,10,5,r.rate,C.blue);
    });

    // Movers: dynamic row heights, largest possible font within five rows per column.
    card(g,50,1249,1140,426);
    heading(g,'이번 주 가동률 변동 주요 기여 설비','가동 Capa 증감 기준 · 방향별 최대 5개',75,1295);
    var movers=getMovers(data),ui=movers.up.reduce(function(a,c){return a+c.impact},0),di=movers.down.reduce(function(a,c){return a+c.impact},0);
    text(g,'상승 '+capImpact(ui)+' · '+diff(ui/movers.total),1165,1289,350,17,'800',C.red,'right');
    text(g,'하락 '+capImpact(di)+' · '+diff(di/movers.total),1165,1314,350,17,'800',C.blue,'right');
    drawMoversColumn(g,movers.up,75,1334,518,318,true);drawMoversColumn(g,movers.down,611,1334,554,318,false);

    // A4 footer.
    line(g,50,1693,1190,1693,C.line,2);
    text(g,'Source  ICIS Styrene China weekly / '+(window.__SM_DATA_SOURCE__==='snapshot'?'Saved snapshot':'Internal DB'),50,1721,670,14,'500',C.muted);
    text(g,'Operating Capa = Nameplate Capa × Operating Rate',1190,1721,540,14,'500',C.muted,'right');
    return cvs;
  }

  async function save(){
    var context=getContext();if(!context||!context.DATA)return toast('데이터 로딩 후 다시 시도해 주세요.',false);
    var button=document.getElementById('report-image'),label=button?button.textContent:'';
    if(button){button.disabled=true;button.textContent='A4 생성 중…'}
    try{
      if(document.fonts&&document.fonts.load){try{await document.fonts.load('700 18px "Noto Sans KR"');await document.fonts.ready}catch(_){} }
      var canvas=draw(context.DATA,context.DETAIL,context.HISTORY);
      var file='China_SM_Overview_Report_'+currDate(context.DATA,context.DETAIL,context.HISTORY).replace(/[^0-9A-Za-z_-]/g,'-')+'.png';
      if(window.AndroidReport&&typeof window.AndroidReport.savePng==='function'){
        window.AndroidReport.savePng(canvas.toDataURL('image/png'),file);toast('A4 이미지 저장 요청 완료 · 사진 앱에서 확인하세요.',true);
      }else{
        var blob=await new Promise(function(resolve,reject){canvas.toBlob(function(b){b?resolve(b):reject(new Error('PNG 변환 실패'))},'image/png')});
        var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},30000);toast('A4 보고서 이미지가 생성되었습니다.',true)
      }
    }catch(e){console.error('SM A4 export',e);toast('A4 저장 실패: '+(e&&e.message?e.message:String(e)),false)}
    finally{if(button){button.disabled=false;button.textContent=label}}
  }
  window.__SM_CANVAS_REPORT__={draw:draw,calcRegions:calcRegions,getMovers:getMovers};
  var button=document.getElementById('report-image');if(button)button.addEventListener('click',save);
})();