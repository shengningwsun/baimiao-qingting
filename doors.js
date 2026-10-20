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
function frameGeometry(width,height,depth){
  const half=width/2,face=depth/2;
  const front=[[-.006,face+.018],[.018,face+.018],[.022,face+.024],[.038,face+.024],[.042,face+.031],[.052,face+.031],[.056,face+.025],[.068,face+.025],[.072,face+.036],[.078,face+.036],[.082,face+.029],[.092,face+.029],[.096,face+.040],[.101,face+.040],[.108,face+.034]];
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
export function buildDoorTrim(parent,{x=0,y=0,z=0,width,height,axis='x',depth=.2,name='古铜多层门套'}={}){
  const m=finishes(),group=root(parent,{x,y,z,axis,name});
  group.userData.referenceDoorTrim={width,height,axis,depth,innerRevealSeparation:.006,continuousProfile:true};
  const frame=new T.Mesh(frameGeometry(width,height,depth),m.bronze);frame.name='连续阶梯古铜门套';frame.userData.continuousDoorProfile=true;frame.userData.structuralDoorFrame=true;
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

export function buildEntryDoor(parent,{x=0,y=0,z=0,width=1.8,height=2.7,axis='x',depth=.2,double=true,openAngle=1.35,hingeSide=1,trim=false,name='古铜实心双开入户门'}={}){
  const group=root(parent,{x,y,z,axis,name});
  group.userData.referenceEntryDoor={width,height,axis,double,openAngle};
  if(trim)buildDoorTrim(group,{width,height,depth});
  if(double){
    for(const side of [-1,1])leaf(group,{width:width/2-.025,height:height-.025,hinge:side*(width/2-.012),direction:-side,angle:side*openAngle,name:side<0?'双开门左扇':'双开门右扇'});
  }else{
    leaf(group,{width:width-.04,height:height-.025,hinge:hingeSide*(width/2-.012),direction:-hingeSide,angle:-hingeSide*openAngle,name:'古铜实心单开门扇'});
    group.userData.kitchenExteriorDoor=true;
  }
  group.doorLeaves=group.children.filter(child=>child.userData.referenceDoorLeaf);
  return group;
}
