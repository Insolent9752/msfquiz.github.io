'use strict';
// Полностью автономный сайт: никакого Discord, Firebase, Gists, API или отправки данных.
const $=id=>document.getElementById(id);
const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const exam=EXAM_DATA;
const TEST_COUNT=exam.questions.length;
const STEP_COUNT=TEST_COUNT+exam.tasks.length;
const TASK_MAX=exam.tasks.reduce((s,t)=>s+t.points,0);
const LETTERS=['а','б','в','г'];
const state={step:0,start:0,seconds:0,interval:null,tests:[],tasks:[],testLocked:[],taskLocked:[],q17NoticeAcknowledged:false};
function setTheme(dark){document.documentElement.dataset.theme=dark?'dark':'light';$('theme-toggle').textContent=dark?'☀':'☾';try{localStorage.setItem('accounting-theme-v2',dark?'dark':'light')}catch{}}
function initTheme(){let saved;try{saved=localStorage.getItem('accounting-theme-v2')}catch{}setTheme(saved==='dark'||(!saved&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches))}
function showScreen(s){all('.screen').forEach(e=>e.classList.toggle('active',e.id===s+'-screen'));window.scrollTo(0,0)}
function timeString(n){const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function elapsed(){return state.start?Math.floor((Date.now()-state.start)/1000):state.seconds}
function start(){clearInterval(state.interval);Object.assign(state,{step:0,start:Date.now(),seconds:0,interval:null,tests:Array(TEST_COUNT).fill(null),tasks:exam.tasks.map(t=>Array(t.stages.length).fill(null)),testLocked:Array(TEST_COUNT).fill(false),taskLocked:exam.tasks.map(t=>Array(t.stages.length).fill(false)),q17NoticeAcknowledged:false});state.interval=setInterval(()=>$('timer').textContent=timeString(elapsed()),1000);$('timer').textContent='00:00';$('q17-overlay').classList.add('hidden');$('review-list').classList.add('hidden');$('review-btn').textContent='Разобрать ответы и задания';$('review-btn').setAttribute('aria-expanded','false');showScreen('exam');render()}
function node(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el}
function isTask(){return state.step>=TEST_COUNT}
function taskIndex(){return state.step-TEST_COUNT}
function answerReady(){
 if(!isTask())return state.testLocked[state.step] && (exam.questions[state.step].id!==17 || state.q17NoticeAcknowledged);
 return state.taskLocked[taskIndex()].every(Boolean);
}
function updateNav(){
 const ready=answerReady();
 $('next-btn').disabled=!ready;
 if(!isTask() && exam.questions[state.step].id===17 && state.testLocked[state.step] && !state.q17NoticeAcknowledged)$('completion-hint').textContent='Прочитайте пояснение к вопросу №17, чтобы продолжить.';
 else if(ready)$('completion-hint').textContent='Ответ проверен и зафиксирован. Изменить его нельзя.';
 else if(isTask())$('completion-hint').textContent='Проверьте все этапы задачи, чтобы продолжить. Подтверждённый ответ изменить нельзя.';
 else if(exam.questions[state.step].id===17)$('completion-hint').textContent='Выберите один или два варианта и нажмите «Проверить ответ». После проверки изменить выбор нельзя.';
 else if(exam.questions[state.step].multiple)$('completion-hint').textContent='Выберите все подходящие варианты и нажмите «Проверить ответ». После проверки изменить выбор нельзя.';
 else $('completion-hint').textContent='Нажмите на выбранный вариант. Правильный ответ появится сразу, но изменить выбор будет нельзя.';
}
function render({scroll=true}={}){
 const task=isTask();const n=task?taskIndex():state.step;const item=task?exam.tasks[n]:exam.questions[n];
 $('section-label').textContent=task?'Раздел 2 · Ситуационные задачи':'Раздел 1 · Тестовые вопросы';
 $('step-label').textContent=(task?'Задача ':'Вопрос ')+(n+1)+' из '+(task?exam.tasks.length:TEST_COUNT);
 $('item-type').textContent=task?item.points+' баллов':'1 балл';$('item-number').textContent=(task?'Задача № ':'Вопрос № ')+item.id;
 $('item-title').textContent=task?item.title:item.question;
 $('progress-track').setAttribute('aria-valuenow',state.step+1);
 $('progress-fill').style.width=(((state.step+1)/STEP_COUNT)*100)+'%';
 $('back-btn').disabled=state.step===0;
 $('next-btn').textContent=state.step===STEP_COUNT-1?'Завершить тест →':state.step===TEST_COUNT-1?'Перейти к задачам →':'Следующий вопрос →';
 for(const id of ['item-condition','task-points','task-assumption','multi-label','task-stages','test-feedback','multi-submit'])$(id).classList.add('hidden');
 $('answer-options').replaceChildren();$('task-stages').replaceChildren();$('test-feedback').replaceChildren();
 if(task)renderTask(item,n);else renderTest(item,n);
 updateNav();if(scroll)window.scrollTo(0,0);
}
function testIsCorrect(q,selected){
 if(q.acceptAnySubset)return selected.length>=(q.minSelections||1)&&selected.length<=(q.maxSelections||q.correct.length)&&selected.every(x=>q.correct.includes(x));
 return selected.length===q.correct.length&&q.correct.every(x=>selected.includes(x));
}
function openQ17Notice(){
 const overlay=$('q17-overlay');overlay.classList.remove('hidden');
 $('q17-notice-ok').focus();updateNav();
}
function closeQ17Notice(){
 state.q17NoticeAcknowledged=true;
 $('q17-overlay').classList.add('hidden');updateNav();
 $('next-btn').focus();
}
function makeFeedback(pass,points,max,content,explanation){
 const div=node('div','answer-feedback '+(pass?'success':'error'));
 div.setAttribute('role','status');
 div.append(node('strong','',`${pass?'Верно':'Неверно'} · ${points} из ${max} ${max===1?'балла':'баллов'}`));
 if(content)div.append(para(content,'feedback-answer'));
 if(explanation)div.append(para(explanation,'feedback-explanation'));
 return div;
}
function renderTest(q,index){
 const locked=state.testLocked[index];
 if(q.multiple){$('multi-label').classList.remove('hidden');$('multi-label').textContent=q.id===17?'Выберите один или два обоснованных варианта. После ответа появится пояснение.':'Выберите все подходящие ответы.';}
 const selected=state.tests[index]||[];
 q.options.forEach((text,i)=>{
  let cls='answer-option'+(selected.includes(i)?' selected':'');
  if(locked&&q.correct.includes(i))cls+=' correct';
  if(locked&&selected.includes(i)&&!q.correct.includes(i))cls+=' wrong';
  const button=node('button',cls);button.type='button';button.disabled=locked;button.dataset.index=i;
  if(q.multiple&&!locked&&q.maxSelections&&selected.length>=q.maxSelections&&!selected.includes(i))button.disabled=true;
  button.append(node('span','option-letter',LETTERS[i]),node('span','option-text',text));
  button.addEventListener('click',()=>{
   if(state.testLocked[index])return;
   if(q.multiple){
    const a=state.tests[index]||[];
    if(!a.includes(i)&&q.maxSelections&&a.length>=q.maxSelections)return;
    state.tests[index]=a.includes(i)?a.filter(x=>x!==i):[...a,i].sort((a,b)=>a-b);
    render({scroll:false});
   }else{
    state.tests[index]=[i];state.testLocked[index]=true;render({scroll:false});
   }
  });
  $('answer-options').append(button);
 });
 if(q.multiple&&!locked){
  const confirm=$('multi-submit');confirm.classList.remove('hidden');confirm.disabled=!selected.length;
  confirm.onclick=()=>{if(!state.testLocked[index]&&state.tests[index]?.length){state.testLocked[index]=true;render({scroll:false});if(q.id===17&&!state.q17NoticeAcknowledged)openQ17Notice()}};
 }
 if(locked){
  const pass=testIsCorrect(q,selected), correct=q.correct.map(x=>LETTERS[x]+') '+q.options[x]).join('; ');
  const label=q.acceptAnySubset?'Допустимые варианты (достаточно 1–2 из них): ':'Правильный ответ: ';
  const div=makeFeedback(pass,pass?1:0,1,label+correct,q.note||'');
  $('test-feedback').replaceChildren(div);$('test-feedback').classList.remove('hidden');
 }
}
function renderTask(task,index){
 $('item-condition').classList.remove('hidden');$('item-condition').textContent=task.condition;
 $('task-assumption').classList.remove('hidden');$('task-assumption').textContent='Условия автоматической проверки: '+task.assumption;
 const area=$('task-stages');area.classList.remove('hidden');
 task.stages.forEach((step,j)=>{
  const locked=state.taskLocked[index][j],selected=state.tasks[index][j];
  const section=node('section','stage');
  const head=node('div','stage-header');head.append(node('strong','stage-title','Этап '+(j+1)),node('span','stage-points',step.points+' балл.'));
  section.append(head,node('p','stage-prompt',step.prompt));
  if(step.type==='number'){
   const label=node('label','number-label','Ответ в тенге');
   const input=node('input','stage-number');input.type='text';input.inputMode='decimal';input.autocomplete='off';input.placeholder='Например: 123456,78';input.setAttribute('aria-label','Ответ к этапу '+(j+1));
   input.value=selected??'';input.disabled=locked;
   const verify=node('button','btn secondary verify-stage','Проверить ответ');verify.type='button';verify.disabled=locked||!Number.isFinite(parseAmount(input.value));
   const commit=()=>{
    if(state.taskLocked[index][j]||!Number.isFinite(parseAmount(input.value)))return;
    state.tasks[index][j]=input.value;state.taskLocked[index][j]=true;render({scroll:false});
   };
   input.addEventListener('input',()=>{if(locked)return;state.tasks[index][j]=input.value;verify.disabled=!Number.isFinite(parseAmount(input.value))});
   input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit()}});
   verify.addEventListener('click',commit);
   label.append(input);section.append(label);
   if(!locked)section.append(verify);
  }else{
   const choices=node('div','stage-choices');
   step.options.forEach((option,k)=>{
    let cls='stage-choice'+(selected===k?' selected':'');
    if(locked&&step.correct.includes(k))cls+=' correct';
    if(locked&&selected===k&&!step.correct.includes(k))cls+=' wrong';
    const btn=node('button',cls,String.fromCharCode(65+k)+'. '+option);btn.type='button';btn.disabled=locked;
    btn.addEventListener('click',()=>{if(state.taskLocked[index][j])return;state.tasks[index][j]=k;state.taskLocked[index][j]=true;render({scroll:false})});
    choices.append(btn);
   });section.append(choices);
  }
  if(locked){
   const pass=stageCorrect(step,selected),right=step.type==='number'?formatNumber(step.expected)+' тг':step.options[step.correct[0]];
   section.append(makeFeedback(pass,pass?step.points:0,step.points,'Правильный ответ: '+right,step.explanation));
  }
  area.append(section);
 });
}
function formatNumber(n){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n)}
function parseAmount(v){if(typeof v!=='string')return NaN;let value=v.replace(/\s/g,'').replace(/\u00a0/g,'').replace(/,/g,'.');if(!/^[-+]?\d+(?:\.\d+)?$/.test(value))return NaN;return Number(value)}
function stageCorrect(stage,response){if(stage.type==='number'){const x=parseAmount(response);return Number.isFinite(x)&&Math.abs(x-stage.expected)<=stage.tolerance}return response===stage.correct[0]}
function next(){if(!answerReady())return;if(state.step===STEP_COUNT-1){finish();return}state.step++;render()}
function prev(){if(state.step<=0)return;state.step--;render()}
function score(){const questions=exam.questions.map((q,i)=>{const got=state.tests[i]||[];const pass=testIsCorrect(q,got);return {points:pass?1:0,pass}});
 const taskResults=exam.tasks.map((t,i)=>t.stages.map((st,j)=>{const pass=stageCorrect(st,state.tasks[i][j]);return {pass,points:pass?st.points:0}}));return {questions,taskResults,test:questions.reduce((s,x)=>s+x.points,0),task:taskResults.flat().reduce((s,x)=>s+x.points,0)}}
function finish(){state.seconds=elapsed();clearInterval(state.interval);state.interval=null;state.start=null;const res=score();$('test-result').textContent=res.test+' / '+TEST_COUNT;$('task-result').textContent=res.task+' / '+TASK_MAX;$('total-score').textContent=res.test+res.task;$('elapsed-result').textContent=timeString(state.seconds);buildReview(res);showScreen('results')}
function para(text,cl=''){return node('p',cl,text)}
function buildReview(res){const root=$('review-list');root.replaceChildren();root.append(node('h3','review-head','Раздел 1. Тестовые вопросы'));
 exam.questions.forEach((q,i)=>{const d=node('details','review-item');const s=node('summary','',`Вопрос ${q.id} · ${res.questions[i].points}/1 · ${q.question}`);d.append(s);
 const actual=state.tests[i]||[];d.append(para('Ваш ответ: '+actual.map(x=>LETTERS[x]+') '+q.options[x]).join('; ')));
 d.append(para((q.acceptAnySubset?'Допустимые ответы (один или два): ':'Правильный ответ: ')+q.correct.map(x=>LETTERS[x]+') '+q.options[x]).join('; ')));if(q.note)d.append(para('Примечание: '+q.note,'review-note'));root.append(d)});
 root.append(node('h3','review-head','Раздел 2. Практические задачи'));
 exam.tasks.forEach((t,i)=>{const sum=res.taskResults[i].reduce((s,x)=>s+x.points,0);const d=node('details','review-item');d.append(node('summary','',`Задача ${t.id} · ${sum}/${t.points} баллов · ${t.title}`));d.append(para('Проверка выполнена по заранее указанным расчётным допущениям.','review-note'));
 t.stages.forEach((stage,j)=>{const answer=state.tasks[i][j];let my=stage.type==='number'?String(answer):(stage.options[answer]||'Не отвечено');const right=stage.type==='number'?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(stage.expected)+' тг':stage.options[stage.correct[0]];
 const status=res.taskResults[i][j];const part=node('div','review-stage');part.append(para(`Этап ${j+1} · ${status.points}/${stage.points} баллов · ${stage.prompt}`),para('Ваш ответ: '+my),para('Правильный ответ: '+right),para('Пояснение: '+stage.explanation,'review-note'));d.append(part)});
 d.append(para('Развёрнутое решение:','review-note'));const solution=node('div','solution-text',t.solution);d.append(solution);if(t.note)d.append(para('Оговорка: '+t.note,'review-note'));root.append(d)})}
function init(){initTheme();$('q17-notice-ok').addEventListener('click',closeQ17Notice);$('theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme!=='dark'));$('start-btn').addEventListener('click',start);$('restart-btn').addEventListener('click',start);$('next-btn').addEventListener('click',next);$('back-btn').addEventListener('click',prev);$('quit-btn').addEventListener('click',()=>{if(window.confirm('Выйти из теста? Несохранённые результаты текущей попытки будут потеряны.')){clearInterval(state.interval);state.interval=null;state.start=null;showScreen('start')}});$('review-btn').addEventListener('click',()=>{const opened=$('review-list').classList.toggle('hidden')===false;$('review-btn').textContent=opened?'Скрыть разбор':'Разобрать ответы и задания';$('review-btn').setAttribute('aria-expanded',String(opened))})}
document.addEventListener('DOMContentLoaded',init);
