(function(){
  'use strict';
  var GAS_MARK='script.google.com/macros/s/AKfycbwgn9wMf-aMhkL_9ONO7AFPpOhDqj2ZMHzDHPgpYnzTqcqlTYToxxDCKL1R-tlMdVgU/exec';
  var nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'';
    var method=((init&&init.method)||'GET').toUpperCase();
    var res=await nativeFetch(input,init);
    if(method==='GET' && url.indexOf(GAS_MARK)!==-1){
      try{
        var text=await res.clone().text();
        var trimmed=text.trim();
        if(trimmed.charAt(0)==='<'){
          window.__SM_GAS_FALLBACK__=true;
          var banner=document.getElementById('banner');
          if(banner){
            banner.textContent='실시간 DB 연결이 응답하지 않아 최신 저장 스냅샷으로 표시 중입니다. Google Apps Script 웹앱 배포 URL/공개 권한을 확인하세요.';
            banner.classList.add('show');
          }
          return nativeFetch('snapshot.json?_='+Date.now(),{cache:'no-store'});
        }
      }catch(e){}
    }
    return res;
  };
})();
