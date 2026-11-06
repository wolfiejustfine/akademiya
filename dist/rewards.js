(function(){
  'use strict';
  const app=window.KerningApp,p=window.KerningProgression;
  const button=document.getElementById('rewards-button'),dialog=document.getElementById('reward-dialog');
  const names=n=>{const count=n%100,last=count%10;return count>=11&&count<=14?'баллов':last===1?'балл':last>=2&&last<=4?'балла':'баллов';};
  function render(){
    const state=app.snapshot(),points=state.points||0,count=state.records.filter(p.mastered).length;
    document.getElementById('practice-points').textContent=points;
    document.getElementById('points-unit').textContent=names(points);
    document.getElementById('reward-balance').textContent=points;
    button.setAttribute('aria-label',`${points} ${names(points)}. Посмотреть награды`);
    const list=document.getElementById('award-list');list.replaceChildren();
    for(const [i,badge] of p.badges.entries()){
      const earned=count>=badge.count,item=document.createElement('div');item.className='award-item'+(earned?' earned':'');
      const mark=document.createElement('span');mark.className='award-mark';mark.textContent=earned?'✓':String(i+1).padStart(2,'0');
      const copy=document.createElement('span'),title=document.createElement('strong'),note=document.createElement('small');
      title.textContent=badge.title;note.textContent=`Пройдено упражнений: ${Math.min(count,badge.count)} / ${badge.count}`;
      copy.append(title,note);item.append(mark,copy);list.append(item);
    }
  }
  button.addEventListener('click',()=>{render();dialog.showModal();});
  window.addEventListener('kerning:save',render);render();
})();
