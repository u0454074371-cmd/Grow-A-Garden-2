
/*
 GROW GARDEN 2 - FULL PLAYABLE BROWSER GAME
 Single-file runtime. No ES modules, no CDN, no Three.js.
 The game starts locally immediately; Firebase sync is optional/background.
*/

(function(){
"use strict";

/* -------------------- CONFIG -------------------- */
const FIREBASE={
 databaseURL:"https://game-gag2-online-default-rtdb.europe-west1.firebasedatabase.app",
 projectId:"game-gag2-online"
};

const CROPS={
 Carrot:{emoji:"🥕",price:10,sell:18,grow:12,rarity:"Common",xp:5},
 Tomato:{emoji:"🍅",price:35,sell:68,grow:24,rarity:"Uncommon",xp:10},
 Blueberry:{emoji:"🫐",price:100,sell:210,grow:42,rarity:"Rare",xp:20},
 Starfruit:{emoji:"⭐",price:350,sell:850,grow:75,rarity:"Epic",xp:45},
 Moonmelon:{emoji:"🍈",price:1200,sell:3200,grow:140,rarity:"Legendary",xp:100},
 Sunflower:{emoji:"🌻",price:2200,sell:5900,grow:200,rarity:"Mythic",xp:160}
};

const PETS={
 Bunny:{emoji:"🐰",price:250,multiplier:1.10,rarity:"Common"},
 Cat:{emoji:"🐱",price:700,multiplier:1.18,rarity:"Uncommon"},
 Fox:{emoji:"🦊",price:1200,multiplier:1.30,rarity:"Rare"},
 Bee:{emoji:"🐝",price:3500,multiplier:1.60,rarity:"Epic"},
 Dragon:{emoji:"🐉",price:15000,multiplier:2.20,rarity:"Legendary"},
 Phoenix:{emoji:"🔥",price:50000,multiplier:3.00,rarity:"Mythic"}
};

const MUT={
 Normal:1,Giant:2,Golden:4,Rainbow:10
};

const $=id=>document.getElementById(id);
const now=()=>Date.now();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>new Intl.NumberFormat("nl-NL").format(Math.floor(n||0));
const randomId=()=>Math.random().toString(36).slice(2)+"_"+now().toString(36);

/* -------------------- STATE -------------------- */
function defaultPlayer(){
 return {
  id:localId(),
  name:"Garden Player",
  coins:250,gems:10,level:1,xp:0,
  seeds:{Carrot:5,Tomato:2,Blueberry:0,Starfruit:0,Moonmelon:0,Sunflower:0},
  pets:[],equipped:[],
  harvested:0,planted:0,earned:0,
  questHarvest:0,questPlant:0,
  lastSave:now()
 };
}
function defaultGarden(){
 const cells={};
 for(let plot=0;plot<6;plot++)for(let cell=0;cell<64;cell++)cells[plot+":"+cell]=null;
 return {cells};
}
function localId(){
 let id=localStorage.getItem("gg2_id");
 if(!id){id="player_"+randomId();localStorage.setItem("gg2_id",id);}
 return id;
}
function loadLocal(){
 try{return JSON.parse(localStorage.getItem("gg2_save")||"null")}catch(e){return null}
}
function saveLocal(){
 try{localStorage.setItem("gg2_save",JSON.stringify({player,garden,savedAt:now()}));}catch(e){}
}

let saved=loadLocal();
let player=saved&&saved.player?Object.assign(defaultPlayer(),saved.player):defaultPlayer();
let garden=saved&&saved.garden?saved.garden:defaultGarden();
player.id=player.id||localId();

function normalize(){
 if(!garden||!garden.cells)garden=defaultGarden();
 if(!player.seeds)player.seeds=defaultPlayer().seeds;
 if(!Array.isArray(player.pets))player.pets=[];
 if(!Array.isArray(player.equipped))player.equipped=[];
 player.coins=Math.max(0,Number(player.coins)||0);
 player.gems=Math.max(0,Number(player.gems)||0);
 player.level=Math.max(1,Number(player.level)||1);
 player.xp=Math.max(0,Number(player.xp)||0);
}
normalize();

/* -------------------- CANVAS WORLD -------------------- */
const canvas=$("world");
const ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);

function resize(){
 W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);
 canvas.width=W*DPR;canvas.height=H*DPR;
 canvas.style.width=W+"px";canvas.style.height=H+"px";
 ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize);resize();

const plots=[
 {x:-42,z:-34},{x:42,z:-34},{x:-42,z:0},{x:42,z:0},{x:-42,z:34},{x:42,z:34}
];
const world={
 x:0,y:1.75,z:18,vx:0,vy:0,vz:0,yaw:Math.PI,pitch:-.04,ground:true,
 keys:new Set(),touchX:0,touchY:0,
 objects:[],
 time:0
};

function addObj(type,x,y,z,extra){
 const o=Object.assign({type,x,y,z},extra||{});
 world.objects.push(o);return o;
}

/* scenery */
function buildScenery(){
 world.objects.length=0;
 for(let i=0;i<6;i++){
  const p=plots[i];
  addObj("plot",p.x,0,p.z,{plot:i});
  for(let c=0;c<64;c++){
   const gx=c%8,gz=Math.floor(c/8);
   addObj("cell",p.x-12.25+gx*3.5,.15,p.z-12.25+gz*3.5,{plot:i,cell:c});
  }
 }
 addObj("building",0,4,-56,{w:18,d:13,h:8,color:"#af7950",label:"SEED SHOP"});
 addObj("building",-25,4,-56,{w:18,d:13,h:8,color:"#688c5e",label:"SELL BARN"});
 addObj("building",25,4,-56,{w:18,d:13,h:8,color:"#8064a0",label:"PET HOUSE"});
 addObj("pond",-70,.2,58,{w:30,d:20,color:"#4ab5da"});
 for(let i=0;i<36;i++){
  const a=i*Math.PI*2/36,r=75+(i%4)*5;
  addObj("tree",Math.cos(a)*r,3.2,Math.sin(a)*r,{scale:1+(i%3)*.15});
 }
 for(let i=0;i<25;i++){
  const a=i*2.1,r=40+(i%6)*7;
  addObj("rock",Math.cos(a)*r,.8,Math.sin(a)*r,{scale:.8+(i%4)*.2});
 }
 for(let i=0;i<30;i++){
  const a=i*1.9,r=20+(i%7)*3;
  addObj("flower",Math.cos(a)*r,.3,Math.sin(a)*r,{color:["#f18aa0","#f4d15c","#7dbfff"][i%3]});
 }
}
buildScenery();

/* perspective */
function project(x,y,z){
 const dx=x-world.x,dz=z-world.z,dy=y-world.y;
 const sy=Math.sin(-world.yaw),cy=Math.cos(-world.yaw);
 const cx=dx*cy-dz*sy,cz=dx*sy+dz*cy;
 const cp=Math.cos(-world.pitch),sp=Math.sin(-world.pitch);
 const yy=dy*cp-cz*sp,depth=dy*sp+cz*cp;
 if(depth<=.1)return null;
 const f=W/(2*Math.tan(Math.PI/6));
 return{x:W/2+(cx/depth)*f,y:H/2-(yy/depth)*f,depth,scale:f/depth};
}

/* draw background */
function background(){
 const g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,"#78b9de");g.addColorStop(.47,"#cfe0bd");g.addColorStop(.49,"#6da06b");g.addColorStop(1,"#315e38");
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const fog=ctx.createLinearGradient(0,H*.40,0,H*.8);
 fog.addColorStop(0,"rgba(229,240,210,.35)");fog.addColorStop(1,"rgba(74,126,72,0)");
 ctx.fillStyle=fog;ctx.fillRect(0,H*.35,W,H*.45);
}

function poly(points,color,stroke){
 if(points.some(p=>!p))return;
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
 ctx.fillStyle=color;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}

function drawCube(o){
 const w=o.w/2,d=o.d/2,h=o.h;
 const p=[
  project(o.x-w,o.y-h/2,o.z-d),project(o.x+w,o.y-h/2,o.z-d),
  project(o.x+w,o.y+h/2,o.z-d),project(o.x-w,o.y+h/2,o.z-d),
  project(o.x-w,o.y-h/2,o.z+d),project(o.x+w,o.y-h/2,o.z+d),
  project(o.x+w,o.y+h/2,o.z+d),project(o.x-w,o.y+h/2,o.z+d)
 ];
 if(p.some(v=>!v))return;
 const f=[[0,1,2,3,"#745237"],[4,5,6,7,"#896646"],[0,4,7,3,o.color||"#6d8c67"],[1,5,6,2,o.color||"#789f70"],[3,2,6,7,"#8e6a49"],[0,1,5,4,"#68492f"]];
 f.sort((a,b)=>{
  const da=a.slice(0,4).reduce((s,i)=>s+p[i].depth,0);
  const db=b.slice(0,4).reduce((s,i)=>s+p[i].depth,0);
  return db-da;
 });
 f.forEach(a=>poly(a.slice(0,4).map(i=>p[i]),a[4]));
 if(o.label){
  const top=project(o.x,o.y+h/2+.2,o.z);
  if(top){ctx.font="900 "+clamp(top.scale*4,9,19)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText(o.label,top.x,top.y-8);ctx.shadowBlur=0;}
 }
}

function drawTree(o){
 const base=project(o.x,o.y-2.7,o.z),top=project(o.x,o.y+3.4*o.scale,o.z);
 if(!base||!top)return;
 const r=clamp(top.scale*2.2,7,42);
 ctx.fillStyle="#6f482e";ctx.fillRect(base.x-r*.18,top.y+r*.3,r*.36,Math.max(5,base.y-top.y));
 ctx.fillStyle="#2f7e45";ctx.beginPath();ctx.arc(top.x,top.y,r,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#49a15a";ctx.beginPath();ctx.arc(top.x-r*.45,top.y+r*.2,r*.62,0,Math.PI*2);ctx.fill();
}

function drawRock(o){
 const p=project(o.x,o.y,o.z);if(!p)return;const r=clamp(p.scale*1.4*o.scale,2,15);
 ctx.fillStyle="#68746a";ctx.beginPath();ctx.ellipse(p.x,p.y,r*1.4,r*.75,0,0,Math.PI*2);ctx.fill();
}

function drawFlower(o){
 const p=project(o.x,o.y,o.z);if(!p)return;const r=clamp(p.scale*.65,1.2,7);
 ctx.fillStyle=o.color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
}

function drawPond(o){
 const p=project(o.x,o.y,o.z);if(!p)return;
 const rx=clamp(p.scale*o.w*.75,15,120),ry=clamp(p.scale*o.d*.35,6,50);
 ctx.fillStyle=o.color;ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="rgba(255,255,255,.25)";ctx.lineWidth=2;ctx.stroke();
}

function drawCell(o){
 const p=project(o.x,o.y,o.z);if(!p)return;
 const s=clamp(p.scale*1.45,3,30);
 ctx.fillStyle="#8a5937";ctx.fillRect(p.x-s,p.y-s*.45,s*2,s*.9);
 ctx.strokeStyle="rgba(52,31,19,.65)";ctx.strokeRect(p.x-s,p.y-s*.45,s*2,s*.9);
}

function drawCrop(o){
 const key=o.plot+":"+o.cell,c=garden.cells[key];if(!c)return;
 const p=project(o.x,o.y,o.z);if(!p)return;
 const cfg=CROPS[c.name],ready=c.ready||now()>=c.readyAt;
 const growth=clamp((now()-c.plantedAt)/(c.readyAt-c.plantedAt),0,1);
 const h=clamp(p.scale*(ready?2.8:(.5+growth*2)),7,70),w=h*.46;
 const colors={Carrot:"#f08a3d",Tomato:"#ea514d",Blueberry:"#6174e9",Starfruit:"#f0d05a",Moonmelon:"#79d3af",Sunflower:"#ffd24d"};
 ctx.fillStyle=colors[c.name]||"#6fc46d";
 ctx.beginPath();ctx.roundRect(p.x-w/2,p.y-h,w,h,Math.min(9,w*.3));ctx.fill();
 ctx.fillStyle="#4ba258";
 ctx.beginPath();ctx.arc(p.x-w*.2,p.y-h*.92,w*.38,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(p.x+w*.2,p.y-h*.84,w*.38,0,Math.PI*2);ctx.fill();
 if(c.mutation!=="Normal"){ctx.strokeStyle=c.mutation==="Golden"?"#ffdd6c":["#ff6b6b","#ffd96b","#72dd83","#74b8ff","#ce83ff"][Math.floor(now()/180)%5];ctx.lineWidth=3;ctx.stroke();}
 if(ready){ctx.font="900 "+clamp(p.scale*2.8,8,14)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText("READY",p.x,p.y-h-5);ctx.shadowBlur=0;}
}

function draw(){
 background();
 const objs=world.objects.map(o=>{const p=project(o.x,o.y,o.z);return Object.assign({},o,{_p:p})}).filter(o=>o._p&&o._p.depth<220);
 // Add crops as render-only objects
 for(const key in garden.cells){
  const c=garden.cells[key];if(!c)continue;
  const parts=key.split(":").map(Number),plot=parts[0],cell=parts[1],p=plots[plot];
  const gx=cell%8,gz=Math.floor(cell/8);
  const x=p.x-12.25+gx*3.5,z=p.z-12.25+gz*3.5;
  const po=project(x,.4,z);if(po)objs.push({type:"crop",x,y:.4,z,plot,cell,_p:po});
 }
 objs.sort((a,b)=>b._p.depth-a._p.depth);
 objs.forEach(o=>{
  if(o.type==="building")drawCube(o);
  else if(o.type==="tree")drawTree(o);
  else if(o.type==="rock")drawRock(o);
  else if(o.type==="flower")drawFlower(o);
  else if(o.type==="pond")drawPond(o);
  else if(o.type==="cell")drawCell(o);
  else if(o.type==="crop")drawCrop(o);
 });
}

/* -------------------- PLAYER -------------------- */
function move(dt){
 const p=world;
 let x=0,z=0;
 if(p.keys.has("KeyA"))x-=1;if(p.keys.has("KeyD"))x+=1;if(p.keys.has("KeyW"))z+=1;if(p.keys.has("KeyS"))z-=1;
 x+=p.touchX;z+=p.touchY;
 const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
 const speed=(p.keys.has("ShiftLeft")||p.keys.has("ShiftRight"))?10:6;
 const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);
 const dx=sy*z+cy*x,dz=cy*z-sy*x;
 p.vx+=(dx*speed-p.vx)*Math.min(1,dt*11);
 p.vz+=(dz*speed-p.vz)*Math.min(1,dt*11);
 if(!len){p.vx*=Math.max(0,1-dt*7);p.vz*=Math.max(0,1-dt*7);}
 p.x+=p.vx*dt;p.z+=p.vz*dt;
 p.vy-=24*dt;p.y+=p.vy*dt;
 if(p.y<1.75){p.y=1.75;p.vy=0;p.ground=true;}
 p.x=clamp(p.x,-104,104);p.z=clamp(p.z,-104,104);
 // building collision
 const builds=[{x:0,z:-56,w:18,d:13},{x:-25,z:-56,w:18,d:13},{x:25,z:-56,w:18,d:13}];
 builds.forEach(b=>{
  if(p.x>b.x-b.w/2-1&&p.x<b.x+b.w/2+1&&p.z>b.z-b.d/2-1&&p.z<b.z+b.d/2+1){
   p.z=b.z+b.d/2+1.2;
  }
 });
}

function jump(){if(world.ground){world.vy=8.5;world.ground=false;}}

/* -------------------- GAMEPLAY -------------------- */
function mutation(){
 const r=Math.random();return r<.003?"Rainbow":r<.02?"Golden":r<.08?"Giant":"Normal";
}
function plant(plot,cell){
 const key=plot+":"+cell,name=selectedSeed,cfg=CROPS[name];
 if(garden.cells[key])return msg("Dit veld is al bezet.","warn");
 if((player.seeds[name]||0)<=0)return msg("Je hebt geen "+name+" seeds.","warn");
 const t=now();player.seeds[name]--;player.planted++;player.questPlant++;
 garden.cells[key]={name,plot,cell,plantedAt:t,readyAt:t+cfg.grow*1000,ready:false,mutation:mutation()};
 saveLocal();ui();
 msg(cfg.emoji+" "+name+" geplant!");
}
function petMultiplier(){
 return (player.equipped||[]).reduce((m,id)=>{
  const pet=player.pets.find(p=>p.id===id),cfg=pet&&PETS[pet.name];return m*(cfg?cfg.multiplier:1);
 },1);
}
function harvest(plot,cell){
 const key=plot+":"+cell,c=garden.cells[key];
 if(!c)return msg("Hier groeit niets.","warn");
 if(!(c.ready||now()>=c.readyAt))return msg("Deze crop groeit nog.","warn");
 const cfg=CROPS[c.name],mut=MUT[c.mutation]||1;
 const value=Math.floor(cfg.sell*mut*petMultiplier());
 player.coins+=value;player.xp+=cfg.xp;player.harvested++;player.earned+=value;player.questHarvest++;
 let leveled=0;
 while(player.xp>=player.level*100){player.xp-=player.level*100;player.level++;leveled++;}
 garden.cells[key]=null;saveLocal();ui();
 msg("🌟 "+c.mutation+" harvest · +🪙 "+fmt(value));
 if(leveled)msg("🎉 LEVEL "+player.level+"!");
}
function buySeed(name){
 const c=CROPS[name];if(player.coins<c.price)return msg("Niet genoeg coins.","warn");
 player.coins-=c.price;player.seeds[name]=(player.seeds[name]||0)+1;saveLocal();ui();msg(c.emoji+" "+name+" gekocht.");
}
function buyPet(name){
 const c=PETS[name];if(player.coins<c.price)return msg("Niet genoeg coins.","warn");
 player.coins-=c.price;player.pets.push({id:randomId(),name});saveLocal();ui();msg(c.emoji+" "+name+" gekocht.");
}
function togglePet(id){
 const at=player.equipped.indexOf(id);
 if(at>=0){player.equipped.splice(at,1);}
 else{if(player.equipped.length>=3)return msg("Maximaal 3 pets.","warn");if(player.pets.some(p=>p.id===id))player.equipped.push(id);}
 saveLocal();ui();
}

/* -------------------- UI -------------------- */
let selectedSeed="Carrot";
function ui(){
 $("coins").textContent=fmt(player.coins);
 $("gems").textContent=fmt(player.gems);
 $("level").textContent=player.level;
 $("status").textContent=online?"FIREBASE ONLINE":"LOCAL SAVE";
 $("questText").textContent=Math.min(10,player.questHarvest)+" / 10";
 $("questBar").style.width=Math.min(100,player.questHarvest/10*100)+"%";
 $("seeds").className="seedbar";
 $("seeds").innerHTML=Object.keys(CROPS).map(n=>`<button class="seed ${selectedSeed===n?"sel":""}" data-seed="${n}"><em>${CROPS[n].emoji}</em><small>${n}</small><b>${player.seeds[n]||0}</b></button>`).join("");
 $("seeds").querySelectorAll("[data-seed]").forEach(b=>b.onclick=()=>{selectedSeed=b.dataset.seed;ui()});
}
function msg(text,type){
 const e=document.createElement("div");e.className="toast "+(type||"");e.textContent=text;$("toast").appendChild(e);setTimeout(()=>e.remove(),2600);
}
function showHelp(){
 const e=$("helpPanel");e.hidden=false;e.innerHTML=`<div class="modal"><h2>Grow Garden 2</h2><p><b>WASD</b> lopen · <b>Shift</b> sprinten · <b>Spatie</b> springen · <b>muis</b> rondkijken · <b>E</b> interactie.</p><p>Kijk naar een leeg tuinveld en druk E om de geselecteerde seed te planten. Kijk naar een rijpe crop en druk E om te oogsten.</p><button id="closeHelp">Sluiten</button></div>`;$("closeHelp").onclick=()=>e.hidden=true;
}
function showShop(){
 const e=$("helpPanel");e.hidden=false;e.innerHTML=`<div class="modal"><h2>Seed Shop</h2><p>Je coins: 🪙 ${fmt(player.coins)}</p>${Object.entries(CROPS).map(([n,c])=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:8px 0;padding:10px;border:1px solid #294a32;border-radius:11px"><span>${c.emoji} <b>${n}</b><small style="color:#9db1a0"> ${c.rarity}</small></span><button data-buy="${n}">🪙 ${fmt(c.price)}</button></div>`).join("")}<button id="closeShop">Sluiten</button></div>`;
 e.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buySeed(b.dataset.buy));e.querySelector("#closeShop").onclick=()=>e.hidden=true;
}
function showPets(){
 const e=$("helpPanel");e.hidden=false;e.innerHTML=`<div class="modal"><h2>Pet House</h2><p>Multiplier: ×${petMultiplier().toFixed(2)}</p>${Object.entries(PETS).map(([n,c])=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:8px 0;padding:10px;border:1px solid #294a32;border-radius:11px"><span>${c.emoji} <b>${n}</b><small style="color:#9db1a0"> ×${c.multiplier}</small></span><button data-pet="${n}">🪙 ${fmt(c.price)}</button></div>`).join("")}<h3>Mijn pets</h3>${player.pets.map(p=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:6px 0"><span>${PETS[p.name].emoji} ${p.name}</span><button data-equip="${p.id}">${player.equipped.includes(p.id)?"Unequip":"Equip"}</button></div>`).join("")||"<p>Nog geen pets.</p>"}<button id="closePets">Sluiten</button></div>`;
 e.querySelectorAll("[data-pet]").forEach(b=>b.onclick=()=>showPetsBuy(b.dataset.pet));e.querySelectorAll("[data-equip]").forEach(b=>b.onclick=()=>{togglePet(b.dataset.equip);showPets();});e.querySelector("#closePets").onclick=()=>e.hidden=true;
}
function showPetsBuy(n){buyPet(n);showPets();}
function interaction(){
 const target=lookTarget();
 if(!target){msg("Kijk naar een veld of crop.","warn");return;}
 if(target.type==="crop")harvest(target.plot,target.cell);
 else if(target.type==="cell")plant(target.plot,target.cell);
}
function lookTarget(){
 let best=null,score=1e9;
 // crops
 for(const key in garden.cells){
  const c=garden.cells[key];if(!c)continue;
  const a=key.split(":").map(Number),plot=a[0],cell=a[1],p=plots[plot],gx=cell%8,gz=Math.floor(cell/8);
  const o={type:"crop",plot,cell,x:p.x-12.25+gx*3.5,y:.4,z:p.z-12.25+gz*3.5};
  const q=project(o.x,o.y,o.z);if(!q||q.depth>18)continue;
  const d=Math.hypot(q.x-W/2,q.y-H/2);if(d<score&&d<120){best=o;score=d;}
 }
 if(best)return best;
 for(const o of world.objects){
  if(o.type!=="cell")continue;
  const q=project(o.x,o.y,o.z);if(!q||q.depth>18)continue;
  const d=Math.hypot(q.x-W/2,q.y-H/2);if(d<score&&d<120){best=o;score=d;}
 }
 return best;
}

/* -------------------- INPUT -------------------- */
document.addEventListener("keydown",e=>{
 world.keys.add(e.code);
 if(e.code==="Space"){e.preventDefault();jump();}
 if(e.code==="KeyE")interaction();
});
document.addEventListener("keyup",e=>world.keys.delete(e.code));
canvas.addEventListener("click",()=>{
 try{canvas.requestPointerLock&&canvas.requestPointerLock();}catch(e){}
});
document.addEventListener("mousemove",e=>{
 if(document.pointerLockElement===canvas){
  world.yaw-=e.movementX*.0024;world.pitch-=e.movementY*.0018;world.pitch=clamp(world.pitch,-1.15,1.15);
 }
});
$("help").onclick=showHelp;$("shop").onclick=showShop;$("pets").onclick=showPets;

let online=false;
async function firebaseBackground(){
 // REST is deliberately optional. The game never waits for it.
 try{
  const id=encodeURIComponent(player.id);
  const r=await fetch(FIREBASE.databaseURL+"/players/"+id+".json");
  if(r.ok){
   const remote=await r.json();
   if(remote&&typeof remote==="object"){
    player=Object.assign(player,remote,{id:player.id,seeds:Object.assign(player.seeds,remote.seeds||{})});
    online=true;ui();
   }
  }
 }catch(e){/* local mode is expected when database rules/auth block access */}
}
async function firebaseSave(){
 if(!online)return;
 try{
  const id=encodeURIComponent(player.id);
  await fetch(FIREBASE.databaseURL+"/players/"+id+".json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(player)});
 }catch(e){}
}

/* -------------------- MOBILE -------------------- */
if(matchMedia("(pointer:coarse)").matches){
 $("mobile").hidden=false;
 const joy=$("joy"),stick=$("joyStick");let active=false;
 joy.addEventListener("pointerdown",e=>{active=true;joy.setPointerCapture(e.pointerId);joyMove(e)});
 joy.addEventListener("pointermove",e=>{if(active)joyMove(e)});
 joy.addEventListener("pointerup",()=>{active=false;world.touchX=world.touchY=0;stick.style.transform="translate(0,0)"});
 function joyMove(e){
  const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy;
  const max=42,len=Math.hypot(dx,dy),s=Math.min(1,max/Math.max(1,len));const x=dx*s,y=dy*s;
  world.touchX=x/max;world.touchY=y/max;stick.style.transform=`translate(${x}px,${y}px)`;
 }
 $("jump").onclick=jump;$("interact").onclick=interaction;
}

/* -------------------- BOOT / LOOP -------------------- */
function boot(){
 const bar=$("loading-progress"),text=$("loading-text");
 bar.style.width="35%";text.textContent="Wereld klaarzetten...";
 // The canvas game is already available: no network call, no module import.
 buildScenery();
 bar.style.width="70%";text.textContent="Gameplay laden...";
 ui();
 draw();
 bar.style.width="100%";text.textContent="Klaar!";
 setTimeout(()=>{
  $("loading").style.display="none";$("hud").hidden=false;
  msg("Welkom! WASD om te lopen.");
 },120);
 setTimeout(firebaseBackground,200);
}
let last=performance.now();
function loop(t){
 const dt=Math.min(.035,(t-last)/1000);last=t;
 move(dt);draw();
 const c=lookTarget();
 if(c){$("interaction").hidden=false;$("interactionTitle").textContent=c.type==="crop"?(garden.cells[c.plot+":"+c.cell]?.ready?"Oogsten":"Crop groeit"):"Planten"}
 else $("interaction").hidden=true;
 requestAnimationFrame(loop);
}
setInterval(saveLocal,30000);setInterval(firebaseSave,60000);
addEventListener("beforeunload",saveLocal);

boot();
requestAnimationFrame(loop);

})();
