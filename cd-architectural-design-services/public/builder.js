const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const state = {
  step: 0, location: 'province', lotArea: 200, floorArea: 100, storeys: 1,
  style: 'modern', roof: 'gable', structure: 'concrete',
  rooms: new Set(['living','kitchen','bedroom','bathroom','laundry','parking']),
  household: '3-4', finish: 'balanced', windows: 'standard', outdoor: 'basic'
};
const styleNames = {modern:'Modern',tropical:'Tropical',minimal:'Minimal',classic:'Classic'};
const roofNames = {gable:'Gable roof',hip:'Hip roof',flat:'Flat / low-slope roof'};
const structureNames = {concrete:'Reinforced concrete + masonry',mixed:'Mixed concrete and lightweight systems',light:'Lightweight / steel-framed concept'};
const finishNames = {essential:'Essential',balanced:'Balanced',premium:'Premium'};
const roomNames = {living:'Living room',kitchen:'Kitchen & dining',bedroom:'Bedrooms',bathroom:'Bathrooms',laundry:'Laundry / utility',parking:'Carport / parking',office:'Home office',guest:'Guest room',family:'Family / flex room',balcony:'Balcony / terrace',storage:'Extra storage',garden:'Garden / courtyard'};
const roomAllowances = {living:1,kitchen:1.5,bedroom:1,bathroom:1.5,laundry:.5,parking:1,office:.8,guest:1,family:1,balcony:.8,storage:.4,garden:1};
const locationFactors = {province:1,metro:1.15,cebu:1.08,davao:1.04,'la-union':1.02,other:1.06};
const finishFactors = {essential:.86,balanced:1,premium:1.28};
const styleFactors = {modern:1,tropical:1.04,minimal:.97,classic:1.08};
const locationNames = {province:'Provincial area, Philippines',metro:'Metro Manila',cebu:'Cebu / Central Visayas',davao:'Davao Region','la-union':'La Union / Ilocos Region',other:'Other location in the Philippines'};
const money = n => '₱' + Math.round(n).toLocaleString('en-PH');
const shortMoney = n => n >= 1_000_000 ? '₱' + (n/1_000_000).toFixed(2).replace(/0$/,'').replace(/\.0$/,'') + 'M' : money(n);
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
function estimate(){
  // Editable demonstration assumptions only, not researched or verified market pricing.
  const lowRate=25000, highRate=45000;
  const loc=locationFactors[state.location]||1.06;
  const finish=finishFactors[state.finish]||1;
  const style=styleFactors[state.style]||1;
  const structureFactor={concrete:1,mixed:.96,light:.92}[state.structure]||1;
  const storeyFactor={1:1,2:1.07,3:1.15}[state.storeys]||1;
  const windowFactor={standard:1,large:1.045,mixed:1.025}[state.windows]||1;
  const roofFactor={gable:1,hip:1.025,flat:1.04}[state.roof]||1;
  const selectedRoomUnits=[...state.rooms].reduce((sum,key)=>sum+(roomAllowances[key]||0),0);
  const baseRoomUnits=6.5;
  const roomFactor=clamp(1+(selectedRoomUnits-baseRoomUnits)*.012,.94,1.15);
  const outdoorExtra={basic:0,garden:Math.max(50000,state.floorArea*700),deck:Math.max(120000,state.floorArea*1800)}[state.outdoor]||0;
  const complexity=loc*finish*style*structureFactor*storeyFactor*windowFactor*roofFactor*roomFactor;
  const low=state.floorArea*lowRate*complexity+outdoorExtra;
  const high=state.floorArea*highRate*complexity+outdoorExtra*1.45;
  return {low,high,mid:(low+high)/2,loc,finish,style,structureFactor,storeyFactor,windowFactor,roofFactor,roomFactor,outdoorExtra,lowRate,highRate};
}
function syncFromInputs(){
  state.location=$('#location').value;
  state.lotArea=clamp(Number($('#lot-area').value)||200,60,10000);
  state.floorArea=clamp(Number($('#floor-area').value)||100,25,2000);
  state.storeys=Number($('#storeys').value)||1;
  state.roof=$('#roof').value;
  state.structure=$('#structure').value;
  state.household=$('#household').value;
  state.windows=$('#windows').value;
  state.outdoor=$('#outdoor').value;
  state.finish=$('input[name="finish"]:checked')?.value||'balanced';
}
function update(){
  syncFromInputs();
  const cost=estimate();
  const range=shortMoney(cost.low)+'–'+shortMoney(cost.high);
  $('#step-counter').textContent=String(state.step+1).padStart(2,'0')+' / 05';
  $('#step-kicker').textContent=['STEP 01 · THE SITE','STEP 02 · CHARACTER','STEP 03 · YOUR ROOMS','STEP 04 · FINISHES','STEP 05 · YOUR ESTIMATE'][state.step];
  $('#progress-fill').style.width=((state.step+1)/5*100)+'%';
  $('#progress-label').textContent=(state.step+1)+' of 5';
  $('#back-button').disabled=state.step===0;
  $('#next-button').innerHTML=state.step===4?'Finish concept <span aria-hidden="true">✓</span>':'Next step <span aria-hidden="true">→</span>';
  $$('.step-item').forEach((el,i)=>{el.classList.toggle('active',i===state.step);el.classList.toggle('complete',i<state.step);if(i===state.step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
  $$('.builder-step').forEach((el,i)=>{const active=i===state.step;el.hidden=!active;el.classList.toggle('active',active)});
  $('#estimate-number').textContent=range;
  $('#estimate-meter-fill').style.width=clamp((cost.mid/Math.max(1,state.floorArea*45000*1.6))*100,12,100)+'%';
  $('#preview-style').textContent=styleNames[state.style]+' home';
  $('#preview-size').textContent=state.floorArea+' m² · '+state.storeys+' '+(state.storeys===1?'storey':'storeys');
  $('#house-preview').dataset.style=state.style;
  $('#house-preview').dataset.roof=state.roof;
  $('#house-preview').dataset.storeys=state.storeys;
  $('#summary-style').textContent=styleNames[state.style];
  $('#summary-area').textContent=state.floorArea+' m²';
  $('#summary-storeys').textContent=state.storeys;
  $('#summary-rooms').textContent=state.rooms.size+' selected';
  $('#summary-finish').textContent=finishNames[state.finish];
  $('#room-count').textContent=state.rooms.size;
  $('#review-range').textContent=range;
  $('#review-mid').textContent='Working midpoint: '+shortMoney(cost.mid);
  $('#saved-status').textContent='Updated just now · this session only';
  renderReview(cost);
}
function renderReview(cost){
  const items=[
    ['Location',locationNames[state.location]],['Lot area',state.lotArea+' m²'],['Floor area',state.floorArea+' m²'],
    ['Storeys',String(state.storeys)],['Style',styleNames[state.style]],['Roof',roofNames[state.roof]],
    ['Structure',structureNames[state.structure]],['Finish level',finishNames[state.finish]],
    ['Spaces selected',[...state.rooms].map(r=>roomNames[r]).join(', ')||'No rooms selected'],['Household',state.household+' people']
  ];
  $('#review-grid').innerHTML=items.map(([label,value])=>'<div class="review-item"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(value)+'</strong></div>').join('');
  const rows=[
    ['Floor area × base allowance',money(state.floorArea*cost.lowRate)+' – '+money(state.floorArea*cost.highRate)],
    ['Location adjustment',Math.round((cost.loc-1)*100)+'%'],
    ['Style adjustment',Math.round((cost.style-1)*100)+'%'],
    ['Finish allowance',Math.round((cost.finish-1)*100)+'%'],
    ['Structure / storey / opening / room factors','Applied to the base range'],
    ['Outdoor works allowance',cost.outdoorExtra?money(cost.outdoorExtra)+' – '+money(cost.outdoorExtra*1.45):'Basic allowance only']
  ];
  $('#breakdown-rows').innerHTML=rows.map(([label,value])=>'<div class="breakdown-row"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(value)+'</strong></div>').join('');
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function gotoStep(index){
  state.step=clamp(index,0,4);
  update();
  $('.work-area').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
function conceptText(){
  const cost=estimate();
  return [
    'C + D ARCHITECTURAL DESIGN SERVICES',
    'HOME BUILDER — CONCEPT SUMMARY',
    '',
    'This is an early concept and budget guide, not a final plan, quotation, or guarantee.',
    '',
    'LOCATION: '+locationNames[state.location],
    'LOT AREA: '+state.lotArea+' m²',
    'TARGET FLOOR AREA: '+state.floorArea+' m²',
    'STOREYS: '+state.storeys,
    'STYLE: '+styleNames[state.style],
    'ROOF: '+roofNames[state.roof],
    'STRUCTURE DIRECTION: '+structureNames[state.structure],
    'FINISH LEVEL: '+finishNames[state.finish],
    'WINDOWS: '+$('#windows option:checked').textContent,
    'OUTDOOR SCOPE: '+$('#outdoor option:checked').textContent,
    'HOUSEHOLD: '+state.household+' people',
    'SPACES: '+([...state.rooms].map(r=>roomNames[r]).join(', ')||'Not selected'),
    '',
    'ILLUSTRATIVE CONSTRUCTION RANGE: '+shortMoney(cost.low)+'–'+shortMoney(cost.high),
    'WORKING MIDPOINT: '+shortMoney(cost.mid),
    '',
    'ESTIMATE ASSUMPTIONS:',
    'Base allowance: ₱25,000–₱45,000 per m². This is an unverified demonstration assumption and must be calibrated by C + D against current local contractor and supplier prices.',
    'The range uses simple location, finish, style, structure, storey, window, roof and room-complexity multipliers.',
    'The concept estimate may exclude land, permits, taxes, professional fees, financing, utility connection fees, demolition, retaining walls, unusual foundations, and other site-specific costs.',
    'Before relying on the estimate, C + D must review site conditions, the actual brief, code requirements, engineering, material specifications, a bill of quantities and current contractor pricing.',
    '',
    'Prepared in the C + D online home builder. No client name or contact information was collected in this tool.'
  ].join('\n');
}
$$('[data-style]').forEach(button=>button.addEventListener('click',()=>{
  if(!button.dataset.style||button.tagName!=='BUTTON')return;
  state.style=button.dataset.style;
  $$('[data-style].visual-option').forEach(el=>{const selected=el===button;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected))});
  update();
}));
$$('[data-room]').forEach(button=>button.addEventListener('click',()=>{
  const room=button.dataset.room;
  if(state.rooms.has(room))state.rooms.delete(room);else state.rooms.add(room);
  const selected=state.rooms.has(room);
  button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
  $('.room-toggle',button).textContent=selected?'✓':'+';
  update();
}));
$$('[data-go-step]').forEach(button=>button.addEventListener('click',()=>gotoStep(Number(button.dataset.goStep))));
['location','lot-area','floor-area','storeys','roof','structure','household','windows','outdoor'].forEach(id=>{
  $('#'+id).addEventListener('input',()=>{if(id==='floor-area'||id==='lot-area'){const input=$('#'+id);const min=Number(input.min),max=Number(input.max);if(input.value!==''&&Number(input.value)<min)input.value=min;if(Number(input.value)>max)input.value=max}update()});
  $('#'+id).addEventListener('change',update);
});
$$('input[name="finish"]').forEach(input=>input.addEventListener('change',()=>{
  $$('.finish-option').forEach(label=>label.classList.toggle('selected',label.contains(input)&&input.checked));
  update();
}));
$('#back-button').addEventListener('click',()=>gotoStep(state.step-1));
$('#next-button').addEventListener('click',()=>{
  if(state.step<4)gotoStep(state.step+1);
  else{
    const data=encodeURIComponent(conceptText());
    const link=document.createElement('a');
    link.href='data:text/plain;charset=utf-8,'+data;
    link.download='cd-home-concept-summary.txt';
    link.click();
  }
});
$('#reset-rooms').addEventListener('click',()=>{
  state.rooms=new Set(['living','kitchen','bedroom','bathroom','laundry','parking']);
  $$('[data-room]').forEach(button=>{const selected=state.rooms.has(button.dataset.room);button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));$('.room-toggle',button).textContent=selected?'✓':'+'});
  update();
});
$('#edit-choices').addEventListener('click',()=>gotoStep(0));
$('#view-estimate').addEventListener('click',event=>{event.preventDefault();gotoStep(4)});
$('#download-summary').addEventListener('click',()=>{
  const blob=new Blob([conceptText()],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='cd-home-concept-summary.txt';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('#contact-studio').addEventListener('click',()=>{
  const text=encodeURIComponent(conceptText());
  $('#contact-studio').href='project-brief.html?source=home-builder&concept='+text;
});
update();