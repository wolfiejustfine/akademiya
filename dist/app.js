(function () {
  'use strict';
  const levels = window.KERNING_LEVELS;
  const scoring = window.KerningScore;
  const movement = window.KerningMovement;
  const progression = window.KerningProgression;
  const persistence = window.KerningPersistence;
  const $ = id => document.getElementById(id);
  const svg = $('word-svg');
  const NS = 'http://www.w3.org/2000/svg';
  let selected = null;
  let drag = null;
  let toastTimer;
  let scoreFrame;
  let submissionFrame;
  let groupNodes = [];
  let referenceNodes = [];
  let customLevel = null;
  let customRecord = null;
  let state = freshState();
  let storageAvailable = true;

  function freshState() {
    return {version:3,curriculum:'gentle-18-v1',epoch:0,index:0,guides:true,finished:false,custom:null,events:[],points:0,awards:[],records:levels.map(progression.initial)};
  }
  function positionsValid(values, level) {
    return movement.valid(values, level);
  }
  try {
    const snapshot = persistence.read();
    const saved = snapshot ? progression.migrate(snapshot,levels,scoring.score) : null;
    if (saved?.version === 3 && saved.curriculum === 'gentle-18-v1' && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < levels.length &&
        Array.isArray(saved.records) && saved.records.length === levels.length) {
      for (let i = 0; i < levels.length; i++) {
        const record = saved.records[i];
        if (!positionsValid(record?.draft, levels[i])) throw new Error('Повреждённое сохранение');
        if (!Number.isInteger(record.successes) || record.successes < 0 || record.successes > 3 ||
            !Number.isInteger(record.attempts) || record.attempts < record.successes) throw new Error('Повреждённый прогресс');
        if (progression.mastered(record) && !progression.successful(record.masteryScore)) throw new Error('Повреждённый результат');
        if (!positionsValid(record.attemptStart,levels[i])) record.attemptStart=levels[i].glyphs.map(g=>g.start);
        if (record.submission !== null && (!record.submission || typeof record.submission !== 'object')) throw new Error('Повреждённое сохранение');
        if (record.submission) {
          if (!positionsValid(record.submission.positions, levels[i])) throw new Error('Повреждённый результат');
          record.submission.score = scoring.score(record.submission.positions, levels[i].glyphs.map(g => g.target));
        }
        record.phase = record.phase === 'compare' && record.submission ? 'compare' : 'edit';
      }
      state = saved;
      state.guides = saved.guides !== false;
      state.events=Array.isArray(saved.events)?saved.events:[];
      state.finished = Boolean(saved.finished && saved.records.every(progression.mastered));
      if(!progression.unlocked(state.records,state.index))state.index=progression.firstOpen(state.records);
    } else if (!saved) {
      // Keep the old key intact. A prior passed exercise contributes one success,
      // preserving sequential unlocking in the expanded course.
      const old=JSON.parse(localStorage.getItem('kirillitsa-kerning-v2'));
      const previous=['МИР','ЛИРА','КНИГА','ЛИТЕРА','галерея','КОЛОСОК','ПУШИСТЫЙ','НАТЮРМОРТ','ОБЩЕЖИТИЕ','ПУТЕШЕСТВИЕ'];
      if(old?.version===2&&Array.isArray(old.records))levels.forEach((level,i)=>{
        const j=previous.indexOf(level.word),prior=j<0?null:old.records[j];
        if(progression.unlocked(state.records,i)&&prior?.submission&&positionsValid(prior.submission.positions,level)){
          const score=scoring.score(prior.submission.positions,level.glyphs.map(g=>g.target));
          state=progression.apply(state,i,score);
          state.events.push({id:crypto.randomUUID(),level:i,positions:prior.submission.positions.slice()});
        }
      });
    }
  } catch { /* Invalid/unavailable storage never prevents the exercise from loading. */ }

  function save(silent=false) {
    if(customLevel)state.custom={word:customLevel.word,fontId:customLevel.fontId,active:true,record:customRecord};
    try { persistence.write(state); }
    catch {
      if (storageAvailable) toast('Браузер не разрешает сохранение. Практику можно продолжить.');
      storageAvailable = false;
    }
    if(!silent)window.dispatchEvent(new CustomEvent('kerning:save'));
  }
  function toast(text) {
    clearTimeout(toastTimer);
    $('toast').textContent = text;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  }
  function node(tag, attributes, parent) {
    const element = document.createElementNS(NS, tag);
    for (const [key,value] of Object.entries(attributes)) element.setAttribute(key, value);
    parent?.appendChild(element);
    return element;
  }
  function current() { return customLevel || levels[state.index]; }
  function record() { return customRecord || state.records[state.index]; }
  function comparing() { return record().phase === 'compare'; }
  function completeCount() { return state.records.filter(progression.mastered).length; }

  function renderNavigation() {
    const nav = $('level-navigation');
    nav.replaceChildren();
    levels.forEach((level,i) => {
      const button = document.createElement('button');
      button.textContent = i + 1;
      const open=progression.unlocked(state.records,i),done=progression.mastered(state.records[i]);
      button.className = [!customLevel && i === state.index ? 'current' : '', done ? 'done' : ''].join(' ');
      button.disabled=!open;
      button.setAttribute('aria-label', `Упражнение ${i+1}: ${level.word}${done ? ', закреплено' : open ? ', доступно' : ', закрыто до закрепления предыдущего'}`);
      button.title=open?level.word:'Сначала решите предыдущее упражнение на 95–100%';
      if (!customLevel && i === state.index) button.setAttribute('aria-current','step');
      button.addEventListener('click',()=>loadLevel(i));
      nav.appendChild(button);
    });
    $('completed-count').textContent = completeCount();
    $('mastery-status').hidden=Boolean(customLevel);
    $('mastery-status').textContent=customLevel?'':progression.mastered(record())?'Пройдено · можно повторить':'Цель: 95–100%';
  }
  function renderWord() {
    const level = current();
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 ${level.viewY+25} ${level.width} ${level.height-50}`);
    svg.setAttribute('aria-label', `Слово «${level.word}». Перемещайте внутренние буквы.`);
    svg.classList.toggle('hide-guides', !state.guides);
    for (const y of [level.capline,level.baseline]) {
      node('line',{x1:0,x2:level.width,y1:y,y2:y,class:'guide'},svg);
    }
    const references = node('g',{'aria-hidden':'true'},svg);
    const letters = node('g',{},svg);
    referenceNodes = [];
    groupNodes = level.glyphs.map((glyph,i) => {
      const locked = i === 0 || i === level.glyphs.length - 1;
      const reference = node('path',{d:glyph.path,class:'reference-letter',opacity:0,transform:`translate(${record().draft[i]} 0)`},references);
      reference.style.opacity = '0';
      referenceNodes.push(reference);
      const group = node('g',{
        class:`letter${locked ? ' locked' : ''}`, 'data-index':i,
        transform:`translate(${record().draft[i]} 0)`,
        role:locked ? 'img' : 'button',
        'aria-label':`Буква ${glyph.char}, ${i+1}${locked ? ', закреплена' : ', перемещайте стрелками'}`
      },letters);
      if (!locked) group.setAttribute('tabindex',0);
      const [left,top,right,bottom] = glyph.bounds;
      node('rect',{x:left-8,y:level.viewY+22,width:Math.max(right-left+16,24),height:level.height-44,rx:5,class:'selection-background'},group);
      node('path',{d:glyph.path,class:'glyph','aria-hidden':'true'},group);
      if(!locked)node('line',{x1:left,x2:right,y1:Math.max(bottom,190)+14,y2:Math.max(bottom,190)+14,class:'selection-rule'},group);
      // Transparent target fills the spaces around narrow glyphs as well.
      node('rect',{x:left-10,y:Math.min(top,30)-15,width:Math.max(right-left+20,30),height:Math.max(bottom,190)-Math.min(top,30)+30,class:'hitarea'},group);
      group.addEventListener('focus',()=> { if (!comparing()) select(i); });
      group.addEventListener('keydown',event => {
        if (comparing()) return;
        if (event.key === ' '){event.preventDefault();select(i);}
      });
      return group;
    });
    svg.appendChild(references);
  }

  function select(i) {
    if (comparing() || i <= 0 || i >= current().glyphs.length - 1) return;
    selected = i;
    groupNodes.forEach((group,j)=>group.classList.toggle('selected',j===i));
    $('nudge-left').disabled = false;
    $('nudge-right').disabled = false;
    $('board-tip').classList.add('dim');
  }
  function applyPosition(i,value) {
    const position = movement.clamp(current(),i,value);
    record().draft[i] = position;
    groupNodes[i].setAttribute('transform',`translate(${position} 0)`);
  }
  function nudge(amount) {
    if (selected === null || comparing()) return;
    applyPosition(selected,record().draft[selected]+amount);
    save();
  }
  function designX(event) {
    const matrix = svg.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()).x : event.clientX;
  }
  function pickLetter(event) {
    const matrix = svg.getScreenCTM();
    if (matrix) {
      const point = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      // Prefer actual ink over another letter's enlarged transparent hit target.
      for (let i = groupNodes.length - 1; i >= 0; i--) {
        const path = groupNodes[i].querySelector('.glyph');
        if (path.isPointInFill(new DOMPoint(point.x-record().draft[i],point.y))) return groupNodes[i];
      }
    }
    return event.target.closest('.letter');
  }
  svg.addEventListener('pointerdown',event=>{
    if (comparing() || event.button !== 0 || drag) return;
    const group = pickLetter(event);
    if (!group) return;
    const i = Number(group.dataset.index);
    if (i === 0 || i === current().glyphs.length - 1) {toast('Эта буква закреплена');return;}
    event.preventDefault();
    select(i);
    group.focus({preventScroll:true});
    drag = {id:event.pointerId,index:i,start:designX(event),origin:record().draft[i]};
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove',event=>{
    if (!drag || drag.id !== event.pointerId) return;
    applyPosition(drag.index,drag.origin+designX(event)-drag.start);
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    save();
  }
  svg.addEventListener('pointerup',finishDrag);
  svg.addEventListener('pointercancel',finishDrag);
  svg.addEventListener('lostpointercapture',finishDrag);

  function renderControls() {
    const isComparison = comparing();
    $('font-info').hidden = false;
    $('practice-instruction').hidden = isComparison;
    $('comparison').hidden = !isComparison;
    $('check-button').hidden = isComparison;
    $('reset-position').hidden = isComparison;
    $('nudge-controls').hidden = isComparison;
    $('retry-button').hidden = !isComparison;
    $('next-button').hidden = !isComparison || (!customLevel && !progression.successful(record().submission.score));
    $('retry-button').className = isComparison && $('next-button').hidden ? 'primary-button' : 'text-button';
    $('result-panel').hidden = !isComparison;
    $('board-tip').hidden = isComparison;
    $('board-tip').classList.toggle('dim',selected !== null);
    $('nudge-left').disabled = selected === null;
    $('nudge-right').disabled = selected === null;
    $('next-button').innerHTML = customLevel ? 'К упражнениям <span aria-hidden="true">→</span>' : completeCount() === levels.length ? 'Итоги <span aria-hidden="true">↗</span>' : 'Дальше <span aria-hidden="true">→</span>';
    document.querySelector('[data-mode="reference"]').textContent=customLevel ? 'Образец' : 'Эталон';
    document.querySelector('.legend>span:last-child').innerHTML='<i class="legend-reference"></i> '+(customLevel ? 'Автоматический образец' : 'Эталон');
    groupNodes.forEach((group,i)=>{
      if (i > 0 && i < groupNodes.length - 1) group.setAttribute('tabindex',isComparison ? -1 : 0);
      group.classList.toggle('compare',isComparison);
      group.classList.remove('selected','reference-mode','animate');
    });
  }
  function renderScore(value,animate=false) {
    cancelAnimationFrame(scoreFrame);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduced){$('score-number').textContent = Math.round(value);return;}
    const start = performance.now();
    function frame(now) {
      const progress = Math.min((now-start)/650,1);
      $('score-number').textContent = Math.round(value*(1-Math.pow(1-progress,3)));
      if(progress<1) scoreFrame=requestAnimationFrame(frame);
    }
    scoreFrame=requestAnimationFrame(frame);
  }
  function setComparison(mode,animate=false) {
    if (!record().submission) return;
    const targets = current().glyphs.map(g=>g.target);
    const positions = record().submission.positions;
    document.querySelectorAll('[data-mode]').forEach(button=>{
      const active=button.dataset.mode===mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active);
    });
    cancelAnimationFrame(submissionFrame);
    groupNodes.forEach((group,i)=>{
      group.classList.toggle('animate',animate);
      group.classList.toggle('compare',mode==='both');
      group.classList.toggle('reference-mode',mode==='reference');
      group.setAttribute('transform',`translate(${mode==='reference' ? targets[i] : positions[i]} 0)`);
      const reference=referenceNodes[i];
      reference.style.opacity=mode==='both' ? '.72' : '0';
      if (animate && mode==='both') {
        reference.style.transition='none';
        reference.setAttribute('transform',`translate(${positions[i]} 0)`);
      } else reference.setAttribute('transform',`translate(${targets[i]} 0)`);
    });
    if (animate && mode==='both') {
      // Two frames guarantee the starting transforms are painted before moving.
      submissionFrame=requestAnimationFrame(()=>{
        submissionFrame=requestAnimationFrame(()=>referenceNodes.forEach((reference,i)=>{
          reference.style.transition='';
          reference.setAttribute('transform',`translate(${targets[i]} 0)`);
        }));
      });
    }
    document.querySelector('.legend').hidden = mode !== 'both';
  }
  function renderResult(animate=false) {
    const value=record().submission.score;
    const shown=Math.round(value);
    const exact=scoring.exactMatch(record().submission.positions,current().glyphs.map(g=>g.target));
    $('result-title').textContent = exact ? 'Точное совпадение с эталоном' : shown===100 ? 'Максимальная оценка с учётом округления' : value>=80 ? 'Ритм уже близок к эталону' : value>=50 ? 'Есть интервалы для уточнения' : 'Попробуйте собрать слово заново';
    if(customLevel)$('result-title').textContent=exact ? 'Точное совпадение с автоматическим образцом' : shown===100 ? 'Максимальная оценка с учётом округления' : 'Сравните с автоматическим образцом';
    $('result-note').textContent=(shown===100 && !exact ? 'Осталось очень небольшое смещение; процент округлён до целого. ' : '')+current().note;
    $('mastery-feedback').hidden=Boolean(customLevel);
    $('mastery-feedback').textContent=customLevel?'':progression.successful(value) ? (completeCount()===levels.length?'Все упражнения пройдены. Можно посмотреть итоги или повторить.':'Упражнение пройдено. Можно повторить или идти дальше.') : 'Для перехода нужно 95–100%. Попробуйте ещё раз.';
    if(!customLevel){const reward=record().submission.reward||0;$('mastery-feedback').textContent+=(reward>0?` +${reward} баллов.`:reward<0?` −${Math.abs(reward)} ${reward===-1?'балл':'балла'}.`:' Баллы не изменились.');}
    $('result-detail-title').textContent=$('result-title').textContent;
    $('result-detail-feedback').textContent=customLevel?'Своя практика не меняет баллы и результаты учебной серии.':$('mastery-feedback').textContent;
    if(!customLevel){
      const reward=record().submission.reward||0;
      const delta=reward>0?` · +${reward} баллов`:reward<0?` · −${Math.abs(reward)} ${reward===-1?'балл':'балла'}`:'';
      $('mastery-feedback').textContent=(progression.successful(value)?'Упражнение пройдено':'Для перехода нужно 95–100%')+delta;
    }
    renderScore(value,animate);
    setComparison('both',animate);
  }
  function check() {
    if (comparing()) return;
    const positions=record().draft.slice();
    record().submission={positions,score:scoring.score(positions,current().glyphs.map(g=>g.target))};
    if(!customLevel){
      state=progression.apply(state,state.index,record().submission.score);
      state.events.push({id:crypto.randomUUID(),level:state.index,positions});
    }
    record().phase='compare';
    selected=null;
    renderControls();
    renderResult(true);
    renderNavigation();
    save();
    ($('next-button').hidden?$('retry-button'):$('next-button')).focus({preventScroll:true});
  }
  function loadLevel(index) {
    if(!progression.unlocked(state.records,index)){toast('Сначала решите предыдущее упражнение на 95–100%.');return;}
    customLevel=null;
    customRecord=null;
    if(state.custom)state.custom.active=false;
    state.index=index;
    renderExercise();
  }
  function renderExercise() {
    const index=state.index;
    cancelAnimationFrame(scoreFrame);
    cancelAnimationFrame(submissionFrame);
    drag=null;
    selected=null;
    state.index=index;
    state.finished=false;
    $('exercise-view').hidden=false;
    $('exercise-view').classList.toggle('custom-practice',Boolean(customLevel));
    $('final-view').hidden=true;
    $('exercise-number').textContent=customLevel ? 'СВОЁ СЛОВО' : String(index+1).padStart(2,'0')+' / '+levels.length;
    $('exercise-topic').textContent=current().topic;
    $('font-name').textContent=current().family;
    $('font-style').textContent=current().style;
    const movable=current().glyphs.length-2;
    $('movement-note').textContent=movable===1?'Двигайте среднюю букву. Крайние закреплены.':`Двигайте внутренние буквы: ${movable}. Крайние закреплены.`;
    $('guides-button').setAttribute('aria-pressed',state.guides);
    renderWord();
    renderControls();
    if(comparing()) renderResult();
    renderNavigation();
    save();
  }
  function retry() {
    record().phase='edit';
    record().draft=progression.nextDraft(current(),record().draft).map((x,i)=>movement.clamp(current(),i,x));
    record().attemptStart=record().draft.slice();
    renderExercise();
    groupNodes[1].focus({preventScroll:true});
  }
  function next() {
    if(customLevel){loadLevel(state.index);return;}
    if(!progression.successful(record().submission?.score)){retry();return;}
    if(completeCount()===levels.length){showFinal();return;}
    let index=(state.index+1)%levels.length;
    loadLevel(index);
    if(index===0) toast('Продолжите практику: выполнены ещё не все упражнения');
  }
  function showFinal() {
    if(completeCount()!==levels.length)return;
    state.finished=true;
    $('exercise-view').hidden=true;
    $('final-view').hidden=false;
    $('final-score').textContent=scoring.sessionScore(state.records.map(r=>r.masteryScore));
    $('results-grid').replaceChildren();
    levels.forEach((level,i)=>{
      const button=document.createElement('button');
      button.className='result-item';
      const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');
      const word=document.createElement('strong');word.textContent=level.word;
      const score=document.createElement('b');score.textContent=Math.round(state.records[i].masteryScore)+'%';
      button.append(number,word,score);
      button.setAttribute('aria-label',`Повторить упражнение ${i+1}: ${level.word}, ${score.textContent}`);
      button.addEventListener('click',()=>loadLevel(i));
      $('results-grid').appendChild(button);
    });
    save();
  }
  function openDialog(id) { $(id).showModal(); }
  function startCustom(word,fontId,restored=null) {
    const font=window.KERNING_FONTS.find(font=>font.id===fontId);
    const level=window.KerningCustomWords.build(word,font);
    customLevel=level;
    customRecord={draft:level.glyphs.map(g=>g.start),submission:null,phase:'edit'};
    if(restored && positionsValid(restored.draft,level)) {
      customRecord.draft=restored.draft;
      if(restored.submission && positionsValid(restored.submission.positions,level)){
        customRecord.submission={positions:restored.submission.positions,score:scoring.score(restored.submission.positions,level.glyphs.map(g=>g.target))};
        customRecord.phase=restored.phase==='compare' ? 'compare' : 'edit';
      }
    }
    renderExercise();
  }
  for(const [category,label] of [['sans','Без засечек'],['serif','С засечками']]){
    const group=document.createElement('optgroup');group.label=label;
    window.KERNING_FONTS.filter(font=>font.category===category).forEach(font=>{
      const option=document.createElement('option');option.value=font.id;option.textContent=font.family+' · '+font.style;group.appendChild(option);
    });
    $('custom-font').appendChild(group);
  }
  $('custom-button').addEventListener('click',()=>{
    $('custom-error').textContent='';
    $('custom-word').value=state.custom?.word || '';
    $('custom-font').value=state.custom?.fontId || 'sans';
    openDialog('custom-dialog');
    $('custom-word').focus();
  });
  $('custom-form').addEventListener('submit',event=>{
    event.preventDefault();
    try{startCustom($('custom-word').value,$('custom-font').value);$('custom-dialog').close();}
    catch(error){$('custom-error').textContent=error.message;}
  });
  $('help-button').addEventListener('click',()=>openDialog('help-dialog'));
  $('about-button').addEventListener('click',()=>openDialog('about-dialog'));
  $('result-detail-button').addEventListener('click',()=>openDialog('result-detail-dialog'));
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.querySelectorAll('.dialog-close').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',event=>{
      if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}
    });
  });
  $('check-button').addEventListener('click',check);
  $('retry-button').addEventListener('click',retry);
  $('next-button').addEventListener('click',next);
  $('reset-position').addEventListener('click',()=>{
    record().draft=record().attemptStart?.slice() || current().glyphs.map(g=>g.start);
    groupNodes.forEach((group,i)=>group.setAttribute('transform',`translate(${record().draft[i]} 0)`));
    save();
    toast('Исходная расстановка восстановлена');
  });
  $('nudge-left').addEventListener('click',()=>nudge(-1));
  $('nudge-right').addEventListener('click',()=>nudge(1));
  $('guides-button').addEventListener('click',()=>{
    state.guides=!state.guides;
    svg.classList.toggle('hide-guides',!state.guides);
    $('guides-button').setAttribute('aria-pressed',state.guides);
    save();
  });
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setComparison(button.dataset.mode,true)));
  $('restart-button').addEventListener('click',()=>openDialog('restart-dialog'));
  $('confirm-restart').addEventListener('click',()=>{
    $('restart-dialog').close();
    state=freshState();loadLevel(0);
  });
  $('review-button').addEventListener('click',()=>loadLevel(state.index));
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();loadLevel(0);});
  window.addEventListener('keydown',event=>{
    if(document.querySelector('dialog[open]') || state.finished || event.ctrlKey || event.metaKey || event.altKey)return;
    const inWord=svg.contains(document.activeElement);
    if(inWord && ['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault();nudge((event.key==='ArrowRight'?1:-1)*(event.shiftKey?10:1));
    }
    if(event.key==='Enter' && (inWord || document.activeElement===document.body)) {
      event.preventDefault();comparing()?next():check();
    }
    if(event.key==='Escape' && inWord){$('check-button').focus();}
  });
  window.addEventListener('pagehide',save);
  window.KerningApp=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(state))});
  const wasFinished=state.finished;
  const restoredCustom=state.custom?.active ? {...state.custom} : null;
  loadLevel(state.index);
  if(restoredCustom){try{startCustom(restoredCustom.word,restoredCustom.fontId,restoredCustom.record);}catch{/* Keep the valid course visible. */}}
  else if(wasFinished)showFinal();
})();
