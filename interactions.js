import * as T from './vendor/three.module.js';
import {interactionTargets} from './interaction-data.js';
import {lamps,occlusionWalls,colliders} from './world.js';
import {blocked,surfaceHeight} from './navigation.js';
import {makeFurniturePlan,sampleMotion,standingFrame} from './interaction-motion.js';

function clearSight(a,b){
  const delta=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z),length=delta.length();
  if(length<.02)return true;const ray=new T.Ray(new T.Vector3(a.x,a.y,a.z),delta.divideScalar(length)),hit=new T.Vector3();
  for(const w of occlusionWalls){
    const box=new T.Box3(new T.Vector3(...w.min),new T.Vector3(...w.max));
    if(ray.intersectBox(box,hit)&&hit.distanceTo(ray.origin)<length-.16)return false;
  }
  return true;
}
export function createInteractions({getState,enterPose,leavePose,stopInput,showToast,requestRender}){
  const roomLights=lamps.filter(l=>l.isLight&&l.userData.roomBounds),enabled=new Map(roomLights.map(l=>[l.uuid,true]));
  let active=null,nearby=null,stand=null,currentPose=null,animation=null,plan=null,preset={lamps:3.3,emissive:.5};
  const action=document.getElementById('interact'),exitButton=document.getElementById('leave-pose');
  function closestLight(x,z,y){
    let best=null,distance=Infinity;
    for(const light of roomLights){const b=light.userData.roomBounds;if(y<b.min[1]-.1||y>b.max[1]-.8)continue;
      const dx=Math.max(b.min[0]-x,0,x-b.max[0]),dz=Math.max(b.min[2]-z,0,z-b.max[2]);
      const d=dx*dx+dz*dz+.0001*Math.hypot(x-light.position.x,z-light.position.z);
      if(d<distance){distance=d;best=light;}
    }return best;
  }
  function syncLighting(value=preset){
    preset=value;
    for(const lamp of lamps){
      if(lamp.isLight){lamp.intensity=enabled.get(lamp.uuid)===false?0:preset.lamps;continue;}
      const p=lamp.userData.fixtureWorldPosition,light=p?closestLight(p[0],p[2],p[1]>=4?4.05:.45):null;
      lamp.emissiveIntensity=light&&enabled.get(light.uuid)===false?0:preset.emissive;
    }
  }
  function update(){
    const state=getState();nearby=null;
    if(state.mode==='walk'&&!active&&!state.blocked){
      let best=Infinity;
      for(const item of interactionTargets){
        if(Math.abs(item.floor-state.feet)>.58)continue;
        const distance=Math.hypot(item.x-state.position.x,item.z-state.position.z);if(distance>item.range||distance>=best)continue;
        const point={x:item.x,y:item.height??item.floor+.8,z:item.z};
        if(!clearSight(state.position,point))continue;
        nearby=item;best=distance;
      }
    }
    action.hidden=!nearby;
    if(nearby){
      const light=nearby.kind==='light'?closestLight(nearby.x,nearby.z,nearby.floor):null;
      const label=nearby.kind==='sit'?(nearby.seatType==='chair'?'坐椅子':'坐沙发'):nearby.kind==='lie'?'躺下休息':enabled.get(light?.uuid)===false?'打开电灯':'关闭电灯';
      action.textContent=label;action.setAttribute('aria-label',label);action.dataset.target=nearby.id;
    }
    exitButton.hidden=!active||active.kind==='light'||state.mode!=='walk'||state.blocked;
    exitButton.disabled=!!animation;
    if(active)exitButton.textContent=animation?(animation.exiting?'正在起身…':active.kind==='lie'?'正在上床…':'正在坐下…'):active.kind==='sit'?'起身':'起床';
    return nearby;
  }
  function exit(silent=false){
    if(!active||animation&&!silent)return false;
    if(active.kind==='light'){active=null;currentPose=null;animation=null;update();requestRender();return true;}
    stopInput();const state=getState();let destination=stand;
    // If an object was added or moved, choose a valid nearby floor before standing.
    if(!destination||blocked(destination.x,destination.z,destination.feet,colliders)){
      destination=null;
      for(const r of [.9,1.3,1.7,2.1])for(let i=0;i<16;i++){
        const x=active.x+Math.sin(i*Math.PI/8)*r,z=active.z+Math.cos(i*Math.PI/8)*r;
        if(!blocked(x,z,active.floor,colliders)){destination={x,z,feet:surfaceHeight(x,z,active.floor),yaw:state.yaw,pitch:0};break;}
      }
    }
    if(!destination){showToast('旁边暂时没有站立位置，请通过菜单前往房间');return false;}
    if(silent){active=null;stand=null;currentPose=null;animation=null;plan=null;leavePose(destination);update();requestRender();return true;}
    const steps=plan?.reverse(state);
    if(!steps){showToast('请使用菜单返回房间');return false;}
    animation={steps,index:0,elapsed:0,exiting:true,done(){active=null;stand=null;plan=null;currentPose=null;leavePose(destination);showToast('已起身，可以继续行走');}};
    stopInput();showToast(active.kind==='lie'?'正在坐起、落腿并下床':'正在起身');update();requestRender();return true;
  }
  function interact(){
    if(animation||active)return false;
    update();if(!nearby)return false;const item=nearby;
    if(item.kind==='light'){
      const light=closestLight(item.x,item.z,item.floor);if(!light)return false;
      const frame=standingFrame(getState(),'stand');let toggled=false;active=item;currentPose=frame;stopInput();
      animation={steps:[{from:frame,to:frame,duration:.65,phase:'reach'}],index:0,elapsed:0,exiting:false,
        onStep(p){if(p>=.5&&!toggled){toggled=true;enabled.set(light.uuid,enabled.get(light.uuid)===false);syncLighting();showToast(enabled.get(light.uuid)?'已打开房间电灯':'已关闭房间电灯');}},
        done(){active=null;currentPose=null;}};
      requestRender();update();return true;
    }
    const state=getState();if(blocked(state.position.x,state.position.z,state.feet,colliders)){showToast('请先站在家具旁边再使用');return false;}
    stand={x:state.position.x,z:state.position.z,feet:state.feet,yaw:state.yaw,pitch:state.pitch};
    plan=makeFurniturePlan(item,state,colliders);
    if(!plan){stand=null;showToast('请换到家具正面或旁边的空位再试');return false;}
    stopInput();active=item;currentPose=plan.entry[0].from;
    animation={steps:plan.entry,index:0,elapsed:0,exiting:false,done(){currentPose=plan.settled;enterPose(currentPose);showToast(item.kind==='lie'?'已躺下 · 点“起床”继续行走':'已坐下 · 点“起身”继续行走');}};
    showToast(item.kind==='lie'?'正在走近、坐到床沿并躺下':'正在走近、转身并坐下');update();requestRender();return true;
  }
  function tick(dt){
    if(!animation||getState().blocked)return false;
    const running=animation,step=running.steps[running.index];running.elapsed+=Math.max(0,Math.min(.05,dt));
    const t=Math.min(1,running.elapsed/step.duration);
    currentPose=sampleMotion(step,t,getState().view);enterPose(currentPose);running.onStep?.(t);
    if(t>=1){
      running.index++;running.elapsed=0;
      if(running.index>=running.steps.length){animation=null;running.done();update();}
    }
    return true;
  }
  action.onclick=interact;exitButton.onclick=()=>exit();
  return {update,interact,exit,tick,syncLighting,clear(){active=null;stand=null;nearby=null;currentPose=null;animation=null;plan=null;action.hidden=exitButton.hidden=true;},get pose(){return currentPose;},get animating(){return !!animation;},get phase(){return animation?.steps[animation.index]?.phase??null;},get nearby(){return nearby;},get active(){return active?.id??null;},get lights(){return roomLights.map(l=>({id:l.uuid,on:enabled.get(l.uuid),intensity:l.intensity}));},targets:interactionTargets};
}
