import * as T from './vendor/three.module.js';
export const scene=new T.Scene();
export const colliders=[];
export const occlusionWalls=[];
export const lamps=[];
export const house=new T.Group();scene.add(house);
export const colors={wall:0xf4f1e8,trim:0xe7e7dd,metal:0x293635};
let seed=127;export function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const textures={};
export const materialLoads=[];
export const assetPath=name=>globalThis.__assetUrls?.[name]||'./assets/'+name;
function tex(type){if(textures[type])return textures[type];const c=document.createElement('canvas');c.width=c.height=512;const a=c.getContext('2d');let base=type==='wood'?'#a47c53':type==='grass'?'#577142':type==='roof'?'#4c575b':type==='stone'?'#c6c6b9':'#d8d6ca';a.fillStyle=base;a.fillRect(0,0,512,512);for(let i=0;i<14000;i++){const x=rand()*512,y=rand()*512,v=Math.floor(rand()*50);a.fillStyle=`rgba(${v},${v},${v},${rand()*.16})`;a.fillRect(x,y,type==='wood'?rand()*90+10:2,type==='grass'?5:1)}if(type==='wood'){for(let y=0;y<512;y+=64){a.fillStyle='#765a3e';a.fillRect(0,y,512,2);a.fillRect(((y/64)%2)*256,y,2,64)}}if(type==='stone'||type==='tile'){a.strokeStyle=type==='stone'?'#b4b7ad':'#c0c2b8';a.lineWidth=2;for(let y=0;y<512;y+=128){for(let x=-256;x<512;x+=256){a.strokeRect(x+(y%256?128:0),y,256,128)}}}if(type==='roof'){for(let x=0;x<512;x+=32){const g=a.createLinearGradient(x,0,x+32,0);g.addColorStop(0,'#344049');g.addColorStop(.5,'#707b7c');g.addColorStop(1,'#465257');a.fillStyle=g;a.fillRect(x,0,32,512)}for(let y=0;y<512;y+=64){a.fillStyle='#303b3e88';a.fillRect(0,y,512,3)}}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return textures[type]=t}
export const mat={wall:new T.MeshStandardMaterial({color:colors.wall,roughness:.85}),trim:new T.MeshStandardMaterial({color:colors.trim,roughness:.7}),metal:new T.MeshStandardMaterial({color:colors.metal,roughness:.35,metalness:.65}),wood:new T.MeshStandardMaterial({map:tex('wood'),roughness:.64}),stone:new T.MeshStandardMaterial({map:tex('stone'),roughness:.86}),tile:new T.MeshStandardMaterial({map:tex('tile'),roughness:.55}),roof:new T.MeshStandardMaterial({map:tex('roof'),roughness:.72}),glass:new T.MeshStandardMaterial({color:0xadc8c7,transparent:true,opacity:.22,roughness:.12,metalness:.3,depthWrite:false}),grass:new T.MeshStandardMaterial({map:tex('grass'),color:0xa7b481,roughness:1}),soil:new T.MeshStandardMaterial({color:0x594637,roughness:1}),white:new T.MeshStandardMaterial({color:0xf4f0e4,roughness:.8}),dark:new T.MeshStandardMaterial({color:0x25332c,roughness:.8}),gold:new T.MeshStandardMaterial({color:0xc7a16a,roughness:.28,metalness:.7})};
// CC0 photographed albedo, normal and roughness maps replace the original painted surfaces.
// The procedural maps remain a local fallback while the photographed files decode.
if(typeof Image!=='undefined'){
  const loader=new T.TextureLoader();
  const surfaces={wall:['plaster',.10,2],wood:['wood',.32,2.5],stone:['stone',.65,2],tile:['tile',.48,3],roof:['roof',.75,7]};
  for(const [key,[file,normalStrength,meters]] of Object.entries(surfaces)){
    const m=mat[key];
    const load=(part,srgb=false)=>{let settled;materialLoads.push(new Promise(resolve=>settled=resolve));const t=loader.load(assetPath(`${file}-${part}.jpg`),settled,undefined,settled);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=16;if(srgb)t.colorSpace=T.SRGBColorSpace;return t};
    m.map=load('diffuse',true);m.normalMap=load('nor_gl');m.normalScale.set(normalStrength,normalStrength);m.roughnessMap=load('Rough');m.userData.worldTiling=1/meters;
  }
  mat.wall.color.set(0xffffff);mat.grass.color.set(0x82c46e);mat.roof.color.set(0xffffff);mat.roof.metalness=.18;
  mat.glass.color.set(0xc8e5f1);mat.glass.metalness=.72;mat.glass.opacity=.37;mat.glass.envMapIntensity=1.25;
}
// Painted indoor walls stay white; the exterior's coarse stucco remains separate.
mat.interiorWall=new T.MeshStandardMaterial({color:0xf7f7f4,roughness:.82,normalMap:mat.wall.normalMap,normalScale:new T.Vector2(.045,.045)});
mat.interiorWall.userData.worldTiling=.5;
mat.skirting=new T.MeshStandardMaterial({color:0xe9eceb,roughness:.4});
mat.interiorTile=new T.MeshStandardMaterial({color:0xffffff,roughness:.48,metalness:0,envMapIntensity:.65});
mat.interiorTile.userData.worldTiling=1/2.4;
// Keep the photographed grain and grout; make the ceramic a neutral grey finish.
mat.interiorTile.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = vec3(dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722))) * vec3(0.80,0.83,0.86);');
};
mat.interiorTile.customProgramCacheKey=()=> 'neutral-grey-ceramic-v1';
if(typeof Image!=='undefined'){
  const loader=new T.TextureLoader();
  const load=part=>{let done;materialLoads.push(new Promise(resolve=>done=resolve));const t=loader.load(assetPath('interior-tile-'+part+'.jpg'),done,undefined,done);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=16;return t;};
  mat.interiorTile.map=load('diffuse');mat.interiorTile.map.colorSpace=T.SRGBColorSpace;
  mat.interiorTile.normalMap=load('nor_gl');mat.interiorTile.normalScale.set(.10,.10);
  mat.interiorTile.roughnessMap=mat.interiorTile.aoMap=load('arm');mat.interiorTile.aoMapIntensity=.65;
}
export function material(color,roughness=.75){return new T.MeshStandardMaterial({color,roughness})}
const boxGeometry=new T.BoxGeometry(1,1,1);
export function box(x,y,z,w,h,d,m=mat.wall,parent=house,solid=false){const o=new T.Mesh(boxGeometry,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(Array.isArray(m)){o.geometry=boxGeometry.clone();const p=o.geometry.attributes.position,u=o.geometry.attributes.uv;for(let i=8;i<12;i++)u.setXY(i,(p.getX(i)*w+x)/3,(p.getZ(i)*d+z)/3);u.needsUpdate=true}if(solid)colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y0:y-h/2,y1:y+h/2});return o}
export function cylinder(x,y,z,r,h,m,parent=house,rt=r){const o=new T.Mesh(new T.CylinderGeometry(rt,r,h,12),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
export function sphere(x,y,z,r,m,parent=house,scale){const o=new T.Mesh(new T.SphereGeometry(r,12,8),m);o.position.set(x,y,z);if(scale)o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
export function bar(a,b,r,m,parent=house){const va=new T.Vector3(...a),vb=new T.Vector3(...b);const o=cylinder(...va.clone().add(vb).multiplyScalar(.5).toArray(),r,va.distanceTo(vb),m,parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());return o}
function piece(axis,x,z,t,y,w,h,depth,m,solid=true){
// Exterior walls have stucco outdoors and fine white paint on the room-facing face.
let finish=m;
if(m===mat.wall&&solid){
  const face=axis==='x'?(z<0?4:5):(x<0?0:1);
  finish=Array(6).fill(m);finish[face]=mat.interiorWall;
}
const o=axis==='x'?box(x+t,y,z,w,h,depth,finish,house,solid):box(x,y,z+t,depth,h,w,finish,house,solid);
if(solid&&!m.transparent){o.userData.opaqueWall=true;const p=o.position,q=o.scale;occlusionWalls.push({axis:axis==='x'?2:0,min:[p.x-q.x/2,p.y-q.y/2,p.z-q.z/2],max:[p.x+q.x/2,p.y+q.y/2,p.z+q.z/2]});}
return o;
}
export function wall(axis,x,z,length,base,height,openings=[],depth=.2,m=mat.wall){const ops=[...openings].sort((a,b)=>a.t-b.t);let at=-length/2;for(const o of ops){const left=o.t-o.w/2;if(left>at)piece(axis,x,z,(at+left)/2,base+height/2,left-at,height,depth,m);if(o.b>0)piece(axis,x,z,o.t,base+o.b/2,o.w,o.b,depth,m);const top=o.b+o.h;if(top<height)piece(axis,x,z,o.t,base+(top+height)/2,o.w,height-top,depth,m);if(o.type==='window')windowFrame(axis,x,z,o.t,base+o.b,o.w,o.h,depth);else if(o.type==='door')doorTrim(axis,x,z,o.t,base,o.w,o.h,depth);at=o.t+o.w/2}if(at<length/2)piece(axis,x,z,(at+length/2)/2,base+height/2,length/2-at,height,depth,m)}
function windowFrame(axis,x,z,t,y,w,h,depth){const frame=.055;for(const side of [-1,1])piece(axis,x,z,t+side*(w/2-frame/2),y+h/2,frame,h,depth+.04,mat.metal,false);for(const by of [y+frame/2,y+h-frame/2,y+h*.75])piece(axis,x,z,t,by,w,frame,depth+.04,mat.metal,false);piece(axis,x,z,t,y+h/2,frame,h,depth+.045,mat.metal,false);const glass=piece(axis,x,z,t,y+h/2,w-.08,h-.06,.014,mat.glass,false);glass.name='建筑窗户';glass.userData.architecturalWindow={axis,x:axis==='x'?x+t:x,z:axis==='z'?z+t:z,bottom:y,width:w,height:h};glass.castShadow=false;piece(axis,x,z,t,y-.05,w+.15,.09,depth+.12,mat.trim,false)}
function doorTrim(axis,x,z,t,y,w,h,depth){for(const side of [-1,1])piece(axis,x,z,t+side*(w/2+.025),y+h/2,.07,h,depth+.05,mat.wood,false);piece(axis,x,z,t,y+h,w+.12,.07,depth+.05,mat.wood,false)}
const win=(t,w=1.8,b=.8,h=2.1)=>({t,w,b,h,type:'window'});const door=(t,w=1.05,h=2.45)=>({t,w,b:0,h,type:'door'});
function facadeReveal(axis,x,z,length,base,dy,openings,m){
const cuts=openings.filter(o=>dy>o.b&&dy<o.b+o.h).sort((a,b)=>a.t-b.t);let at=-length/2;
for(const o of cuts){const left=o.t-o.w/2;if(left>at)piece(axis,x,z,(at+left)/2,base+dy,left-at,.023,.017,m,false);at=o.t+o.w/2}
if(at<length/2)piece(axis,x,z,(at+length/2)/2,base+dy,length/2-at,.023,.017,m,false);
}
export function architecture(){
box(0,.19,0,13.35,.48,10.3,mat.stone,house);box(0,.395,0,13,.05,10,mat.white);
// Support slabs sit below the finish. They never compete with a second floor face.
for(const a of upperSlabAreas)box((a.x0+a.x1)/2,3.925,(a.z0+a.z1)/2,a.x1-a.x0,.19,a.z1-a.z0,mat.white);
for(const a of floorSurfaces){
  const floor=box((a.x0+a.x1)/2,a.y-.015,(a.z0+a.z1)/2,a.x1-a.x0,.03,a.z1-a.z0,mat[a.material]);
  floor.name=a.name;floor.userData.floorSurface=a;
}
box(0,7.52,0,13.25,.2,10.25,mat.white);
// Solid slabs also hide furniture between floors; the stair opening stays clear.
occlusionWalls.push(
 ...upperSlabAreas.map(a=>({axis:1,min:[a.x0,3.83,a.z0],max:[a.x1,4.05,a.z1]})),
 {axis:1,min:[-6.625,7.42,-5.125],max:[6.625,7.62,5.125]}
);
// Lower facade stops at the slab underside. Its top must not protrude into upstairs finishes.
for(let f=0;f<2;f++){const y=.45+3.6*f,facadeHeight=f?3.42:3.38;
// Blue plan openings: one front/rear window per bedroom.
// Lower north: bedroom C1821, stairs C1215, dining C1821.
// Upper north: bedrooms C1813, C1218 and C1818, no stair window.
wall('x',0,-5,13,y,facadeHeight,f?
  [win(-4.55,1.8,1.35,1.3),win(1.4,1.2,.9,1.8),win(4.65,1.8,.9,1.8)]:
  [win(-4.55,1.8,.8,2.1),win(-1.3,1.2,1.35,1.5),win(1.9,1.8,.8,2.1)]);
// No side bedroom openings. Ground-floor east has kitchen C1515/M0921.
const westOpenings=[win(.1,.9,1.35,1.5)];
const eastOpenings=f?[win(.1,.9,1.35,1.5)]:
  [win(-3.45,1.5,.95,1.5),door(-1.45,.9,2.1),win(.1,.9,1.35,1.5)];
const frontBedroomOpenings=[win(0,1.8,.5,f?2.4:2.7)];
wall('z',-6.5,0,10,y,facadeHeight,westOpenings);wall('z',6.5,0,10,y,facadeHeight,eastOpenings);
for(const x of [-4.55,4.55])wall('x',x,5,3.9,y,facadeHeight,frontBedroomOpenings);
wall('z',-2.6,4.4,1.2,y,facadeHeight);wall('z',2.6,4.4,1.2,y,facadeHeight);
wall('x',0,3.8,5.2,y,facadeHeight,f?[door(0,3,2.7)]:
  [door(0,1.8,2.7),win(-1.7,.9,.45,2.7),win(1.7,.9,.45,2.7)]);
// Continuous facade reveals and eaves.
for(const dy of [1.1,2.2,3.35]){const stripe=material(0xb1b9b1);for(const x of [-4.55,4.55])facadeReveal('x',x,5.11,3.9,y,dy,frontBedroomOpenings,stripe);facadeReveal('z',-6.61,0,10,y,dy,westOpenings,stripe);facadeReveal('z',6.61,0,10,y,dy,eastOpenings,stripe)}
}
// Balcony support ends exactly at the indoor threshold; the finish is a separate region.
box(0,3.91,4.86,5.2,.22,2.12,mat.white);
for(const x of [-2.675,2.675])box(x,3.925,5.46,.15,.25,.92,mat.white);
box(0,3.925,5.96,5.5,.25,.08,mat.white);
box(0,3.72,4.86,5.3,.16,2.12,mat.trim);box(0,7.44,4.4,5.8,.28,2.1,mat.trim);box(0,7.64,4.35,6.1,.15,2.3,mat.white);
for(const xx of [-2.68,2.68]){box(xx,2.04,4.12,.23,3.15,.42,mat.wall);box(xx,.85,4.12,.29,.9,.48,mat.stone)}
// Balcony rails.
for(let x=-2.6;x<=2.61;x+=.65)bar([x,4.08,5.82],[x,5.17,5.82],.022,mat.metal);for(const y of [4.42,4.79,5.17]){bar([-2.6,y,5.82],[2.6,y,5.82],.025,mat.metal);bar([-2.6,y,3.8],[-2.6,y,5.82],.025,mat.metal);bar([2.6,y,3.8],[2.6,y,5.82],.025,mat.metal)}
colliders.push({x0:-2.8,x1:2.8,z0:5.74,z1:5.98,y0:4,y1:5.3},{x0:-2.8,x1:-2.5,z0:3.7,z1:6,y0:4,y1:5.3},{x0:2.5,x1:2.8,z0:3.7,z1:6,y0:4,y1:5.3});
for(let i=0;i<3;i++)box(0,.075*(i+1),i===2?5.43:6.03-i*.31,3.4,.15*(i+1),i===2?.86:.9,mat.stone);
// Open double entry doors, inviting a clear route indoors.
for(const s of [-1,1]){const group=new T.Group();group.position.set(s*.9,.45,3.8);group.rotation.y=s*1.35;house.add(group);box(-s*.435,1.28,0,.87,2.56,.065,material(0x4c4542),group);for(const yy of [.6,1.6])box(-s*.435,yy,.04,.65,.68,.025,material(0x57504a),group);bar([-s*.72,1.12,.08],[-s*.72,1.43,.08],.017,mat.gold,group)}
// Kitchen M0921, hinged at the south jamb and open inward as in the plan.
const kitchenExit=new T.Group();kitchenExit.name='厨房室外门 M0921';
kitchenExit.userData.kitchenExteriorDoor=true;kitchenExit.position.set(6.5,.45,-1.02);house.add(kitchenExit);
box(-.43,1.025,0,.86,2.05,.06,mat.wood,kitchenExit);
for(const yy of [.55,1.35])box(-.43,yy,.039,.68,.54,.018,mat.wood,kitchenExit);
bar([-.7,.93,.075],[-.7,1.13,.075],.013,mat.metal,kitchenExit);
colliders.push({x0:5.6,x1:6.53,z0:-1.05,z1:-.98,y0:.45,y1:2.55});
box(6.665,.235,-1.45,.33,.43,1.12,mat.stone);
box(6.99,.135,-1.45,.32,.27,1.12,mat.stone);
box(7.31,.05,-1.45,.32,.1,1.12,mat.stone);
// Hipped tiled roof, with continuous UVs.
const verts=[],uvs=[];function tri(a,b,c){verts.push(...a,...b,...c);for(const v of [a,b,c])uvs.push(v[0]*.7,v[2]*.7)}const a=[-7,7.7,-5.6],b=[7,7.7,-5.6],c=[7,7.7,5.6],d=[-7,7.7,5.6],e=[-2.6,9.72,0],g=[2.6,9.72,0];tri(a,e,g);tri(a,g,b);tri(b,g,c);tri(c,g,e);tri(c,e,d);tri(d,e,a);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();const roof=new T.Mesh(geo,mat.roof);roof.material.side=T.DoubleSide;roof.castShadow=true;roof.receiveShadow=true;house.add(roof);for(const pair of [[a,e],[b,g],[c,g],[d,e],[e,g]])bar(pair[0],pair[1],.055,mat.metal);box(0,7.64,-5.45,14,.2,.28,mat.white);box(0,7.64,5.45,14,.2,.28,mat.white);box(-6.9,7.64,0,.24,.2,11,mat.white);box(6.9,7.64,0,.24,.2,11,mat.white);
}
// Temporarily omitted landscaping can be restored independently later.
export const gardenFeatures={trees:false,perimeterWalls:false,planting:false,bollards:false};
// Connected paving, with adjacent bounds instead of overlapping coplanar slabs.
export const pavedAreas=[
 {name:'正门前平台',x0:-9.1,x1:11.3,z0:5.2,z1:9.1,material:'tile'},
 {name:'前院左侧平台',x0:-9.1,x1:-1.7,z0:9.1,z1:13,material:'tile'},
 {name:'前院右侧平台',x0:1.7,x1:11.3,z0:9.1,z1:13,material:'tile'},
 {name:'入户石材通道',x0:-1.7,x1:1.7,z0:9.1,z1:14.4,material:'stone'},
 {name:'厨房外门平台',x0:6.7,x1:11.3,z0:-5.1,z1:5.2,material:'tile'},
 {name:'西侧通道',x0:-9.1,x1:-6.7,z0:-5.1,z1:5.2,material:'tile'},
 {name:'后侧通道',x0:-9.1,x1:9.1,z0:-7.1,z1:-5.1,material:'tile'}
];
export function baseGarden(){
const ground=material(0xbebfb9,.95);
box(0,-.175,0,150,.35,150,ground,scene);box(0,.015,1,21,.13,26,ground,scene);
for(const area of pavedAreas)box((area.x0+area.x1)/2,.035,(area.z0+area.z1)/2,area.x1-area.x0,.13,area.z1-area.z0,mat[area.material],scene);
if(gardenFeatures.perimeterWalls){for(const x of [-10.5,10.5])box(x,.78,-.4,.24,1.7,26,mat.wall,scene,true);box(0,.78,-13.3,21,1.7,.24,mat.wall,scene,true);for(const x of [-6.4,6.4])box(x,.67,12.7,8.2,1.5,.24,mat.wall,scene,true);for(const x of [-2.1,2.1]){box(x,1,12.7,.48,2.2,.48,mat.stone,scene,true);box(x,2.17,12.7,.64,.13,.64,mat.trim,scene)}}
}
// Finished floors are a partition, not layers laid over a full tiled floor.
export const upperSlabAreas=[
 {x0:-6.5,x1:-2.6,z0:-5,z1:5},
 {x0:0,x1:6.5,z0:-5,z1:3.8},
 {x0:-2.6,x1:0,z0:-.8,z1:3.8},
 {x0:2.6,x1:6.5,z0:3.8,z1:5}
];
export const floorSurfaces=[];
const floor=(level,name,x0,x1,z0,z1,material)=>floorSurfaces.push({level,name,x0,x1,z0,z1,y:level?4.05:.45,material});
for(const level of [0,1]){
  floor(level,'后侧左卧室地板',-6.5,-2.6,-5,-.8,'interiorTile');
  if(!level){floor(0,'楼梯底层地面',-2.6,0,-5,-.8,'interiorTile');floor(0,'餐厅地面',0,3.7,-5,-.8,'interiorTile');floor(0,'厨房地面',3.7,6.5,-5,-.8,'interiorTile');}
  else{floor(1,'后侧中卧室地板',0,2.8,-5,-.8,'interiorTile');floor(1,'后侧右卧室地板',2.8,6.5,-5,-.8,'interiorTile');}
  floor(level,'走廊及卫生间地面',-6.5,6.5,-.8,1,'interiorTile');
  floor(level,'前侧左卧室地板',-6.5,-2.6,1,5,'interiorTile');floor(level,'前侧右卧室地板',2.6,6.5,1,5,'interiorTile');
  floor(level,level?'休闲区地面':'客厅地面',-2.6,2.6,1,3.8,'interiorTile');
  floor(level,level?'阳台地面':'入户门廊地面',-2.6,2.6,3.8,level?5.92:5,level?'white':'tile');
}
architecture();baseGarden();
