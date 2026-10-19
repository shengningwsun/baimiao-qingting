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
    cameraDistance:0,obstructed:false,shoulderFallback:false,pose:'stand',view:'first',moving:false};
  let phase=0,lastPose='stand';
  const anchor=new T.Vector3(),focus=new T.Vector3(),desired=new T.Vector3(),candidate=new T.Vector3();
  const direction=new T.Vector3(),offset=new T.Vector3();
  const sweepMin=new Float64Array(3),sweepMax=new Float64Array(3);
  const valid=v=>Number.isFinite(v)?v:0;
  function setAnchor(state){
    const p=state.pose?.position;
    anchor.set(valid(p?.x??state.position?.x),valid(p?.y??state.feet),valid(p?.z??state.position?.z));
  }
  function eyePoint(state,out){
    setAnchor(state);const kind=state.pose?.kind;
    if(kind==='sit'){out.copy(anchor);out.y+=.81;return out;}
    if(kind==='lie'){
      offset.set(0,.235,-.63).applyAxisAngle(T.Object3D.DEFAULT_UP,state.pose?.yaw??state.yaw??0);
      return out.copy(anchor).add(offset);
    }
    return out.copy(state.position);
  }
  function update(state={}){
    const kind=state.pose?.kind??'stand';setAnchor(state);
    const moving=!!(state.mode==='walk'&&state.moving&&kind!=='sit'&&kind!=='lie');
    if(moving)phase+=Math.min(.05,Math.max(0,state.dt??0))*(state.sprinting?11.2:8.4);
    group.visible=state.mode==='walk'&&state.view==='third';
    contactShadow.visible=kind==='stand';
    group.position.copy(anchor);group.rotation.set(0,(state.pose?.yaw??state.yaw??0)+(kind==='lie'?Math.PI:0),0);
    rig.position.set(0,kind==='stand'?.9:kind==='sit'?.115:.11,0);
    rig.rotation.set(kind==='lie'?Math.PI/2:0,0,0);
    if(moving){rig.position.y+=Math.abs(Math.sin(phase))* .018;rig.rotation.x=state.sprinting?-.045:-.02;}
    for(const {side,arm,elbow} of arms){
      arm.rotation.set(kind==='sit'?.48:moving?-side*Math.sin(phase)*.42:kind==='lie'?.04:.025,0,side*.075);
      elbow.rotation.x=kind==='sit'?-.9:moving?-.14:kind==='lie'?.01:-.08;
    }
    for(const {side,hip,knee,foot} of legs){
      hip.rotation.x=kind==='sit'?Math.PI/2-.12:moving?side*Math.sin(phase)*(state.sprinting?.58:.43):0;
      knee.rotation.x=kind==='sit'?-Math.PI/2+.12:moving?-Math.max(0,-side*Math.sin(phase))*.68:0;
      foot.rotation.x=0;
    }
    if(kind!==lastPose){phase=0;lastPose=kind;}
    stats.pose=kind;stats.view=state.view??'first';stats.moving=!!moving;
    // The house disables scene.matrixWorldAutoUpdate. Explicitly refresh the
    // dynamic hierarchy so animation remains correct without touching the house.
    group.updateMatrixWorld(true);
    return moving;
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
    return Math.max(.035,length*fraction-.035);
  }
  function applyCamera(camera,state={}){
    const view=state.view??'first',yaw=state.yaw??0,pitch=state.pitch??0;
    if(camera.near!==.12){camera.near=.12;camera.updateProjectionMatrix();}
    if(view!=='third'){
      eyePoint(state,camera.position);camera.rotation.set(pitch,yaw,0,'YXZ');
      stats.cameraDistance=0;stats.obstructed=stats.shoulderFallback=false;
      camera.updateMatrixWorld(true);return false;
    }
    eyePoint(state,focus);focus.y-=state.pose?.kind==='lie'?0:state.pose?.kind==='sit'?.08:.21;
    const nominal=state.pose?.kind==='lie'?2.0:2.2;
    function pointAtAngle(angle,out){
      out.set(Math.sin(angle)*Math.cos(pitch),-Math.sin(pitch),Math.cos(angle)*Math.cos(pitch)).multiplyScalar(nominal).add(focus);
      out.y=T.MathUtils.clamp(out.y,anchor.y+.25,anchor.y+3.15);return out;
    }
    pointAtAngle(yaw,desired);let free=distanceBeforeWall(focus,desired),best=free;
    const originalBlocked=free<desired.distanceTo(focus)-.04;stats.shoulderFallback=false;
    // Tight passages prefer a clear shoulder view to putting the lens in a wall
    // or inside the visitor's head. The stored visitor yaw never changes here.
    if(free<(state.pose?.kind==='sit'?1.15:.85)){
      for(const angle of [yaw-.7,yaw+.7,yaw-1.1,yaw+1.1,yaw-1.55,yaw+1.55,yaw-2.1,yaw+2.1]){
        pointAtAngle(angle,candidate);const available=distanceBeforeWall(focus,candidate);
        if(available>best+.08){best=available;desired.copy(candidate);stats.shoulderFallback=true;}
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
    camera.position.copy(focus).addScaledVector(direction.normalize(),Math.min(free,ideal));camera.lookAt(focus);
    camera.updateMatrixWorld(true);stats.cameraDistance=camera.position.distanceTo(focus);stats.obstructed=originalBlocked||free<ideal-.04;
    return false; // Immediate follow needs no battery-consuming idle frames.
  }
  update({position:new T.Vector3(0,1.62,0),feet:0,mode:'orbit',view:'first'});
  return {group,update,applyCamera,stats};
}
