/* PENTALIQ: one shared configuration for every HTML page. Never blocks checkout. */
(function(){
 'use strict';
 if(window.__pentaliqLoading)return;
 var config=window.PENTALIQ_CONFIG;
 if(!config||!config.enabled||!config.siteKey||!config.supabaseUrl||!config.publishableKey)return;
 if(config.dashboardBase!=='https://carloshenriquemartinssena-hub.github.io/PENTALIQ/')return;
 window.__pentaliqLoading=true;
 function load(name,attributes){
  return new Promise(function(resolve,reject){
   var script=document.createElement('script');
   script.src=config.dashboardBase+name;
   script.async=true;
   Object.keys(attributes||{}).forEach(function(key){script.setAttribute(key,attributes[key]);});
   script.onload=resolve;script.onerror=reject;
   document.head.appendChild(script);
  });
 }
 load('tracker.js',{'data-site':config.siteKey,'data-supabase':config.supabaseUrl,'data-anon':config.publishableKey})
  .then(function(){return load('pilot-acai.js');})
  .then(function(){return load('consent.js',{'data-site':config.siteKey});})
  .catch(function(){/* Analytics unavailability must not block navigation or payment. */});
})();
