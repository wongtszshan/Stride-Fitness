const origin="https://wongtszshan.github.io";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"content-type,x-stride-passphrase","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Vary":"Origin","Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"};
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers});
const validDate=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d);
function normalizePlan(raw,allowed,sports){if(!raw||!Array.isArray(raw.days))throw Error("模型没有返回计划列表");const types=[...new Set([...sports,"休息"])];const output=[],seen=new Set();for(const e of raw.days){if(!validDate(e.date)||!allowed.has(e.date)||seen.has(e.date))continue;seen.add(e.date);const type=types.includes(e.type)?e.type:(String(e.type||"").trim()==="休息"?"休息":sports[0]),minutes=type==="休息"?0:Math.min(180,Math.max(5,Math.round(Number(e.minutes)||30)));output.push({date:e.date,type,minutes,note:String(e.note||"").slice(0,180)});}if(!output.length)throw Error("返回日期与请求不匹配");return{days:output,summary:String(raw.summary||"").slice(0,500)};}

const SYNC_REPO="wongtszshan/Stride-Fitness-data";
const SYNC_FILE="fitness.json";
async function githubFile(env){
 const response=await fetch("https://api.github.com/repos/"+SYNC_REPO+"/contents/"+SYNC_FILE,{headers:{"Authorization":"Bearer "+env.STRIDE_GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Stride-Fitness-Sync"},cache:"no-store"});
 if(!response.ok){
  const status=response.status;
  const details=status===401?"GitHub Token 无效、已过期，或未获授权":
    status===403?"GitHub 拒绝访问：可能是 Token 权限不足、访问限制或额度限制":
    status===404?"GitHub 找不到此仓库或文件：常见原因是 Fine-grained Token 未授权访问 Stride-Fitness-data 私库":
    status===429?"GitHub 请求暂时受限，请稍后重试":
    "GitHub 返回 HTTP "+status;
  throw new Error(details+" (HTTP "+status+")");
 }
 const content=await response.json();
 const bytes=Uint8Array.from(atob(content.content.replace(/\s/g,"")),c=>c.charCodeAt(0));
 return{sha:content.sha,document:JSON.parse(new TextDecoder().decode(bytes))}
}
function validFitness(data){
 return data&&typeof data==="object"&&!Array.isArray(data)&&data.plans&&typeof data.plans==="object"&&!Array.isArray(data.plans)&&data.logs&&typeof data.logs==="object"&&!Array.isArray(data.logs)&&Array.isArray(data.weights)&&typeof data.nickname==="string"&&Object.keys(data.plans).length<3000&&Object.keys(data.logs).length<3000&&data.weights.length<4000;
}
async function handleSync(request,env,url){
 if(!env.STRIDE_GITHUB_TOKEN)return reply({error:"尚未配置 STRIDE_GITHUB_TOKEN，云端同步未启用"},503);
 if(Number(request.headers.get("content-length"))>450000)return reply({error:"同步数据超过大小限制"},413);
 let current;try{current=await githubFile(env)}catch(e){return reply({error:"私库读取失败："+e.message+"。请检查 GitHub Fine-grained Token 的仓库选择和 Contents 权限。",code:"GITHUB_READ_FAILED"},502)}
 if(url.pathname==="/sync/read")return reply({ok:true,sha:current.sha,document:current.document});
 let payload;try{payload=await request.json()}catch{return reply({error:"JSON 格式错误"},400)}
 if(typeof payload?.sha!=="string"||payload.sha!==current.sha)return reply({error:"云端数据已被其他设备修改，未覆盖任何数据。请先处理冲突。",code:"CONFLICT",cloud:current.document,sha:current.sha},409);
 if(!validFitness(payload?.data))return reply({error:"记录格式无效"},400);
 const doc={schemaVersion:1,revision:(Number(current.document?.revision)||0)+1,updatedAt:new Date().toISOString(),data:payload.data};
 const binary=new TextEncoder().encode(JSON.stringify(doc,null,2));if(binary.length>310000)return reply({error:"记录过大"},413);
 let chunk="";for(const b of binary)chunk+=String.fromCharCode(b);
 const result=await fetch("https://api.github.com/repos/"+SYNC_REPO+"/contents/"+SYNC_FILE,{method:"PUT",headers:{"Authorization":"Bearer "+env.STRIDE_GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Stride-Fitness-Sync","Content-Type":"application/json"},body:JSON.stringify({message:"sync: update Stride fitness records",sha:current.sha,content:btoa(chunk)})});
 if(result.status===409||result.status===422)return reply({error:"GitHub 检测到版本冲突，云端未被覆盖",code:"CONFLICT"},409);
 if(!result.ok)return reply({error:"GitHub 写入失败 HTTP "+result.status},502);
 const written=await result.json();
 return reply({ok:true,sha:written.content?.sha,revision:doc.revision,updatedAt:doc.updatedAt});
}

export default {async fetch(request,env){
 const url=new URL(request.url);if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(request.headers.get("Origin")&&request.headers.get("Origin")!==origin)return reply({error:"Origin not permitted"},403);
 if(url.pathname==="/health"&&request.method==="GET")return reply({ok:true,providers:{kimi:{configured:Boolean(env.KIMI_API_KEY&&env.STRIDE_ACCESS_SECRET),model:env.KIMI_MODEL||"kimi-k2.5"},claude:{configured:Boolean(env.CLAUDE_API_KEY&&env.STRIDE_ACCESS_SECRET),model:env.CLAUDE_MODEL||"claude-sonnet-4-6"}}});
 if(!["/ai","/auth","/sync/read","/sync/write"].includes(url.pathname)||request.method!=="POST")return reply({error:"Not found"},404);
 if(!env.STRIDE_ACCESS_SECRET)return reply({error:"AI 未配置访问口令 STRIDE_ACCESS_SECRET"},503);
 if(request.headers.get("x-stride-passphrase")!==env.STRIDE_ACCESS_SECRET)return reply({error:"访问口令不正确"},401);
 if(url.pathname==="/auth")return reply({ok:true,providers:{kimi:Boolean(env.KIMI_API_KEY),claude:Boolean(env.CLAUDE_API_KEY)},syncConfigured:Boolean(env.STRIDE_GITHUB_TOKEN)});
 if(url.pathname.startsWith("/sync/"))return handleSync(request,env,url);
 if(Number(request.headers.get("content-length"))>45000)return reply({error:"Payload too large"},413);
 let body;try{body=await request.json()}catch{return reply({error:"JSON 无效"},400)}
 const task=body?.task,provider=body?.provider||"kimi";if(!["plan","summary"].includes(task))return reply({error:"Unsupported task"},400);if(!["kimi","claude"].includes(provider))return reply({error:"不支持的 AI 服务商"},400);if(provider==="kimi"&&!env.KIMI_API_KEY)return reply({error:"Kimi 尚未配置 KIMI_API_KEY；可以在设置中选择已配置的 Claude"},503);if(provider==="claude"&&!env.CLAUDE_API_KEY)return reply({error:"Claude 尚未配置 CLAUDE_API_KEY；可以在设置中选择已配置的 Kimi"},503);
 let prompt,system="你是谨慎的中文运动计划助手。仅根据提供的数据回答，不虚构事实；不是医疗诊断。避免极端强度与快速减重承诺。如有运动禁忌应先提示咨询专业人士。";
 if(task==="plan"){const p=body.profile||{},dates=body.dates;if(!Array.isArray(dates)||dates.length<1||dates.length>84||!dates.every(validDate))return reply({error:"日期无效"},400);const sports=Array.isArray(p.sports)?[...new Set(p.sports.filter(x=>typeof x==="string").map(x=>x.trim()).filter(x=>x&&x!=="休息"&&x.length<=28))].slice(0,20):[];if(!sports.length)return reply({error:"请至少选择一种喜欢的运动"},400);
 prompt="请生成健身安排。仅返回有效 JSON 对象，格式 {days:[{date,type,minutes,note}],summary}，days 每天一条。date 只能取以下日期："+dates.join(",")+"。请每个日期只安排一天，不要缺漏。每条 note 控制在30个汉字内以避免长周期输出超限。训练类型只能使用用户勾选的运动："+sports.join("、")+"，或休息。严禁自行增加未选择的运动项目。休息 minutes 为0。请优先安全、渐进和可持续。用户需求："+JSON.stringify({goal:String(p.goal||"保持健康").slice(0,240),frequency:Math.min(6,Math.max(1,Number(p.frequency)||3)),duration:Math.min(90,Math.max(10,Number(p.duration)||30)),sports,notes:String(p.notes||"").slice(0,450),history:Array.isArray(p.history)?p.history.slice(-28):[]})}
 else {const metrics=body.metrics||{};prompt="请用简洁的中文总结用户一周训练，包含：完成情况、已知趋势、可能原因（明确是推测）、下一周温和调整建议。不可自行添加数据，不做医学判断。返回普通中文段落。数据："+JSON.stringify(metrics).slice(0,11000)}
 let upstream, value;
 try {
   if(provider==="claude"){
     upstream=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":env.CLAUDE_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:env.CLAUDE_MODEL||"claude-sonnet-4-6",system,messages:[{role:"user",content:prompt}],max_tokens:task==="plan"?8192:1600}),signal:AbortSignal.timeout(55000)});
   }else{
     const endpoint=(env.KIMI_BASE_URL||"https://api.moonshot.ai/v1").replace(/[/]$/,"")+"/chat/completions";
     upstream=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+env.KIMI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.KIMI_MODEL||"kimi-k2.5",messages:[{role:"system",content:system},{role:"user",content:prompt}],max_tokens:task==="plan"?4096:1600}),signal:AbortSignal.timeout(55000)});
   }
 }catch{return reply({error:(provider==="claude"?"Claude":"Kimi")+" 服务暂时无法连接"},502)}
 if(!upstream.ok)return reply({error:(provider==="claude"?"Claude":"Kimi")+" 请求失败（HTTP "+upstream.status+"），请检查密钥、模型和额度"},502);
 let output;try{output=await upstream.json()}catch{return reply({error:"AI 响应格式错误"},502)}
 if(provider==="claude")value=Array.isArray(output?.content)?output.content.filter(b=>b.type==="text").map(b=>b.text).join("\\n"):null;
 else value=output?.choices?.[0]?.message?.content;
 if(typeof value!=="string"||!value.trim())return reply({error:"AI 未返回文本"},502);
 if(task==="summary")return reply({text:value.slice(0,4500)});
 try{const cleaned=value.replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,"");let raw=JSON.parse(cleaned);return reply(normalizePlan(raw,new Set(body.dates),Array.isArray(body.profile?.sports)?body.profile.sports.filter(x=>typeof x==="string"&&x.trim()&&x!=="休息").slice(0,20):["其他运动"]))}catch{return reply({error:"AI 计划结构不符合要求，请重试"},502)}
 }};