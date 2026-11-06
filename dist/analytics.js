(function(){
  'use strict';
  const config=window.KERNING_CONFIG;if(!config?.analytics||location.protocol==='file:')return;
  let lastDay='',busy=false;
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow'}).format(new Date());
  async function visit(){
    if(busy||lastDay===day())return;busy=true;
    try{
      const sessionResponse=await fetch(config.api+'?action=session',{credentials:'same-origin'});
      if(!sessionResponse.ok)return;const session=await sessionResponse.json();
      const result=await fetch(config.api+'?action=visit',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:'{}'});
      if(result.ok)lastDay=day();
    }catch{/* A reporting outage never interrupts practice or local saving. */}
    finally{busy=false;}
  }
  visit();window.addEventListener('online',visit);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)visit();});
  setInterval(()=>{if(!document.hidden)visit();},60000);
})();
