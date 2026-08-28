
import {CROPS,PETS,defaultPlayer,defaultGarden} from "./data.js";
import {connectFirebase,loadRemotePlayer,saveRemote} from "./firebase.js";

const KEY="gg2_fixed_3d_save";
export class GameState{
 constructor(){
  const saved=this.readLocal();
  this.player=saved?.player||defaultPlayer();
  this.garden=saved?.garden||defaultGarden();
  this.player.id=this.player.id||this.localId();
  this.selectedSeed="Carrot";
  this.backendOnline=false;
  this.lastSaved=Date.now();
 }
 localId(){
  let id=localStorage.getItem("gg2_player_id");
  if(!id){id="web_"+Math.random().toString(36).slice(2)+"_"+Date.now();localStorage.setItem("gg2_player_id",id);}
  return id;
 }
 readLocal(){try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch{return null}}
 saveLocal(){try{localStorage.setItem(KEY,JSON.stringify({player:this.player,garden:this.garden,savedAt:Date.now()}));this.lastSaved=Date.now();}catch{}}
 async connect(){
  this.backendOnline=await connectFirebase();
  if(!this.backendOnline)return false;
  const remote=await loadRemotePlayer(this.player.id);
  if(remote)this.player={...this.player,...remote,id:this.player.id,seeds:{...this.player.seeds,...(remote.seeds||{})}};
  await this.save();
  return true;
 }
 async save(){
  this.saveLocal();
  if(this.backendOnline){
    const payload={...this.player};delete payload.id;
    await saveRemote(this.player.id,payload);
  }
 }
 petMultiplier(){
  return (this.player.equipped||[]).reduce((m,id)=>{
   const pet=this.player.pets.find(p=>p.id===id);
   return m*(pet?(PETS[pet.name]?.multiplier||1):1);
  },1);
 }
 plant(plot,cell,name){
  const cfg=CROPS[name];const key=`${plot}:${cell}`;
  if(!cfg)return{ok:false,msg:"Onbekende seed."};
  if(this.garden.cells[key])return{ok:false,msg:"Dit veld is al bezet."};
  if((this.player.seeds[name]||0)<=0)return{ok:false,msg:"Je hebt geen seeds van deze soort."};
  const now=Date.now();
  this.player.seeds[name]--;
  this.garden.cells[key]={plot,cell,name,plantedAt:now,readyAt:now+cfg.grow*1000,ready:false,mutation:this.rollMutation()};
  this.player.planted++;
  this.player.questPlant++;
  return{ok:true};
 }
 rollMutation(){const r=Math.random();if(r<.003)return"Rainbow";if(r<.02)return"Golden";if(r<.08)return"Giant";return"Normal";}
 isReady(c){return !!c&&(c.ready||Date.now()>=c.readyAt);}
 harvest(plot,cell){
  const key=`${plot}:${cell}`,crop=this.garden.cells[key];
  if(!crop)return{ok:false,msg:"Hier groeit niets."};
  if(!this.isReady(crop))return{ok:false,msg:"Deze crop groeit nog."};
  const cfg=CROPS[crop.name],mut={Normal:1,Giant:2,Golden:4,Rainbow:10}[crop.mutation]||1;
  const value=Math.floor(cfg.sell*mut*this.petMultiplier());
  this.player.coins+=value;this.player.xp+=cfg.xp;this.player.harvested++;this.player.earned+=value;this.player.questHarvest++;
  while(this.player.xp>=this.player.level*100){this.player.xp-=this.player.level*100;this.player.level++;}
  this.garden.cells[key]=null;
  return{ok:true,value,mutation:crop.mutation};
 }
 buySeed(name){
  const cfg=CROPS[name];if(!cfg)return{ok:false,msg:"Seed bestaat niet."};
  if(this.player.coins<cfg.price)return{ok:false,msg:"Niet genoeg coins."};
  this.player.coins-=cfg.price;this.player.seeds[name]=(this.player.seeds[name]||0)+1;return{ok:true};
 }
 buyPet(name){
  const cfg=PETS[name];if(!cfg)return{ok:false,msg:"Pet bestaat niet."};
  if(this.player.coins<cfg.price)return{ok:false,msg:"Niet genoeg coins."};
  this.player.coins-=cfg.price;this.player.pets.push({id:Math.random().toString(36).slice(2),name});return{ok:true};
 }
 equipPet(id){
  if(this.player.equipped.includes(id)){this.player.equipped=this.player.equipped.filter(x=>x!==id);return{ok:true}}
  if(this.player.equipped.length>=3)return{ok:false,msg:"Maximaal 3 pets."};
  if(!this.player.pets.some(p=>p.id===id))return{ok:false,msg:"Pet niet gevonden."};
  this.player.equipped.push(id);return{ok:true};
 }
 quest(){const target=10,progress=Math.min(target,this.player.questHarvest||0);return{title:"First Harvest",progress,target};}
}
