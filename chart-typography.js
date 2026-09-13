(function(){
  if(!window.Chart) return;
  const NativeChart = window.Chart;
  function factor(){
    const w = window.innerWidth || 1200;
    if(w >= 1800) return 1.58;
    if(w >= 1500) return 1.48;
    if(w >= 1200) return 1.38;
    if(w >= 900) return 1.28;
    return 1.12;
  }
  function scaleFont(font,f){
    if(!font) return;
    if(typeof font.size === 'number') font.size = Math.round(font.size*f);
  }
  function scaleConfig(cfg){
    if(!cfg || !cfg.options) return cfg;
    const f = factor();
    const o = cfg.options;
    if(o.plugins){
      if(o.plugins.legend && o.plugins.legend.labels){
        scaleFont(o.plugins.legend.labels.font,f);
        if(typeof o.plugins.legend.labels.padding === 'number') o.plugins.legend.labels.padding = Math.round(o.plugins.legend.labels.padding*1.15);
      }
      if(o.plugins.tooltip){
        scaleFont(o.plugins.tooltip.titleFont,f);
        scaleFont(o.plugins.tooltip.bodyFont,f);
        if(typeof o.plugins.tooltip.padding === 'number') o.plugins.tooltip.padding = Math.round(o.plugins.tooltip.padding*1.15);
      }
    }
    if(o.scales){
      Object.keys(o.scales).forEach(function(k){
        const s=o.scales[k];
        if(!s) return;
        if(s.ticks) scaleFont(s.ticks.font,f);
        if(s.title) scaleFont(s.title.font,f);
      });
    }
    return cfg;
  }
  const WrappedChart = new Proxy(NativeChart,{
    construct(target,args,newTarget){
      if(args && args[1]) scaleConfig(args[1]);
      return Reflect.construct(target,args,target);
    },
    get(target,prop,receiver){return Reflect.get(target,prop,receiver);},
    set(target,prop,value,receiver){return Reflect.set(target,prop,value,receiver);}
  });
  window.Chart = WrappedChart;
  try{
    NativeChart.defaults.font.size = Math.round((NativeChart.defaults.font.size||12)*factor());
  }catch(e){}
})();