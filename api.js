export const TYPES={
  github:{name:'GitHub stats',def:{user:'torvalds'},f:[['user','GitHub username']]},
  news:{name:'Hacker News',def:{count:5},f:[['count','Stories to show (3–10)']]},
  weather:{name:'Weather',def:{city:'Bhubaneswar'},f:[['city','City']]},
  crypto:{name:'Crypto prices',def:{coins:'bitcoin,ethereum,solana'},f:[['coins','CoinGecko ids, comma separated']]}
};
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const hash=s=>[...String(s)].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);

/* ---------- data: fake (with delay) and live ---------- */
export async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error('Request failed ('+r.status+')');return r.json()}
export const FAKE={
  async github(c){await sleep(900);const h=hash(c.user);return{login:c.user,name:c.user[0].toUpperCase()+c.user.slice(1),repos:h%90+5,followers:h%5000+20,stars:h%12000+50}},
  async news(c){await sleep(1200);const t=['Show HN: A tiny database in 500 lines','Why our build got 10x faster','The case for boring technology','Ask HN: What are you building this weekend?','A visual guide to CSS grid','Rust 2.0 roadmap announced','How we cut cloud costs by 40%','Understanding WebAssembly memory','Postgres tips you may not know','Writing a compiler in a weekend'];
    return t.slice(0,c.count).map((x,i)=>({title:x,score:400-i*37,by:'user'+(i+3),url:'#',n:i*12+9}))},
  async weather(c){await sleep(1000);const h=hash(c.city);return{city:c.city,t:h%30+5,wind:h%25+3,code:[0,1,2,3,61,95][h%6]}},
  async crypto(c){await sleep(800);return c.coins.split(',').map(s=>s.trim()).filter(Boolean).map(id=>{const h=hash(id);return{id,price:(h%60000)/(h%3?10:1)+1,chg:((h%1000)/100)-5}})}
};
export const WC={0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',51:'Drizzle',61:'Rain',63:'Rain',71:'Snow',80:'Showers',95:'Thunderstorm'};
export const LIVE={
  async github(c){const u=await getJSON('https://api.github.com/users/'+encodeURIComponent(c.user));
    const rp=await getJSON('https://api.github.com/users/'+encodeURIComponent(c.user)+'/repos?per_page=100');
    return{login:u.login,name:u.name||u.login,repos:u.public_repos,followers:u.followers,stars:rp.reduce((a,r)=>a+r.stargazers_count,0)}},
  async news(c){const ids=(await getJSON('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0,c.count);
    const it=await Promise.all(ids.map(i=>getJSON('https://hacker-news.firebaseio.com/v0/item/'+i+'.json')));
    return it.map(x=>({title:x.title,score:x.score,by:x.by,n:x.descendants||0,url:x.url||'https://news.ycombinator.com/item?id='+x.id}))},
  async weather(c){const g=await getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&name='+encodeURIComponent(c.city));
    if(!g.results)throw new Error('City not found: '+c.city);const p=g.results[0];
    const w=await getJSON('https://api.open-meteo.com/v1/forecast?latitude='+p.latitude+'&longitude='+p.longitude+'&current=temperature_2m,wind_speed_10m,weather_code');
    return{city:p.name+(p.country?', '+p.country:''),t:Math.round(w.current.temperature_2m),wind:Math.round(w.current.wind_speed_10m),code:w.current.weather_code}},
  async crypto(c){const ids=c.coins.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).join(',');
    const d=await getJSON('https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&ids='+encodeURIComponent(ids));
    const k=Object.keys(d);if(!k.length)throw new Error('No matching coins. Use CoinGecko ids like "bitcoin".');
    return k.map(id=>({id,price:d[id].usd,chg:d[id].usd_24h_change||0}))}
};
