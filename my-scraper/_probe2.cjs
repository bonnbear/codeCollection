const https=require('https');const fs=require('fs');
const ORIGIN='https://bt1207so.top';
function rs(n){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let s='';for(let i=0;i<n;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function ts(d=new Date()){const p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;}
let JAR={};
function ch(){return Object.entries(JAR).map(([k,v])=>`${k}=${v}`).join('; ');}
function req(url){return new Promise((res,rej)=>{const u=new URL(url);https.get(u,{headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36','Referer':ORIGIN+'/','Cookie':ch()}},(r)=>{(r.headers['set-cookie']||[]).forEach(c=>{const[kv]=c.split(';');const i=kv.indexOf('=');JAR[kv.slice(0,i)]=kv.slice(i+1);});let b='';r.on('data',d=>b+=d);r.on('end',()=>res({status:r.statusCode,headers:r.headers,body:b}));}).on('error',rej);});}
async function pass(){const aywcUid=`${rs(10)}_${ts()}`;JAR['aywcUid']=aywcUid;const st=Date.now();const g=await req(`${ORIGIN}/anti/recaptcha/v4/gen?aywcUid=${aywcUid}&_=${Date.now()}`);const t=JSON.parse(g.body).token;await new Promise(r=>setTimeout(r,1600));await req(`${ORIGIN}/anti/recaptcha/v4/verify?token=${t}&aywcUid=${aywcUid}&costtime=${Date.now()-st}`);}
async function get(url){let r=await req(url);if(/recaptcha-form|Bot Challenge/.test(r.body)){await pass();r=await req(url);}return r;}
(async()=>{
  await pass();
  const kw=encodeURIComponent('成');
  const s=await get(`${ORIGIN}/search?keyword=${kw}`);
  console.log('search status',s.status,'len',s.body.length);
  fs.writeFileSync('_search.html',s.body);
  // 抽取详情链接候选
  const links=[...s.body.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).filter(h=>/\/(hash|detail|info|topic)\//i.test(h)||/[0-9a-f]{40}/i.test(h));
  console.log('candidate detail links:',[...new Set(links)].slice(0,10));
  if(links.length){
    let d=links[0];if(d.startsWith('/'))d=ORIGIN+d;
    const dp=await get(d);
    console.log('detail status',dp.status,'len',dp.body.length,'url',d);
    fs.writeFileSync('_detail.html',dp.body);
    console.log('has magnet:', /magnet:\?/.test(dp.body));
  }
})().catch(e=>console.error('ERR',e.message));
