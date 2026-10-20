const smooth=t=>t*t*(3-2*t),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Split a rotated leaf into short collision boxes. A single bounding box for a
// diagonal leaf would incorrectly close the whole corner of a small room.
function leafBoxes(door,leaf,progress){
  const data=leaf.userData.referenceDoorLeaf,direction=data.direction??-Math.sign(leaf.position.x),width=data.width;
  const angle=(data.closedAngle??0)+(data.openAngle??leaf.userData.restAngle)*progress;
  const cos=Math.cos(angle),sin=Math.sin(angle),rootAngle=door.axis==='z'?Math.PI/2:0,rc=Math.cos(rootAngle),rs=Math.sin(rootAngle);
  const thickness=data.thickness??.064,segments=Math.max(1,Math.ceil(width/.12)),boxes=[];
  const point=(x,z)=>{
    const lx=leaf.position.x+cos*x+sin*z,lz=-sin*x+cos*z;
    return [door.x+rc*lx+rs*lz,door.z-rs*lx+rc*lz];
  };
  const rectangle=(x0,x1,z0,z1)=>{
    const corners=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z])=>point(x,z));
    return {x0:Math.min(...corners.map(p=>p[0])),x1:Math.max(...corners.map(p=>p[0])),z0:Math.min(...corners.map(p=>p[1])),z1:Math.max(...corners.map(p=>p[1])),y0:door.y,y1:door.y+data.height,roomDoorId:door.id,dynamicDoor:true};
  };
  for(let i=0;i<segments;i++){
    const a=direction*width*i/segments,b=direction*width*(i+1)/segments;
    boxes.push(rectangle(Math.min(a,b),Math.max(a,b),-thickness/2,thickness/2));
  }
  // The long pulls project beyond the panel on both faces.
  const handleX=direction*(width-.115);
  boxes.push(rectangle(handleX-.017,handleX+.017,-.101,.101));
  return boxes;
}
function overlapsPlayer(box,player){
  if(!player)return false;
  const p=player.position??player,y=Number.isFinite(player.feet)?player.feet:p.y;
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(y))return false;
  if(y+1.48<box.y0||y+.16>box.y1)return false;
  const r=player.radius??.19,dx=p.x-clamp(p.x,box.x0,box.x1),dz=p.z-clamp(p.z,box.z0,box.z1);
  return dx*dx+dz*dz<(r+.012)**2;
}

export function createDoorSystem({colliders}){
  const doors=[];
  let lastNotice='';
  function boxesAt(door,progress){return door.leaves.flatMap(leaf=>leafBoxes(door,leaf,progress));}
  function hitsPlayer(door,from,to,player){
    if(!player)return false;
    const p=player.position??player,y=Number.isFinite(player.feet)?player.feet:p.y;
    if(!Number.isFinite(y)||y+1.48<door.y||y+.16>door.y+door.height||Math.hypot(p.x-door.x,p.z-door.z)>door.width+(player.radius??.19)+.15)return false;
    const samples=Math.max(1,Math.ceil(Math.abs(to-from)*Math.PI/2/.035));
    // Include both endpoints: someone standing beside a fully open leaf must
    // still be protected when the first closing frame starts.
    for(let i=0;i<=samples;i++)if(boxesAt(door,from+(to-from)*i/samples).some(box=>overlapsPlayer(box,player)))return true;
    return false;
  }
  function sync(door){
    const boxes=boxesAt(door,door.progress);
    if(!door.colliders.length){door.colliders=boxes;colliders.push(...boxes);}
    else for(let i=0;i<boxes.length;i++)Object.assign(door.colliders[i],boxes[i]);
    for(const leaf of door.leaves){
      const data=leaf.userData.referenceDoorLeaf;
      leaf.rotation.y=(data.closedAngle??0)+(data.openAngle??leaf.userData.restAngle)*door.progress;
      leaf.updateMatrix();
    }
    // The scene is frozen after startup. Updating just this dynamic subtree
    // keeps both the visual mesh and the camera's ray tests at the new angle.
    door.root.updateMatrix();door.root.updateWorldMatrix(true,true);
    door.isOpen=door.progress>.98;
    door.opening=door.target>door.progress;
    door.root.userData.doorProgress=door.progress;
  }
  function register(root,{x,z,y,width,height,axis='x',name='房门',open=false,category='room'}={}){
    const leaves=root.doorLeaves??root.children.filter(child=>child.userData.referenceDoorLeaf);
    if(!leaves.length)throw Error('Door has no hinged leaves: '+name);
    const door={kind:'door',id:'door-'+doors.length,name,x,z,y,floor:y,width,height,axis,category,root,leaves,colliders:[],progress:open?1:0,target:open?1:0,isOpen:open,opening:false,duration:.82,blocked:false};
    root.userData.dynamicRoot=true;root.userData.roomDoorId=door.id;
    for(const leaf of leaves){leaf.userData.dynamicRoot=true;leaf.userData.restAngle=leaf.rotation.y;}
    doors.push(door);sync(door);return door;
  }
  function setOpen(door,open,player=null,{immediate=false}={}){
    if(typeof door==='string')door=doors.find(item=>item.id===door);
    if(!door)return false;
    const target=open?1:0;
    lastNotice='';
    if(!immediate&&hitsPlayer(door,door.progress,target,player)){
      lastNotice=open?'请避开门扇，稍退一步再开门':'门口有人，请离开门扇范围再关门';
      door.blocked=true;return false;
    }
    door.blocked=false;door.target=target;
    if(Math.abs(door.progress-target)<1e-9){door.motion=null;sync(door);return true;}
    door.motion={from:door.progress,to:target,elapsed:0,duration:Math.max(.18,door.duration*Math.abs(target-door.progress))};
    if(immediate){door.progress=target;door.motion=null;sync(door);}
    return true;
  }
  function toggle(door,player){return setOpen(door,door.target<.5,player);}
  function tick(dt,player){
    let changed=false;
    for(const door of doors){
      if(!door.motion)continue;
      const motion=door.motion,elapsed=Math.min(motion.duration,motion.elapsed+Math.max(0,Math.min(dt,.05))),progress=motion.from+(motion.to-motion.from)*smooth(elapsed/motion.duration);
      if(hitsPlayer(door,door.progress,progress,player)){
        door.blocked=true;
        if(motion.to===0){
          // Reverse from the current angle instead of pushing the visitor or
          // snapping the door back. Opening will wait if they enter that arc.
          door.target=1;door.motion={from:door.progress,to:1,elapsed:0,duration:Math.max(.18,door.duration*(1-door.progress))};
          door.blocked=false; // Keep requesting frames so the safe reversal can finish.
          lastNotice='已停止关门，避免夹到人物';
        }
        continue;
      }
      door.blocked=false;motion.elapsed=elapsed;
      if(Math.abs(progress-door.progress)>1e-9){door.progress=progress;sync(door);changed=true;}
      if(elapsed>=motion.duration){door.progress=motion.to;door.motion=null;sync(door);}
    }
    return changed;
  }
  function nearest(player,range=1.65){
    const p=player.position??player,y=Number.isFinite(player.feet)?player.feet:p.y;
    let nearest=null,best=range;
    for(const door of doors){
      if(!Number.isFinite(y)||Math.abs(y-door.y)>.65)continue;
      // Interaction stays at the doorway on either side while the leaf moves.
      const distance=Math.hypot(p.x-door.x,p.z-door.z);
      if(distance>best)continue;
      door.distance=distance;nearest=door;best=distance;
    }
    return nearest;
  }
  return {doors,register,tick,toggle,setOpen,nearest,openAll({immediate=true}={}){for(const door of doors)setOpen(door,true,null,{immediate});},get animating(){return doors.some(door=>!!door.motion&&!door.blocked);},get lastNotice(){return lastNotice;},boxesAt,hitsPlayer};
}
