import {blocked} from './navigation.js';

const mix=(a,b,t)=>a+(b-a)*t;
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function walkSegmentClear(a,b,floor,colliders){
  const steps=Math.max(1,Math.ceil(distance(a,b)/.04));
  for(let i=0;i<=steps;i++){const t=i/steps;if(blocked(mix(a.x,b.x,t),mix(a.z,b.z,t),floor,colliders))return false;}
  return true;
}
export function planWalkPath(start,goal,floor,colliders){
  if(blocked(goal.x,goal.z,floor,colliders))return null;
  if(walkSegmentClear(start,goal,floor,colliders))return [start,goal];
  const unit=.13,minX=Math.min(start.x,goal.x)-1.3,maxX=Math.max(start.x,goal.x)+1.3,minZ=Math.min(start.z,goal.z)-1.3,maxZ=Math.max(start.z,goal.z)+1.3;
  const queue=[{x:start.x,z:start.z,ix:0,iz:0,parent:-1}],seen=new Set(['0,0']);let found=-1;
  for(let n=0;n<queue.length&&queue.length<6000;n++){
    const p=queue[n];if(distance(p,goal)<.20&&walkSegmentClear(p,goal,floor,colliders)){found=n;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const ix=p.ix+dx,iz=p.iz+dz,key=ix+','+iz;if(seen.has(key))continue;seen.add(key);
      const q={ix,iz,x:start.x+ix*unit,z:start.z+iz*unit,parent:n};
      if(q.x<minX||q.x>maxX||q.z<minZ||q.z>maxZ||!walkSegmentClear(p,q,floor,colliders))continue;
      queue.push(q);
    }
  }
  if(found<0)return null;
  const route=[goal];for(let i=found;i>=0;i=queue[i].parent)route.unshift({x:queue[i].x,z:queue[i].z});
  const result=[route[0]];
  for(let i=0;i<route.length-1;){let next=i+1;while(next+1<route.length&&walkSegmentClear(route[i],route[next+1],floor,colliders))next++;result.push(route[next]);i=next;}
  return result;
}
export function standingFrame(state,kind='sit'){
  return {kind,position:{x:state.position.x,y:state.feet,z:state.position.z},shape:{sit:0,lie:0},yaw:state.yaw,bodyYaw:state.yaw,lookYaw:state.yaw,lookPitch:state.pitch};
}
export function makeFurniturePlan(item,state,colliders){
  const final=item.pose,others=colliders.filter(c=>c!==item.collision),yaw=final.yaw??0;
  const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)},right={x:Math.cos(yaw),z:-Math.sin(yaw)},candidates=[];
  const candidate=(f,r)=>candidates.push({x:final.position.x+forward.x*f+right.x*r,z:final.position.z+forward.z*f+right.z*r});
  if(item.kind==='lie'){candidate(-1.36,0);candidate(-1.36,.25);candidate(-1.36,-.25);candidate(0,1.24);candidate(0,-1.24);}
  else if(item.seatType==='chair'){candidate(.61,0);candidate(-.12,.66);candidate(-.12,-.66);candidate(0,.75);candidate(0,-.75);}
  else {candidate(.73,0);candidate(.73,.35);candidate(.73,-.35);candidate(.82,.6);candidate(.82,-.6);}
  const start={x:state.position.x,z:state.position.z};let route=null,stage;
  const edge=item.kind==='lie'?{...final.position,x:final.position.x-forward.x*.78,z:final.position.z-forward.z*.78}:{...final.position};
  for(const point of candidates){
    if(!walkSegmentClear(point,edge,item.floor,others))continue;
    const path=planWalkPath(start,point,item.floor,colliders);if(path){route=path;stage=point;break;}
  }
  if(!route)return null;
  const entry=[];let current=standingFrame(state,item.kind);
  function add(to,duration,phase,arc=0){entry.push({from:current,to,duration,phase,arc});current=to;}
  for(let i=1;i<route.length;i++){
    const p=route[i],heading=Math.atan2(-(p.x-route[i-1].x),-(p.z-route[i-1].z));
    add({...current,position:{x:p.x,y:item.floor,z:p.z},bodyYaw:heading,yaw:heading,lookYaw:heading},Math.max(.2,distance(route[i-1],p)/1.25),'approach');
  }
  const bodyYaw=item.kind==='lie'?yaw+Math.PI:yaw;
  add({...current,bodyYaw,yaw:bodyYaw,lookYaw:bodyYaw,lookPitch:-.03},.42,'turn');
  add({...current,position:edge,shape:{sit:1,lie:0}},item.kind==='lie'?1.0:.85,'lower',.025);
  if(item.kind==='lie')add({...current,position:{...final.position},shape:{sit:0,lie:1},yaw,lookPitch:{first:1.05,third:-.38}},1.2,'recline');
  const settled={...current,kind:item.kind,position:{...final.position},yaw,bodyYaw};
  return {entry,settled,route,stage,reverse(look){
    const reversed=entry.slice().reverse().map(s=>({from:s.to,to:s.from,duration:s.duration,phase:s.phase==='approach'?'leave':s.phase==='lower'||s.phase==='recline'?'rise':s.phase,arc:s.arc}));
    reversed[0]={...reversed[0],from:{...reversed[0].from,lookYaw:look.yaw,lookPitch:look.pitch}};
    return reversed;
  }};
}
export function sampleMotion(step,t,view){
  const p=Math.max(0,Math.min(1,t)),s=p*p*(3-2*p),a=step.from,b=step.to;
  const pitch=frame=>typeof frame.lookPitch==='object'?frame.lookPitch[view]:(frame.lookPitch??0);
  return {kind:b.kind,position:{x:mix(a.position.x,b.position.x,s),y:mix(a.position.y,b.position.y,s)+(step.arc??0)*Math.sin(Math.PI*p),z:mix(a.position.z,b.position.z,s)},
    yaw:angle(a.yaw??0,b.yaw??0,s),bodyYaw:angle(a.bodyYaw??a.yaw??0,b.bodyYaw??b.yaw??0,s),shape:{sit:mix(a.shape.sit,b.shape.sit,s),lie:mix(a.shape.lie,b.shape.lie,s)},
    cameraYaw:angle(a.lookYaw??a.yaw,b.lookYaw??b.yaw,s),cameraPitch:mix(pitch(a),pitch(b),s),
    gait:['approach','leave'].includes(step.phase)?Math.min(1,p*7,(1-p)*7):0,transition:{phase:step.phase,progress:p}};
}
