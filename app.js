const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const defaultCalls = [
  {id:1,code:'10-90',title:'Braquage',location:'Vinewood Blvd',priority:'high',details:'Signalement d’un braquage en cours.',assigned:'A-08'},
  {id:2,code:'10-70',title:'Poursuite',location:'Downtown',priority:'medium',details:'Véhicule refusant le contrôle.',assigned:'A-01'},
  {id:3,code:'10-80',title:'Suspicion',location:'Mirror Park',priority:'normal',details:'Activité suspecte signalée.',assigned:''}
];
const defaultCases = [
  {id:'FIB-024',name:'Opération Nightfall',type:'Crime organisé',lead:'A-01',status:'En cours',clearance:'Sensible'},
  {id:'FIB-019',name:'Affaire V-24',type:'Corruption',lead:'A-12',status:'En cours',clearance:'Interne'},
  {id:'FIB-011',name:'Code Red',type:'Terrorisme',lead:'S-01',status:'Classifié',clearance:'Classifié'}
];
const units = [
  ['A-01','Downtown','En service'],['A-08','Vinewood','En écoute'],['A-12','Mission Row','En route'],
  ['H-01','Aérien','En vol'],['S-01','QG','Surveillance'],['T-01','Paleto Bay','Standby']
];

function load(key, fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
function save(key,val){localStorage.setItem(key,JSON.stringify(val))}
let selectedCall = null;

function renderDispatch(){
  const callsBox=$('#calls'); if(!callsBox) return;
  let calls=load('fib_calls',defaultCalls);
  callsBox.innerHTML = calls.map(c=>`<div class="incident ${c.priority}" data-id="${c.id}"><strong>${c.code} · ${c.title}</strong><span>${c.location}</span><span>${c.assigned?'Assigné '+c.assigned:'Non assigné'}</span></div>`).join('');
  $('#callCount').textContent=`${calls.length} appel${calls.length>1?'s':''}`;
  $$('.incident').forEach(el=>el.onclick=()=>{selectedCall=Number(el.dataset.id);const c=calls.find(x=>x.id===selectedCall);$('#selectedTitle').textContent=`${c.code} · ${c.title}`;$('#selectedText').textContent=`${c.location} — ${c.details} ${c.assigned?`Unité assignée : ${c.assigned}.`:''}`;});
  const u=$('#units'); if(u) u.innerHTML=units.map(x=>`<div class="unit"><div><strong>${x[0]}</strong><small>${x[1]}</small></div><span class="status ${x[2].includes('route')||x[2].includes('écoute')?'busy':''}">${x[2]}</span></div>`).join('');
}
function dispatchActions(){
  const modal=$('#modal'); if(!modal) return;
  $('#newCall').onclick=()=>modal.style.display='grid';
  $('#cancelCall').onclick=()=>modal.style.display='none';
  $('#saveCall').onclick=()=>{let calls=load('fib_calls',defaultCalls);const title=$('#title').value.trim(),location=$('#location').value.trim();if(!title||!location)return alert('Titre et localisation requis.');calls.unshift({id:Date.now(),code:$('#code').value,title,location,priority:$('#priority').value,details:$('#details').value.trim()||'Aucun détail.',assigned:''});save('fib_calls',calls);fetch('/api/dispatch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(calls[0])}).catch(()=>{});modal.style.display='none';$('#title').value='';$('#location').value='';$('#details').value='';renderDispatch();};
  $('#assignA01').onclick=()=>{if(!selectedCall)return alert('Sélectionne un appel.');let calls=load('fib_calls',defaultCalls);let c=calls.find(x=>x.id===selectedCall);if(c)c.assigned='A-01';save('fib_calls',calls);renderDispatch();};
  $('#closeCall').onclick=()=>{if(!selectedCall)return alert('Sélectionne un appel.');let calls=load('fib_calls',defaultCalls).filter(x=>x.id!==selectedCall);save('fib_calls',calls);selectedCall=null;$('#selectedTitle').textContent='Appel clôturé';$('#selectedText').textContent='L’intervention a été archivée.';renderDispatch();};
  $('#serviceBtn').onclick=e=>{const on=e.target.textContent.includes('En service');e.target.textContent=on?'● Hors service':'● En service';e.target.className='btn '+(on?'danger':'success');};
}
function renderCases(){const rows=$('#caseRows');if(!rows)return;const cases=load('fib_cases',defaultCases);rows.innerHTML=cases.map(c=>`<tr><td>${c.id}</td><td><b>${c.name}</b></td><td>${c.type}</td><td>${c.lead}</td><td><span class="tag ${c.status==='Classifié'?'red':'amber'}">${c.status}</span></td><td>${c.clearance}</td></tr>`).join('');}
function caseActions(){const modal=$('#caseModal');if(!modal)return;$('#newCase').onclick=()=>modal.style.display='grid';$('#cancelCase').onclick=()=>modal.style.display='none';$('#saveCase').onclick=()=>{const name=$('#caseName').value.trim(),lead=$('#caseLead').value.trim();if(!name||!lead)return alert('Nom et responsable requis.');let cases=load('fib_cases',defaultCases);cases.unshift({id:'FIB-'+String(Math.floor(Math.random()*900)+100),name,type:$('#caseType').value,lead,status:'En cours',clearance:$('#caseClearance').value});save('fib_cases',cases);modal.style.display='none';renderCases();};}
function recruitment(){const form=$('#recruitForm');if(!form)return;form.onsubmit=e=>{e.preventDefault();const data={rpName:$('#rpName').value,age:$('#age').value,discord:$('#discord').value,experience:$('#experience').value,motivation:$('#motivation').value,at:new Date().toISOString()};const list=load('fib_recruits',[]);list.unshift(data);save('fib_recruits',list);$('#recruitStatus').innerHTML='<span class="tag green">✓ Candidature enregistrée</span>';form.reset();};}
function agent(){const duty=$('#toggleDuty');if(duty)duty.onclick=()=>{const tag=$('#dutyTag');const on=tag.textContent==='En service';tag.textContent=on?'Hors service':'En service';tag.className='tag '+(on?'red':'green');duty.textContent=on?'● Hors service':'● En service';duty.className='btn '+(on?'danger':'success');};const radio=$('#radioBtn');if(radio)radio.onclick=()=>{const p=$('#radioPanel');p.style.display=p.style.display==='none'?'block':'none'};}
document.addEventListener('DOMContentLoaded',()=>{renderDispatch();dispatchActions();renderCases();caseActions();recruitment();agent();});
