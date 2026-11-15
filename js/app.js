
const STRIDE_GOALS_KEY='stride_training_goals_v1';
const STRIDE_GOALS_DEFAULT=['减脂塑形','增强体能','提升力量','建立运动习惯','提高柔韧性','减压放松','改善睡眠','运动表现'];
let goalPrefs=loadGoalPrefs();
function loadGoalPrefs(){try{let p=JSON.parse(localStorage.getItem(STRIDE_GOALS_KEY)||'null');if(p&&Array.isArray(p.selected))return{selected:p.selected.filter(v=>typeof v==='string'),custom:typeof p.custom==='string'?p.custom:''}}catch{}return{selected:['增强体能'],custom:''}}
function persistGoalPrefs(){goalPrefs.custom=$('customGoal')?.value||'';localStorage.setItem(STRIDE_GOALS_KEY,JSON.stringify(goalPrefs))}
function drawGoals(){const wrap=$('goalChoices');if(!wrap)return;wrap.replaceChildren();STRIDE_GOALS_DEFAULT.forEach(goal=>{const selected=goalPrefs.selected.includes(goal),button=document.createElement('button');button.type='button';button.className='sport-chip'+(selected?' chosen':'');button.setAttribute('aria-pressed',String(selected));button.textContent=goal;button.onclick=()=>{goalPrefs.selected=selected?goalPrefs.selected.filter(x=>x!==goal):[...goalPrefs.selected,goal];persistGoalPrefs();drawGoals()};wrap.appendChild(button)})}
function selectedGoals(){return [...goalPrefs.selected,($('customGoal')?.value||'').trim()].filter(Boolean)}
function getPlanInputs(){const goals=selectedGoals(),weeks=Number($('period')?.value),start=$('planStart')?.value,frequency=Number($('frequency')?.value),minutes=Number($('duration')?.value);
if(!goals.length){toast('请至少选择或填写一个训练目标');$('goalChoices').scrollIntoView({behavior:'smooth',block:'center'});return null}
if(!Number.isInteger(weeks)||weeks<1||weeks>12){toast('训练周期请选择 1–12 周');return null}
if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||start<today()){toast('请选择今天或之后的开始日期');return null}
return{goals,weeks,start,frequency,minutes}
}


const STRIDE_SPORT_DEFAULTS=['舞蹈有氧','力量训练','跑步','快走','瑜伽','普拉提','骑行','游泳','跳绳','拉伸'];
const STRIDE_SPORT_SELECTION_KEY='stride_sport_preferences_v1';
let sportPreferences=loadSportPreferences();
function loadSportPreferences(){
 try{const x=JSON.parse(localStorage.getItem(STRIDE_SPORT_SELECTION_KEY)||'null');
 if(x&&Array.isArray(x.selected)&&Array.isArray(x.custom))return{selected:x.selected.filter(v=>typeof v==='string'),custom:x.custom.filter(v=>typeof v==='string')} }
 catch{}return{selected:['舞蹈有氧','力量训练'],custom:[]}
}
function sportList(){return [...new Set([...STRIDE_SPORT_DEFAULTS,...sportPreferences.custom])]}
function selectedSports(){return sportList().filter(x=>sportPreferences.selected.includes(x))}
function storeSportPreferences(){localStorage.setItem(STRIDE_SPORT_SELECTION_KEY,JSON.stringify(sportPreferences))}
function drawSports(){
 const wrap=$('sportChoices');if(!wrap)return;
 wrap.innerHTML='';
 sportList().forEach(s=>{const b=document.createElement('button');b.type='button';b.className='sport-chip'+(sportPreferences.selected.includes(s)?' chosen':'');b.setAttribute('aria-pressed',String(sportPreferences.selected.includes(s)));b.textContent=s;b.onclick=()=>toggleSport(s);wrap.appendChild(b)});
 const chosen=selectedSports();$('sportSelectionStatus').textContent=chosen.length?'已选择 '+chosen.length+' 种：'+chosen.join('、'):'请至少选择一种运动后再生成计划。';
}
function toggleSport(s){sportPreferences.selected=sportPreferences.selected.includes(s)?sportPreferences.selected.filter(v=>v!==s):[...sportPreferences.selected,s];storeSportPreferences();drawSports()}
function addCustomSport(){const input=$('customSportInput'),name=input.value.trim().replace(/\s+/g,' ');if(!name)return toast('请输入运动名称');if(name.length>28)return toast('名称请控制在 28 个字符以内');if(name==='休息')return toast('休息日由计划自动安排');if(!sportList().includes(name)){sportPreferences.custom.push(name)}if(!sportPreferences.selected.includes(name))sportPreferences.selected.push(name);input.value='';storeSportPreferences();drawSports();populateDayTypes($('daytype').value);toast('已添加：'+name)}
function ensureSports(){const sports=selectedSports();if(!sports.length){toast('请至少选择一种喜欢的运动');$('sportChoices').scrollIntoView({behavior:'smooth',block:'center'});return null}return sports}


const key='stride_fit_v1',today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Singapore'});const initial=()=>({plans:{},logs:{},weights:[],nickname:''});let data;try{data={...initial(),...JSON.parse(localStorage.getItem(key)||'{}')}}catch{data=initial()}let picked=today(),view=new Date(picked+'T12:00:00'),pending=[];const $=id=>document.getElementById(id),save=()=>{localStorage.setItem(key,JSON.stringify(data));render()},fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}),iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),add=(date,n)=>{let d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)},startWeek=d=>{let x=new Date(d+'T12:00:00');x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)};function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2600)}function nav(p){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));render();scrollTo(0,0)}document.querySelectorAll('#nav button').forEach(x=>x.onclick=()=>nav(x.dataset.page));function openDay(d){picked=d;view=new Date(d+'T12:00:00');nav('calendar');setTimeout(()=>document.querySelector('.day-detail')?.scrollIntoView({behavior:'smooth',block:'start'}),90)}function moveMonth(n){view=new Date(view.getFullYear(),view.getMonth()+n,1);picked=iso(view);render()}
function populateDayTypes(current){
 const select=$('daytype'),existing=new Set([...STRIDE_SPORT_DEFAULTS,...sportPreferences.custom,...Object.values(data.plans).map(p=>p?.type).filter(Boolean),'其他运动','休息']);
 const previous=select.value;
 select.replaceChildren();
 for(const name of existing){const o=document.createElement('option');o.value=name;o.textContent=name;select.appendChild(o)}
 select.value=existing.has(current)?current:(existing.has(previous)?previous:'休息');
}
function renderCalendar(){let y=view.getFullYear(),m=view.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();$('monthtitle').textContent=y+' 年 '+(m+1)+' 月';let s=['一','二','三','四','五','六','日'].map(x=>'<div class="weekday">'+x+'</div>').join('');for(let i=0;i<start;i++)s+='<div></div>';for(let i=1;i<=days;i++){let d=iso(new Date(y,m,i)),p=data.plans[d],l=data.logs[d],type=l?.status==='done'?'done':l?.status==='missed'?'missed':'';s+='<button class="day '+type+(d===picked?' selected':'')+'" data-date="'+d+'"><div class="num">'+i+'</div><div class="mark">'+(l?.status==='done'?'✓':l?.status==='missed'?'×':'')+'</div><div class="dlabel">'+(p?.type||'')+'</div></button>'}$('calendargrid').innerHTML=s;document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{picked=b.dataset.date;renderCalendar();if(window.innerWidth<701){document.querySelector('.day-detail')?.scrollIntoView({behavior:'smooth',block:'start'})}});let p=data.plans[picked],l=data.logs[picked];populateDayTypes(p?.type||'休息');$('selectedtitle').textContent=fmt(picked);$('selectedstatus').textContent=l?.status==='done'?'已完成':l?.status==='missed'?'未完成':p?.type==='休息'?'休息日':p?'待执行':'待安排';$('daytype').value=p?.type||'休息';$('dayminutes').value=p?.minutes??30;$('daynote').value=p?.note||'';$('actualminutes').value=l?.minutes??p?.minutes??30;$('actualnote').value=l?.note||''}
function saveDayPlan(){data.plans[picked]={type:$('daytype').value,minutes:Math.max(0,Number($('dayminutes').value)||0),note:$('daynote').value.trim()};save();toast('计划已保存')}function removeDay(){if(!data.plans[picked])return toast('当天没有计划');if(!confirm('删除 '+picked+' 的训练计划？已有打卡记录仍会保留。'))return;delete data.plans[picked];save();toast('计划已删除')}function completeDay(){if(!data.plans[picked]&&$('daytype').value!=='休息'){data.plans[picked]={type:$('daytype').value,minutes:Number($('dayminutes').value)||0,note:$('daynote').value.trim()}}data.logs[picked]={status:'done',minutes:Math.max(0,Number($('actualminutes').value)||0),note:$('actualnote').value.trim()};save();toast('打卡成功 ✓')}function missDay(){if(data.plans[picked]?.type==='休息')return toast('休息日不需要标记未完成');data.logs[picked]={status:'missed',minutes:0,note:$('actualnote').value.trim()};save();toast('已记录未完成')}function clearLog(){if(!data.logs[picked])return toast('当天没有打卡记录');if(!confirm('清除 '+picked+' 的打卡记录？'))return;delete data.logs[picked];save();toast('已清除打卡记录')}
function weekData(){let start=startWeek(today()),end=add(start,6),entries=Object.entries(data.logs).filter(([d,l])=>d>=start&&d<=end&&l.status==='done'),planned=Object.entries(data.plans).filter(([d,p])=>d>=start&&d<=end&&p.type!=='休息'),donePlans=planned.filter(([d])=>data.logs[d]?.status==='done');return {start,end,entries,planned,donePlans,minutes:entries.reduce((a,[,l])=>a+l.minutes,0)}}function renderHome(){let w=weekData(),p=data.plans[today()],l=data.logs[today()];$('dateheading').textContent=fmt(today());$('weekdone').textContent=w.entries.length+' 次';$('weekminutes').textContent=w.minutes+' 分';$('weekrate').textContent=w.planned.length?Math.round(w.donePlans.length/w.planned.length*100)+'%':'—';$('todayplan').innerHTML='<h2 style="margin:0">'+(p?.type||'今天还没有训练安排')+'</h2><p class="muted">'+(p?(p.minutes+' 分钟 · '+(p.note||'按自己的节奏完成训练')):'可以自由运动，或前往计划页生成日程')+'</p><span class="pill">'+(l?.status==='done'?'已完成':l?.status==='missed'?'未完成':'等待打卡')+'</span>';const upcoming=Object.entries(data.plans).filter(([d,p])=>d>today()&&p.type!=='休息').sort((a,b)=>a[0].localeCompare(b[0]))[0];if($('upcoming'))$('upcoming').textContent=upcoming?'下次训练 · '+upcoming[0].slice(5).replace('-','/')+' · '+upcoming[1].type+' · '+upcoming[1].minutes+' 分钟':'还没有下一次计划，去安排一周训练吧';let rows=Object.entries(data.logs).filter(([,l])=>l.status==='done').sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5);$('recent').innerHTML=rows.length?rows.map(([d,l])=>'<div class="rowitem"><div>'+d+' · '+(data.plans[d]?.type||'自主训练')+'</div><span class="pill">'+l.minutes+' 分钟</span></div>').join(''):'<div class="empty">还没有记录，完成第一次训练后就会出现在这里。</div>'}
function generatePlan(){
 const types=ensureSports(),cfg=getPlanInputs();if(!types||!cfg)return;
 const {weeks,start,frequency,minutes}=cfg;
 const offsets=frequency===2?[0,3]:frequency===3?[0,2,4]:frequency===4?[0,2,4,5]:frequency===5?[0,1,2,4,5]:[0,1,2,3,4,5];
 pending=[];
 for(let day=0;day<weeks*7;day++){
 const d=add(start,day),ix=offsets.indexOf(day%7),active=ix!==-1;
 pending.push({date:d,type:active?types[(Math.floor(day/7)*frequency+ix)%types.length]:'休息',minutes:active?minutes:0,note:active?'按喜好轮换运动；训练前热身、循序渐进':'恢复与休息'});
 }
 $('previewitems').innerHTML='<div class="notice">本地计划按运动种类轮换安排；如需根据目标个性化设计，请使用 AI 生成计划。</div>'+pending.map(p=>'<div class="preview-row"><span class="preview-date">'+p.date.slice(5)+'</span><span class="preview-name">'+esc(p.type)+(p.minutes?' · '+p.minutes+' 分':'')+'</span><span class="preview-note">'+esc(p.note)+'</span></div>').join('');
 $('planpreview').classList.remove('hide');$('planpreview').scrollIntoView({behavior:'smooth',block:'start'});toast('计划已预览，确认后才会写入日历')
}
function applyPlan(){if(!pending.length)return;let conflicts=pending.some(p=>data.plans[p.date]);if(conflicts&&!confirm('这些日期已有部分计划，确认覆盖计划内容？已有打卡记录不会删除。'))return;pending.forEach(p=>data.plans[p.date]={type:p.type,minutes:p.minutes,note:p.note});pending=[];$('planpreview').classList.add('hide');save();toast('训练计划已写入日历');nav('calendar')}
function addWeight(){let date=$('weightdate').value,val=Number($('weightvalue').value);if(!date||!Number.isFinite(val)||val<20||val>350)return toast('请输入有效日期和体重');data.weights=data.weights.filter(x=>x.date!==date);data.weights.push({date,kg:val});data.weights.sort((a,b)=>a.date.localeCompare(b.date));$('weightvalue').value='';save();toast('体重已记录')}function renderStats(){let logs=Object.values(data.logs).filter(l=>l.status==='done'),weights=data.weights;$('totaldone').textContent=logs.length;$('totalminutes').textContent=logs.reduce((a,l)=>a+l.minutes,0);$('latestweight').textContent=weights.length?weights.at(-1).kg+' kg':'—';$('weightlist').innerHTML=weights.slice(-8).reverse().map(w=>'<div class="rowitem"><span>'+w.date+'</span><span>'+w.kg+' kg <button class="btn danger" data-weight="'+w.date+'" style="padding:5px 8px">删除</button></span></div>').join('')||'<p class="muted">暂无体重记录。每周记录一次即可。</p>';document.querySelectorAll('[data-weight]').forEach(b=>b.onclick=()=>{data.weights=data.weights.filter(x=>x.date!==b.dataset.weight);save()});let points=weights.slice(-10),svg=$('weightchart');if(points.length<2){svg.innerHTML='<text x="160" y="95" text-anchor="middle" fill="#99a89f" font-size="12">至少记录两次体重后显示曲线</text>'}else{let values=points.map(x=>x.kg),min=Math.min(...values)-.5,max=Math.max(...values)+.5,coords=points.map((x,i)=>[25+i*270/(points.length-1),145-(x.kg-min)/(max-min)*110]);svg.innerHTML='<path d="M 25 145 H 300" stroke="#dee9de" fill="none"/><polyline points="'+coords.map(x=>x.join(',')).join(' ')+'" stroke="#4a9c73" fill="none" stroke-width="3"/>'+coords.map((x,i)=>'<circle cx="'+x[0]+'" cy="'+x[1]+'" r="4" fill="#4a9c73"/><text x="'+x[0]+'" y="'+(x[1]-11)+'" text-anchor="middle" fill="#607a69" font-size="10">'+points[i].kg+'</text>').join('')}}function renderReport(){let w=weekData(),rate=w.planned.length?Math.round(w.donePlans.length/w.planned.length*100):null,weights=data.weights.filter(x=>x.date>=w.start&&x.date<=w.end);$('report').innerHTML='<p><b>'+w.start+' 至 '+w.end+'</b></p><p>本周完成 <b>'+w.entries.length+'</b> 次训练，共 <b>'+w.minutes+'</b> 分钟。'+(rate===null?'本周尚无安排的训练计划。':'计划训练完成率为 <b>'+rate+'%</b>。')+'</p><p>'+ (w.planned.length===0?'建议先规划符合实际时间的一周训练。':rate>=80?'计划执行情况较好，可以继续维持当前节奏。':rate>=50?'可以适当降低单次训练难度，优先培养稳定习惯。':'建议先减少每周训练天数，选择更容易坚持的运动。')+'</p><p class="muted">'+(weights.length?'本周有 '+weights.length+' 条体重记录，建议结合长期趋势观察。':'本周没有体重记录；体重为可选指标，不影响运动打卡。')+'</p>'}
function render(){renderHome();renderCalendar();renderStats();renderReport();$('nickname').value=data.nickname||''}function saveSettings(){data.nickname=$('nickname').value.trim();save();toast('设置已保存')}function exportData(){let blob=new Blob([JSON.stringify({app:'Stride',version:1,exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='stride-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}$('fileinput').onchange=async e=>{try{let x=JSON.parse(await e.target.files[0].text());if(x.app!=='Stride'||!x.data||typeof x.data.plans!=='object'||typeof x.data.logs!=='object'||!Array.isArray(x.data.weights))throw Error('格式错误');if(!confirm('导入将覆盖当前浏览器记录，确定吗？'))return;data={...initial(),...x.data};save();toast('导入成功')}catch(err){toast('导入失败：'+err.message)}finally{e.target.value=''}};function resetData(){if(!confirm('确定清空此浏览器全部记录？此操作无法撤销。'))return;data=initial();save();toast('已清空')}$('weightdate').value=today();render();

/* Visual analytics: computed entirely from recorded data, no fabricated samples */
let statsRange='7';
const statColors=['#448f68','#8cbda2','#8faad5','#e5ba82','#a8a0cb','#83b7b5','#cb9fa1'];
function statsStart(){if(statsRange==='all')return '0000-01-01';return add(today(),-(Number(statsRange)-1))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function metricData(){const start=statsStart(),now=today();const logs=Object.entries(data.logs).filter(([d,l])=>d>=start&&d<=now&&l?.status==='done');const plans=Object.entries(data.plans).filter(([d,p])=>d>=start&&d<=now&&p?.type!=='休息');let completed=plans.filter(([d])=>data.logs[d]?.status==='done').length;return{start,now,logs,plans,completed,minutes:logs.reduce((s,[d,l])=>s+(Number(l.minutes)||0),0)}}
function svgText(x,y,s,opts=''){return '<text x="'+x+'" y="'+y+'" '+opts+'>'+esc(s)+'</text>'}
function emptyGraph(msg){return svgText(320,125,msg,'class="svg-empty" text-anchor="middle"')}
function plotWeight(){const all=data.weights.filter(w=>w&&/^\d{4}-\d{2}-\d{2}$/.test(w.date)&&w.date<=today()&&Number.isFinite(Number(w.kg))).sort((a,b)=>a.date.localeCompare(b.date));const visible=all.filter(w=>w.date>=statsStart()),first=all[0],last=all.at(-1),delta=first&&last&&first!==last?Number(last.kg)-Number(first.kg):null;const compact=(w)=>w?Number(w.kg).toFixed(1):'—';
$('weightSummary').innerHTML='<div><span class="wlabel">起始体重</span><strong>'+compact(first)+' <small>kg</small></strong></div><div><span class="wlabel">当前体重</span><strong>'+compact(last)+' <small>kg</small></strong></div><div><span class="wlabel">累计变化</span><strong>'+(delta===null?'—':(delta>0?'+':'')+delta.toFixed(1))+' <small>kg</small></strong></div>';
$('statWeightFoot').textContent=last?'最近记录 '+last.date:'体重数据可选';
const svg=$('weightchart');if(visible.length<2){svg.innerHTML=emptyGraph(visible.length===1?'当前周期只有 1 次体重记录':'记录至少两次体重，即可看到趋势');return}
const vals=visible.map(w=>Number(w.kg)),bottom=Math.min(...vals),top=Math.max(...vals),pad=Math.max(.3,(top-bottom)*.2),min=bottom-pad,max=top+pad;
const left=57,right=617,upper=23,low=200;
const xs=visible.map((w,i)=>left+i*(right-left)/(visible.length-1));const ys=vals.map(v=>low-(v-min)/(max-min)*(low-upper));
let markup='<defs><linearGradient id="weightfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#78b58d" stop-opacity=".23"/><stop offset="100%" stop-color="#78b58d" stop-opacity="0"/></linearGradient></defs>';
for(let i=0;i<=4;i++){let y=upper+i*(low-upper)/4;markup+='<line class="chart-gridline" x1="'+left+'" y1="'+y+'" x2="'+right+'" y2="'+y+'"/>'+svgText(42,y+4,(max-(max-min)*i/4).toFixed(1),'class="chart-axis-label" text-anchor="end"')}
const pairs=xs.map((x,i)=>x.toFixed(1)+','+ys[i].toFixed(1));
markup+='<polygon points="'+left+','+low+' '+pairs.join(' ')+' '+right+','+low+'" fill="url(#weightfill)"/><polyline points="'+pairs.join(' ')+'" stroke="#408b62" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
xs.forEach((x,i)=>{let isLast=i===xs.length-1;markup+='<circle cx="'+x+'" cy="'+ys[i]+'" r="'+(isLast?6:3.5)+'" fill="#fff" stroke="#448f68" stroke-width="2.5"><title>'+esc(visible[i].date+' · '+vals[i]+' kg')+'</title></circle>';if(i===0||isLast||visible.length<5)markup+=svgText(x,238,visible[i].date.slice(5),'class="chart-axis-label" text-anchor="middle"')});
svg.innerHTML=markup;
}
function plotDuration(m){const dates=[];let span=statsRange==='all'?Math.min(30,Math.max(7,Math.ceil((new Date(m.now+'T12:00:00')-new Date((m.logs[0]?.[0]||m.now)+'T12:00:00'))/86400000)+1)):Math.min(30,Number(statsRange));for(let i=span-1;i>=0;i--)dates.push(add(today(),-i));const sum={};m.logs.forEach(([d,l])=>sum[d]=(sum[d]||0)+(Number(l.minutes)||0));const values=dates.map(d=>sum[d]||0);$('durationTotal').textContent='当前范围共 '+m.minutes+' 分钟';
let svg=$('durationchart');if(!m.logs.length){svg.innerHTML=emptyGraph('完成第一次训练后，这里会出现柱状图');return}
const max=Math.max(30,...values)*1.16,left=47,right=625,top=30,bottom=203,width=(right-left)/dates.length;let s='';
for(let k=0;k<5;k++){const y=bottom-(bottom-top)*k/4;s+='<line class="chart-gridline" x1="'+left+'" x2="'+right+'" y1="'+y+'" y2="'+y+'"/>'+svgText(35,y+4,Math.round(max*k/4),'class="chart-axis-label" text-anchor="end"')}
dates.forEach((d,i)=>{let h=values[i]/max*(bottom-top),x=left+i*width+width*.17,w=Math.max(2,width*.66);if(h>0)s+='<rect x="'+x+'" y="'+(bottom-h)+'" width="'+w+'" height="'+h+'" rx="'+Math.min(6,w/2)+'" fill="'+(d===today()?'#2b7855':'#96c7a5')+'"><title>'+esc(d+'：'+values[i]+' 分钟')+'</title></rect>';if(i===0||i===dates.length-1||(dates.length<=7)||(i%Math.ceil(dates.length/6)===0))s+=svgText(x+w/2,233,d.slice(5).replace('-','/'),'class="chart-axis-label" text-anchor="middle"')});svg.innerHTML=s;
}
function plotTypes(m){let totals={};m.logs.forEach(([d,l])=>{let name=data.plans[d]?.type||'自主训练';if(name==='休息')name='自主训练';totals[name]=(totals[name]||0)+(Number(l.minutes)||0)});let items=Object.entries(totals).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),total=items.reduce((s,[,v])=>s+v,0);$('typeTotal').textContent=total;const svg=$('typechart');if(!total){svg.innerHTML='<circle cx="110" cy="110" r="73" fill="none" stroke="#edf3ed" stroke-width="24"/>'; $('typelegend').innerHTML='<div class="muted">暂无训练数据，打卡后显示占比。</div>';return}
let offset=0,s='<circle cx="110" cy="110" r="73" fill="none" stroke="#edf3ed" stroke-width="24"/>';const circum=2*Math.PI*73;
items.forEach(([name,v],i)=>{let len=circum*v/total,color=statColors[i%statColors.length];s+='<circle cx="110" cy="110" r="73" fill="none" stroke="'+color+'" stroke-width="24" stroke-dasharray="'+len+' '+(circum-len)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 110 110)"><title>'+esc(name+'：'+v+' 分钟')+'</title></circle>';offset+=len});svg.innerHTML=s;
$('typelegend').innerHTML=items.slice(0,7).map(([name,v],i)=>'<div class="legend-item"><span class="legend-dot" style="background:'+statColors[i%statColors.length]+'"></span><span>'+esc(name)+'</span><b>'+Math.round(v/total*100)+'%</b></div>').join('');
}
function plotHeatmap(){const start=add(startWeek(today()),-11*7),end=add(start,83),days=84;const colors=['#edf2ed','#d1e9d7','#9dceb0','#59a47c','#2f805c'];let hits=0,s='';for(let i=0;i<days;i++){const d=add(start,i),l=data.logs[d],v=d>today()?0:(l?.status==='done'?Math.max(0,Number(l.minutes)||0):0);const idx=d>today()?0:v===0?(l?.status==='done'?1:0):v<20?1:v<40?2:v<60?3:4;if(l?.status==='done'&&d<=today())hits++;s+='<div class="heat-day" style="background:'+colors[idx]+';'+(d>today()?'opacity:.32':'')+'" title="'+esc(d+(l?.status==='done'?' · 完成 '+v+' 分钟':l?.status==='missed'?' · 未完成':' · 无打卡'))+'" aria-label="'+esc(d+(l?.status==='done'?' 完成训练':' 未打卡'))+'"></div>'}$('heatmap').innerHTML=s;$('heatmapFoot').textContent='近 12 周累计 '+hits+' 天完成打卡'}
renderStats=function(){const m=metricData(),allWeights=data.weights.filter(w=>w&&w.date<=today()).sort((a,b)=>a.date.localeCompare(b.date));$('totaldone').textContent=m.logs.length;$('totalminutes').textContent=m.minutes;$('latestweight').textContent=allWeights.length?Number(allWeights.at(-1).kg).toFixed(1)+' kg':'—';$('statCompletion').textContent=m.plans.length?Math.round(m.completed/m.plans.length*100)+'%':'—';$('statCompletionFoot').textContent=m.plans.length?'完成 '+m.completed+' / 计划 '+m.plans.length+' 次':'当前范围暂无训练计划';$('statSessionsFoot').textContent=m.logs.length?'已记录的完成训练':'完成训练后自动统计';$('statMinutesFoot').textContent='选定时间范围内';if(!$('weightdate').value)$('weightdate').value=today();$('weightlist').innerHTML=data.weights.slice(-8).reverse().map(w=>'<div class="rowitem"><span>'+esc(w.date)+'</span><span>'+esc(w.kg)+' kg <button class="btn danger" data-weight="'+esc(w.date)+'" style="padding:5px 8px">删除</button></span></div>').join('')||'<p class="muted">暂无体重记录，每周记录一次即可。</p>';document.querySelectorAll('[data-weight]').forEach(b=>b.onclick=()=>{data.weights=data.weights.filter(x=>x.date!==b.dataset.weight);save()});plotWeight();plotDuration(m);plotTypes(m);plotHeatmap()};
document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{statsRange=b.dataset.range;document.querySelectorAll('[data-range]').forEach(x=>x.classList.toggle('on',x===b));renderStats()}));


const STRIDE_AI_ENDPOINT="https://stride-fitness-api.wangtszshan.workers.dev";
const aiProvider=()=>localStorage.getItem('stride_ai_provider')==='claude'?'claude':'kimi';
const aiProviderLabel=()=>aiProvider()==='claude'?'Claude':'Kimi';
function changeAIProvider(){const v=$('aiProvider').value;localStorage.setItem('stride_ai_provider',v);$('aiProviderNote').textContent='当前使用 '+(v==='claude'?'Claude (Anthropic Messages API)':'Kimi (Moonshot Chat Completions API)')+'。更换服务商不会删除训练数据。';$('aiStatusText').textContent='已切换服务商，请检测连接';}

const aiPass=()=>sessionStorage.getItem('stride_ai_access')||'';
function saveAISettings(){const x=$('aiAccess').value.trim();if(!x)return toast('请输入 Worker 访问口令');sessionStorage.setItem('stride_ai_access',x);toast('口令仅保存于本次浏览器会话')}
async function checkAI(){const b=$('aiCheckButton');b.disabled=true;b.textContent='检测中…';try{const r=await fetch(STRIDE_AI_ENDPOINT+'/health');const x=await r.json(),p=x.providers?.[aiProvider()];$('aiStatusText').textContent=!p?'AI 服务暂不可用':p.configured?'已配置 ✓ '+aiProviderLabel()+' · '+p.model:'尚未配置 '+aiProviderLabel()+' 所需的 Cloudflare Secret 或访问口令';}catch(e){$('aiStatusText').textContent='连接失败：'+e.message}finally{b.disabled=false;b.textContent='检测 AI 连接'}}
async function callStrideAI(payload){const pass=aiPass();if(!pass)throw Error('请先前往「设置」保存 Stride AI 访问口令');const r=await fetch(STRIDE_AI_ENDPOINT+'/ai',{method:'POST',headers:{'Content-Type':'application/json','x-stride-passphrase':pass},body:JSON.stringify({...payload,provider:aiProvider()})});let x=await r.json();if(!r.ok)throw Error(x.error||'AI 请求失败');return x}
async function generateAIPlan(){const sports=ensureSports(),cfg=getPlanInputs();if(!sports||!cfg)return;const btn=$('aiPlanButton');btn.disabled=true;btn.textContent='✦ AI 正在制定…';try{const {weeks,start,frequency,minutes,goals}=cfg,dates=[];for(let i=0;i<weeks*7;i++)dates.push(add(start,i));
const history=Object.entries(data.logs).sort((a,b)=>a[0].localeCompare(b[0])).slice(-28).map(([date,l])=>({date,status:l.status,minutes:l.minutes,exercise:data.plans[date]?.type||'自主训练'}));
const response=await callStrideAI({task:'plan',dates,profile:{goal:goals.join('；'),frequency,duration:minutes,sports,notes:$('ainotes').value,history}});if(!Array.isArray(response.days)||!response.days.length)throw Error('AI 未返回有效计划');pending=response.days;$('previewitems').innerHTML='<div class="notice" style="margin-bottom:12px">✦ ' + aiProviderLabel() + ' AI 建议：'+esc(response.summary||'请根据身体状态调整训练')+'</div>'+pending.map(p=>'<div class="preview-row"><span class="preview-date">'+esc(p.date.slice(5))+'</span><span class="preview-name">'+esc(p.type)+(p.minutes?' · '+p.minutes+' 分':'')+'</span><span class="preview-note">'+esc(p.note||'')+'</span></div>').join('');$('planpreview').classList.remove('hide');$('planpreview').scrollIntoView({behavior:'smooth',block:'start'});toast('AI 计划已生成，请预览后再确认')}catch(e){toast(e.message);alert('AI 暂时无法生成计划：'+e.message+'\n你仍可使用本地规则生成功能。')}finally{btn.disabled=false;btn.textContent='✦ AI 生成计划'}}
async function generateAIReport(){const btn=$('aiReportButton');btn.disabled=true;btn.textContent='✦ 正在分析…';try{const w=weekData(),weights=data.weights.filter(x=>x.date>=w.start&&x.date<=w.end);const recent=Object.entries(data.logs).filter(([d])=>d>=w.start&&d<=w.end).map(([date,l])=>({date,status:l.status,minutes:l.minutes,type:data.plans[date]?.type||'自主训练'}));const x=await callStrideAI({task:'summary',metrics:{weekStart:w.start,weekEnd:w.end,planned:w.planned.length,completedPlanned:w.donePlans.length,completedTotal:w.entries.length,trainingMinutes:w.minutes,recent,weights}});$('aiReportText').textContent=x.text||'无内容';$('aiReportOutput').classList.remove('hide');toast('AI 周总结已生成')}catch(e){toast(e.message);alert('AI 总结未完成：'+e.message)}finally{btn.disabled=false;btn.textContent='✦ AI 周总结'}}
drawSports();$('planStart').value=today();$('customGoal').value=goalPrefs.custom;drawGoals();$('customGoal').addEventListener('input',persistGoalPrefs);$('customSportInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCustomSport()}});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update().catch(()=>{})).catch(()=>{}))}
$('aiAccess').value=aiPass();$('aiProvider').value=aiProvider();changeAIProvider();



/* PWA update manager: compare actual deployed asset URLs with loaded ones.
   No manually synchronized release IDs; never erase localStorage. */
let strideUpgradeDismissed='',strideUpdateWorking=false;
const strideAssetRefs=(html)=>{
  const styles=[...html.matchAll(/href=["']([^"']*css\/style\.css[^"']*)["']/g)].map(x=>x[1]);
  const scripts=[...html.matchAll(/src=["']([^"']*js\/app\.js[^"']*)["']/g)].map(x=>x[1]);
  return [...styles,...scripts].join('|');
};
const strideCurrentAssetRefs=()=>{
 const style=document.querySelector('link[rel="stylesheet"][href*="css/style.css"]');
 const script=document.querySelector('script[src*="js/app.js"]');
 return [(style?.getAttribute('href')||''),(script?.getAttribute('src')||'')].join('|');
};
let strideRemoteAssets=strideCurrentAssetRefs();
function showStrideUpdate(refs){
 strideRemoteAssets=refs;if(refs===strideUpgradeDismissed)return;
 document.getElementById('updateBanner')?.classList.remove('hide');
}
function dismissStrideUpdate(){
 strideUpgradeDismissed=strideRemoteAssets;document.getElementById('updateBanner')?.classList.add('hide');
}
async function fetchDeployedAssetRefs(){
 const response=await fetch('./index.html?stride_check='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw Error('Cannot check latest version');
 return strideAssetRefs(await response.text());
}
async function checkStrideUpdates(){
 if(!navigator.onLine||strideUpdateWorking)return;
 try{
  const remote=await fetchDeployedAssetRefs(),current=strideCurrentAssetRefs();
  if(!remote||!current)return;
  if(remote!==current)showStrideUpdate(remote);
  else {strideUpgradeDismissed='';document.getElementById('updateBanner')?.classList.add('hide');}
  if('serviceWorker' in navigator){
   const registration=await navigator.serviceWorker.getRegistration('./');
   if(registration)registration.update().catch(()=>{});
  }
 }catch{}
}
async function applyStrideUpdate(){
 if(strideUpdateWorking)return;
 strideUpdateWorking=true;
 const b=document.querySelector('#updateBanner button.btn');
 if(b){b.disabled=true;b.textContent='更新中…';}
 try{
  if('serviceWorker' in navigator){
   const registration=await navigator.serviceWorker.getRegistration('./');
   if(registration){await registration.update();if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});}
  }
  const target=new URL(location.href);target.searchParams.set('stride_refresh',String(Date.now()));
  location.replace(target.toString());
 }catch(e){
  strideUpdateWorking=false;
  if(b){b.disabled=false;b.textContent='更新应用';}
  toast('更新暂时失败，请检查网络后重试');
 }
}
window.addEventListener('pageshow',()=>setTimeout(checkStrideUpdates,1200));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkStrideUpdates()});
window.addEventListener('online',checkStrideUpdates);
setInterval(()=>{if(document.visibilityState==='visible')checkStrideUpdates()},15*60*1000);
