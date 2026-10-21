import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// The reference shows a solid metal door under temporary protective film.
// Model the finished bronze door, without that film, lettering or glass.
let shared;
function finishes(){
  if(shared)return shared;
  const bronze=new T.MeshStandardMaterial({name:'拉丝古铜铝合金',color:0x564338,metalness:.82,roughness:.31,envMapIntensity:1.05});
  const edge=new T.MeshStandardMaterial({name:'古铜门框细亮边',color:0x9a8062,metalness:.87,roughness:.25,envMapIntensity:1.05});
  const panel=new T.MeshStandardMaterial({name:'实心古铜拉丝门板',color:0x706057,metalness:.73,roughness:.39,envMapIntensity:.85});
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=32;
    const context=canvas.getContext('2d');
    if(context?.createImageData){
      const pixels=context.createImageData(canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const slope=Math.sin(x/canvas.width*Math.PI*2),i=(y*canvas.width+x)*4;
        pixels.data[i]=128+slope*76;pixels.data[i+1]=128;
        pixels.data[i+2]=Math.sqrt(1-(slope*.6)**2)*127+128;pixels.data[i+3]=255;
      }
      context.putImageData(pixels,0,0);
      const normal=new T.CanvasTexture(canvas);normal.wrapS=normal.wrapT=T.RepeatWrapping;
      normal.repeat.set(128,1);normal.anisotropy=8;panel.normalMap=normal;panel.normalScale.set(.10,.02);
    }
  }
  return shared={bronze,edge,panel};
}
const cube=new T.BoxGeometry(1,1,1);
const rod=new T.CylinderGeometry(1,1,1,10);
let roomFinishes;
function interiorFinishes(){
  if(roomFinishes)return roomFinishes;
  const paint=new T.MeshStandardMaterial({name:'卧室暖白缎光烤漆',color:0xf4f2ed,roughness:.39,metalness:0});
  const inset=new T.MeshStandardMaterial({name:'卧室白色实心凹板',color:0xeeeae3,roughness:.48,metalness:0});
  const aluminium=new T.MeshStandardMaterial({name:'卫浴白色粉末喷涂铝框',color:0xf4f5f2,roughness:.34,metalness:.12});
  const frosted=new T.MeshStandardMaterial({name:'卫浴乳白长虹磨砂隐私面',color:0xe1e6e2,roughness:.58,metalness:0,envMapIntensity:.6});
  // Shared, tiny procedural normal map: rounded vertical reeds without extra
  // meshes or a costly screen-space transmission pass on a mobile phone.
  // The opaque milky backing represents the privacy/acid-etched inner layer.
  const pixels=new Uint8Array(256*4*4);
  for(let y=0;y<4;y++)for(let x=0;x<256;x++){
    const nx=Math.sin(x/256*Math.PI*2)*.76,i=(y*256+x)*4;
    pixels[i]=Math.round(127.5+nx*127.5);pixels[i+1]=128;pixels[i+2]=Math.round(127.5+Math.sqrt(1-nx*nx)*127.5);pixels[i+3]=255;
  }
  const normal=new T.DataTexture(pixels,256,4,T.RGBAFormat);normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.magFilter=T.LinearFilter;normal.minFilter=T.LinearMipmapLinearFilter;normal.generateMipmaps=true;normal.repeat.set(48,1);normal.anisotropy=8;normal.needsUpdate=true;
  frosted.normalMap=normal;frosted.normalScale.set(.28,.03);
  return roomFinishes={paint,inset,aluminium,frosted,black:new T.MeshStandardMaterial({name:'卧室哑黑门锁五金',color:0x272c2c,roughness:.32,metalness:.65}),silver:new T.MeshStandardMaterial({name:'卫浴拉丝银色隐私锁五金',color:0xb8c1c3,roughness:.29,metalness:.85})};
}
function block(parent,name,x,y,z,w,h,d,material){
  const object=new T.Mesh(cube,material);object.name=name;object.position.set(x,y,z);object.scale.set(w,h,d);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function pin(parent,name,x,y,z,r,h,material){
  const object=new T.Mesh(rod,material);object.name=name;object.position.set(x,y,z);object.scale.set(r,h,r);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function root(parent,{x=0,y=0,z=0,axis='x',name}){
  const group=new T.Group();group.name=name;group.position.set(x,y,z);if(axis==='z')group.rotation.y=Math.PI/2;parent.add(group);return group;
}

// Sweep ONE closed, stepped cross section around a mitered U-shaped opening.
// There are no independent horizontal/vertical boxes at the top corners, and
// no coplanar casing layers. The -6 mm inner return also hides the wall reveal
// without sharing its plane. The two bottom ends are buried in the floor and
// deliberately uncapped: a cap there would coincide with the finished floor.
function frameGeometry(width,height,depth,style='bronze'){
  const half=width/2,face=depth/2;
  const front=style==='bedroom'?[[-.006,face+.018],[.018,face+.018],[.024,face+.026],[.068,face+.026],[.074,face+.020]]:style==='bathroom'?[[-.006,face+.018],[.012,face+.018],[.017,face+.024],[.043,face+.024],[.048,face+.019]]:[[-.006,face+.018],[.018,face+.018],[.022,face+.024],[.038,face+.024],[.042,face+.031],[.052,face+.031],[.056,face+.025],[.068,face+.025],[.072,face+.036],[.078,face+.036],[.082,face+.029],[.092,face+.029],[.096,face+.040],[.101,face+.040],[.108,face+.034]];
  const profile=[...front,...front.slice().reverse().map(([r,z])=>[r,-z])];
  const points=profile.map(([r,z])=>[new T.Vector3(-half-r,0,z),new T.Vector3(-half-r,height+r,z),new T.Vector3(half+r,height+r,z),new T.Vector3(half+r,0,z)]);
  const positions=[],uvs=[];
  function tri(a,b,c){for(const p of [a,b,c]){positions.push(p.x,p.y,p.z);uvs.push(p.x,p.y);}}
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    for(let j=0;j<3;j++){tri(a[j],a[j+1],b[j+1]);tri(a[j],b[j+1],b[j]);}
  }
  const geometry=new T.BufferGeometry();geometry.type='ContinuousDoorProfileGeometry';
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

// Local X follows the opening; local Z is its depth.
export function buildDoorTrim(parent,{x=0,y=0,z=0,width,height,axis='x',depth=.2,name='古铜多层门套',style='bronze'}={}){
  const m=finishes(),group=root(parent,{x,y,z,axis,name});
  group.userData.referenceDoorTrim={width,height,axis,depth,style,innerRevealSeparation:.006,continuousProfile:true};
  const material=style==='bedroom'?interiorFinishes().paint:style==='bathroom'?interiorFinishes().aluminium:m.bronze;
  const frame=new T.Mesh(frameGeometry(width,height,depth,style),material);frame.name=style==='bedroom'?'连续白色简约卧室门套':style==='bathroom'?'连续白色窄边卫浴门套':'连续阶梯古铜门套';frame.userData.continuousDoorProfile=true;frame.userData.structuralDoorFrame=true;
  frame.castShadow=true;frame.receiveShadow=true;group.add(frame);
  return group;
}

function leaf(parent,{width,height,hinge,direction,angle,name}){
  const m=finishes(),group=new T.Group();group.name=name;group.position.set(hinge,.01,0);group.rotation.y=angle;parent.add(group);
  const center=direction*width/2,stile=.052,rail=.067;
  group.userData.referenceDoorLeaf={width,height,openAngle:angle,direction,hinge,closedAngle:0,thickness:.064,solidMetal:true};
  for(const sign of [-1,1]){
    block(group,'门扇竖框',center+sign*(width/2-stile/2),height/2,0,stile,height,.064,m.bronze);
    block(group,'门扇横框',center,sign<0?rail/2:height-rail/2,0,width-2*stile,rail,.064,m.bronze);
  }
  // The recessed slab slightly enters the stiles, closing every edge. Its face
  // is 11 mm behind the frame face, so no thin overlay competes with the metal.
  const panel=block(group,'不透明实心古铜门板',center,height/2,0,width-2*stile+.008,height-2*rail+.008,.042,m.panel);
  panel.userData.referenceDoorPanel=true;
  // Tall square pulls on both sides, with separate mounting blocks.
  const handleX=direction*(width-.115),handleHeight=Math.min(.70,height*.28),handleY=height*.49;
  for(const face of [-1,1]){
    for(const delta of [-1,1])block(group,'拉手连接座',handleX,handleY+delta*(handleHeight/2-.065),face*.055,.029,.032,.046,m.bronze);
    block(group,'古铜长拉手',handleX,handleY,face*.085,.025,handleHeight,.029,m.edge);
    block(group,'门锁盖',handleX,height*.29,face*.035,.028,.068,.012,m.edge);
  }
  for(const y of [height*.18,height*.5,height*.82])pin(group,'古铜门铰链',direction*.006,y,.005,.015,.115,m.edge);
  // All hardware moves rigidly with this hinge. Batch it locally rather than
  // adding twenty draw calls for every animated door leaf on a mobile phone.
  const batches=new Map();
  for(const part of [...group.children]){
    part.updateMatrix();const transformed=part.geometry.clone();transformed.applyMatrix4(part.matrix);
    const geometry=transformed.index?transformed.toNonIndexed():transformed;if(geometry!==transformed)transformed.dispose();
    let batch=batches.get(part.material);if(!batch)batches.set(part.material,batch={geometries:[],names:[],panels:0,pulls:0});
    batch.geometries.push(geometry);batch.names.push(part.name);if(part.userData.referenceDoorPanel)batch.panels++;if(part.name==='古铜长拉手')batch.pulls++;
    group.remove(part);
  }
  for(const [material,batch] of batches){
    const object=new T.Mesh(mergeGeometries(batch.geometries,false),material);object.name=batch.panels?'不透明实心古铜门板':material===m.edge?'古铜拉手与门铰链':'古铜门扇外框';
    object.castShadow=true;object.receiveShadow=true;object.userData.referenceDoorLeafPart=true;
    if(batch.panels)object.userData.referenceDoorPanel=true;
    object.userData.doorParts={names:batch.names,panelCount:batch.panels,longPullCount:batch.pulls};
    batch.geometries.forEach(geometry=>geometry.dispose());group.add(object);
  }
  group.userData.referenceDoorLeaf.longPullCount=2;group.userData.referenceDoorLeaf.drawCalls=group.children.length;
  return group;
}

function interiorLeaf(parent,{width,height,hinge,direction,angle,style}){
  const m=interiorFinishes(),bath=style==='bathroom',body=bath?m.aluminium:m.paint,panelMaterial=bath?m.frosted:m.inset,hardware=bath?m.silver:m.black;
  const group=new T.Group();group.name=bath?'白色长虹磨砂卫生间门扇':'白色单凹板卧室门扇';group.position.set(hinge,.01,0);group.rotation.y=angle;parent.add(group);
  const center=direction*width/2,stile=bath?.043:.105,rail=bath?.060:.130,handleX=direction*(width-.115),handleY=1.02;
  group.userData.referenceDoorLeaf={width,height,openAngle:angle,direction,hinge,closedAngle:0,thickness:.064,style,solidMetal:false,opaque:true,privacy:bath,handleType:bath?'silver-privacy-lever':'black-lever',handleBounds:{x0:Math.min(handleX-direction*.105,handleX+direction*.025),x1:Math.max(handleX-direction*.105,handleX+direction*.025),z0:-.09,z1:.09}};
  for(const sign of [-1,1]){
    block(group,'白色门扇竖框',center+sign*(width/2-stile/2),height/2,0,stile,height,.064,body);
    block(group,'白色门扇横框',center,sign<0?rail/2:height-rail/2,0,width-2*stile,rail,.064,body);
  }
  const panel=block(group,bath?'乳白长虹磨砂隐私面':'白色实心单凹板',center,height/2,0,width-2*stile+.004,height-2*rail+.004,bath?.018:.042,panelMaterial);panel.userData.referenceDoorPanel=true;
  for(const face of [-1,1]){
    // Round rose and short return lever on both sides, fully separated from
    // the panel face; the inside bathroom thumb-turn is distinct from a key.
    const rose=pin(group,'圆形把手锁座',handleX,handleY,face*.041,.025,.016,hardware);rose.rotation.x=Math.PI/2;
    block(group,'短执手连接',handleX,handleY,face*.063,.019,.019,.041,hardware);
    const lever=pin(group,'横向短执手',handleX-direction*.044,handleY,face*.080,.009,.108,hardware);lever.rotation.z=Math.PI/2;
    const lock=pin(group,bath?'卫浴隐私锁座':'卧室钥匙锁座',handleX,handleY-.075,face*.038,.016,.010,hardware);lock.rotation.x=Math.PI/2;
    block(group,bath?'隐私锁旋钮':'钥匙孔',handleX,handleY-.075,face*.049,bath?.021:.003,bath?.007:.014,.012,hardware);
  }
  for(const y of [height*.18,height*.5,height*.82])pin(group,'室内门铰链',direction*.006,y,.005,.013,.095,hardware);
  const batches=new Map();
  for(const part of [...group.children]){
    part.updateMatrix();const transformed=part.geometry.clone();transformed.applyMatrix4(part.matrix);const geometry=transformed.toNonIndexed();transformed.dispose();
    if(!batches.has(part.material))batches.set(part.material,{geometries:[],names:[],panels:0});const batch=batches.get(part.material);batch.geometries.push(geometry);batch.names.push(part.name);if(part.userData.referenceDoorPanel)batch.panels++;group.remove(part);
  }
  for(const [material,batch] of batches){
    const mesh=new T.Mesh(mergeGeometries(batch.geometries,false),material);mesh.name=material.name;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.referenceDoorLeafPart=true;mesh.userData.doorParts={names:batch.names,panelCount:batch.panels,longPullCount:0};if(batch.panels)mesh.userData.referenceDoorPanel=true;group.add(mesh);batch.geometries.forEach(g=>g.dispose());
  }
  group.userData.referenceDoorLeaf.longPullCount=0;group.userData.referenceDoorLeaf.drawCalls=group.children.length;return group;
}

export function buildEntryDoor(parent,{x=0,y=0,z=0,width=1.8,height=2.7,axis='x',depth=.2,double=true,openAngle=1.35,hingeSide=1,trim=false,name='古铜实心双开入户门',style='bronze'}={}){
  const group=root(parent,{x,y,z,axis,name});
  group.userData.referenceEntryDoor={width,height,axis,double,openAngle};
  if(trim)buildDoorTrim(group,{width,height,depth,style});
  if(double){
    for(const side of [-1,1])leaf(group,{width:width/2-.025,height:height-.025,hinge:side*(width/2-.012),direction:-side,angle:side*openAngle,name:side<0?'双开门左扇':'双开门右扇'});
  }else{
    const options={width:width-.04,height:height-.025,hinge:hingeSide*(width/2-.012),direction:-hingeSide,angle:-hingeSide*openAngle,name:'古铜实心单开门扇',style};
    if(style==='bedroom'||style==='bathroom')interiorLeaf(group,options);else leaf(group,options);
    group.userData.kitchenExteriorDoor=true;
  }
  group.doorLeaves=group.children.filter(child=>child.userData.referenceDoorLeaf);
  return group;
}

let slidingFinishes;
export function buildSlidingDoor(parent,{x=0,y=0,z=0,width,height,axis='x',name='玻璃推拉门'}={}){
  slidingFinishes??={frame:new T.MeshStandardMaterial({name:'推拉门深色铝框',color:0x354139,roughness:.36,metalness:.62}),glass:new T.MeshStandardMaterial({name:'清透安全玻璃',color:0xd2e3de,roughness:.12,metalness:.05,transparent:true,opacity:.20,depthWrite:false,side:T.DoubleSide,envMapIntensity:.8})};
  const group=root(parent,{x,y,z,axis,name}),m=slidingFinishes;
  group.userData.referenceEntryDoor={width,height,axis,double:true,sliding:true};group.doorLeaves=[];group.fixedDoorPanels=[];
  // Four panels on two separate tracks: the inner pair slide left/right onto
  // the outer pair. Nothing rotates into the dining furniture or the balcony.
  const panelWidth=width/4-.006,panelHeight=height-.035,stile=.034,rail=.044;
  for(const side of [-1,1])for(const moving of [false,true]){
    const panel=new T.Group(),center=side*width*(moving?1:3)/8;
    panel.name=(moving?'活动':'固定')+(side<0?'左':'右')+'玻璃门扇';panel.position.set(center,.012,moving?.033:-.033);group.add(panel);
    const data={motionType:'slide',width:panelWidth,height:panelHeight,thickness:.04,closedX:center,closedZ:panel.position.z,slideX:moving?side*width/4:0,openAngle:0,closedAngle:0,direction:1,glass:true};
    panel.userData.slidingDoorPanel=data;
    if(moving){panel.userData.referenceDoorLeaf=data;group.doorLeaves.push(panel);}else group.fixedDoorPanels.push(panel);
    const pieces=[];
    function railPart(label,px,py,pz,w,h,d){const mesh=block(panel,label,px,py,pz,w,h,d,m.frame);mesh.updateMatrix();const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);pieces.push(geometry);panel.remove(mesh);}
    for(const sign of [-1,1]){railPart('推拉门竖框',sign*(panelWidth-stile)/2,panelHeight/2,0,stile,panelHeight,.04);railPart('推拉门横框',0,sign<0?rail/2:panelHeight-rail/2,0,panelWidth-2*stile,rail,.04);}
    if(moving)for(const face of [-1,1])railPart('推拉门拉手',-side*(panelWidth/2-.065),panelHeight*.49,face*.038,.018,.30,.035);
    const merged=pieces.map(g=>{if(!g.index)return g;const n=g.toNonIndexed();g.dispose();return n;});
    const metal=new T.Mesh(mergeGeometries(merged,false),m.frame);metal.name='推拉门框与拉手';metal.castShadow=metal.receiveShadow=true;panel.add(metal);merged.forEach(g=>g.dispose());
    const glass=new T.Mesh(new T.PlaneGeometry(panelWidth-2*stile,panelHeight-2*rail),m.glass);glass.position.y=panelHeight/2;glass.name='推拉门透明玻璃';glass.userData.slidingDoorGlass=true;glass.castShadow=false;glass.receiveShadow=true;panel.add(glass);
    data.drawCalls=2;
  }
  // The thin tracks stand above the floor instead of sharing its surface.
  block(group,'推拉门上导轨',0,height-.008,0,width,.016,.115,m.frame);
  block(group,'推拉门下导轨',0,.007,0,width,.008,.115,m.frame);
  return group;
}
