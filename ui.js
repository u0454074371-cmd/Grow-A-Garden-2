
import {CROPS,PETS} from "./data.js";
export class UI{
 constructor(game){
  this.game=game;this.seedBar=document.querySelector("#seed-bar");this.bind();
 }
 bind(){
  document.querySelectorAll(".nav").forEach(()=>{});
  document.querySelector("#shop-btn").onclick=()=>this.shop();
  document.querySelector("#pets-btn").onclick=()=>this.pets();
  document.querySelector("#settings").onclick=()=>this.settings();
 }
 money(n){return new Intl.NumberFormat("nl-NL").format(Math.floor(n||0))}
 renderHud(){
  const p=this.game.player;
  document.querySelector("#hud-coins").textContent=this.money(p.coins);
  document.querySelector("#hud-gems").textContent=this.money(p.gems);
  document.querySelector("#hud-level").textContent=p.level;
  document.querySelector("#online-status").textContent=this.game.backendOnline?"FIREBASE ONLINE":"LOCAL SAVE";
  const q=this.game.quest();document.querySelector("#quest-name").textContent=q.title;document.querySelector("#quest-progress").textContent=`${q.progress} / ${q.target}`;document.querySelector("#quest-bar").style.width=`${q.progress/q.target*100}%`;
  this.seedBar.innerHTML=Object.entries(CROPS).map(([name,c])=>`<button class="seed ${this.game.selectedSeed===name?"selected":""}" data-seed="${name}"><span class="emoji">${c.emoji}</span><small>${name}</small><b>${p.seeds[name]||0}</b></button>`).join("");
  this.seedBar.querySelectorAll("[data-seed]").forEach(b=>b.onclick=()=>{this.game.selectedSeed=b.dataset.seed;this.renderHud()});
 }
 toast(text,type=""){const e=document.createElement("div");e.className="toast "+type;e.textContent=text;document.querySelector("#toast-root").append(e);setTimeout(()=>e.remove(),2800)}
 modal(title,body){
  const root=document.querySelector("#panel-root");root.innerHTML=`<div class="modal-back"><div class="modal"><button class="modal-close">×</button><h2>${title}</h2>${body}</div></div>`;
  root.querySelector(".modal-close").onclick=()=>root.innerHTML="";
  root.querySelector(".modal-back").onclick=e=>{if(e.target.classList.contains("modal-back"))root.innerHTML=""};
  return root.querySelector(".modal");
 }
 shop(){
  const el=this.modal("Seed Shop",`<p>Koop zaden met je coins.</p><div class="shop-grid">${Object.entries(CROPS).map(([n,c])=>`<button class="shop-item" data-buy="${n}"><strong>${c.emoji} ${n}</strong><small>${c.rarity} · 🪙 ${this.money(c.price)}</small></button>`).join("")}</div>`);
  el.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{const r=this.game.buySeed(b.dataset.buy);this.toast(r.ok?`${b.dataset.buy} gekocht.`:r.msg,r.ok?"":"warn");this.renderHud();this.game.save()});
 }
 pets(){
  const owned=this.game.player.pets||[];
  const el=this.modal("Pet House",`<p>Pets geven een multiplier op harvest.</p><div class="shop-grid">${Object.entries(PETS).map(([n,c])=>`<button class="shop-item" data-pet="${n}"><strong>${c.emoji} ${n}</strong><small>${c.rarity} · ×${c.multiplier} · 🪙 ${this.money(c.price)}</small></button>`).join("")}</div><h3>Mijn pets</h3>${owned.map(p=>`<button class="shop-item" data-equip="${p.id}" style="width:100%;margin-top:7px"><strong>${PETS[p.name]?.emoji||"🐾"} ${p.name}</strong><small>${this.game.player.equipped.includes(p.id)?"Equipped":"Klik om te equippen"}</small></button>`).join("")||"<p>Nog geen pets.</p>"}`);
  el.querySelectorAll("[data-pet]").forEach(b=>b.onclick=()=>{const r=this.game.buyPet(b.dataset.pet);this.toast(r.ok?"Pet gekocht.":r.msg,r.ok?"":"warn");this.renderHud();this.game.save()});
  el.querySelectorAll("[data-equip]").forEach(b=>b.onclick=()=>{const r=this.game.equipPet(b.dataset.equip);this.toast(r.ok?"Pet aangepast.":r.msg,r.ok?"":"warn");this.pets();this.game.save();});
 }
 settings(){
  const el=this.modal("Settings",`<p>Grow Garden 2 gebruikt lokaal opslaan wanneer Firebase niet bereikbaar is.</p><button class="shop-item" id="reset">Reset lokale save</button>`);
  el.querySelector("#reset").onclick=()=>{localStorage.removeItem("gg2_3d_save_v4");location.reload()};
 }
}
