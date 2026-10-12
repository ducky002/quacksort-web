(() => {
 'use strict';
 const data=window.ChallengeData,core=window.ChallengeCore,type=document.body.dataset.challenge;
 const configs={sorting:{title:'Sort the Crowd',description:'Copy each photo into every person’s collection it belongs to. The original stays in the middle.',steps:['Meet Maya, Alex, Priya, and Leo. Their reference portraits stay beside their collections.','On desktop, drag a photo into a collection. Or tap a photo, then tap “Add selected photo” under a person.','Group photos belong to more than one person. Click a copied photo to undo an assignment.'],utility:'QuackSort detects faces and groups similar faces, helping you organise a whole event by person.'},groups:{title:'Find the Shared Moments',description:'Find every photo containing all three chosen people. Other guests can be in the picture too.',steps:['Three people will be picked from Maya, Alex, Priya, Leo, and Zoe when you start.','Select every photo showing all three. A photo with only two does not count.','Tap a selected picture again to undo. Check your work before the clock runs out.'],utility:'With Group Cards, select people and find the photos containing everyone selected.'},albums:{title:'Build a Concept Album',description:'Two clues, sixteen pictures, and forty seconds. Find photos matching both.',steps:['Your concept combines an event theme with either Group photo or Solo portrait.','Select every picture matching BOTH clues. Some pictures match only one: leave those out.','Tap a picture again to undo. Check your album before the clock runs out.'],utility:'Concept Albums find photos around your keywords, so you can build collections around an idea.'}};
 const config=configs[type];if(!config)return;
 const people=type==='sorting'?data.people.filter(p=>data.sortingPeople.includes(p.id)):data.people;
 const $=id=>document.getElementById(id);
 const floating=document.createElement('div');floating.className='floating-timer';floating.hidden=true;
 floating.innerHTML='<span>Time remaining</span><strong id="floating-value" role="timer" aria-live="off"></strong><a href="index.html">All challenges</a>';document.body.appendChild(floating);
 let timerVisible=true;
 const timerObserver=new IntersectionObserver(entries=>{timerVisible=entries[0].isIntersecting;floating.hidden=phase!=='playing'||timerVisible;});
 let round,previous='',answers=new Set(),selected=null,phase='ready',deadline=0,started=0,interval=null,result=null,revealAnswers=null,generation=0,loaded=false;
 let drag=null,suppressClick=false;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const person=id=>data.people.find(p=>p.id===id);
 const label=id=>id.replace('photo-','Photo ');
 function reference(p){return `<div class="reference-person"><img src="${p.avatar}" alt="Reference portrait of ${p.name}"><span>${p.name}</span></div>`;}
 function random(){if(window.crypto?.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}return Math.random();}
 async function newRound(){
  generation++;const token=generation;clearInterval(interval);interval=null;cleanupDrag();floating.hidden=true;
  for(let i=0;i<10;i++){round=core.createRound(type,data,random);if(core.fingerprint(round)!==previous)break;}
  previous=core.fingerprint(round);answers=new Set();selected=null;phase='ready';result=null;revealAnswers=null;loaded=false;
  $('title').textContent=config.title;$('description').textContent=config.description;
  $('ready').hidden=false;$('play-area').hidden=true;$('result').hidden=true;
  $('ready-title').textContent='A small event. A real challenge.';
  $('steps').innerHTML=config.steps.map(s=>`<li>${esc(s)}</li>`).join('');
  $('references').innerHTML=type==='albums'?`<div class="theme-examples">${data.themes.map((t,i)=>`<figure><img src="${data.photos[i].src}" alt="${t.name} example"><figcaption>${t.name}</figcaption></figure>`).join('')}</div>`:`<div class="reference-people">${people.map(reference).join('')}</div>`;
  $('start').disabled=true;$('start').textContent='Loading photos…';$('timer').textContent=Math.floor(round.seconds/60)+':'+String(round.seconds%60).padStart(2,'0');$('timer-box').classList.remove('urgent');$('timer-label').textContent='Time to play';$('status').textContent='';
  try{
   await Promise.all(round.photos.map(p=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=p.src;})));
   if(token!==generation)return;loaded=true;$('start').disabled=false;$('start').textContent=`Start ${round.seconds}-second challenge`;
  }catch{if(token===generation){$('start').textContent='Photos unavailable';$('status').textContent='The sample photos could not load. Please reload this page.';}}
 }
 function ensurePlaying(){if(phase!=='playing')return false;if(performance.now()>=deadline){finish(true);return false;}return true;}
 function start(){if(phase!=='ready'||!loaded)return;phase='playing';started=performance.now();deadline=started+round.seconds*1000;$('ready').hidden=true;$('play-area').hidden=false;$('timer-label').textContent='Time remaining';render();tick();interval=setInterval(tick,100);}
 function tick(){if(phase!=='playing')return;const remaining=Math.max(0,Math.ceil((deadline-performance.now())/1000));$('timer').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');$('floating-value').textContent=$('timer').textContent;floating.hidden=timerVisible;floating.classList.toggle('urgent',remaining<=10);$('timer-box').classList.toggle('urgent',remaining<=10);if(!remaining)finish(true);}
 function photoButton(photo){
  const shown=revealAnswers||answers,isSelected=type==='sorting'?selected===photo.id:shown.has(photo.id);
  let feedback='',text='';
  if(type!=='sorting'&&phase!=='playing'){
   if(shown.has(photo.id)&&round.expected.includes(photo.id)){feedback='correct';text='Match';}
   else if(shown.has(photo.id)){feedback='extra';text='Extra';}
   else if(round.expected.includes(photo.id)){feedback='missed';text='Missed';}
  }
  const badges=type==='sorting'?people.filter(p=>shown.has(photo.id+':'+p.id)).map(p=>`<span>${p.name}</span>`).join(''):'';
  return `<button type="button" class="photo-pick ${feedback}" data-photo="${photo.id}" aria-pressed="${isSelected}" aria-label="${esc(label(photo.id)+': '+photo.description)}" ${phase==='playing'?'':'disabled'}><img src="${photo.src}" alt="${esc(photo.description)}" draggable="false"><span class="photo-caption"><span>${label(photo.id)}</span><span class="selection-mark" aria-hidden="true">${text|| (isSelected?'✓':'+')}</span></span>${badges?`<span class="assignment-badges">${badges}</span>`:''}</button>`;
 }
 function render(){
  const active=document.activeElement;const focusKey=active?.dataset.photo||active?.dataset.assign||active?.dataset.remove;
  const shown=revealAnswers||answers;
  if(type==='sorting'){
   $('target').hidden=true;
   $('board').innerHTML=`<div class="sorting-board"><section class="dump"><h2>Unsorted photos</h2><p>Originals stay here. Copy a group photo to every person in it.</p><div class="photo-grid">${round.photos.map(photoButton).join('')}</div></section>${people.map(p=>{
    const assigned=round.photos.filter(f=>shown.has(f.id+':'+p.id));
    return `<section class="person-zone ${selected&&phase==='playing'?'drop-ready':''}" data-person="${p.id}" aria-label="${p.name}'s collection"><div class="zone-header"><img src="${p.avatar}" alt="${p.name} reference"><div><h2>${p.name}</h2><span>${assigned.length} copied ${assigned.length===1?'photo':'photos'}</span></div></div><button class="assign-button" data-assign="${p.id}" ${selected&&phase==='playing'?'':'disabled'}>Add selected photo</button><div class="zone-photos">${assigned.length?assigned.map(f=>`<button class="zone-copy" data-remove="${f.id}:${p.id}" aria-label="Remove ${label(f.id)} from ${p.name}" ${phase==='playing'?'':'disabled'}><img src="${f.src}" alt="${esc(f.description)}">${label(f.id)}${phase==='playing'?' · remove':''}</button>`).join(''):'<p class="zone-empty">Drop or add photos here</p>'}</div></section>`;
   }).join('')}</div>`;
  }else{
   $('target').hidden=false;
   if(type==='groups')$('target').innerHTML=`<div><h2>Find all three, together</h2><p>Extra people are fine. Missing any one of these three is not.</p></div><div class="reference-people">${round.target.map(id=>reference(person(id))).join('')}</div>`;
   else{const theme=data.themes.find(t=>t.id===round.target[0]),modifier=data.albumModifiers.find(m=>m.id===round.target[1]);$('target').innerHTML=`<span class="theme-tag" data-theme="${theme.id}" data-modifier="${modifier.id}">${theme.name} + ${modifier.name}</span><div><h2>Match both clues</h2><p>${theme.hint} ${modifier.hint}</div>`;}
   $('board').innerHTML=`<div class="photo-grid">${round.photos.map(photoButton).join('')}</div>`;
  }
  $('check').disabled=phase!=='playing';$('reset').disabled=phase!=='playing'||!answers.size;
  $('progress').textContent=type==='sorting'?`${shown.size} ${shown.size===1?'copy':'copies'} assigned${selected?' · '+label(selected)+' selected':''}`:`${shown.size} ${shown.size===1?'photo':'photos'} selected`;
  if(focusKey){const target=[...$('board').querySelectorAll('button')].find(b=>(b.dataset.photo||b.dataset.assign||b.dataset.remove)===focusKey);if(target&&!target.disabled)target.focus({preventScroll:true});}
 }
 function assign(id,photoId=selected){if(!ensurePlaying()||!photoId)return;answers.add(photoId+':'+id);selected=photoId;render();$('status').textContent=`${label(photoId)} copied to ${person(id).name}. Its original stays in the middle.`;}
 function select(id){if(!ensurePlaying())return;if(type==='sorting')selected=selected===id?null:id;else if(answers.has(id))answers.delete(id);else answers.add(id);render();$('status').textContent=type==='sorting'?(selected?`${label(id)} selected. Add it to each person shown.`:'Photo selection cleared.'):`${answers.size} ${answers.size===1?'photo':'photos'} selected.`;}
 function answerLabel(key){const [id,pid]=key.split(':');return label(id)+(pid?' → '+person(pid).name:'');}
 function finish(timedOut=false){
  if(phase!=='playing')return;phase='result';floating.hidden=true;cleanupDrag();clearInterval(interval);interval=null;selected=null;
  result=core.grade(round.expected,answers);const elapsed=Math.min(round.seconds,(performance.now()-started)/1000);
  $('timer-label').textContent='Round finished';$('timer').textContent=elapsed.toFixed(1)+'s';$('timer-box').classList.remove('urgent');
  const missing=round.expected.filter(k=>!answers.has(k)),extra=[...answers].filter(k=>!round.expected.includes(k));
  const title=result.score===100?'You nailed it!':timedOut?'Time’s up. Here’s your result.':'Nice effort. Here’s your result.';
  $('result').hidden=false;
  $('result').innerHTML=`<div class="result-heading"><div class="result-score">${result.score}%</div><div><h2 tabindex="-1" id="result-title">${title}</h2><p>${result.correct} of ${result.total} correct ${type==='sorting'?'photo assignments':'photos'} in ${elapsed.toFixed(1)} seconds.</p></div></div><div class="result-stats"><span>${result.correct} correct</span><span>${result.missing} missed</span><span>${result.extra} extra</span></div><p>${config.utility}</p>${missing.length||extra.length?`<details><summary>Review missed and extra choices</summary><ul>${missing.map(k=>`<li>Missed: ${answerLabel(k)}</li>`).join('')}${extra.map(k=>`<li>Extra: ${answerLabel(k)}</li>`).join('')}</ul></details>`:'<p>Every match found, with no extra choices.</p>'}<div class="result-actions"><a class="btn primary" href="../index.html?demo=1">Try QuackSort</a><button class="btn secondary" id="reveal">See QuackSort’s approach</button><button class="btn secondary" id="again">Play a fresh round</button></div><p class="sample-note">Prepared sample preview. Your score counts correct matches and penalises extra choices; desktop processing time depends on your photos and hardware.</p>`;
  render();$('status').textContent=timedOut?'The countdown ended. Your choices have been checked.':'Your choices have been checked.';
  $('result-title').focus({preventScroll:true});$('result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 }
 async function reveal(){
  if(phase!=='result')return;phase='revealing';selected=null;const token=generation;revealAnswers=new Set();$('reveal').disabled=true;$('again').disabled=true;
  $('status').textContent='Sample preview: organising the prepared matches.';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const key of round.expected){if(token!==generation)return;revealAnswers.add(key);render();if(!reduced)await new Promise(r=>setTimeout(r,90));}
  if(token!==generation)return;phase='result';$('again').disabled=false;$('reveal').textContent='All sample matches shown';$('status').textContent=type==='sorting'?'Sample sorted: each photo is copied to everyone it contains.':type==='groups'?'Group Cards sample: every photo containing all three people.':'Concept Album sample: every photo matching both concept clues.';render();
  $('board').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
 }
 function cleanupDrag(){if(drag){drag.ghost?.remove();try{if(drag.button.hasPointerCapture(drag.id))drag.button.releasePointerCapture(drag.id);}catch{}drag=null;}}
 $('board').addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;return;}
  const photo=e.target.closest('[data-photo]'),add=e.target.closest('[data-assign]'),remove=e.target.closest('[data-remove]');
  if(photo)select(photo.dataset.photo);else if(add)assign(add.dataset.assign);else if(remove&&ensurePlaying()){answers.delete(remove.dataset.remove);render();$('status').textContent='Copy removed. The original photo is still available.';}
 });
 $('board').addEventListener('pointerdown',e=>{
  if(type!=='sorting'||e.pointerType==='touch'||e.button!==0||phase!=='playing')return;
  const button=e.target.closest('[data-photo]');if(!button)return;
  drag={id:e.pointerId,button,photoId:button.dataset.photo,x:e.clientX,y:e.clientY,ghost:null};button.setPointerCapture(e.pointerId);
 });
 $('board').addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){drag.ghost=drag.button.querySelector('img').cloneNode();drag.ghost.className='drag-ghost';drag.ghost.setAttribute('aria-hidden','true');document.body.appendChild(drag.ghost);}
  if(drag.ghost){e.preventDefault();drag.ghost.style.left=(e.clientX-65)+'px';drag.ghost.style.top=(e.clientY-40)+'px';}
 });
 $('board').addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const hadGhost=!!drag.ghost,photoId=drag.photoId,zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-person]');cleanupDrag();
  if(hadGhost){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);if(zone)assign(zone.dataset.person,photoId);}
 });
 $('board').addEventListener('pointercancel',cleanupDrag);
 $('start').addEventListener('click',start);$('check').addEventListener('click',()=>finish(performance.now()>=deadline));
 $('reset').addEventListener('click',()=>{if(ensurePlaying()){answers.clear();selected=null;render();$('status').textContent='Choices cleared. Keep going!';}});
 $('result').addEventListener('click',e=>{if(e.target.closest('#again')){newRound();$('ready').scrollIntoView({behavior:'smooth',block:'start'});}else if(e.target.closest('#reveal'))reveal();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});window.addEventListener('pagehide',()=>{clearInterval(interval);cleanupDrag();});
 timerObserver.observe($('timer-box'));newRound();
})();
