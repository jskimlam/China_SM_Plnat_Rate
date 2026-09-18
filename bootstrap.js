(function(){
  'use strict';
  var GAS_MARK='script.google.com/macros/s/AKfycbwgn9wMf-aMhkL_9ONO7AFPpOhDqj2ZMHzDHPgpYnzTqcqlTYToxxDCKL1R-tlMdVgU/exec';
  var nativeFetch=window.fetch.bind(window);

  window.__SM_GAS_FALLBACK__=false;
  window.__SM_DATA_SOURCE__='live';
  window.__SM_DATA_SOURCE_NOTE__='';

  function hideLegacyBanner(){
    var banner=document.getElementById('banner');
    if(banner){
      banner.classList.remove('show');
      banner.textContent='';
    }
  }

  function markSnapshotUi(){
    hideLegacyBanner();
    var patch=function(){
      ['overview-meta','trend-meta','regions-meta','changes-meta'].forEach(function(id){
        var el=document.getElementById(id);
        if(!el || !el.innerHTML) return;
        if(el.innerHTML.indexOf('저장 스냅샷')!==-1) return;
        if(el.innerHTML.indexOf('실시간 DB')!==-1){
          el.innerHTML=el.innerHTML.replace('실시간 DB','저장 스냅샷');
        }else{
          el.innerHTML='저장 스냅샷<br>'+el.innerHTML.replace(/^저장 스냅샷<br>/,'');
        }
      });
      var latest=document.getElementById('latest');
      if(latest && latest.parentElement){
        latest.parentElement.title='현재 저장 스냅샷 데이터 표시 중 · 실시간 DB 연결 복구 시 자동 전환';
      }
    };
    setTimeout(patch,0);
    setTimeout(patch,250);
    setTimeout(patch,900);
  }

  function setLiveUi(){
    hideLegacyBanner();
    window.__SM_GAS_FALLBACK__=false;
    window.__SM_DATA_SOURCE__='live';
    window.__SM_DATA_SOURCE_NOTE__='';
  }

  async function snapshotResponse(reason){
    window.__SM_GAS_FALLBACK__=true;
    window.__SM_DATA_SOURCE__='snapshot';
    window.__SM_DATA_SOURCE_NOTE__=reason||'live DB unavailable';
    markSnapshotUi();
    return nativeFetch('snapshot.json?_='+Date.now(),{cache:'no-store'});
  }

  window.fetch=async function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'';
    var method=((init&&init.method)||'GET').toUpperCase();

    if(method!=='GET' || url.indexOf(GAS_MARK)===-1){
      return nativeFetch(input,init);
    }

    try{
      var res=await nativeFetch(input,init);
      if(!res.ok) return snapshotResponse('HTTP '+res.status);

      var text=await res.clone().text();
      var trimmed=text.trim();
      if(!trimmed || trimmed.charAt(0)==='<'){
        return snapshotResponse('non-JSON response');
      }

      var liveData;
      try{ liveData=JSON.parse(trimmed); }
      catch(e){ return snapshotResponse('invalid JSON response'); }

      try{
        var snapRes=await nativeFetch('snapshot.json?_='+Date.now(),{cache:'no-store'});
        if(snapRes.ok){
          var snapText=await snapRes.clone().text();
          var snapData=JSON.parse(snapText);
          var liveCount=liveData&&liveData.national?liveData.national.length:0;
          var snapCount=snapData&&snapData.national?snapData.national.length:0;
          if(snapCount>liveCount){
            window.__SM_GAS_FALLBACK__=true;
            window.__SM_DATA_SOURCE__='snapshot';
            window.__SM_DATA_SOURCE_NOTE__='snapshot is newer than live DB';
            markSnapshotUi();
            return snapRes;
          }
        }
      }catch(e){}

      setLiveUi();
      return res;
    }catch(err){
      return snapshotResponse(err && err.message ? err.message : 'network error');
    }
  };
})();
