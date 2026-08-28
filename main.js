
import {World} from "./world.js";
import {GameState} from "./game.js";
import {UI} from "./ui.js";

const $=s=>document.querySelector(s);
const game=new GameState();
const ui=new UI(game);
let world=null;
const keys=new Set();

function setProgress(value,text){
  const bar=$("#loading-progress");if(bar)bar.style.width=value+"%";
  const label=$("#loading-text");if(label)label.textContent=text;
}
function showGame(){
  $("#loading").style.display="none";
  $("#game").hidden=false;
}
function notify(text,type=""){ui.toast(text,type);}

async function start(){
  try{
    setProgress(10,"Profiel laden...");
    game.saveLocal?.();
    setProgress(30,"3D wereld starten...");
    world=new World($("#game-canvas"),()=>{});
    world.setKeys(keys);
    game.world=world;
    setProgress(60,"Tuin plaatsen...");
    world.rebuildCrops(game.garden);
    ui.renderHud();
    bindControls();
    setProgress(88,"Game klaarzetten...");
    showGame();
    world.start();
    setProgress(100,"Klaar");

    // Firebase is deliberately non-blocking and optional.
    window.setTimeout(async()=>{
      try{
        const online=await game.connect();
        ui.renderHud();
        notify(online?"☁ Online save verbonden":"💾 Lokale save actief",online?"":"warn");
      }catch(err){console.warn("Firebase background error",err);}
    },100);
  }catch(error){
    console.error("Start error:",error);
    // Absolute fallback: reveal the game UI rather than remaining on the loader.
    showGame();
    if(!world){
      try{world=new World($("#game-canvas"));world.setKeys(keys);world.start();}catch(e){console.error(e);}
    }
    notify("Game gestart in veilige lokale modus.","warn");
  }
}

function bindControls(){
  document.addEventListener("keydown",e=>{
    if(e.code==="Space"){e.preventDefault();world.jump();}
    if(e.code==="KeyE"){interact();}
    keys.add(e.code);
  });
  document.addEventListener("keyup",e=>keys.delete(e.code));

  $("#shop-btn").onclick=()=>ui.shop();
  $("#pets-btn").onclick=()=>ui.pets();
  $("#settings").onclick=()=>ui.settings();

  const canvas=$("#game-canvas");
  canvas.addEventListener("click",()=>canvas.requestPointerLock?.());
  canvas.addEventListener("dblclick",e=>{e.preventDefault();interact();});

  if(matchMedia("(pointer:coarse)").matches){
    $("#mobile-controls").hidden=false;
    setupMobile();
  }
}

function interact(){
  if(!world)return;
  const target=world.findCenterObject();
  if(!target){notify("Kijk dichter naar een plant of leeg veld.","warn");return;}
  if(target.type==="crop"){
    const result=game.harvest(target.plot,target.cell);
    if(!result.ok){notify(result.msg,"warn");return;}
    world.rebuildCrops(game.garden);
    ui.renderHud();game.save();
    notify(`🌟 ${result.mutation} harvest · +🪙 ${ui.money(result.value)}`);
  }else if(target.type==="cell"){
    const result=game.plant(target.plot,target.cell,game.selectedSeed);
    if(!result.ok){notify(result.msg,"warn");return;}
    world.rebuildCrops(game.garden);
    ui.renderHud();game.save();
    notify(`${game.selectedSeed} geplant!`);
  }
}

function setupMobile(){
  const joy=$("#joystick"),stick=$("#joystick-stick");
  let active=false;
  joy.addEventListener("pointerdown",e=>{active=true;joy.setPointerCapture(e.pointerId);moveJoy(e);});
  joy.addEventListener("pointermove",e=>{if(active)moveJoy(e);});
  joy.addEventListener("pointerup",()=>{active=false;world.moveStick.x=world.moveStick.y=0;stick.style.transform="translate(0,0)"});
  function moveJoy(e){
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;const max=40,len=Math.hypot(dx,dy),scale=Math.min(1,max/Math.max(1,len));
    dx*=scale;dy*=scale;world.moveStick.x=dx/max;world.moveStick.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;
  }
  $("#mobile-jump").onclick=()=>world.jump();
  $("#mobile-interact").onclick=()=>interact();
}

setInterval(()=>{
  if(!world)return;
  for(const crop of Object.values(game.garden.cells||{})){
    if(!crop)continue;
    if(!crop.ready&&Date.now()>=crop.readyAt){
      crop.ready=true;world.rebuildCrops(game.garden);
    }
  }
},400);

setInterval(()=>game.save(),30000);
window.addEventListener("beforeunload",()=>game.save());
start();
