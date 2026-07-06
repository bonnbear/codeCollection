const https = require('https');
const ORIGIN = 'https://bt1207so.top';
function rs(n){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let s='';for(let i=0;i<n;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function ts(d=new Date()){const p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;}
let JAR={};
function cookieHeader(){return Object.entries(JAR).map(([k,v])=>`${k}=${v}`).join('; ');}
function req(url){return new Promise((resolve,reject)=>{
  const u=new URL(url);
  const opt={method:'GET',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36','Referer':ORIGIN+'/','Cookie':cookieHeader()}};
  https.get(u,opt,(res)=>{
    (res.headers['set-cookie']||[]).forEach(c=>{const [kv]=c.split(';');const i=kv.indexOf('=');JAR[kv.slice(0,i)]=kv.slice(i+1);});
    let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body,url}));
  }).on('error',reject);
});}
(async()=>{
  const aywcUid=`${rs(10)}_${ts()}`;
  JAR['aywcUid']=aywcUid;
  const start=Date.now();
  console.log('1) gen ...');
  const gen=await req(`${ORIGIN}/anti/recaptcha/v4/gen?aywcUid=${aywcUid}&_=${Date.now()}`);
  console.log('   status',gen.status,'body:',gen.body.slice(0,200));
  let token;
  try{token=JSON.parse(gen.body).token;}catch{}
  console.log('   token:',token&&token.slice(0,20));
  if(token){
    await new Promise(r=>setTimeout(r,1600));
    console.log('2) verify ...');
    const v=await req(`${ORIGIN}/anti/recaptcha/v4/verify?token=${token}&aywcUid=${aywcUid}&costtime=${Date.now()-start}`);
    console.log('   status',v.status,'location:',v.headers.location);
    console.log('   cookies now:',Object.keys(JAR).join(','));
  }
  console.log('3) fetch home ...');
  const home=await req(ORIGIN+'/');
  console.log('   status',home.status,'len',home.body.length);
  console.log('   title:', (home.body.match(/<title>([\s\S]*?)<\/title>/)||[])[1]);
  require('fs').writeFileSync('_home.html',home.body);
  console.log('   saved _home.html');
})().catch(e=>console.error('ERR',e.message));
