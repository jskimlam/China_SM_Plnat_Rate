(function(){
  'use strict';

  var $=function(s){return document.querySelector(s)};
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var pct=function(v){return v==null?'—':(Number(v)*100).toFixed(1)+'%'};
  var pp=function(v){return v==null?'—':(Number(v)>=0?'+':'')+(Number(v)*100).toFixed(1)+'%p'};
  var capa=function(v){return v==null?'—':(Number(v)/10000).toLocaleString('ko-KR',{maximumFractionDigits:1})+'만톤'};
  var signedCapa=function(v){return (Number(v)>=0?'+':'')+capa(Number(v))};
  var cls=function(v){return Number(v)>.0005?'up':Number(v)<-.0005?'down':'flat'};
  var shortWeek=function(v){var s=String(v||'');return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(5).replace('-','/'):s};
  var ctx=function(){return typeof window.__SM_REPORT_CONTEXT__==='function'?window.__SM_REPORT_CONTEXT__():null};

  function toast(msg,ok){
    var t=document.getElementById('report-toast');
    if(!t){t=document.createElement('div');t.id='report-toast';t.className='report-toast';document.body.appendChild(t)}
    t.textContent=msg;t.classList.toggle('error',ok===false);t.classList.add('show');
    clearTimeout(t._timer);t._timer=setTimeout(function(){t.classList.remove('show')},2800);
  }

  function reportDate(data,detail,history){
    return String((detail&&detail.cur_date)||(history&&history.weeks&&history.weeks[history.weeks.length-1])||data.w_cur||'latest');
  }

  function lineSvg(rows){
    if(!rows||!rows.length)return '';
    var W=690,H=265,pl=54,pr=18,pt=24,pb=40;
    var vals=rows.map(function(r){return Number(r.avg_rate)*100}).filter(Number.isFinite);
    var lo=Math.max(0,Math.floor((Math.min.apply(null,vals)-3)/5)*5);
    var hi=Math.min(100,Math.ceil((Math.max.apply(null,vals)+3)/5)*5);
    if(hi-lo<10){hi=Math.min(100,lo+10);if(hi-lo<10)lo=Math.max(0,hi-10)}
    var x=function(i){return pl+(W-pl-pr)*(rows.length===1?0:i/(rows.length-1))};
    var y=function(v){return pt+(H-pt-pb)*(hi-v)/(hi-lo||1)};
    var out=[];
    for(var j=0;j<=4;j++){
      var v=lo+(hi-lo)*j/4,yy=y(v);
      out.push('<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e2e8f0" stroke-width="1"/>');
      out.push('<text x="'+(pl-9)+'" y="'+(yy+4)+'" text-anchor="end" font-size="13" fill="#64748b">'+v.toFixed(0)+'%</text>');
    }
    var points=rows.map(function(r,i){return x(i).toFixed(1)+','+y(Number(r.avg_rate)*100).toFixed(1)}).join(' ');
    out.push('<polyline points="'+points+'" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>');
    rows.forEach(function(r,i){
      out.push('<circle cx="'+x(i)+'" cy="'+y(Number(r.avg_rate)*100)+'" r="'+(i===rows.length-1?5:3.3)+'" fill="#fff" stroke="#2563eb" stroke-width="3"/>');
      if(i%2===0||i===rows.length-1)out.push('<text x="'+x(i)+'" y="'+(H-13)+'" text-anchor="middle" font-size="12" fill="#64748b">'+esc(shortWeek(r.week))+'</text>');
    });
    var last=rows[rows.length-1],lx=x(rows.length-1),ly=y(Number(last.avg_rate)*100),rx=Math.max(pl,lx-55),ry=Math.max(5,ly-39);
    out.push('<rect x="'+rx+'" y="'+ry+'" width="74" height="27" rx="8" fill="#0f172a"/>');
    out.push('<text x="'+(rx+37)+'" y="'+(ry+18)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">'+pct(last.avg_rate)+'</text>');
    return '<svg class="report-line-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="최근 12주 전국 가동률 추이">'+out.join('')+'</svg>';
  }

  function regionRows(data){
    var delta={};
    (data.changes||[]).forEach(function(c){
      if(c.rate_prev==null||c.rate_cur==null)return;
      var r=(data.regions||[]).find(function(x){return x.region===c.region});
      if(!r||!r.capa)return;
      delta[c.region]=(delta[c.region]||0)+(Number(c.capa)||0)*(Number(c.rate_cur)-Number(c.rate_prev))/Number(r.capa);
    });
    return (data.regions||[]).slice().sort(function(a,b){return Number(b.capa)-Number(a.capa)}).slice(0,8).map(function(r){
      return {region:r.region,rate:Number(r.rate)||0,delta:delta[r.region]||0,capa:Number(r.capa)||0};
    });
  }

  function contributors(data){
    var total=Number(data.total_capa_latest)||1;
    var all=(data.changes||[]).filter(function(c){return c.rate_prev!=null&&c.rate_cur!=null}).map(function(c){
      var d=Number(c.rate_cur)-Number(c.rate_prev),impact=(Number(c.capa)||0)*d;
      var o={};for(var k in c)o[k]=c[k];o.d=d;o.impact=impact;o.npp=impact/total;return o;
    }).filter(function(c){return Math.abs(c.d)>.0005}).sort(function(a,b){return Math.abs(b.impact)-Math.abs(a.impact)});
    return {all:all,ups:all.filter(function(x){return x.impact>0}),downs:all.filter(function(x){return x.impact<0}),total:total};
  }

  function driverRows(arr,kind){
    if(!arr.length)return '<div class="rr-none">해당 기여 설비 없음</div>';
    return arr.slice(0,5).map(function(c){
      return '<div class="rr-driver">'+
        '<div class="rr-driver-top"><b>'+esc(c.company)+'</b><strong class="'+kind+'">'+signedCapa(c.impact)+'</strong></div>'+
        '<div class="rr-driver-meta">'+esc(c.region)+' · Capa '+capa(c.capa)+' · '+pct(c.rate_prev)+' → '+pct(c.rate_cur)+' <span class="'+kind+'">'+pp(c.d)+'</span> · 전국 '+pp(c.npp)+'</div>'+
        '<div class="rr-driver-status">'+esc((c.status_prev&&c.status_cur&&String(c.status_prev)!==String(c.status_cur))?(c.status_prev+' → '+c.status_cur):(c.status_cur||c.status_prev||'상태 기재 없음'))+'</div>'+
      '</div>';
    }).join('');
  }

  function buildSheet(data,detail,history){
    var national=(data.national||[]).slice(-12),cur=national[national.length-1],prev=national[national.length-2]||cur;
    var rd=Number(cur.avg_rate)-Number(prev.avg_rate),cd=Number(cur.online_capa)-Number(prev.online_capa);
    var sm=data.status_mix||{},statusTotal=Object.keys(sm).reduce(function(a,k){return a+(Number(sm[k])||0)},0)||1;
    var defs=[['good','정상 가동','#16a34a'],['warning','저부하·감산','#d97706'],['serious','정기보수','#ea580c'],['critical','가동 중단','#dc2626']];
    var regs=regionRows(data),con=contributors(data);
    var upImpact=con.ups.reduce(function(a,x){return a+x.impact},0),downImpact=con.downs.reduce(function(a,x){return a+x.impact},0);
    var source=window.__SM_DATA_SOURCE__==='snapshot'?'Saved snapshot / ICIS weekly parsing':'Internal DB / ICIS weekly parsing';
    var made=new Date().toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    var statusHtml=defs.map(function(d){
      var v=Number(sm[d[0]])||0,share=v/statusTotal;
      return '<div class="rr-status-row"><div class="rr-status-label"><span style="background:'+d[2]+'"></span><b>'+d[1]+'</b><em>'+pct(share)+'</em></div><div class="rr-status-track"><i style="width:'+Math.max(1,share*100)+'%;background:'+d[2]+'"></i></div><small>'+capa(v)+'</small></div>';
    }).join('');
    var regionHtml=regs.map(function(r){
      return '<div class="rr-region"><div><b>'+esc(r.region)+'</b><small>'+capa(r.capa)+'</small></div><div class="rr-region-rate"><strong>'+pct(r.rate)+'</strong><span class="'+cls(r.delta)+'">'+pp(r.delta)+'</span></div><div class="rr-region-track"><i style="width:'+Math.max(1,r.rate*100)+'%"></i></div></div>';
    }).join('');

    var sheet=document.createElement('div');
    sheet.className='a4-report-sheet';
    sheet.innerHTML=
      '<div class="rr-topbar"></div>'+
      '<header class="rr-header"><div><div class="rr-eyebrow">WEEKLY OPERATING SUMMARY</div><h1>China SM Operating Rate Intelligence</h1><p>Styrene Plant Operations, Capacity & Regional Analytics</p></div><div class="rr-date"><span>기준 주차</span><b>'+esc(reportDate(data,detail,history))+'</b><small>Generated '+esc(made)+'</small></div></header>'+
      '<section class="rr-kpis">'+
        '<div><span>전국 평균 가동률</span><b>'+pct(cur.avg_rate)+'</b><small class="'+cls(rd)+'">'+pp(rd)+' WoW</small></div>'+
        '<div><span>가동 Capa</span><b>'+capa(cur.online_capa)+'</b><small class="'+cls(cd)+'">'+signedCapa(cd)+' WoW</small></div>'+
        '<div><span>총 설치 Capa</span><b>'+capa(data.total_capa_latest)+'</b><small>'+(data.facility_count||68)+'개 설비</small></div>'+
        '<div><span>변동 설비</span><b>'+con.all.length+'개</b><small>상승 '+con.ups.length+' · 하락 '+con.downs.length+'</small></div>'+
      '</section>'+
      '<section class="rr-grid rr-main">'+
        '<article class="rr-box rr-trend"><div class="rr-sec-head"><div><h2>전국 가동률 추이</h2><p>최근 12개 관측주 · Capa 가중 평균</p></div><b>'+pct(cur.avg_rate)+'</b></div>'+lineSvg(national)+'</article>'+
        '<article class="rr-box rr-status"><div class="rr-sec-head"><div><h2>Operating status mix</h2><p>최신주 · 설비 Capa 기준</p></div></div><div class="rr-status-total"><b>'+capa(statusTotal)+'</b><span>총 설비 Capa</span></div><div class="rr-status-list">'+statusHtml+'</div></article>'+
      '</section>'+
      '<section class="rr-box rr-regions"><div class="rr-sec-head"><div><h2>지역별 가동 현황</h2><p>Capa 상위 8개 지역 · 전주 대비 가동률 변화</p></div></div><div class="rr-region-grid">'+regionHtml+'</div></section>'+
      '<section class="rr-box rr-drivers"><div class="rr-sec-head"><div><h2>이번 주 가동률 변동 주요 기여 설비</h2><p>가동 Capa 영향 기준 · 각 방향 최대 5개 표시</p></div><div class="rr-driver-net"><span class="up">상승 '+signedCapa(upImpact)+' · '+pp(upImpact/con.total)+'</span><span class="down">하락 '+signedCapa(downImpact)+' · '+pp(downImpact/con.total)+'</span></div></div>'+
        '<div class="rr-driver-cols"><div><h3 class="up">상승 기여 · '+con.ups.length+'개</h3>'+driverRows(con.ups,'up')+'</div><div><h3 class="down">하락 기여 · '+con.downs.length+'개</h3>'+driverRows(con.downs,'down')+'</div></div>'+
      '</section>'+
      '<footer class="rr-footer"><div><b>Source</b> '+esc(source)+'</div><div>Operating Capa = Nameplate Capa × Operating Rate · Capa unit: tons/year</div></footer>';
    return sheet;
  }

  // Render in an independent 1240px viewport. Android WebView otherwise autosizes
  // the text against the narrow phone viewport before html2canvas clones the DOM.
  async function createReportFrame(sheet){
    var frame=document.createElement('iframe');
    frame.title='A4 report print viewport';
    frame.setAttribute('aria-hidden','true');
    frame.setAttribute('tabindex','-1');
    frame.style.cssText='position:fixed;left:-16000px;top:0;width:1240px;height:1754px;border:0;z-index:-1;pointer-events:none;';
    var html='<!doctype html><html lang="ko"><head>'+
      '<meta charset="utf-8">'+
      '<meta name="viewport" content="width=1240,initial-scale=1,minimum-scale=1">'+
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap">'+
      '<link rel="stylesheet" href="large-ui.css?v=20261010a5">'+
      '<style>html,body{width:1240px;height:1754px;margin:0;padding:0;overflow:hidden;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}'+
      '.a4-report-sheet{position:relative!important;left:0!important;top:0!important;z-index:auto!important;'+
      'margin:0!important;transform:none!important;max-width:none!important}'+
      '</style></head><body></body></html>';
    var done=new Promise(function(resolve,reject){
      var timer=setTimeout(function(){reject(new Error('A4 렌더러 로딩 시간 초과'))},15000);
      frame.onload=function(){clearTimeout(timer);resolve()};
      frame.onerror=function(){clearTimeout(timer);reject(new Error('A4 렌더러 로딩 오류'))};
    });
    frame.srcdoc=html;
    document.body.appendChild(frame);
    try{
      await done;
      var doc=frame.contentDocument;
      if(!doc||!doc.body)throw new Error('A4 렌더링 문서 접근 실패');
      doc.body.appendChild(sheet);
      // Abort rather than exporting an unreadable image if the print stylesheet did not load.
      var kpi=sheet.querySelector('.rr-kpis>div');
      if(!kpi||doc.defaultView.getComputedStyle(kpi).display!=='flex'){
        throw new Error('A4 전용 스타일 로딩 실패');
      }
      if(doc.fonts&&doc.fonts.ready)await doc.fonts.ready;
      await new Promise(function(resolve){
        frame.contentWindow.requestAnimationFrame(function(){
          frame.contentWindow.requestAnimationFrame(resolve);
        });
      });
      return frame;
    }catch(e){
      frame.remove();
      throw e;
    }
  }

  function checkReportFit(sheet){
    var reasons=[];
    var within=function(container,target,name,margin){
      if(!container||!target){reasons.push(name+' 요소 없음');return}
      var a=container.getBoundingClientRect(),b=target.getBoundingClientRect();
      if(b.bottom>a.bottom-(margin||0)+2||b.right>a.right+3||b.left<a.left-3){
        reasons.push(name+' 영역 초과');
      }
    };
    var head=sheet.querySelector('.rr-header'),title=sheet.querySelector('.rr-header h1'),date=sheet.querySelector('.rr-date');
    if(head&&title&&date){
      if(title.getBoundingClientRect().right>date.getBoundingClientRect().left-10){
        reasons.push('제목/기준일 겹침');
      }
      within(head,title,'제목',0);
    }
    sheet.querySelectorAll('.rr-kpis>div').forEach(function(card,i){
      within(card,card.querySelector('small'),'KPI '+(i+1),6);
      within(card,card.querySelector('b'),'KPI 수치 '+(i+1),0);
    });
    var status=sheet.querySelector('.rr-status'),statusLast=sheet.querySelector('.rr-status-row:last-child');
    within(status,statusLast,'운영상태',10);
    var region=sheet.querySelector('.rr-regions'),grid=sheet.querySelector('.rr-region-grid');
    within(region,grid,'지역별 현황',10);
    var drivers=sheet.querySelector('.rr-drivers');
    sheet.querySelectorAll('.rr-driver-cols>div').forEach(function(col,i){
      var last=col.lastElementChild;
      if(last&&last.classList.contains('rr-driver'))within(drivers,last,'설비 변동 '+(i+1),10);
    });
    var foot=sheet.querySelector('.rr-footer');
    within(sheet,foot,'출처',1);
    return reasons;
  }

  async function save(){
    var c=ctx();
    if(!c||!c.DATA)return toast('데이터 로딩 후 다시 시도해 주세요.',false);
    if(typeof window.html2canvas!=='function')return toast('이미지 생성 모듈을 불러오지 못했습니다.',false);
    var btn=$('#report-image'),old=btn?btn.innerHTML:'',sheet=null,frame=null;
    if(btn){btn.disabled=true;btn.innerHTML='생성 중…'}
    try{
      sheet=buildSheet(c.DATA,c.DETAIL,c.HISTORY);
      frame=await createReportFrame(sheet);
      // A4 title must stay in one line; tighten font only when it truly overflows.
      var title=sheet.querySelector('.rr-header h1');
      if(title&&title.scrollWidth>title.clientWidth+1){
        var size=Number.parseFloat(frame.contentWindow.getComputedStyle(title).fontSize);
        title.style.fontSize=Math.max(30,Math.floor(size*title.clientWidth/title.scrollWidth-1))+'px';
      }
      var problems=checkReportFit(sheet);
      if(problems.length){
        sheet.classList.add('rr-tight');
        await new Promise(function(resolve){frame.contentWindow.requestAnimationFrame(resolve)});
        problems=checkReportFit(sheet);
      }
      if(problems.length){
        sheet.classList.add('rr-compact');
        await new Promise(function(resolve){frame.contentWindow.requestAnimationFrame(resolve)});
        problems=checkReportFit(sheet);
      }
      if(problems.length){
        console.warn('A4 layout exceeded after compact fit:',problems);
        throw new Error('A4 영역 초과: '+problems.join(', '));
      }
      var canvas=await window.html2canvas(sheet,{
        backgroundColor:'#ffffff',scale:1,useCORS:true,logging:false,
        width:1240,height:1754,windowWidth:1240,windowHeight:1754,
        scrollX:0,scrollY:0
      });
      if(canvas.width!==1240||canvas.height!==1754)throw new Error('A4 이미지 크기 오류');
      var week=reportDate(c.DATA,c.DETAIL,c.HISTORY).replace(/[^\dA-Za-z가-힣_-]+/g,'-');
      var fileName='China_SM_Overview_Report_'+week+'.png';
      if(window.AndroidReport&&typeof window.AndroidReport.savePng==='function'){
        var dataUrl=canvas.toDataURL('image/png');
        window.AndroidReport.savePng(dataUrl,fileName);
        toast('APK 저장 요청 완료 · 사진 앱에서 확인하세요.',true);
      }else{
        var blob=await new Promise(function(resolve,reject){
          canvas.toBlob(function(b){b?resolve(b):reject(new Error('PNG 변환 실패'))},'image/png');
        });
        var url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=fileName;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
        setTimeout(function(){URL.revokeObjectURL(url)},30000);
        toast('A4 보고서 이미지가 생성되었습니다.',true);
      }
    }catch(e){
      console.error(e);toast('보고서 이미지 생성 실패: '+(e&&e.message?e.message:e),false);
    }finally{
      if(frame)frame.remove();
      else if(sheet)sheet.remove();
      if(btn){btn.disabled=false;btn.innerHTML=old}
    }
  }

  var btn=$('#report-image');
  if(btn)btn.addEventListener('click',save);
})();