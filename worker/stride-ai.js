const origin="https://wongtszshan.github.io";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"content-type,x-stride-passphrase","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Vary":"Origin","Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"};
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers});
const validDate=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d);
function normalizePlan(raw,allowed){if(!raw||!Array.isArray(raw.days))throw Error("模型没有返回计划列表");const types=["舞蹈有氧","力量训练","跑步","快走","瑜伽","其他运动","休息"];const output=[],seen=new Set();for(const e of raw.days){if(!validDate(e.date)||!allowed.has(e.date)||seen.has(e.date))continue;seen.add(e.date);const type=types.includes(e.type)?e.type:"其他运动",minutes=type==="休息"?0:Math.min(180,Math.max(5,Math.round(Number(e.minutes)||30)));output.push({date:e.date,type,minutes,note:String(e.note||"").slice(0,180)});}if(!output.length)throw Error("返回日期与请求不匹配");return{days:output,summary:String(raw.summary||"").slice(0,500)};}
export default {async fetch(request,env){
 const url=new URL(request.url);if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(request.headers.get("Origin")&&request.headers.get("Origin")!==origin)return reply({error:"Origin not permitted"},403);
 if(url.pathname==="/health"&&request.method==="GET")return reply({ok:true,providers:{kimi:{configured:Boolean(env.KIMI_API_KEY&&env.STRIDE_ACCESS_SECRET),model:env.KIMI_MODEL||"kimi-k2.5"},claude:{configured:Boolean(env.CLAUDE_API_KEY&&env.STRIDE_ACCESS_SECRET),model:env.CLAUDE_MODEL||"claude-sonnet-4-6"}}});
 if(url.pathname!=="/ai"||request.method!=="POST")return reply({error:"Not found"},404);
 if(!env.STRIDE_ACCESS_SECRET)return reply({error:"AI 未配置访问口令 STRIDE_ACCESS_SECRET"},503);
 if(request.headers.get("x-stride-passphrase")!==env.STRIDE_ACCESS_SECRET)return reply({error:"访问口令不正确"},401);
 if(Number(request.headers.get("content-length"))>45000)return reply({error:"Payload too large"},413);
 let body;try{body=await request.json()}catch{return reply({error:"JSON 无效"},400)}
 const task=body?.task,provider=body?.provider||"kimi";if(!["plan","summary"].includes(task))return reply({error:"Unsupported task"},400);if(!["kimi","claude"].includes(provider))return reply({error:"不支持的 AI 服务商"},400);if(provider==="kimi"&&!env.KIMI_API_KEY)return reply({error:"Kimi 尚未配置 KIMI_API_KEY；可以在设置中选择已配置的 Claude"},503);if(provider==="claude"&&!env.CLAUDE_API_KEY)return reply({error:"Claude 尚未配置 CLAUDE_API_KEY；可以在设置中选择已配置的 Kimi"},503);
 let prompt,system="你是谨慎的中文运动计划助手。仅根据提供的数据回答，不虚构事实；不是医疗诊断。避免极端强度与快速减重承诺。如有运动禁忌应先提示咨询专业人士。";
 if(task==="plan"){const p=body.profile||{},dates=body.dates;if(!Array.isArray(dates)||dates.length<1||dates.length>31||!dates.every(validDate))return reply({error:"日期无效"},400);
 prompt="请生成健身安排。仅返回有效 JSON 对象，格式 {days:[{date,type,minutes,note}],summary}，days 每天一条。date 只能取以下日期："+dates.join(",")+"。运动类型仅从 舞蹈有氧、力量训练、跑步、快走、瑜伽、其他运动、休息 选择。休息 minutes 为0。请优先安全、渐进和可持续。用户需求："+JSON.stringify({goal:String(p.goal||"保持健康").slice(0,70),frequency:Math.min(6,Math.max(1,Number(p.frequency)||3)),duration:Math.min(90,Math.max(10,Number(p.duration)||30)),sports:String(p.sports||"").slice(0,100),notes:String(p.notes||"").slice(0,450),history:Array.isArray(p.history)?p.history.slice(-28):[]})}
 else {const metrics=body.metrics||{};prompt="请用简洁的中文总结用户一周训练，包含：完成情况、已知趋势、可能原因（明确是推测）、下一周温和调整建议。不可自行添加数据，不做医学判断。返回普通中文段落。数据："+JSON.stringify(metrics).slice(0,11000)}
 let upstream, value;
 try {
   if(provider==="claude"){
     upstream=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":env.CLAUDE_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:env.CLAUDE_MODEL||"claude-sonnet-4-6",system,messages:[{role:"user",content:prompt}],max_tokens:task==="plan"?4096:1600}),signal:AbortSignal.timeout(55000)});
   }else{
     const endpoint=(env.KIMI_BASE_URL||"https://api.moonshot.ai/v1").replace(/\\/$/,"")+"/chat/completions";
     upstream=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+env.KIMI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.KIMI_MODEL||"kimi-k2.5",messages:[{role:"system",content:system},{role:"user",content:prompt}],max_tokens:task==="plan"?4096:1600}),signal:AbortSignal.timeout(55000)});
   }
 }catch{return reply({error:(provider==="claude"?"Claude":"Kimi")+" 服务暂时无法连接"},502)}
 if(!upstream.ok)return reply({error:(provider==="claude"?"Claude":"Kimi")+" 请求失败（HTTP "+upstream.status+"），请检查密钥、模型和额度"},502);
 let output;try{output=await upstream.json()}catch{return reply({error:"AI 响应格式错误"},502)}
 if(provider==="claude")value=Array.isArray(output?.content)?output.content.filter(b=>b.type==="text").map(b=>b.text).join("\\n"):null;
 else value=output?.choices?.[0]?.message?.content;
 if(typeof value!=="string"||!value.trim())return reply({error:"AI 未返回文本"},502);
 if(task==="summary")return reply({text:value.slice(0,4500)});
 try{const cleaned=value.replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,"");let raw=JSON.parse(cleaned);return reply(normalizePlan(raw,new Set(body.dates)))}catch{return reply({error:"AI 计划结构不符合要求，请重试"},502)}
 }};