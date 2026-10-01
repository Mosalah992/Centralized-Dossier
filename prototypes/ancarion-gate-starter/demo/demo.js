import {mountPortraitGate} from '../src/portrait-gate.js';
const host=document.getElementById('gate');
let gate;const urls=new Map();
function render(){
 gate?.destroy();document.getElementById('result').textContent='';
 const clips=Object.fromEntries(['idle','listening','denied','accepted'].map(k=>[k,urls.get(k)]));
 gate=mountPortraitGate(host,{
  portraitUrl:urls.get('portrait'),portraitIncludesFrame:document.getElementById('has-frame').checked,clips,
  async verifyPhrase(phrase,{signal}){
   await new Promise((resolve,reject)=>{const id=setTimeout(resolve,350);signal.addEventListener('abort',()=>{clearTimeout(id);reject(new DOMException('Aborted','AbortError'))},{once:true})});
   const mode=document.getElementById('response-mode').value;
   if(mode==='offline')throw Error('Demo service unavailable');
   if(mode==='limited')return {ok:false,retryAfterSeconds:10};
   // Intentionally public demo only. Never copy this comparison into production auth.
   return {ok:phrase.trim().toLowerCase()==='auri-el'};
  },
  onGranted(){document.getElementById('result').textContent='Demo opened. In your app, navigate or fetch authorized records here.';}
 });
}
for(const key of ['portrait','idle','listening','denied','accepted']){
 document.getElementById(key+'-file').addEventListener('change',event=>{
  gate?.destroy();if(urls.has(key))URL.revokeObjectURL(urls.get(key));
  const file=event.target.files[0];if(file)urls.set(key,URL.createObjectURL(file));else urls.delete(key);render();
 });
}
document.getElementById('replay').addEventListener('click',render);
document.getElementById('has-frame').addEventListener('change',render);
window.addEventListener('pagehide',()=>{gate?.destroy();for(const url of urls.values())URL.revokeObjectURL(url)});
render();
