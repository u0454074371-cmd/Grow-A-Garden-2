
/* Grow Garden 2 FINAL
   Zero build step, zero module imports, zero CDN dependency.
   The game is made to start immediately on GitHub Pages.
*/
(function(){
"use strict";

var canvas=document.getElementById("world");
var ctx=canvas && canvas.getContext ? canvas.getContext("2d") : null;

if(!canvas || !ctx){
  document.body.innerHTML="<div style='padding:40px;color:white;background:#07110b;font:16px system-ui'>Je browser kan de game-canvas niet starten.</div>";
  return;
}

var W=0,H=0,DPR=1;
function resize(){
  W=window.innerWidth;H=window.innerHeight;DPR=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.floor(W*DPR));
  canvas.height=Math.max(1,Math.floor(H*DPR));
  canvas.style.width=W+"px";canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener("resize",resize);
resize();

var CROPS={
 Carrot:{emoji:"🥕",price:10,sell:18,grow:8},
 Tomato:{emoji:"🍅",price:35,sell:68,grow:15},
 Blueberry:{emoji:"🫐",price:100,sell:210,grow:28},
 Starfruit:{emoji:"⭐",price:350,sell:850,grow:48},
 Moonmelon:{emoji:"🍈",price:1200,sell:3200,grow:80},
 Sunflower:{emoji:"🌻",price:2200,sell:5900,grow:110}
};
var PETS={
 Bunny:{emoji:"🐰",price:250,mult:1.1},
 Cat:{emoji:"🐱",price:700,mult:1.18},
 Fox:{emoji:"🦊",price:1200,mult:1.3},
 Bee:{emoji:"🐝",price:3500,mult:1.6},
 Dragon:{emoji:"🐉",price:15000,mult:2.2},
 Phoenix:{emoji:"🔥",price:50000,mult:3}
};
var MUT={Normal:1,Giant:2,Golden:4,Rainbow:10};

function clone(o){return JSON.parse(JSON.stringify(o));}
function id(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function fmt(n){return new Intl.NumberFormat("nl-NL").format(Math.floor(Number(n)||0));}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function toast(text,type){
  var e=document.createElement("div");e.className="toast "+(type||"");e.textContent=text;
  document.getElementById("toast").appendChild(e);setTimeout(function(){e.remove();},2600);
}
function defaultPlayer(){
  return{id:id(),name:"Garden Player",coins:250,gems:10,level:1,xp:0,seeds:{Carrot:5,Tomato:2,Blueberry:0,Starfruit:0,Moonmelon:0,Sunflower:0},pets:[],equipped:[],harvested:0,planted:0,earned:0};
}
function defaultGarden(){
  var c={};for(var p=0;p<6;p++)for(var i=0;i<64;i++)c[p+":"+i]=null;
  return{cells:c};
}
var SAVE="gg2_final_playable";
var saved=null;
try{saved=JSON.parse(localStorage.getItem(SAVE)||"null");}catch(e){}
var player=saved&&saved.player?Object.assign(defaultPlayer(),saved.player):defaultPlayer();
var garden=saved&&saved.garden?saved.garden:defaultGarden();
if(!garden.cells)garden=defaultGarden();
if(!player.seeds)player.seeds=defaultPlayer().seeds;
if(!Array.isArray(player.pets))player.pets=[];
if(!Array.isArray(player.equipped))player.equipped=[];
var selected="Carrot";

function save(){
  try{localStorage.setItem(SAVE,JSON.stringify({player:player,garden:garden,savedAt:Date.now()}));}catch(e){}
}

var plots=[
 {x:-42,z:-34},{x:42,z:-34},{x:-42,z:0},{x:42,z:0},{x:-42,z:34},{x:42,z:34}
];

var cam={x:0,y:1.75,z:18,vx:0,vy:0,vz:0,yaw:Math.PI,pitch:-.03,ground:true};
var keys={};
var touch={x:0,y:0};
var objects=[];

function add(type,x,y,z,opt){objects.push(Object.assign({type:type,x:x,y:y,z:z},opt||{}));}
function build(){
  objects=[];
  plots.forEach(function(p,index){
    add("plot",p.x,0,p.z,{plot:index});
    for(var zz=0;zz<8;zz++)for(var xx=0;xx<8;xx++){
      add("cell",p.x-12.25+xx*3.5,.15,p.z-12.25+zz*3.5,{plot:index,cell:zz*8+xx});
    }
  });
  add("building",0,4,-56,{w:18,d:13,h:8,color:"#ad764d",label:"SEED SHOP"});
  add("building",-25,4,-56,{w:18,d:13,h:8,color:"#698f5e",label:"SELL BARN"});
  add("building",25,4,-56,{w:18,d:13,h:8,color:"#8065a3",label:"PET HOUSE"});
  add("pond",-70,.2,58,{w:30,d:20,color:"#4db8df"});
  for(var i=0;i<38;i++){
    var a=i*Math.PI*2/38,r=75+(i%5)*4;
    add("tree",Math.cos(a)*r,3.1,Math.sin(a)*r,{scale:1+(i%3)*.12});
  }
  for(var j=0;j<24;j++){
    var a2=j*2.24,r2=42+(j%6)*7;
    add("rock",Math.cos(a2)*r2,.8,Math.sin(a2)*r2,{scale:.8+(j%3)*.2});
  }
}
build();

function project(x,y,z){
  var dx=x-cam.x,dz=z-cam.z,dy=y-cam.y;
  var sy=Math.sin(-cam.yaw),cy=Math.cos(-cam.yaw);
  var cx=dx*cy-dz*sy,cz=dx*sy+dz*cy;
  var cp=Math.cos(-cam.pitch),sp=Math.sin(-cam.pitch);
  var yy=dy*cp-cz*sp,depth=dy*sp+cz*cp;
  if(depth<=.12)return null;
  var f=W/(2*Math.tan(Math.PI/6));
  return{x:W/2+(cx/depth)*f,y:H/2-(yy/depth)*f,depth:depth,scale:f/depth};
}
function poly(p,color){
  if(!p||p.some(function(x){return !x;}))return;
  ctx.beginPath();p.forEach(function(v,i){if(i)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);});ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function cube(o){
  var w=o.w/2,d=o.d/2,h=o.h;
  var p=[
    project(o.x-w,o.y-h/2,o.z-d),project(o.x+w,o.y-h/2,o.z-d),
    project(o.x+w,o.y+h/2,o.z-d),project(o.x-w,o.y+h/2,o.z-d),
    project(o.x-w,o.y-h/2,o.z+d),project(o.x+w,o.y-h/2,o.z+d),
    project(o.x+w,o.y+h/2,o.z+d),project(o.x-w,o.y+h/2,o.z+d)
  ];
  if(p.some(function(v){return !v;}))return;
  [[0,1,2,3,"#725136"],[4,5,6,7,"#8b6746"],[0,4,7,3,o.color],[1,5,6,2,o.color],[3,2,6,7,"#916b49"],[0,1,5,4,"#69492f"]]
  .sort(function(a,b){
    var da=a.slice(0,4).reduce(function(s,i){return s+p[i].depth;},0);
    var db=b.slice(0,4).reduce(function(s,i){return s+p[i].depth;},0);return db-da;
  }).forEach(function(f){poly(f.slice(0,4).map(function(i){return p[i];}),f[4]);});
  if(o.label){
    var t=project(o.x,o.y+h/2+.1,o.z);if(t){
      ctx.font="900 "+clamp(t.scale*4,9,18)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";
      ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText(o.label,t.x,t.y-8);ctx.shadowBlur=0;
    }
  }
}
function tree(o){
  var b=project(o.x,o.y-2.8,o.z),t=project(o.x,o.y+3.3*o.scale,o.z);if(!b||!t)return;
  var r=clamp(t.scale*2.2,7,40);
  ctx.fillStyle="#6d472e";ctx.fillRect(b.x-r*.16,t.y+r*.25,r*.32,Math.max(5,b.y-t.y));
  ctx.fillStyle="#2f7d45";ctx.beginPath();ctx.arc(t.x,t.y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#4ba45a";ctx.beginPath();ctx.arc(t.x-r*.42,t.y+r*.2,r*.62,0,Math.PI*2);ctx.fill();
}
function rock(o){
  var p=project(o.x,o.y,o.z);if(!p)return;var r=clamp(p.scale*1.2*o.scale,2,14);
  ctx.fillStyle="#69766b";ctx.beginPath();ctx.ellipse(p.x,p.y,r*1.5,r*.75,0,0,Math.PI*2);ctx.fill();
}
function pond(o){
  var p=project(o.x,o.y,o.z);if(!p)return;
  var rx=clamp(p.scale*o.w*.75,15,120),ry=clamp(p.scale*o.d*.35,7,55);
  ctx.fillStyle=o.color;ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function cell(o){
  var p=project(o.x,o.y,o.z);if(!p)return;var s=clamp(p.scale*1.45,3,28);
  ctx.fillStyle="#8b5a38";ctx.fillRect(p.x-s,p.y-s*.44,s*2,s*.88);
  ctx.strokeStyle="rgba(52,30,18,.55)";ctx.strokeRect(p.x-s,p.y-s*.44,s*2,s*.88);
}
function crop(o){
  var c=garden.cells[o.plot+":"+o.cell];if(!c)return;var p=project(o.x,.5,o.z);if(!p)return;
  var ready=c.ready||Date.now()>=c.readyAt;
  var progress=clamp((Date.now()-c.plantedAt)/(c.readyAt-c.plantedAt),0,1);
  var h=clamp(p.scale*(ready?2.7:(.6+progress*2)),7,72),w=h*.45;
  var col={Carrot:"#ef8b3c",Tomato:"#e64f4b",Blueberry:"#5e72e8",Starfruit:"#f0ce51",Moonmelon:"#76d1ac",Sunflower:"#ffd14c"}[c.name]||"#70c66d";
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(p.x-w/2,p.y-h,w,h,Math.min(8,w*.3));ctx.fill();
  ctx.fillStyle="#4aa155";ctx.beginPath();ctx.arc(p.x-w*.2,p.y-h*.9,w*.38,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(p.x+w*.2,p.y-h*.82,w*.38,0,Math.PI*2);ctx.fill();
  if(c.mutation==="Golden"){ctx.strokeStyle="#ffdc65";ctx.lineWidth=3;ctx.stroke();}
  if(c.mutation==="Rainbow"){ctx.strokeStyle=["#ff6b6b","#ffdc67","#6fe37a","#68b6ff","#cf7eff"][Math.floor(Date.now()/180)%5];ctx.lineWidth=3;ctx.stroke();}
  if(ready){ctx.font="900 "+clamp(p.scale*2.8,8,14)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText("READY",p.x,p.y-h-5);ctx.shadowBlur=0;}
}
function background(){
  var sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,"#78b9de");sky.addColorStop(.47,"#d6e5c0");sky.addColorStop(.49,"#69a067");sky.addColorStop(1,"#315e38");
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  var fog=ctx.createLinearGradient(0,H*.4,0,H*.8);fog.addColorStop(0,"rgba(234,242,215,.35)");fog.addColorStop(1,"rgba(80,135,78,0)");
  ctx.fillStyle=fog;ctx.fillRect(0,H*.35,W,H*.45);
}
function draw(){
  background();
  var list=objects.map(function(o){var q=project(o.x,o.y,o.z);return Object.assign({},o,{_p:q});}).filter(function(o){return o._p&&o._p.depth<220;});
  for(var key in garden.cells){
    var c=garden.cells[key];if(!c)continue;
    var a=key.split(":").map(Number),pp=plots[a[0]],cx=a[1]%8,cz=Math.floor(a[1]/8);
    var x=pp.x-12.25+cx*3.5,z=pp.z-12.25+cz*3.5,q=project(x,.5,z);
    if(q)list.push({type:"crop",x:x,y:.5,z:z,plot:a[0],cell:a[1],_p:q});
  }
  list.sort(function(a,b){return b._p.depth-a._p.depth;});
  list.forEach(function(o){
    if(o.type==="building")cube(o);else if(o.type==="tree")tree(o);else if(o.type==="rock")rock(o);
    else if(o.type==="pond")pond(o);else if(o.type==="cell")cell(o);else if(o.type==="crop")crop(o);
  });
  var vign=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75);
  vign.addColorStop(0,"rgba(0,0,0,0)");vign.addColorStop(1,"rgba(0,0,0,.24)");ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);
}

/* movement */
function move(dt){
  var x=0,z=0;
  if(keys.KeyA)x--;if(keys.KeyD)x++;if(keys.KeyW)z++;if(keys.KeyS)z--;x+=touch.x;z+=touch.y;
  var len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
  var speed=(keys.ShiftLeft||keys.ShiftRight)?10:6;
  var sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw);
  var dx=sy*z+cy*x,dz=cy*z-sy*x;
  cam.vx+=(dx*speed-cam.vx)*Math.min(1,dt*11);cam.vz+=(dz*speed-cam.vz)*Math.min(1,dt*11);
  if(!len){cam.vx*=Math.max(0,1-dt*7);cam.vz*=Math.max(0,1-dt*7);}
  cam.x+=cam.vx*dt;cam.z+=cam.vz*dt;
  cam.vy-=24*dt;cam.y+=cam.vy*dt;
  if(cam.y<1.75){cam.y=1.75;cam.vy=0;cam.ground=true;}
  cam.x=clamp(cam.x,-104,104);cam.z=clamp(cam.z,-104,104);
  [{x:0,z:-56,w:18,d:13},{x:-25,z:-56,w:18,d:13},{x:25,z:-56,w:18,d:13}].forEach(function(b){
    if(cam.x>b.x-b.w/2-1&&cam.x<b.x+b.w/2+1&&cam.z>b.z-b.d/2-1&&cam.z<b.z+b.d/2+1)cam.z=b.z+b.d/2+1.4;
  });
}
function jump(){if(cam.ground){cam.vy=8.5;cam.ground=false;}}

/* gameplay */
function mutation(){var r=Math.random();return r<.003?"Rainbow":r<.02?"Golden":r<.08?"Giant":"Normal";}
function plant(plot,cell){
  var key=plot+":"+cell,name=selected,c=CROPS[name];
  if(garden.cells[key])return toast("Dit veld is al bezet.","warn");
  if((player.seeds[name]||0)<=0)return toast("Je hebt geen "+name+" seeds.","warn");
  var t=Date.now();player.seeds[name]--;player.planted++;
  garden.cells[key]={name:name,plot:plot,cell:cell,plantedAt:t,readyAt:t+c.grow*1000,ready:false,mutation:mutation()};
  save();hud();toast(c.emoji+" "+name+" geplant!");
}
function petMultiplier(){
  return player.equipped.reduce(function(m,pid){
    var p=player.pets.find(function(v){return v.id===pid;});return m*(p&&PETS[p.name]?PETS[p.name].mult:1);
  },1);
}
function harvest(plot,cell){
  var key=plot+":"+cell,c=garden.cells[key];
  if(!c)return toast("Hier groeit niets.","warn");
  if(!(c.ready||Date.now()>=c.readyAt))return toast("Deze crop groeit nog.","warn");
  var cfg=CROPS[c.name],value=Math.floor(cfg.sell*(MUT[c.mutation]||1)*petMultiplier());
  player.coins+=value;player.xp+=cfg.grow;player.harvested++;player.earned+=value;
  while(player.xp>=player.level*100){player.xp-=player.level*100;player.level++;}
  garden.cells[key]=null;save();hud();toast("🌟 "+c.mutation+" harvest · +🪙 "+fmt(value));
}
function buySeed(name){
  var c=CROPS[name];if(player.coins<c.price)return toast("Niet genoeg coins.","warn");
  player.coins-=c.price;player.seeds[name]=(player.seeds[name]||0)+1;save();hud();toast(c.emoji+" "+name+" gekocht.");
}
function buyPet(name){
  var c=PETS[name];if(player.coins<c.price)return toast("Niet genoeg coins.","warn");
  player.coins-=c.price;player.pets.push({id:id(),name:name});save();hud();toast(c.emoji+" "+name+" gekocht.");
}
function togglePet(pid){
  var i=player.equipped.indexOf(pid);
  if(i>=0)player.equipped.splice(i,1);
  else if(player.equipped.length<3&&player.pets.some(function(p){return p.id===pid;}))player.equipped.push(pid);
  else return toast("Maximaal 3 pets.","warn");
  save();petsModal();
}

/* UI */
function hud(){
  document.getElementById("coins").textContent=fmt(player.coins);
  document.getElementById("gems").textContent=fmt(player.gems);
  document.getElementById("level").textContent=player.level;
  document.getElementById("quest").textContent=Math.min(10,player.harvested)+" / 10";
  document.getElementById("quest-fill").style.width=Math.min(100,player.harvested/10*100)+"%";
  document.getElementById("mode").textContent="LOCAL SAVE";
  var bar=document.getElementById("seedbar");
  bar.innerHTML=Object.keys(CROPS).map(function(n){return '<button class="seed '+(selected===n?"sel":"")+'" data-seed="'+n+'"><em>'+CROPS[n].emoji+'</em><small>'+n+'</small><b>'+(player.seeds[n]||0)+'</b></button>';}).join("");
  bar.querySelectorAll("[data-seed]").forEach(function(b){b.onclick=function(){selected=b.getAttribute("data-seed");hud();}});
}
function modalBox(title,body){
  var m=document.getElementById("modal");m.style.display="grid";
  m.innerHTML='<div class="modal-box"><button class="close" id="close">×</button><h2>'+title+'</h2>'+body+'</div>';
  document.getElementById("close").onclick=function(){m.style.display="none";m.innerHTML="";};
  m.onclick=function(e){if(e.target===m){m.style.display="none";m.innerHTML="";}};
  return m.querySelector(".modal-box");
}
function shop(){
  var html="<p>Koop seeds met je coins.</p>"+Object.keys(CROPS).map(function(n){var c=CROPS[n];return '<div class="modal-row"><span>'+c.emoji+' <b>'+n+'</b><small style="color:#9fb4a5"> · '+fmt(c.sell)+' sell</small></span><button data-buy="'+n+'">🪙 '+fmt(c.price)+'</button></div>';}).join("");
  var box=modalBox("Seed Shop",html);
  box.querySelectorAll("[data-buy]").forEach(function(b){b.onclick=function(){buySeed(b.getAttribute("data-buy"));}});
}
function petsModal(){
  var html="<p>Pet bonus: ×"+petMultiplier().toFixed(2)+"</p>"+Object.keys(PETS).map(function(n){var c=PETS[n];return '<div class="modal-row"><span>'+c.emoji+' <b>'+n+'</b><small style="color:#9fb4a5"> · ×'+c.mult+'</small></span><button data-pet="'+n+'">🪙 '+fmt(c.price)+'</button></div>';}).join("");
  html+="<h3>Mijn pets</h3>"+(player.pets.map(function(p){return '<div class="modal-row"><span>'+PETS[p.name].emoji+' '+p.name+'</span><button data-equip="'+p.id+'">'+(player.equipped.indexOf(p.id)>=0?"Unequip":"Equip")+'</button></div>';}).join("")||"<p>Nog geen pets.</p>");
  var box=modalBox("Pet House",html);
  box.querySelectorAll("[data-pet]").forEach(function(b){b.onclick=function(){buyPet(b.getAttribute("data-pet"));petsModal();}});
  box.querySelectorAll("[data-equip]").forEach(function(b){b.onclick=function(){togglePet(b.getAttribute("data-equip"));}});
}
function help(){
  modalBox("Besturing","<p><b>W A S D</b> = lopen<br><b>Muis</b> = rondkijken<br><b>Shift</b> = sprint<br><b>Spatie</b> = springen<br><b>E</b> = interactie</p><p>Kijk naar een leeg veld en druk E om de geselecteerde seed te planten. Kijk naar een rijpe crop en druk E om te oogsten.</p>");
}

/* target */
function target(){
  var best=null,score=1e9;
  for(var key in garden.cells){
    var c=garden.cells[key];if(!c)continue;
    var a=key.split(":").map(Number),pp=plots[a[0]],gx=a[1]%8,gz=Math.floor(a[1]/8);
    var o={type:"crop",plot:a[0],cell:a[1],x:pp.x-12.25+gx*3.5,y:.5,z:pp.z-12.25+gz*3.5};
    var q=project(o.x,o.y,o.z);if(q&&q.depth<18){var d=Math.hypot(q.x-W/2,q.y-H/2);if(d<score&&d<125){score=d;best=o;}}
  }
  if(best)return best;
  objects.forEach(function(o){
    if(o.type!=="cell")return;
    var q=project(o.x,o.y,o.z);if(!q||q.depth>18)return;
    var d=Math.hypot(q.x-W/2,q.y-H/2);if(d<score&&d<125){score=d;best=o;}
  });
  return best;
}
function interact(){
  var t=target();
  if(!t)return toast("Kijk naar een veld of crop.","warn");
  if(t.type==="crop")harvest(t.plot,t.cell);else if(t.type==="cell")plant(t.plot,t.cell);
}

/* events */
document.addEventListener("keydown",function(e){
  keys[e.code]=true;
  if(e.code==="Space"){e.preventDefault();jump();}
  if(e.code==="KeyE")interact();
});
document.addEventListener("keyup",function(e){keys[e.code]=false;});
canvas.addEventListener("click",function(){try{canvas.requestPointerLock&&canvas.requestPointerLock();}catch(e){}});
document.addEventListener("mousemove",function(e){
  if(document.pointerLockElement===canvas){
    cam.yaw-=e.movementX*.0024;cam.pitch-=e.movementY*.0018;cam.pitch=clamp(cam.pitch,-1.15,1.15);
  }
});
document.getElementById("shop").onclick=shop;
document.getElementById("pets").onclick=petsModal;
document.getElementById("help").onclick=help;

/* Mobile */
if(window.matchMedia&&window.matchMedia("(pointer:coarse)").matches){
  document.getElementById("mobile").hidden=false;
  var joy=document.getElementById("joystick"),stick=document.getElementById("stick"),active=false;
  joy.addEventListener("pointerdown",function(e){active=true;joy.setPointerCapture(e.pointerId);moveJoy(e);});
  joy.addEventListener("pointermove",function(e){if(active)moveJoy(e);});
  joy.addEventListener("pointerup",function(){active=false;touch.x=touch.y=0;stick.style.transform="translate(0,0)";});
  function moveJoy(e){
    var r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy;
    var max=42,len=Math.hypot(dx,dy),s=Math.min(1,max/Math.max(1,len)),x=dx*s,y=dy*s;
    touch.x=x/max;touch.y=y/max;stick.style.transform="translate("+x+"px,"+y+"px)";
  }
  document.getElementById("mobile-jump").onclick=jump;
  document.getElementById("mobile-use").onclick=interact;
}

/* Start immediately: there is deliberately NO loading screen. */
hud();
toast("Welkom! WASD om te lopen.");
var last=performance.now();
function loop(t){
  var dt=Math.min(.035,(t-last)/1000);last=t;
  move(dt);
  draw();
  var a=target();
  var hint=document.getElementById("hint");
  if(a){
    hint.hidden=false;
    hint.querySelector?.("b");
    document.getElementById("hint").textContent=a.type==="crop"?"Druk E om te oogsten":"Druk E om te planten";
  }else hint.hidden=true;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
setInterval(save,30000);

})();
