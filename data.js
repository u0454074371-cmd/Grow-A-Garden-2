
export const CROPS={
 Carrot:{emoji:"🥕",rarity:"Common",price:10,sell:18,grow:12,xp:5},
 Tomato:{emoji:"🍅",rarity:"Uncommon",price:35,sell:68,grow:24,xp:10},
 Blueberry:{emoji:"🫐",rarity:"Rare",price:100,sell:210,grow:42,xp:20},
 Starfruit:{emoji:"⭐",rarity:"Epic",price:350,sell:850,grow:75,xp:45},
 Moonmelon:{emoji:"🍈",rarity:"Legendary",price:1200,sell:3200,grow:140,xp:100},
 Sunflower:{emoji:"🌻",rarity:"Mythic",price:2200,sell:5900,grow:200,xp:160}
};
export const PETS={
 Bunny:{emoji:"🐰",price:250,multiplier:1.1,rarity:"Common"},
 Cat:{emoji:"🐱",price:700,multiplier:1.18,rarity:"Uncommon"},
 Fox:{emoji:"🦊",price:1200,multiplier:1.3,rarity:"Rare"},
 Bee:{emoji:"🐝",price:3500,multiplier:1.6,rarity:"Epic"},
 Dragon:{emoji:"🐉",price:15000,multiplier:2.2,rarity:"Legendary"},
 Phoenix:{emoji:"🔥",price:50000,multiplier:3,rarity:"Mythic"}
};
export function defaultPlayer(){
 return {id:"",displayName:"Garden Player",coins:250,gems:10,level:1,xp:0,
  seeds:{Carrot:5,Tomato:2,Blueberry:0,Starfruit:0,Moonmelon:0,Sunflower:0},
  pets:[],equipped:[],harvested:0,planted:0,earned:0,questHarvest:0,questPlant:0
 };
}
export function defaultGarden(){
 const cells={};for(let i=0;i<64;i++)cells[i]=null;return{cells};
}
