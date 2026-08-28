
/*
 Grow Garden 2 - Dependency-free 3D world engine.
 No CDN, no Three.js and no external assets are required.
 The renderer uses perspective projection on a 2D canvas to provide a
 first-person 3D garden with movement, jumping, collisions, buildings,
 trees, plots and crops.
*/
export class World{
  constructor(canvas,onInteract){
    this.canvas=canvas;
    this.ctx=canvas.getContext("2d",{alpha:false});
    this.onInteract=onInteract;
    this.keys=new Set();
    this.width=canvas.width=innerWidth*devicePixelRatio;
    this.height=canvas.height=innerHeight*devicePixelRatio;
    this.cssW=innerWidth;this.cssH=innerHeight;
    this.fov=Math.PI/3;
    this.player={x:0,y:1.7,z:22,vx:0,vy:0,vz:0,yaw:Math.PI,pitch:0,grounded:true};
    this.moveStick={x:0,y:0};
    this.objects=[];
    this.cells=new Map();
    this.cropObjects=new Map();
    this.last=performance.now();
    this.running=false;
    this.sunPhase=0;
    this.buildWorld();
    addEventListener("resize",()=>this.resize());
    canvas.addEventListener("click",()=>canvas.requestPointerLock?.());
    document.addEventListener("mousemove",e=>{
      if(document.pointerLockElement===canvas){
        this.player.yaw-=e.movementX*0.0024;
        this.player.pitch-=e.movementY*0.0018;
        this.player.pitch=Math.max(-1.2,Math.min(1.2,this.player.pitch));
      }
    });
  }

  resize(){
    this.cssW=innerWidth;this.cssH=innerHeight;
    this.canvas.width=innerWidth*devicePixelRatio;
    this.canvas.height=innerHeight*devicePixelRatio;
    this.ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  }

  add(type,x,y,z,w,d,h,extra={}){
    const o={type,x,y,z,w,d,h,...extra};
    this.objects.push(o);
    return o;
  }

  buildWorld(){
    // Buildings / collision
    this.add("building",-25,4,-55,18,13,8,{color:"#7b9d65",label:"SELL BARN"});
    this.add("building",0,4,-55,18,13,8,{color:"#b07a4f",label:"SEED SHOP"});
    this.add("building",25,4,-55,18,13,8,{color:"#8064a4",label:"PET HOUSE"});

    // Pond
    this.add("pond",-70,.1,58,30,18,.2,{color:"#56b9dc",label:"Pond"});

    // Six plots, each 8x8 cells
    const positions=[[-43,-34],[43,-34],[-43,0],[43,0],[-43,34],[43,34]];
    positions.forEach((p,plot)=>{
      for(let z=0;z<8;z++){
        for(let x=0;x<8;x++){
          const wx=p[0]-12.25+x*3.5,wz=p[1]-12.25+z*3.5;
          this.cells.set(`${plot}:${z*8+x}`,this.add("cell",wx,.1,wz,3.05,3.05,.18,{plot,cell:z*8+x}));
        }
      }
    });

    // Trees around perimeter
    for(let i=0;i<34;i++){
      const a=(Math.PI*2*i)/34;
      const r=76+(i%4)*5;
      this.add("tree",Math.cos(a)*r,3.2,Math.sin(a)*r,3,3,6,{color:i%3===0?"#3d8a4c":"#2d7541"});
    }

    // Rocks
    for(let i=0;i<22;i++){
      const a=(Math.PI*2*i)/22+.3;
      const r=48+(i%5)*6;
      this.add("rock",Math.cos(a)*r,.8,Math.sin(a)*r,2.5,2,1.5,{color:"#68756a"});
    }

    // Lamp posts
    for(const [x,z] of [[-14,-10],[14,-10],[-14,10],[14,10],[-8,-44],[8,-44]]){
      this.add("lamp",x,3,z,.4,.4,6,{color:"#36483b"});
    }

    // Decorative flower patches
    for(let i=0;i<40;i++){
      const a=i*.9,r=18+(i%7)*3;
      this.add("flower",Math.cos(a)*r,.3,Math.sin(a)*r,1,1,.7,{color:["#ef8aa2","#f3d46a","#7dc9ff"][i%3]});
    }
  }

  setKeys(keys){this.keys=keys;}
  jump(){if(this.player.grounded){this.player.vy=8.6;this.player.grounded=false;}}

  updateCrop(plot,cell,crop){
    const key=`${plot}:${cell}`;
    const old=this.cropObjects.get(key);
    if(old)old.removed=true;
    if(!crop)return;
    const tile=this.cells.get(key);if(!tile)return;
    const o=this.add("crop",tile.x,tile.y,tile.z,1.3,1.3,2,{plot,cell,name:crop.name,mutation:crop.mutation||"Normal",crop});
    this.cropObjects.set(key,o);
  }

  rebuildCrops(garden){
    for(const o of this.cropObjects.values())o.removed=true;
    this.cropObjects.clear();
    for(const key in (garden?.cells||{})){
      const c=garden.cells[key];
      if(c)this.updateCrop(c.plot,c.cell,c);
    }
  }

  collides(nx,nz){
    // Building AABBs only; garden tiles and scenery are walkable.
    const buildings=[
      {x:0,z:-55,w:18,d:13},{x:-25,z:-55,w:18,d:13},{x:25,z:-55,w:18,d:13}
    ];
    for(const b of buildings){
      if(nx>b.x-b.w/2-1 && nx<b.x+b.w/2+1 && nz>b.z-b.d/2-1 && nz<b.z+b.d/2+1)return true;
    }
    return false;
  }

  move(dt){
    const p=this.player;
    let ix=0,iz=0;
    if(this.keys.has("KeyA"))ix-=1;
    if(this.keys.has("KeyD"))ix+=1;
    if(this.keys.has("KeyW"))iz+=1;
    if(this.keys.has("KeyS"))iz-=1;
    ix+=this.moveStick.x;iz+=this.moveStick.y;
    const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len;}
    const speed=(this.keys.has("ShiftLeft")||this.keys.has("ShiftRight"))?10.5:6.0;
    const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);
    const dx=(sy*iz)+(cy*ix),dz=(cy*iz)+(-sy*ix);
    const targetX=dx*speed,targetZ=dz*speed;
    p.vx+=(targetX-p.vx)*Math.min(1,dt*11);
    p.vz+=(targetZ-p.vz)*Math.min(1,dt*11);
    if(len===0){p.vx*=Math.max(0,1-dt*8);p.vz*=Math.max(0,1-dt*8);}
    const nx=p.x+p.vx*dt,nz=p.z+p.vz*dt;
    if(!this.collides(nx,p.z))p.x=nx;else p.vx=0;
    if(!this.collides(p.x,nz))p.z=nz;else p.vz=0;
    p.vy-=24*dt;p.y+=p.vy*dt;
    if(p.y<1.7){p.y=1.7;p.vy=0;p.grounded=true;}
    p.x=Math.max(-102,Math.min(102,p.x));p.z=Math.max(-102,Math.min(102,p.z));
  }

  project(x,y,z){
    const p=this.player;
    const dx=x-p.x,dz=z-p.z,dy=y-p.y;
    const sy=Math.sin(-p.yaw),cy=Math.cos(-p.yaw);
    let cx=dx*cy-dz*sy,cz=dx*sy+dz*cy;
    const cp=Math.cos(-p.pitch),sp=Math.sin(-p.pitch);
    const yy=dy*cp-cz*sp,depth=dy*sp+cz*cp;
    if(depth<=.15)return null;
    const f=this.cssW/(2*Math.tan(this.fov/2));
    return {x:this.cssW/2+(cx/depth)*f,y:this.cssH/2-(yy/depth)*f,depth,scale:f/depth};
  }

  poly(points,fill,stroke=null){
    const c=this.ctx;c.beginPath();
    points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
    c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}
  }

  cube(o){
    const x=o.x,y=o.y,z=o.z,w=o.w/2,d=o.d/2,h=o.h;
    const pts=[
      this.project(x-w,y-h/2,z-d),this.project(x+w,y-h/2,z-d),
      this.project(x+w,y+h/2,z-d),this.project(x-w,y+h/2,z-d),
      this.project(x-w,y-h/2,z+d),this.project(x+w,y-h/2,z+d),
      this.project(x+w,y+h/2,z+d),this.project(x-w,y+h/2,z+d)
    ];
    if(pts.some(v=>!v))return;
    const faces=[
      [0,1,2,3,"#6b5036"],[4,5,6,7,"#8b6945"],[0,4,7,3,o.color||"#777"],
      [1,5,6,2,o.color||"#888"],[3,2,6,7,"#8e6c4c"],[0,1,5,4,"#755338"]
    ];
    faces.sort((a,b)=>{
      const da=a.slice(0,4).reduce((s,i)=>s+pts[i].depth,0);
      const db=b.slice(0,4).reduce((s,i)=>s+pts[i].depth,0);
      return db-da;
    });
    faces.forEach(f=>this.poly(f.slice(0,4).map(i=>pts[i]),f[4]));
    const top=this.project(x,y+h/2,z);
    if(top&&top.depth>0&&o.label){
      const s=Math.max(8,Math.min(20,top.scale*4));
      this.ctx.font=`900 ${s}px system-ui`;this.ctx.textAlign="center";this.ctx.fillStyle="#fff";
      this.ctx.shadowColor="#000";this.ctx.shadowBlur=4;this.ctx.fillText(o.label,top.x,top.y-10);this.ctx.shadowBlur=0;
    }
  }

  tree(o){
    const base=this.project(o.x,o.y-2.5,o.z),top=this.project(o.x,o.y+3.8,o.z);
    if(!base||!top)return;
    const s=Math.max(2,top.scale*2.3);
    const trunkW=Math.max(2,s*.33);
    this.ctx.fillStyle="#6c452d";this.ctx.fillRect(base.x-trunkW/2,top.y+s*.5,trunkW,Math.max(4,base.y-top.y));
    const r=Math.max(5,s*2.0);
    this.ctx.fillStyle=o.color||"#2f7d46";
    this.ctx.beginPath();this.ctx.arc(top.x,top.y,r,0,Math.PI*2);this.ctx.fill();
    this.ctx.fillStyle="#52aa5e";this.ctx.beginPath();this.ctx.arc(top.x-r*.45,top.y+r*.25,r*.72,0,Math.PI*2);this.ctx.fill();
  }

  rock(o){
    const p=this.project(o.x,o.y,o.z);if(!p)return;
    const r=Math.max(3,p.scale*1.2);
    this.ctx.fillStyle=o.color||"#68756a";this.ctx.beginPath();
    this.ctx.ellipse(p.x,p.y,r*1.5,r*.8,0,0,Math.PI*2);this.ctx.fill();
  }

  crop(o){
    const p=this.project(o.x,o.y,o.z);if(!p)return;
    const ready=o.crop&&(o.crop.ready||Date.now()>=o.crop.readyAt);
    const height=Math.max(6,p.scale*(ready?2.7:1.3));
    const width=height*.48;
    const colors={Carrot:"#f18a3c",Tomato:"#e84f4e",Blueberry:"#5f71e8",Starfruit:"#f5cf4f",Moonmelon:"#76d4ad",Sunflower:"#ffd34f"};
    this.ctx.fillStyle=colors[o.name]||"#75c66e";
    this.ctx.beginPath();
    this.ctx.roundRect(p.x-width/2,p.y-height,width,height,Math.min(width*.35,8));this.ctx.fill();
    this.ctx.fillStyle="#4ca358";this.ctx.beginPath();this.ctx.arc(p.x-width*.25,p.y-height*.9,width*.45,0,Math.PI*2);this.ctx.fill();
    this.ctx.beginPath();this.ctx.arc(p.x+width*.25,p.y-height*.82,width*.45,0,Math.PI*2);this.ctx.fill();
    if(o.mutation==="Golden"){this.ctx.strokeStyle="#ffe06b";this.ctx.lineWidth=3;this.ctx.stroke();}
    if(o.mutation==="Rainbow"){this.ctx.strokeStyle=["#ff6b6b","#ffd86b","#72db7a","#72b9ff","#c985ff"][Math.floor(Date.now()/200)%5];this.ctx.lineWidth=3;this.ctx.stroke();}
    if(ready){
      this.ctx.font=`900 ${Math.max(9,Math.min(15,p.scale*3))}px system-ui`;this.ctx.textAlign="center";this.ctx.fillStyle="#fff";
      this.ctx.shadowColor="#000";this.ctx.shadowBlur=4;this.ctx.fillText("READY",p.x,p.y-height-5);this.ctx.shadowBlur=0;
    }
  }

  flower(o){
    const p=this.project(o.x,o.y,o.z);if(!p)return;
    const r=Math.max(2,p.scale*.45);this.ctx.fillStyle=o.color;this.ctx.beginPath();this.ctx.arc(p.x,p.y,r,0,Math.PI*2);this.ctx.fill();
  }

  lamp(o){
    const p=this.project(o.x,o.y,o.z),t=this.project(o.x,o.y+o.h,o.z);if(!p||!t)return;
    const w=Math.max(1,t.scale*.12);this.ctx.fillStyle="#3a493d";this.ctx.fillRect(p.x-w/2,t.y,w,p.y-t.y);
    this.ctx.fillStyle="#f7d56c";this.ctx.beginPath();this.ctx.arc(t.x,t.y,Math.max(2,t.scale*.25),0,Math.PI*2);this.ctx.fill();
  }

  pond(o){
    const p=this.project(o.x,o.y,o.z);if(!p)return;
    const sx=Math.max(14,p.scale*o.w*.8),sy=Math.max(7,p.scale*o.d*.35);
    this.ctx.fillStyle=o.color;this.ctx.beginPath();this.ctx.ellipse(p.x,p.y,sx,sy,0,0,Math.PI*2);this.ctx.fill();
    this.ctx.strokeStyle="rgba(255,255,255,.25)";this.ctx.lineWidth=2;this.ctx.stroke();
  }

  ground(){
    const c=this.ctx;
    const sky=c.createLinearGradient(0,0,0,this.cssH);
    sky.addColorStop(0,"#84c3e4");sky.addColorStop(.52,"#d8e6bf");sky.addColorStop(.53,"#57965b");sky.addColorStop(1,"#305d38");
    c.fillStyle=sky;c.fillRect(0,0,this.cssW,this.cssH);
    // horizon haze
    const g=c.createLinearGradient(0,this.cssH*.43,0,this.cssH*.72);
    g.addColorStop(0,"rgba(220,235,195,.5)");g.addColorStop(1,"rgba(70,125,70,0)");
    c.fillStyle=g;c.fillRect(0,this.cssH*.4,this.cssW,this.cssH*.35);
    // road strips
    const horizon=this.project(0,.2,0);
    if(horizon){
      c.strokeStyle="rgba(196,157,105,.55)";
      for(let i=-8;i<=8;i++){
        const a=this.project(i*13,.21,-100),b=this.project(i*13,.21,100);
        if(a&&b){c.lineWidth=1;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
      }
    }
  }

  render(){
    const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.canvas.width,this.canvas.height);
    c.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    this.ground();

    const visible=this.objects.filter(o=>!o.removed).map(o=>{
      const p=this.project(o.x,o.y||0,o.z);return {...o,_p:p};
    }).filter(o=>o._p&&o._p.depth<220);
    visible.sort((a,b)=>b._p.depth-a._p.depth);
    visible.forEach(o=>{
      if(o.type==="tree")this.tree(o);
      else if(o.type==="rock")this.rock(o);
      else if(o.type==="crop")this.crop(o);
      else if(o.type==="cell"){c.globalAlpha=.84;this.cube(o);c.globalAlpha=1}
      else if(o.type==="building")this.cube(o);
      else if(o.type==="lamp")this.lamp(o);
      else if(o.type==="pond")this.pond(o);
      else if(o.type==="flower")this.flower(o);
    });
    // player hands / subtle vignette
    const v=c.createRadialGradient(this.cssW/2,this.cssH/2,Math.min(this.cssW,this.cssH)*.25,this.cssW/2,this.cssH/2,Math.max(this.cssW,this.cssH)*.72);
    v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.23)");
    c.fillStyle=v;c.fillRect(0,0,this.cssW,this.cssH);
  }

  start(){
    if(this.running)return;
    this.running=true;
    const loop=(now)=>{
      const dt=Math.min(.035,(now-this.last)/1000);this.last=now;
      this.move(dt);this.render();requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  findCenterObject(){
    let best=null,bestScore=Infinity;
    for(const o of this.cropObjects.values()){
      if(o.removed)continue;
      const p=this.project(o.x,o.y,o.z);if(!p)continue;
      const dx=p.x-this.cssW/2,dy=p.y-this.cssH/2;
      const dist=Math.hypot(dx,dy);
      if(dist<bestScore&&dist<110&&p.depth<16){best=o;bestScore=dist;}
    }
    // empty tile under crosshair
    if(!best){
      let tileBest=null,score=Infinity;
      for(const tile of this.cells.values()){
        const p=this.project(tile.x,tile.y,tile.z);if(!p)continue;
        const dist=Math.hypot(p.x-this.cssW/2,p.y-this.cssH/2);
        if(dist<score&&dist<130&&p.depth<14){tileBest=tile;score=dist;}
      }
      best=tileBest;
    }
    return best;
  }
}
