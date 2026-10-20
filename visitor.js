import * as T from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

// Original, lightweight visitor artwork. No downloaded model, skin or animation.
// This root must be excluded from static batching and matrix freezing by callers.
export function createVisitor(scene,{colliders=[]}={}){
  const group=new T.Group();group.name='晴庭访客';group.userData.dynamicRoot=true;scene.add(group);
  const rig=new T.Group();group.add(rig);
  const sphere=new T.SphereGeometry(1,12,8);
  const rounded=new RoundedBoxGeometry(1,1,1,2,.14);
  const ring=new T.TorusGeometry(1,.12,5,16);
  const materials={
    skin:new T.MeshStandardMaterial({color:0xd7a986,roughness:.74}),
    jacket:new T.MeshStandardMaterial({color:0x49635d,roughness:.91}),
    seam:new T.MeshStandardMaterial({color:0x344c46,roughness:.9}),
    shirt:new T.MeshStandardMaterial({color:0xe9e7df,roughness:.96}),
    trousers:new T.MeshStandardMaterial({color:0x343e4c,roughness:.9}),
    hair:new T.MeshStandardMaterial({color:0x302b27,roughness:.94}),
    eye:new T.MeshStandardMaterial({color:0x252725,roughness:.36}),
    shoe:new T.MeshStandardMaterial({color:0xdcdedb,roughness:.77}),
    sole:new T.MeshStandardMaterial({color:0xb9bfbb,roughness:.85}),
    zip:new T.MeshStandardMaterial({color:0x8e9991,metalness:.6,roughness:.35})
  };
  const meshes=[];
  function part(parent,name,geometry,material,position,scale){
    const mesh=new T.Mesh(geometry,material);mesh.name=name;
    // Sun shadows are cached for the house. A moving sun caster would either
    // leave an old shadow behind or require an expensive map redraw each frame.
    mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=false;mesh.receiveShadow=true;
    parent.add(mesh);meshes.push(mesh);return mesh;
  }
  const ellipsoid=(parent,name,material,position,scale)=>part(parent,name,sphere,material,position,scale);
  const softBox=(parent,name,material,position,scale)=>part(parent,name,rounded,material,position,scale);
  function pivot(parent,name,x,y,z){const p=new T.Group();p.name=name;p.position.set(x,y,z);parent.add(p);return p;}

  // A tapered jacket, relaxed shoulders and inset T-shirt give the silhouette
  // volume without square limbs, large texture allocations or a skinned mesh.
  ellipsoid(rig,'夹克躯干',materials.jacket,[0,.265,.012],[.205,.29,.125]);
  softBox(rig,'夹克腰部',materials.jacket,[0,.055,.005],[.315,.14,.203]);
  ellipsoid(rig,'裤腰',materials.trousers,[0,-.015,.006],[.162,.105,.105]);
  ellipsoid(rig,'内搭领口',materials.shirt,[0,.475,-.097],[.075,.036,.02]);
  softBox(rig,'内搭',materials.shirt,[0,.265,-.109],[.105,.355,.027]);
  for(const side of [-1,1]){
    const lapel=softBox(rig,'夹克门襟',materials.seam,[side*.068,.26,-.124],[.018,.355,.016]);lapel.rotation.z=side*.07;
    softBox(rig,'腰侧口袋',materials.seam,[side*.119,.135,-.103],[.067,.015,.013]);
  }
  softBox(rig,'拉链头',materials.zip,[.064,.342,-.137],[.013,.024,.007]);
  ellipsoid(rig,'颈部',materials.skin,[0,.535,0],[.061,.078,.062]);
  const head=pivot(rig,'头部',0,.674,-.003);
  ellipsoid(head,'面部',materials.skin,[0,0,-.004],[.116,.145,.109]);
  ellipsoid(head,'下颌',materials.skin,[0,-.068,-.006],[.092,.073,.088]);
  ellipsoid(head,'后发',materials.hair,[0,.026,.034],[.12,.135,.092]);
  ellipsoid(head,'短发顶部',materials.hair,[-.005,.096,.007],[.119,.062,.106]);
  const fringe=ellipsoid(head,'侧分刘海',materials.hair,[-.042,.079,-.077],[.078,.042,.043]);fringe.rotation.z=-.22;
  for(const side of [-1,1]){
    ellipsoid(head,'耳朵',materials.skin,[side*.113,-.008,.005],[.02,.036,.024]);
    ellipsoid(head,'眼睛',materials.eye,[side*.042,.003,-.105],[.013,.009,.006]);
    const brow=ellipsoid(head,'眉毛',materials.hair,[side*.044,.026,-.102],[.023,.004,.005]);brow.rotation.z=side*.1;
  }
  ellipsoid(head,'鼻梁',materials.skin,[0,-.02,-.111],[.014,.025,.018]);
  ellipsoid(head,'嘴部',materials.skin,[0,-.057,-.101],[.029,.006,.008]);

  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=pivot(rig,side<0?'左肩':'右肩',side*.204,.433,0);
    arm.rotation.z=side*.075;
    ellipsoid(arm,'夹克袖上臂',materials.jacket,[side*.014,-.12,0],[.064,.16,.065]);
    const elbow=pivot(arm,'肘关节',side*.023,-.255,0);
    ellipsoid(elbow,'夹克袖前臂',materials.jacket,[0,-.111,0],[.053,.139,.054]);
    softBox(elbow,'袖口',materials.seam,[0,-.222,0],[.082,.033,.083]);
    ellipsoid(elbow,'手掌',materials.skin,[0,-.279,-.006],[.039,.064,.027]);
    ellipsoid(elbow,'拇指',materials.skin,[-side*.031,-.262,-.018],[.014,.03,.015]);
    arms.push({side,arm,elbow});
    const hip=pivot(rig,side<0?'左髋':'右髋',side*.092,-.025,0);
    ellipsoid(hip,'裤腿大腿',materials.trousers,[0,-.195,0],[.082,.231,.085]);
    const knee=pivot(hip,'膝关节',0,-.397,0);
    ellipsoid(knee,'裤腿小腿',materials.trousers,[0,-.171,.005],[.061,.202,.064]);
    const foot=pivot(knee,'脚踝',0,-.385,0);
    softBox(foot,'运动鞋',materials.shoe,[0,-.037,-.051],[.115,.096,.23]);
    softBox(foot,'鞋底',materials.sole,[0,-.082,-.051],[.119,.022,.236]);
    softBox(foot,'鞋口',materials.trousers,[0,.016,.003],[.09,.036,.093]);
    for(let i=0;i<3;i++)softBox(foot,'鞋带',materials.shirt,[0,.007-i*.007,-.047-i*.019],[.066,.008,.009]);
    legs.push({side,hip,knee,foot});
  }
  // A narrow collar ring is shared geometry, not a texture or alpha surface.
  const collar=part(rig,'夹克领边',ring,materials.seam,[0,.49,0],[.067,.067,.067]);collar.rotation.x=Math.PI/2;

  // The chest can lean over planted feet and the pelvis while sitting down.
  // Keep the pants and hip pivots outside this group; rotating a whole rigid
  // figure would lift both shoes and push the knees through a seat.
  const chest=new T.Group();chest.name='上身动作枢轴';
  for(const child of [...rig.children])if(child.name!=='裤腰'&&!legs.some(leg=>leg.hip===child))chest.add(child);
  rig.add(chest);

  // Analytic soft contact shadow: one tiny quad, no bitmap, no extra shadow map.
  const shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv;void main(){float r=length(vUv*2.0-1.0);float a=.22*pow(max(0.0,1.0-r),1.65);if(a<.003)discard;gl_FragColor=vec4(.16,.18,.17,a);}',
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const contactShadow=new T.Mesh(new T.PlaneGeometry(.72,.8),shadowMaterial);
  contactShadow.name='访客脚下柔和接触影';contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=.008;
  group.add(contactShadow);meshes.push(contactShadow);

  const geometrySet=new Set(meshes.map(m=>m.geometry));
  const stats={triangles:meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),
    meshes:meshes.length,geometries:geometrySet.size,materials:Object.keys(materials).length+1,
    cameraDistance:0,obstructed:false,shoulderFallback:false,pose:'stand',view:'first',moving:false,animating:false};
  let phase=0,lastPose='stand';
  const anchor=new T.Vector3(),focus=new T.Vector3(),desired=new T.Vector3(),candidate=new T.Vector3();
  const direction=new T.Vector3(),offset=new T.Vector3(),rightAxis=new T.Vector3(1,0,0);
  const cameraHistory=new WeakMap(),nextCamera=new T.Vector3(),travel=new T.Vector3();
  const sweepMin=new Float64Array(3),sweepMax=new Float64Array(3);
  const valid=v=>Number.isFinite(v)?v:0;
  const clamp=v=>T.MathUtils.clamp(valid(v),0,1);
  function shape(state){
    const pose=state.pose,weights=pose?.shape;
    let sit=weights?clamp(weights.sit):pose?.kind==='sit'?1:0;
    let lie=weights?clamp(weights.lie):pose?.kind==='lie'?1:0;
    const total=sit+lie;if(total>1){sit/=total;lie/=total;}
    const stand=Math.max(0,1-sit-lie),transition=pose?.transition;
    const progress=clamp(transition?.progress),envelope=transition?Math.sin(progress*Math.PI):0;
    const action=transition?.phase;
    const lean=action==='lower'?-.19*envelope:action==='rise'?-.24*envelope:action==='recline'?-.10*envelope:action==='reach'?-.035*envelope:0;
    return {sit,lie,stand,lean,envelope,action,transition,
      height:.9-.785*sit-.79*lie,roll:Math.PI/2*lie,
      bodyYaw:pose?.bodyYaw??((pose?.yaw??state.yaw??0)+Math.PI*lie)};
  }
  function setAnchor(state){
    const p=state.pose?.position;
    anchor.set(valid(p?.x??state.position?.x),valid(p?.y??state.feet),valid(p?.z??state.position?.z));
  }
  function eyePoint(state,out){
    setAnchor(state);
    if(!state.pose)return out.copy(state.position);
    const s=shape(state);
    // Blend the head with the same pelvis, chest and recline transforms as the
    // figure. The reference points preserve the original stable seat/bed eyes,
    // so finishing or starting a transition cannot move the lens in one frame.
    offset.set(0,.72-.025*s.sit-.09*s.lie,-.125*s.lie);
    offset.applyAxisAngle(rightAxis,s.roll+s.lean);
    offset.y+=s.height;offset.applyAxisAngle(T.Object3D.DEFAULT_UP,s.bodyYaw);
    return out.copy(anchor).add(offset);
  }
  function update(state={}){
    const kind=state.pose?.kind??'stand',s=shape(state);setAnchor(state);
    const gait=state.pose?clamp(state.pose.gait??(s.action==='approach'||s.action==='leave'?1:0)):state.moving?1:0;
    const moving=state.mode==='walk'&&gait>.001&&s.stand>.001;
    if(moving)phase+=Math.min(.05,Math.max(0,state.dt??0))*(state.sprinting?11.2:8.4);
    group.visible=state.mode==='walk'&&state.view==='third';
    contactShadow.visible=s.stand>.98;
    group.position.copy(anchor);group.rotation.set(0,s.bodyYaw,0);
    rig.position.set(0,s.height,0);rig.rotation.set(s.roll,0,0);chest.rotation.set(s.lean,0,0);
    if(moving){rig.position.y+=Math.abs(Math.sin(phase))*.018*gait*s.stand;chest.rotation.x+=(state.sprinting?-.045:-.02)*gait*s.stand;}
    head.rotation.x=-.10*s.envelope*(s.action==='recline'||s.action==='rise'?1:0);
    const brace=['lower','recline','rise'].includes(s.action)?s.envelope:0;
    for(const {side,arm,elbow} of arms){
      const swing=moving?-side*Math.sin(phase)*.42*gait*s.stand:0;
      const relaxed=.48*s.sit+.04*s.lie+.025*s.stand+swing;
      arm.rotation.set(T.MathUtils.lerp(relaxed,-.46,brace*.88),0,side*(.075+.06*brace));
      elbow.rotation.x=T.MathUtils.lerp(-.9*s.sit+.01*s.lie+(-.08-(moving?.06:0))*s.stand,-.30,brace*.80);
      if(s.action==='reach'&&side===1){
        // A single right-hand press peaks at the same midpoint at which the
        // interaction controller toggles the light, then returns to the side.
        arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,1.42,s.envelope);
        elbow.rotation.x=T.MathUtils.lerp(elbow.rotation.x,-.24,s.envelope);
      }
    }
    // During recline, lift the heels over the mattress edge before extending
    // the knees. A plain sit/lie rotation blend drags both shoes through the
    // bed front at the halfway pose. Reversing this curve lowers feet only
    // after the torso has sat back up, so getting out follows the same arc.
    const legLift=Math.sin(Math.PI*s.lie)*(s.sit+s.lie);
    for(const {side,hip,knee,foot} of legs){
      hip.rotation.x=(Math.PI/2-.12)*s.sit+.08*legLift+(moving?side*Math.sin(phase)*(state.sprinting?.58:.43)*gait*s.stand:0);
      knee.rotation.x=(-Math.PI/2+.12)*s.sit+.78*legLift+(moving?-Math.max(0,-side*Math.sin(phase))*.68*gait*s.stand:0);
      foot.rotation.x=0;
    }
    if(kind!==lastPose){phase=0;lastPose=kind;}
    stats.pose=kind;stats.view=state.view??'first';stats.moving=!!moving;stats.animating=!!s.transition;
    // The house disables scene.matrixWorldAutoUpdate. Explicitly refresh the
    // dynamic hierarchy so animation remains correct without touching the house.
    group.updateMatrixWorld(true);
    return moving||!!s.transition;
  }
  function distanceBeforeWall(start,end){
    direction.copy(end).sub(start);const length=direction.length();if(length<1e-6)return 0;
    let fraction=1;const radius=.17;
    for(const c of colliders){
      const mins=sweepMin,maxs=sweepMax;
      mins[0]=(c.x0??c.x-c.radius)-radius;mins[1]=(c.y0??-1e6)-radius;mins[2]=(c.z0??c.z-c.radius)-radius;
      maxs[0]=(c.x1??c.x+c.radius)+radius;maxs[1]=(c.y1??1e6)+radius;maxs[2]=(c.z1??c.z+c.radius)+radius;
      let near=0,far=fraction,hit=true,inside=true;
      for(let axis=0;axis<3;axis++){
        const a=start.getComponent(axis),d=direction.getComponent(axis);
        if(a<mins[axis]||a>maxs[axis])inside=false;
        if(Math.abs(d)<1e-8){if(a<mins[axis]||a>maxs[axis]){hit=false;break;}continue;}
        let t0=(mins[axis]-a)/d,t1=(maxs[axis]-a)/d;if(t0>t1)[t0,t1]=[t1,t0];
        near=Math.max(near,t0);far=Math.min(far,t1);if(near>far){hit=false;break;}
      }
      // A seat's interaction anchor can be just inside its padded backrest.
      // Do not lock the camera inside that solid; all other walls still block it.
      if(hit&&!inside&&far>=0&&near>=0)fraction=Math.min(fraction,near);
    }
    return fraction<1?Math.max(.035,length*fraction-.035):length;
  }
  function applyCamera(camera,state={}){
    const view=state.view??'first',yaw=state.yaw??0,pitch=state.pitch??0;
    if(camera.near!==.12){camera.near=.12;camera.updateProjectionMatrix();}
    if(view!=='third'){
      cameraHistory.delete(camera);
      eyePoint(state,camera.position);camera.rotation.set(pitch,yaw,0,'YXZ');
      stats.cameraDistance=0;stats.obstructed=stats.shoulderFallback=false;
      camera.updateMatrixWorld(true);return false;
    }
    const s=shape(state);eyePoint(state,focus);focus.y-=.21*s.stand+.08*s.sit;
    const prior=cameraHistory.get(camera),history=prior&&prior.anchor.distanceTo(anchor)<.65&&camera.position.distanceToSquared(prior.position)<1e-12?prior:null;
    const controlled=!!state.pose||!!history?.held;
    const dt=Math.min(.05,Math.max(0,state.dt??0));
    // A furniture action keeps its clear shoulder direction while the figure
    // turns, rather than jumping between the longest left/right camera rays.
    // After settling, store that shoulder relative to the look yaw. Looking
    // around therefore starts at the exact final angle of the action.
    const motion=!!state.pose?.transition;
    const quiet=history&&controlled&&!motion&&(history.motion||!state.moving&&Math.abs(yaw-history.yaw)<1e-8&&Math.abs(pitch-history.pitch)<1e-8&&focus.distanceToSquared(history.focus)<1e-12);
    if(quiet){
      // Finish at the clear, actual shoulder reached by the action. This is a
      // settled camera, not an unfinished interpolation waiting for idle frames:
      // another hundred no-input updates leave its position exactly unchanged.
      camera.position.copy(history.position);camera.lookAt(focus);camera.updateMatrixWorld(true);
      stats.cameraDistance=camera.position.distanceTo(focus);stats.obstructed=history.obstructed;stats.shoulderFallback=history.shoulderFallback;
      const angle=Math.atan2(camera.position.x-focus.x,camera.position.z-focus.z);
      cameraHistory.set(camera,{...history,anchor:anchor.clone(),focus:focus.clone(),angle,
        offset:Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw)),radius:stats.cameraDistance,yaw,pitch,motion:false});
      return false;
    }
    const baseAngle=history&&controlled?(motion?history.angle:yaw+history.offset):yaw;
    const naturalDistance=2.2-.2*s.lie;
    const nominal=history&&controlled&&!motion&&!state.moving?Math.min(naturalDistance,history.radius):naturalDistance;
    function pointAtAngle(angle,out){
      out.set(Math.sin(angle)*Math.cos(pitch),-Math.sin(pitch),Math.cos(angle)*Math.cos(pitch)).multiplyScalar(nominal).add(focus);
      out.y=T.MathUtils.clamp(out.y,anchor.y+.25,anchor.y+3.15);return out;
    }
    pointAtAngle(baseAngle,desired);let free=distanceBeforeWall(focus,desired),best=free;
    const originalBlocked=free<desired.distanceTo(focus)-.04;stats.shoulderFallback=false;
    // Tight passages prefer a clear shoulder view to putting the lens in a wall
    // or inside the visitor's head. The stored visitor yaw never changes here.
    if(free<(.85+.3*s.sit)){
      const angles=history&&controlled?Array.from({length:40},(_,i)=>baseAngle+(i%2?1:-1)*(.08*(1+Math.floor(i/2)))):[yaw-.7,yaw+.7,yaw-1.1,yaw+1.1,yaw-1.55,yaw+1.55,yaw-2.1,yaw+2.1];
      for(const angle of angles){
        pointAtAngle(angle,candidate);const available=distanceBeforeWall(focus,candidate);
        if(available>best+.08){best=available;desired.copy(candidate);stats.shoulderFallback=true;}
        // The first adequate neighbour is the smallest turn away from the
        // previous shoulder. Extra clearance on the far side is not a reason
        // to teleport across the room.
        if(history&&controlled&&available>=.95+.2*s.sit)break;
      }
      if(best<.62){
        // At a closed corner a short overhead view still shows the visitor;
        // never solve a wall collision by putting the lens inside their head.
        for(const height of [.9,1.3]){
          candidate.copy(focus);candidate.y=Math.min(anchor.y+3.15,focus.y+height);
          const available=distanceBeforeWall(focus,candidate);
          if(available>best+.08){best=available;desired.copy(candidate);stats.shoulderFallback=true;}
        }
      }
      free=best;
    }
    direction.copy(desired).sub(focus);const ideal=direction.length();
    nextCamera.copy(focus).addScaledVector(direction.normalize(),Math.min(free,ideal));
    if(history&&controlled&&motion){
      // Bound actual lens travel, including a changing occlusion result. Sweep
      // the lens along that short path as well as along the focus ray, so a
      // continuous reposition never cuts through a wall or a tall backrest.
      // This bound belongs only to scripted actions. Ordinary walking follows
      // the player at full speed; seated/lying look input also responds in full,
      // without accumulating a camera lag after an interaction has finished.
      travel.copy(nextCamera).sub(history.position);const length=travel.length(),step=4*dt;
      if(length>step&&length>1e-8)nextCamera.copy(history.position).addScaledVector(travel,step/length);
      const path=nextCamera.distanceTo(history.position);
      if(path>1e-6){
        const clear=distanceBeforeWall(history.position,nextCamera);
        if(clear<path)nextCamera.copy(history.position).addScaledVector(travel.copy(nextCamera).sub(history.position).normalize(),clear);
      }
      // A held camera must remain outside the figure when the approach passes
      // close to the previous lens location. Normal actions start well beyond
      // this small exclusion sphere; this only corrects the near-contact case.
      travel.copy(nextCamera).sub(focus);
      if(travel.length()<.64){
        if(travel.length()<1e-6)travel.set(Math.sin(baseAngle),.2,Math.cos(baseAngle));
        nextCamera.copy(focus).addScaledVector(travel.normalize(),.64);
      }
    }
    camera.position.copy(nextCamera);camera.lookAt(focus);
    camera.updateMatrixWorld(true);stats.cameraDistance=camera.position.distanceTo(focus);stats.obstructed=originalBlocked||free<ideal-.04;
    const actualAngle=Math.atan2(camera.position.x-focus.x,camera.position.z-focus.z);
    cameraHistory.set(camera,{anchor:anchor.clone(),focus:focus.clone(),position:camera.position.clone(),angle:actualAngle,
      offset:Math.atan2(Math.sin(actualAngle-yaw),Math.cos(actualAngle-yaw)),radius:stats.cameraDistance,held:controlled,
      yaw,pitch,motion,obstructed:stats.obstructed,shoulderFallback:stats.shoulderFallback});
    return false; // Immediate follow needs no battery-consuming idle frames.
  }
  update({position:new T.Vector3(0,1.62,0),feet:0,mode:'orbit',view:'first'});
  return {group,update,applyCamera,stats};
}
