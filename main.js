/* Grow Garden 2 — upgraded build.
   Zero build step, zero module imports, zero CDN dependency, zero Firebase.
   Three plain files: index.html, style.css, scripts/main.js.
   Just push them to a GitHub repo (index.html in the root) and turn on Pages. */
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

/* ============================================================
   GAME DATA
   ============================================================ */
var CROPS={
 Carrot:{emoji:"🥕",price:8,sell:14,grow:8},
 Tomato:{emoji:"🍅",price:22,sell:42,grow:14},
 Strawberry:{emoji:"🍓",price:45,sell:92,grow:19},
 Blueberry:{emoji:"🫐",price:80,sell:170,grow:26},
 Corn:{emoji:"🌽",price:140,sell:290,grow:33},
 Pepper:{emoji:"🌶️",price:230,sell:490,grow:40},
 CactusFruit:{emoji:"🌵",price:360,sell:780,grow:50},
 Pumpkin:{emoji:"🎃",price:560,sell:1220,grow:60},
 Watermelon:{emoji:"🍉",price:900,sell:1980,grow:72},
 Starfruit:{emoji:"⭐",price:1500,sell:3400,grow:85},
 Moonmelon:{emoji:"🍈",price:2600,sell:6200,grow:100},
 Sunflower:{emoji:"🌻",price:4500,sell:11000,grow:120}
};
var CROP_ORDER=["Carrot","Tomato","Strawberry","Blueberry","Corn","Pepper","CactusFruit","Pumpkin","Watermelon","Starfruit","Moonmelon","Sunflower"];
var CROP_NAME={CactusFruit:"Cactus Fruit"};
function cropLabel(n){return CROP_NAME[n]||n;}
var CROP_COLOR={Carrot:"#ef8b3c",Tomato:"#e64f4b",Strawberry:"#ef4f7a",Blueberry:"#5e72e8",Corn:"#f2d24a",Pepper:"#e0433f",CactusFruit:"#5fd66b",Pumpkin:"#f08a2e",Watermelon:"#48c76a",Starfruit:"#f0ce51",Moonmelon:"#76d1ac",Sunflower:"#ffd14c"};

var PETS={
 Bunny:{emoji:"🐰",price:200,mult:1.08},
 Cat:{emoji:"🐱",price:450,mult:1.14},
 Puppy:{emoji:"🐶",price:800,mult:1.20},
 Turtle:{emoji:"🐢",price:1300,mult:1.27},
 Fox:{emoji:"🦊",price:2200,mult:1.35},
 Owl:{emoji:"🦉",price:3600,mult:1.46},
 Bee:{emoji:"🐝",price:5800,mult:1.60},
 Panda:{emoji:"🐼",price:9000,mult:1.78},
 Dragon:{emoji:"🐉",price:18000,mult:2.2},
 Phoenix:{emoji:"🔥",price:55000,mult:3}
};
var PET_ORDER=["Bunny","Cat","Puppy","Turtle","Fox","Owl","Bee","Panda","Dragon","Phoenix"];
var MUT={Normal:1,Giant:2,Golden:4,Rainbow:10};
var MAX_EQUIPPED=3;

var ACHIEVEMENTS=[
 {id:"first_harvest",label:"Eerste Oogst",desc:"Oogst je eerste gewas.",gems:1,check:function(p){return p.harvested>=1;}},
 {id:"ten_harvests",label:"Boerderijhulp",desc:"Oogst 10 gewassen.",gems:2,check:function(p){return p.harvested>=10;}},
 {id:"fifty_harvests",label:"Oogstmeester",desc:"Oogst 50 gewassen.",gems:5,check:function(p){return p.harvested>=50;}},
 {id:"first_sale",label:"Eerste Verkoop",desc:"Verkoop iets bij de rugzak.",gems:1,check:function(p){return p.sold>=1;}},
 {id:"big_seller",label:"Marktkoopman",desc:"Verkoop 50 gewassen.",gems:4,check:function(p){return p.sold>=50;}},
 {id:"first_pet",label:"Nieuw Vriendje",desc:"Koop je eerste huisdier.",gems:2,check:function(p){return p.pets.length>=1;}},
 {id:"pet_squad",label:"Compleet Team",desc:"Rust 3 huisdieren tegelijk uit.",gems:3,check:function(p){return p.equipped.length>=MAX_EQUIPPED;}},
 {id:"golden_touch",label:"Gouden Handjes",desc:"Oogst een Golden mutatie.",gems:3,check:function(p){return p.goldenCount>=1;}},
 {id:"rainbow_touch",label:"Regenboog Boer",desc:"Oogst een Rainbow mutatie.",gems:6,check:function(p){return p.rainbowCount>=1;}},
 {id:"level_5",label:"Op Weg",desc:"Bereik level 5.",gems:2,check:function(p){return p.level>=5;}},
 {id:"level_10",label:"Ervaren Tuinman",desc:"Bereik level 10.",gems:3,check:function(p){return p.level>=10;}},
 {id:"level_15",label:"Tuinlegende",desc:"Bereik level 15.",gems:5,check:function(p){return p.level>=15;}},
 {id:"coin_stack",label:"Spaarpot",desc:"Heb ooit 1.000 coins tegelijk.",gems:2,check:function(p){return p.coins>=1000;}},
 {id:"first_rebirth",label:"Herboren",desc:"Word 1x herboren onder de Oude Boom.",gems:8,check:function(p){return prestige.count>=1;}}
];

var QUEST_POOL=[
 {type:"plant",need:5,coins:60,gems:0,label:"Plant 5 zaadjes"},
 {type:"plant",need:12,coins:150,gems:1,label:"Plant 12 zaadjes"},
 {type:"harvest",need:5,coins:70,gems:0,label:"Oogst 5 gewassen"},
 {type:"harvest",need:15,coins:220,gems:1,label:"Oogst 15 gewassen"},
 {type:"harvest",need:30,coins:500,gems:2,label:"Oogst 30 gewassen"},
 {type:"sell",need:3,coins:60,gems:0,label:"Verkoop 3 gewassen"},
 {type:"sell",need:10,coins:200,gems:1,label:"Verkoop 10 gewassen"},
 {type:"earn",need:300,coins:0,gems:1,label:"Verdien 300 coins met verkopen"},
 {type:"earn",need:1200,coins:0,gems:2,label:"Verdien 1.200 coins met verkopen"},
 {type:"buypet",need:1,coins:100,gems:1,label:"Koop een huisdier"},
 {type:"water",need:5,coins:80,gems:0,label:"Begiet 5 gewassen"}
];

function clone(o){return JSON.parse(JSON.stringify(o));}
function id(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function fmt(n){return new Intl.NumberFormat("nl-NL").format(Math.floor(Number(n)||0));}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function toast(text,type){
  var e=document.createElement("div");e.className="toast "+(type||"");e.textContent=text;
  document.getElementById("toast").appendChild(e);setTimeout(function(){e.remove();},2800);
}

/* ============================================================
   PLAYER / SAVE STATE
   ============================================================ */
function emptySeeds(){var s={};CROP_ORDER.forEach(function(n){s[n]=0;});return s;}
function defaultPlayer(){
  return{
    id:id(),name:"Garden Player",
    coins:100,gems:0,level:1,xp:0,
    seeds:emptySeeds(),
    pets:[],equipped:[],
    inventory:[], /* [{id,name,mutation}] harvested crops waiting to be sold */
    harvested:0,planted:0,earned:0,sold:0,watered:0,
    goldenCount:0,rainbowCount:0,
    achievements:[],
    quests:[]
  };
}
function defaultGarden(){
  var c={};for(var p=0;p<8;p++)for(var i=0;i<64;i++)c[p+":"+i]=null;
  return{cells:c};
}

var SAVE="gg2_save_v2";
var PKEY="gg2_prestige_v2";

var saved=null;
try{saved=JSON.parse(localStorage.getItem(SAVE)||"null");}catch(e){}
var player=saved&&saved.player?Object.assign(defaultPlayer(),saved.player):defaultPlayer();
if(saved&&saved.player&&saved.player.seeds)player.seeds=Object.assign(emptySeeds(),saved.player.seeds);
if(!Array.isArray(player.pets))player.pets=[];
if(!Array.isArray(player.equipped))player.equipped=[];
if(!Array.isArray(player.inventory))player.inventory=[];
if(!Array.isArray(player.achievements))player.achievements=[];
if(!Array.isArray(player.quests)||!player.quests.length)player.quests=null;

var garden=saved&&saved.garden?saved.garden:defaultGarden();
if(!garden.cells)garden=defaultGarden();

var prestige=null;
try{prestige=JSON.parse(localStorage.getItem(PKEY)||"null");}catch(e){}
if(!prestige||typeof prestige.count!=="number")prestige={count:0};

var selected="Carrot";
var tool="seed"; /* 'seed' | 'water' */

function save(){
  try{localStorage.setItem(SAVE,JSON.stringify({player:player,garden:garden,savedAt:Date.now()}));}catch(e){}
}
function savePrestige(){
  try{localStorage.setItem(PKEY,JSON.stringify(prestige));}catch(e){}
}
function prestigeMult(){return 1+prestige.count*0.15;}

/* ---------- quests ---------- */
var questPoolIndex=0;
function pickQuest(excludeTypes){
  for(var tries=0;tries<QUEST_POOL.length*2;tries++){
    var base=QUEST_POOL[questPoolIndex%QUEST_POOL.length];
    questPoolIndex++;
    if(!excludeTypes||excludeTypes.indexOf(base.type)===-1||tries>QUEST_POOL.length){
      return Object.assign({},base,{id:id(),progress:0,done:false});
    }
  }
  return Object.assign({},QUEST_POOL[0],{id:id(),progress:0,done:false});
}
function generateQuests(){
  var qs=[];
  for(var i=0;i<3;i++)qs.push(pickQuest(qs.map(function(q){return q.type;})));
  player.quests=qs;
}
if(!player.quests)generateQuests();

function checkQuests(type,amount){
  var changed=false;
  player.quests.forEach(function(q){
    if(q.done||q.type!==type)return;
    q.progress=Math.min(q.need,q.progress+amount);
    if(q.progress>=q.need){
      q.done=true;
      player.coins+=q.reward_coins!==undefined?q.reward_coins:q.coins;
      player.gems+=q.reward_gems!==undefined?q.reward_gems:q.gems;
      toast("✅ Quest voltooid: "+q.label+" · +🪙"+fmt(q.coins)+(q.gems?" +💎"+q.gems:""));
      changed=true;
    }
  });
  if(changed){
    setTimeout(function(){
      player.quests=player.quests.map(function(q){
        if(!q.done)return q;
        return pickQuest(player.quests.filter(function(x){return x!==q;}).map(function(x){return x.type;}));
      });
      save();questsUI();
    },900);
  }
  questsUI();
}

/* ---------- achievements ---------- */
function checkAchievements(){
  var unlocked=false;
  ACHIEVEMENTS.forEach(function(a){
    if(player.achievements.indexOf(a.id)>=0)return;
    if(a.check(player)){
      player.achievements.push(a.id);
      player.gems+=a.gems||0;
      toast("🏆 Prestatie: "+a.label+(a.gems?" · +💎"+a.gems:""),"ach");
      unlocked=true;
    }
  });
  if(unlocked)save();
}

/* ============================================================
   WORLD LAYOUT
   ============================================================ */
var plots=[
 {x:-84,z:-42},{x:-28,z:-42},{x:28,z:-42},{x:84,z:-42},
 {x:-84,z:42},{x:-28,z:42},{x:28,z:42},{x:84,z:42}
];

var cam={x:0,y:1.75,z:26,vx:0,vy:0,vz:0,yaw:Math.PI,pitch:-.03,ground:true};
var keys={};
var touch={x:0,y:0};
var objects=[];
var fireflies=[];

function add(type,x,y,z,opt){objects.push(Object.assign({type:type,x:x,y:y,z:z},opt||{}));}
function build(){
  objects=[];
  plots.forEach(function(p,index){
    add("plot",p.x,0,p.z,{plot:index});
    for(var zz=0;zz<8;zz++)for(var xx=0;xx<8;xx++){
      add("cell",p.x-12.25+xx*3.5,.15,p.z-12.25+zz*3.5,{plot:index,cell:zz*8+xx});
    }
  });
  add("building",-40,4,-92,{w:20,d:14,h:8,color:"#ad764d",label:"SEED SHOP"});
  add("building",0,4,-92,{w:20,d:14,h:8,color:"#698f5e",label:"RUGZAK / VERKOOP"});
  add("building",40,4,-92,{w:20,d:14,h:8,color:"#8065a3",label:"PET HOUSE"});
  add("elder-tree",0,0,-135,{});
  add("fountain",0,0,0,{});
  add("pond",-118,.2,72,{w:44,d:26,color:"#4db8df"});
  add("windmill",-118,0,44,{});
  add("bridge",-90,0,72,{});
  for(var l=1;l<=3;l++){
    add("lamp",-6,0,-l*20+6,{});add("lamp",6,0,-l*20+6,{});
  }
  var treeCount=60;
  for(var i=0;i<treeCount;i++){
    var a=i*Math.PI*2/treeCount,r=145+(i%5)*7;
    add("tree",Math.cos(a)*r,3.1,Math.sin(a)*r,{scale:1+(i%3)*.12,pine:i%2===0});
  }
  var rockCount=30;
  for(var j=0;j<rockCount;j++){
    var a2=j*2.24,r2=95+(j%6)*8;
    add("rock",Math.cos(a2)*r2,.8,Math.sin(a2)*r2,{scale:.8+(j%3)*.2});
  }
  var flowerCount=46;
  for(var k=0;k<flowerCount;k++){
    var fx=(k%2?1:-1)*(58+(k%7)*4),fz=-60+(k*11)%150;
    add("flower",fx,.1,fz,{hue:k%4});
  }
  for(var f=0;f<10;f++){
    fireflies.push({x:-118+(Math.random()-.5)*40,y:1+Math.random()*2,z:72+(Math.random()-.5)*24,t:Math.random()*10});
  }
}
build();

/* ============================================================
   PROJECTION / RENDERING
   ============================================================ */
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
      ctx.font="900 "+clamp(t.scale*3.6,8,16)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";
      ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText(o.label,t.x,t.y-8);ctx.shadowBlur=0;
    }
  }
}
function tree(o){
  var b=project(o.x,o.y-2.8,o.z),t=project(o.x,o.y+3.3*o.scale,o.z);if(!b||!t)return;
  var r=clamp(t.scale*2.2,7,40);
  ctx.fillStyle="#6d472e";ctx.fillRect(b.x-r*.16,t.y+r*.25,r*.32,Math.max(5,b.y-t.y));
  if(o.pine){
    ctx.fillStyle="#2c6a41";
    for(var lvl=0;lvl<3;lvl++){
      var ty=t.y+lvl*r*.55,tw=r*(1.05-lvl*.22);
      ctx.beginPath();ctx.moveTo(t.x,ty-r*.55);ctx.lineTo(t.x-tw,ty+r*.35);ctx.lineTo(t.x+tw,ty+r*.35);ctx.closePath();ctx.fill();
    }
  }else{
    ctx.fillStyle="#2f7d45";ctx.beginPath();ctx.arc(t.x,t.y,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#4ba45a";ctx.beginPath();ctx.arc(t.x-r*.42,t.y+r*.2,r*.62,0,Math.PI*2);ctx.fill();
  }
}
function rock(o){
  var p=project(o.x,o.y,o.z);if(!p)return;var r=clamp(p.scale*1.2*o.scale,2,14);
  ctx.fillStyle="#69766b";ctx.beginPath();ctx.ellipse(p.x,p.y,r*1.5,r*.75,0,0,Math.PI*2);ctx.fill();
}
function flower(o){
  var p=project(o.x,o.y,o.z);if(!p)return;var r=clamp(p.scale*.55,2,9);
  var hues=["#ff8fb3","#ffd76b","#9ad2ff","#c398ff"];
  ctx.fillStyle="#3f8a4a";ctx.fillRect(p.x-1,p.y-r*.8,2,r*.8);
  ctx.fillStyle=hues[o.hue%hues.length];
  for(var pt=0;pt<5;pt++){
    var ang=pt/5*Math.PI*2;
    ctx.beginPath();ctx.ellipse(p.x+Math.cos(ang)*r*.5,p.y-r*.8+Math.sin(ang)*r*.5,r*.42,r*.28,ang,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle="#ffe37a";ctx.beginPath();ctx.arc(p.x,p.y-r*.8,r*.28,0,Math.PI*2);ctx.fill();
}
function pond(o){
  var p=project(o.x,o.y,o.z);if(!p)return;
  var rx=clamp(p.scale*o.w*.75,15,190),ry=clamp(p.scale*o.d*.35,7,80);
  ctx.fillStyle=o.color;ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.22)";ctx.beginPath();ctx.ellipse(p.x-rx*.25,p.y-ry*.2,rx*.3,ry*.14,0,0,Math.PI*2);ctx.fill();
}
function windmill(o){
  var base=project(o.x,1.6,o.z),top=project(o.x,7,o.z);if(!base||!top)return;
  var r=clamp(top.scale*1.6,4,20);
  ctx.fillStyle="#c9b28a";ctx.fillRect(base.x-r*.22,top.y,r*.44,Math.max(4,base.y-top.y));
  var spin=(Date.now()/700)%(Math.PI*2);
  ctx.save();ctx.translate(top.x,top.y);ctx.rotate(spin);
  ctx.fillStyle="#eee7d8";
  for(var b=0;b<4;b++){
    ctx.save();ctx.rotate(b*Math.PI/2);
    ctx.fillRect(-r*.09,0,r*.18,r*1.5);
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle="#7a5a3a";ctx.beginPath();ctx.arc(top.x,top.y,r*.16,0,Math.PI*2);ctx.fill();
}
function bridge(o){
  var p=project(o.x,.35,o.z);if(!p)return;var s=clamp(p.scale*7,10,60);
  ctx.fillStyle="#a9834f";ctx.fillRect(p.x-s,p.y-s*.16,s*2,s*.32);
  ctx.strokeStyle="rgba(60,38,16,.5)";
  for(var i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(p.x+i*s*.22,p.y-s*.16);ctx.lineTo(p.x+i*s*.22,p.y+s*.16);ctx.stroke();}
}
function lamp(o,night){
  var base=project(o.x,0,o.z),top=project(o.x,3.4,o.z);if(!base||!top)return;
  var r=clamp(top.scale*1,2,10);
  ctx.strokeStyle="#3a3f3a";ctx.lineWidth=Math.max(1,r*.18);
  ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke();
  if(night){
    var glow=ctx.createRadialGradient(top.x,top.y,0,top.x,top.y,r*4);
    glow.addColorStop(0,"rgba(255,224,137,.55)");glow.addColorStop(1,"rgba(255,224,137,0)");
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(top.x,top.y,r*4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffe089";
  }else ctx.fillStyle="#8f8f7a";
  ctx.beginPath();ctx.arc(top.x,top.y,r*.5,0,Math.PI*2);ctx.fill();
}
function fountain(o,night){
  var p=project(o.x,.1,o.z);if(!p)return;var s=clamp(p.scale*3.2,6,44);
  ctx.fillStyle="#9aa39a";ctx.beginPath();ctx.ellipse(p.x,p.y,s,s*.42,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#4db8df";ctx.beginPath();ctx.ellipse(p.x,p.y,s*.78,s*.32,0,0,Math.PI*2);ctx.fill();
  var top=project(o.x,2.2,o.z);
  if(top){
    ctx.fillStyle="#b9c2b8";ctx.beginPath();ctx.ellipse(top.x,top.y,s*.3,s*.13,0,0,Math.PI*2);ctx.fill();
    var bob=Math.sin(Date.now()/240)*s*.05;
    ctx.strokeStyle="rgba(210,240,255,.7)";ctx.lineWidth=Math.max(1,s*.05);
    ctx.beginPath();ctx.moveTo(top.x,top.y-s*.1);ctx.lineTo(top.x,top.y-s*.6+bob);ctx.stroke();
  }
  if(night){
    var glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,s*2.2);
    glow.addColorStop(0,"rgba(120,200,255,.28)");glow.addColorStop(1,"rgba(120,200,255,0)");
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,s*2.2,0,Math.PI*2);ctx.fill();
  }
}
function elderTree(o,night){
  var b=project(o.x,3,o.z),t=project(o.x,15,o.z);if(!b||!t)return;
  var r=clamp(t.scale*4.4,9,60);
  ctx.fillStyle="#5a3a24";ctx.fillRect(b.x-r*.22,t.y+r*.3,r*.44,Math.max(6,b.y-t.y));
  ctx.fillStyle=night?"#274b30":"#356b3f";ctx.beginPath();ctx.arc(t.x,t.y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=night?"#2f5a3a":"#4a8a53";ctx.beginPath();ctx.arc(t.x-r*.4,t.y+r*.16,r*.68,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(t.x+r*.42,t.y+r*.1,r*.6,0,Math.PI*2);ctx.fill();
  var glowCol=prestige.count>0?"rgba(255,220,120,":"rgba(140,230,150,";
  var glow=ctx.createRadialGradient(t.x,t.y,0,t.x,t.y,r*1.6);
  glow.addColorStop(0,glowCol+(night?".5)":".25)"));glow.addColorStop(1,glowCol+"0)");
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(t.x,t.y,r*1.6,0,Math.PI*2);ctx.fill();
  var lbl=project(o.x,o.y+r/4.4+15.6,o.z)||t;
  ctx.font="900 "+clamp(t.scale*3.4,8,15)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";
  ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText("OUDE BOOM",t.x,b.y-r*2.3);ctx.shadowBlur=0;
}
function firefly(o,night){
  if(!night)return;
  var p=project(o.x,o.y,o.z);if(!p)return;
  var r=clamp(p.scale*.28,1,4);
  var glow=Math.abs(Math.sin(Date.now()/500+o.t));
  ctx.fillStyle="rgba(220,255,140,"+(0.25+glow*0.6)+")";
  ctx.beginPath();ctx.arc(p.x,p.y,r*2.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#eaffb0";ctx.beginPath();ctx.arc(p.x,p.y,r*.6,0,Math.PI*2);ctx.fill();
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
  var col=CROP_COLOR[c.name]||"#70c66d";
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(p.x-w/2,p.y-h,w,h,Math.min(8,w*.3));ctx.fill();
  ctx.fillStyle="#4aa155";ctx.beginPath();ctx.arc(p.x-w*.2,p.y-h*.9,w*.38,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(p.x+w*.2,p.y-h*.82,w*.38,0,Math.PI*2);ctx.fill();
  if(c.mutation==="Golden"){ctx.strokeStyle="#ffdc65";ctx.lineWidth=3;ctx.stroke();}
  if(c.mutation==="Giant"){ctx.strokeStyle="#8fe3a0";ctx.lineWidth=2;ctx.stroke();}
  if(c.mutation==="Rainbow"){ctx.strokeStyle=["#ff6b6b","#ffdc67","#6fe37a","#68b6ff","#cf7eff"][Math.floor(Date.now()/180)%5];ctx.lineWidth=3;ctx.stroke();}
  if(c.watered&&!ready){ctx.strokeStyle="rgba(108,199,255,.85)";ctx.lineWidth=2;ctx.stroke();}
  if(ready){ctx.font="900 "+clamp(p.scale*2.8,8,14)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText("KLAAR",p.x,p.y-h-5);ctx.shadowBlur=0;}
}

/* ---------- day / night ---------- */
var CYCLE_MS=1000*60*4;
function dayPhase(){ return (Date.now()%CYCLE_MS)/CYCLE_MS; }
function isNight(){ var p=dayPhase(); return p>.55&&p<.97; }
function background(){
  var p=dayPhase();
  var top,mid,ground1,ground2;
  if(p<.22){top="#3a4f77";mid="#e08a5a";ground1="#69a067";ground2="#315e38";}
  else if(p<.5){top="#78b9de";mid="#d6e5c0";ground1="#69a067";ground2="#315e38";}
  else if(p<.6){top="#3a4f77";mid="#e08a5a";ground1="#4f7a55";ground2="#274a2c";}
  else if(p<.95){top="#050a16";mid="#131c30";ground1="#1c2f22";ground2="#0e1a12";}
  else {top="#3a4f77";mid="#e08a5a";ground1="#69a067";ground2="#315e38";}
  var sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,top);sky.addColorStop(.47,mid);sky.addColorStop(.49,ground1);sky.addColorStop(1,ground2);
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

  var night=isNight();
  if(night){
    ctx.fillStyle="#fff";
    for(var s=0;s<70;s++){
      var sx=(s*97.3+cam.yaw*40)%W,sy=(s*53.7)%(H*.42);
      ctx.globalAlpha=.25+.5*Math.abs(Math.sin(s+Date.now()/900));
      ctx.fillRect(sx,sy,1.6,1.6);
    }
    ctx.globalAlpha=1;
    ctx.fillStyle="#eef1e0";ctx.beginPath();ctx.arc(W*.82,H*.16,26,0,Math.PI*2);ctx.fill();
  }else{
    ctx.fillStyle="rgba(255,247,214,.9)";ctx.beginPath();ctx.arc(W*.18,H*.16,30,0,Math.PI*2);ctx.fill();
  }

  var off=(cam.yaw*90)%(W*2);
  function hillLayer(color,baseY,amp,alpha){
    ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(-W,H);
    for(var x=-W;x<=W*2;x+=40){
      var y=baseY+Math.sin((x+off)/160)*amp+Math.sin((x+off)/47)*amp*.3;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W*2,H);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  }
  hillLayer(night?"#0d1a12":"#4c7a52",H*.44,18,.55);
  hillLayer(night?"#0a140d":"#3c6a45",H*.47,14,.75);

  var fog=ctx.createLinearGradient(0,H*.4,0,H*.8);fog.addColorStop(0,"rgba(234,242,215,.35)");fog.addColorStop(1,"rgba(80,135,78,0)");
  ctx.fillStyle=fog;ctx.fillRect(0,H*.35,W,H*.45);
}

function draw(){
  background();
  var night=isNight();
  var list=objects.map(function(o){var q=project(o.x,o.y,o.z);return Object.assign({},o,{_p:q});}).filter(function(o){return o._p&&o._p.depth<260;});
  for(var key in garden.cells){
    var c=garden.cells[key];if(!c)continue;
    var a=key.split(":").map(Number),pp=plots[a[0]],cx=a[1]%8,cz=Math.floor(a[1]/8);
    var x=pp.x-12.25+cx*3.5,z=pp.z-12.25+cz*3.5,q=project(x,.5,z);
    if(q)list.push({type:"crop",x:x,y:.5,z:z,plot:a[0],cell:a[1],_p:q});
  }
  fireflies.forEach(function(fl){
    fl.x+=Math.sin(Date.now()/1300+fl.t)*.01;fl.z+=Math.cos(Date.now()/1100+fl.t)*.01;
    var q=project(fl.x,fl.y,fl.z);if(q)list.push({type:"firefly",x:fl.x,y:fl.y,z:fl.z,t:fl.t,_p:q});
  });
  list.sort(function(a,b){return b._p.depth-a._p.depth;});
  list.forEach(function(o){
    if(o.type==="building")cube(o);
    else if(o.type==="tree")tree(o);
    else if(o.type==="rock")rock(o);
    else if(o.type==="flower")flower(o);
    else if(o.type==="pond")pond(o);
    else if(o.type==="windmill")windmill(o);
    else if(o.type==="bridge")bridge(o);
    else if(o.type==="lamp")lamp(o,night);
    else if(o.type==="fountain")fountain(o,night);
    else if(o.type==="elder-tree")elderTree(o,night);
    else if(o.type==="firefly")firefly(o,night);
    else if(o.type==="cell")cell(o);
    else if(o.type==="crop")crop(o);
  });
  if(night){ctx.fillStyle="rgba(4,8,16,.34)";ctx.fillRect(0,0,W,H);}
  var vign=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75);
  vign.addColorStop(0,"rgba(0,0,0,0)");vign.addColorStop(1,"rgba(0,0,0,.24)");ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);
}

/* ============================================================
   MOVEMENT
   ============================================================ */
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
  cam.x=clamp(cam.x,-150,150);cam.z=clamp(cam.z,-150,150);
  [{x:-40,z:-92,w:20,d:14},{x:0,z:-92,w:20,d:14},{x:40,z:-92,w:20,d:14}].forEach(function(b){
    if(cam.x>b.x-b.w/2-1&&cam.x<b.x+b.w/2+1&&cam.z>b.z-b.d/2-1&&cam.z<b.z+b.d/2+1)cam.z=b.z+b.d/2+1.4;
  });
  var fd=Math.hypot(cam.x-0,cam.z-0);if(fd<3.4){var a=Math.atan2(cam.z,cam.x);cam.x=Math.cos(a)*3.4;cam.z=Math.sin(a)*3.4;}
}
function jump(){if(cam.ground){cam.vy=8.5;cam.ground=false;}}

/* ============================================================
   GAMEPLAY
   ============================================================ */
function mutation(){var r=Math.random();return r<.003?"Rainbow":r<.02?"Golden":r<.08?"Giant":"Normal";}

function plant(plot,cellIdx){
  var key=plot+":"+cellIdx,name=selected,c=CROPS[name];
  if(garden.cells[key])return toast("Dit veld is al bezet.","warn");
  if((player.seeds[name]||0)<=0)return toast("Je hebt geen "+cropLabel(name)+" zaadjes. Koop ze in de SHOP.","warn");
  var t=Date.now();player.seeds[name]--;player.planted++;
  garden.cells[key]={name:name,plot:plot,cell:cellIdx,plantedAt:t,readyAt:t+c.grow*1000,ready:false,mutation:mutation(),watered:false};
  checkQuests("plant",1);checkAchievements();
  save();hud();toast(c.emoji+" "+cropLabel(name)+" geplant!");
}
function water(plot,cellIdx){
  var key=plot+":"+cellIdx,c=garden.cells[key];
  if(!c)return toast("Hier groeit niets.","warn");
  if(c.ready||Date.now()>=c.readyAt)return toast("Dit gewas is al klaar om te oogsten.","warn");
  if(c.watered)return toast("Al begoten — dit groeit nu sneller.","warn");
  var remaining=c.readyAt-Date.now();
  c.readyAt-=remaining*0.25;c.watered=true;
  player.watered=(player.watered||0)+1;
  checkQuests("water",1);checkAchievements();
  save();toast("💧 Begoten! Groeit 25% sneller.");
}
function petMultiplier(){
  return player.equipped.reduce(function(m,pid){
    var p=player.pets.find(function(v){return v.id===pid;});return m*(p&&PETS[p.name]?PETS[p.name].mult:1);
  },1);
}
function harvest(plot,cellIdx){
  var key=plot+":"+cellIdx,c=garden.cells[key];
  if(!c)return toast("Hier groeit niets.","warn");
  if(!(c.ready||Date.now()>=c.readyAt))return toast("Dit gewas groeit nog.","warn");
  player.harvested++;
  if(c.mutation==="Golden")player.goldenCount=(player.goldenCount||0)+1;
  if(c.mutation==="Rainbow")player.rainbowCount=(player.rainbowCount||0)+1;
  player.inventory.push({id:id(),name:c.name,mutation:c.mutation});
  garden.cells[key]=null;
  checkQuests("harvest",1);checkAchievements();
  save();hud();toast(CROPS[c.name].emoji+" "+c.mutation+" "+cropLabel(c.name)+" in je rugzak!");
}
function itemValue(item){
  var cfg=CROPS[item.name];if(!cfg)return 0;
  return Math.floor(cfg.sell*(MUT[item.mutation]||1)*petMultiplier()*prestigeMult());
}
function sellItem(itemId){
  var idx=player.inventory.findIndex(function(i){return i.id===itemId;});
  if(idx<0)return;
  var item=player.inventory[idx],value=itemValue(item);
  player.inventory.splice(idx,1);
  player.coins+=value;player.earned+=value;player.sold++;
  checkQuests("sell",1);checkQuests("earn",value);checkAchievements();
  save();hud();inventoryModal();
}
function sellAll(){
  if(!player.inventory.length)return toast("Je rugzak is leeg.","warn");
  var total=0,count=player.inventory.length;
  player.inventory.forEach(function(item){total+=itemValue(item);});
  player.inventory=[];
  player.coins+=total;player.earned+=total;player.sold+=count;
  checkQuests("sell",count);checkQuests("earn",total);checkAchievements();
  save();hud();toast("💰 "+count+" gewassen verkocht voor +🪙"+fmt(total));
  inventoryModal();
}
function buySeed(name){
  var c=CROPS[name];if(player.coins<c.price)return toast("Niet genoeg coins.","warn");
  player.coins-=c.price;player.seeds[name]=(player.seeds[name]||0)+1;save();hud();toast(c.emoji+" "+cropLabel(name)+" zaadje gekocht.");
}
function buyPet(name){
  var c=PETS[name];if(player.coins<c.price)return toast("Niet genoeg coins.","warn");
  player.coins-=c.price;player.pets.push({id:id(),name:name});
  checkQuests("buypet",1);checkAchievements();
  save();hud();toast(c.emoji+" "+name+" gekocht.");
}
function togglePet(pid){
  var i=player.equipped.indexOf(pid);
  if(i>=0)player.equipped.splice(i,1);
  else if(player.equipped.length<MAX_EQUIPPED&&player.pets.some(function(p){return p.id===pid;}))player.equipped.push(pid);
  else return toast("Maximaal "+MAX_EQUIPPED+" huisdieren tegelijk.","warn");
  checkAchievements();
  save();hud();petsModal();
}
function doRebirth(){
  if(player.level<15)return;
  var keepPets=player.pets,keepEquipped=player.equipped,keepAch=player.achievements;
  prestige.count++;savePrestige();
  player=defaultPlayer();
  player.pets=keepPets;player.equipped=keepEquipped;player.achievements=keepAch;
  garden=defaultGarden();
  generateQuests();
  save();hud();questsUI();
  toast("🌳 Herboren! Permanente verkoopbonus: ×"+prestigeMult().toFixed(2));
  document.getElementById("modal").style.display="none";
}

/* ============================================================
   UI
   ============================================================ */
function hud(){
  document.getElementById("coins").textContent=fmt(player.coins);
  document.getElementById("gems").textContent=fmt(player.gems);
  document.getElementById("level").textContent=player.level;
  document.getElementById("mode").textContent="LOCAL SAVE"+(prestige.count?" · ×"+prestigeMult().toFixed(2):"");
  document.getElementById("daynight").textContent=isNight()?"🌙":"☀️";
  var pb=document.getElementById("petbar");
  pb.innerHTML=player.equipped.map(function(pid){
    var p=player.pets.find(function(v){return v.id===pid;});return p?"<span>"+PETS[p.name].emoji+"</span>":"";
  }).join("");
  var bar=document.getElementById("seedbar");
  bar.innerHTML=CROP_ORDER.map(function(n){return '<button class="seed '+(selected===n?"sel":"")+'" data-seed="'+n+'"><em>'+CROPS[n].emoji+'</em><small>'+cropLabel(n)+'</small><b>'+(player.seeds[n]||0)+'</b></button>';}).join("");
  bar.querySelectorAll("[data-seed]").forEach(function(b){b.onclick=function(){selected=b.getAttribute("data-seed");tool="seed";hud();}});
  var sellBtn=document.getElementById("sell");
  sellBtn.innerHTML="RUGZAK"+(player.inventory.length?'<span class="count">'+player.inventory.length+"</span>":"");
  document.getElementById("water-toggle").className="tool-btn"+(tool==="water"?" active":"");
  document.getElementById("rebirth").className="top-btn"+(player.level>=15&&prestige.count===0?" ready":"");
  questsUI();
}
function questsUI(){
  var box=document.getElementById("quests");
  box.innerHTML=player.quests.map(function(q){
    var pct=Math.min(100,q.progress/q.need*100);
    return '<div class="quest-card'+(q.done?" done":"")+'"><small>QUEST</small><strong>'+q.label+'</strong><span>'+q.progress+" / "+q.need+' · 🪙'+fmt(q.coins)+(q.gems?" 💎"+q.gems:"")+'</span><div class="progress"><i style="width:'+pct+'%"></i></div></div>';
  }).join("");
}
function modalBox(title,body){
  var m=document.getElementById("modal");m.style.display="grid";
  m.innerHTML='<div class="modal-box"><button class="close" id="close">×</button><h2>'+title+'</h2>'+body+'</div>';
  document.getElementById("close").onclick=function(){m.style.display="none";m.innerHTML="";};
  m.onclick=function(e){if(e.target===m){m.style.display="none";m.innerHTML="";}};
  return m.querySelector(".modal-box");
}
function shop(){
  var html="<p>Koop zaadjes met je coins.</p>"+CROP_ORDER.map(function(n){var c=CROPS[n];var afford=player.coins>=c.price;return '<div class="modal-row"><span>'+c.emoji+' <b>'+cropLabel(n)+'</b><small style="color:#9fb4a5"> · verkoopt voor '+fmt(c.sell)+'</small></span><button data-buy="'+n+'" '+(afford?"":"disabled")+'>🪙 '+fmt(c.price)+'</button></div>';}).join("");
  var box=modalBox("Zaadwinkel",html);
  box.querySelectorAll("[data-buy]").forEach(function(b){b.onclick=function(){buySeed(b.getAttribute("data-buy"));shop();}});
}
function petsModal(){
  var html="<p>Pet bonus: ×"+petMultiplier().toFixed(2)+" (max "+MAX_EQUIPPED+" tegelijk uitgerust)</p>"+PET_ORDER.map(function(n){var c=PETS[n];var afford=player.coins>=c.price;return '<div class="modal-row"><span>'+c.emoji+' <b>'+n+'</b><small style="color:#9fb4a5"> · ×'+c.mult+'</small></span><button data-pet="'+n+'" '+(afford?"":"disabled")+'>🪙 '+fmt(c.price)+'</button></div>';}).join("");
  html+="<h3>Mijn huisdieren</h3>"+(player.pets.map(function(p){return '<div class="modal-row"><span>'+PETS[p.name].emoji+' '+p.name+'</span><button data-equip="'+p.id+'">'+(player.equipped.indexOf(p.id)>=0?"Ontkoppel":"Uitrusten")+'</button></div>';}).join("")||"<p>Nog geen huisdieren.</p>");
  var box=modalBox("Pet House",html);
  box.querySelectorAll("[data-pet]").forEach(function(b){b.onclick=function(){buyPet(b.getAttribute("data-pet"));petsModal();}});
  box.querySelectorAll("[data-equip]").forEach(function(b){b.onclick=function(){togglePet(b.getAttribute("data-equip"));petsModal();}});
}
function inventoryModal(){
  var groups={};
  player.inventory.forEach(function(item){
    var k=item.name+":"+item.mutation;
    if(!groups[k])groups[k]={name:item.name,mutation:item.mutation,ids:[],value:itemValue(item)};
    groups[k].ids.push(item.id);
  });
  var keys=Object.keys(groups);
  var total=player.inventory.reduce(function(s,i){return s+itemValue(i);},0);
  var html="<p>Verkoop je geoogste gewassen. Uitgeruste huisdieren en je herboren-bonus verhogen de verkoopprijs.</p>";
  html+=keys.length?keys.map(function(k){
    var g=groups[k],cfg=CROPS[g.name];
    return '<div class="modal-row"><span>'+cfg.emoji+' <b>'+g.mutation+" "+cropLabel(g.name)+'</b><small style="color:#9fb4a5"> · x'+g.ids.length+' · 🪙'+fmt(g.value)+' /stuk</small></span><div class="btns"><button data-sell-one="'+g.ids[0]+'">Verkoop 1</button><button data-sell-group="'+k+'">Verkoop alles</button></div></div>';
  }).join(""):"<p>Je rugzak is leeg. Ga naar buiten en oogst wat rijpe gewassen.</p>";
  var box=modalBox("Rugzak · "+player.inventory.length+" stuks",html+'<button class="confirm-btn" id="sellall" '+(player.inventory.length?"":"disabled")+'>Verkoop alles · +🪙'+fmt(total)+'</button>');
  box.querySelectorAll("[data-sell-one]").forEach(function(b){b.onclick=function(){sellItem(b.getAttribute("data-sell-one"));};});
  box.querySelectorAll("[data-sell-group]").forEach(function(b){b.onclick=function(){
    var k=b.getAttribute("data-sell-group"),g=groups[k];
    g.ids.slice().forEach(function(itemId){sellItem(itemId);});
  };});
  var allBtn=box.querySelector("#sellall");if(allBtn)allBtn.onclick=sellAll;
}
function achievementsModal(){
  var unlockedCount=player.achievements.length;
  var html='<p>'+unlockedCount+" / "+ACHIEVEMENTS.length+' prestaties behaald.</p><div class="ach-grid">'+
   ACHIEVEMENTS.map(function(a){
     var got=player.achievements.indexOf(a.id)>=0;
     return '<div class="ach-card'+(got?" unlocked":"")+'"><b>'+(got?"🏆":"🔒")+" "+a.label+'</b><span>'+a.desc+'</span></div>';
   }).join("")+"</div>";
  modalBox("Prestaties",html);
}
function rebirthModal(){
  var can=player.level>=15;
  var html="<p>Bij de Oude Boom kun je herboren worden: je level, coins, zaadjes en tuin worden gereset, maar je houdt je huisdieren en prestaties. Elke herboorte geeft een <b>permanente +15% verkoopbonus</b>.</p>"+
   '<div class="modal-row"><span>Huidige bonus</span><span>×'+prestigeMult().toFixed(2)+'</span></div>'+
   '<div class="modal-row"><span>Herboren-teller</span><span>'+prestige.count+'x</span></div>'+
   '<div class="modal-row"><span>Vereiste level</span><span>'+player.level+' / 15</span></div>'+
   '<button class="confirm-btn" id="do-rebirth" '+(can?"":"disabled")+'>'+(can?"🌳 Word herboren":"Bereik eerst level 15")+'</button>';
  var box=modalBox("Oude Boom",html);
  var btn=box.querySelector("#do-rebirth");if(btn)btn.onclick=doRebirth;
}
function help(){
  modalBox("Besturing","<p><b>W A S D</b> = lopen<br><b>Muis</b> = rondkijken (klik canvas om te vergrendelen)<br><b>Shift</b> = sprint<br><b>Spatie</b> = springen<br><b>E</b> = interactie</p>"+
  "<p>Kijk naar een leeg veld en druk E om de geselecteerde seed te planten. Kijk naar een rijpe crop en druk E om te oogsten — het komt in je <b>rugzak</b>, en pas bij RUGZAK verkoop je het echt voor coins.</p>"+
  "<p>Zet de 💧 gieter aan en druk E op een groeiend gewas om het 25% sneller te laten groeien.</p>"+
  "<p>Er is een dag/nacht cyclus van 4 minuten. Bij level 15 kun je bij de Oude Boom herboren worden voor een permanente verkoopbonus.</p>");
}

/* ============================================================
   TARGETING / INTERACTION
   ============================================================ */
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
  if(!t)return toast("Kijk naar een veld of gewas.","warn");
  if(tool==="water"){
    if(t.type==="crop")water(t.plot,t.cell);else toast("Niets te begieten hier.","warn");
    return;
  }
  if(t.type==="crop")harvest(t.plot,t.cell);else if(t.type==="cell")plant(t.plot,t.cell);
}

/* ============================================================
   EVENTS
   ============================================================ */
document.addEventListener("keydown",function(e){
  keys[e.code]=true;
  if(e.code==="Space"){e.preventDefault();jump();}
  if(e.code==="KeyE")interact();
  if(e.code==="KeyQ"){tool=tool==="water"?"seed":"water";hud();toast(tool==="water"?"💧 Gieter actief":"🌱 Zaaien actief");}
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
document.getElementById("sell").onclick=inventoryModal;
document.getElementById("ach").onclick=achievementsModal;
document.getElementById("rebirth").onclick=rebirthModal;
document.getElementById("help").onclick=help;
document.getElementById("water-toggle").onclick=function(){tool=tool==="water"?"seed":"water";hud();toast(tool==="water"?"💧 Gieter actief":"🌱 Zaaien actief");};

/* ---------- mobile controls ---------- */
if(window.matchMedia&&window.matchMedia("(pointer:coarse)").matches){
  document.getElementById("mobile").hidden=false;
  var joy=document.getElementById("joystick"),stick=document.getElementById("stick"),active=false;
  joy.addEventListener("pointerdown",function(e){active=true;joy.setPointerCapture(e.pointerId);moveJoy(e);});
  joy.addEventListener("pointermove",function(e){if(active)moveJoy(e);});
  joy.addEventListener("pointerup",function(){active=false;touch.x=touch.y=0;stick.style.transform="translate(0,0)";});
  function moveJoy(e){
    var r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy;
    var max=42,len=Math.hypot(dx,dy),s=Math.min(1,max/Math.max(1,len)),x=dx*s,y=dy*s;
    touch.x=x/max;touch.y=-y/max;stick.style.transform="translate("+x+"px,"+y+"px)";
  }
  document.getElementById("mobile-jump").onclick=jump;
  document.getElementById("mobile-use").onclick=interact;
  var lastTouchX=null;
  canvas.addEventListener("touchstart",function(e){if(e.touches.length===1)lastTouchX={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  canvas.addEventListener("touchmove",function(e){
    if(e.touches.length===1&&lastTouchX){
      var t=e.touches[0];
      cam.yaw-=(t.clientX-lastTouchX.x)*.004;cam.pitch-=(t.clientY-lastTouchX.y)*.003;cam.pitch=clamp(cam.pitch,-1.15,1.15);
      lastTouchX={x:t.clientX,y:t.clientY};
    }
  },{passive:true});
}

/* Start immediately: there is deliberately NO loading screen and NO backend. */
hud();
checkAchievements();
toast("Welkom in Grow Garden 2! Koop eerst zaadjes bij de SHOP — je begint zonder.");
var last=performance.now();
function loop(t){
  var dt=Math.min(.035,(t-last)/1000);last=t;
  move(dt);
  draw();
  var a=target();
  var hint=document.getElementById("hint");
  if(a){
    hint.hidden=false;
    var txt=tool==="water"?(a.type==="crop"?"Druk E om te begieten":"Zet 💧 uit om te planten"):(a.type==="crop"?"Druk E om te oogsten":"Druk E om te planten");
    document.getElementById("hint").textContent=txt;
  }else hint.hidden=true;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
setInterval(function(){save();hud();},15000);

})();
