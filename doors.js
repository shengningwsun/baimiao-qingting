import * as T from './vendor/three.module.js';

// The fitted, unwrapped door in the reference: brushed bronze profiles and
// full-height reeded glass. Its packing-film lettering is deliberately absent.
let shared;
function finishes(){
  if(shared)return shared;
  const bronze=new T.MeshStandardMaterial({name:'拉丝古铜铝合金',color:0x564338,metalness:.82,roughness:.31,envMapIntensity:1.05});
  const edge=new T.MeshStandardMaterial({name:'古铜门框细亮边',color:0x9a8062,metalness:.87,roughness:.25,envMapIntensity:1.05});
  const gasket=new T.MeshStandardMaterial({name:'深棕密封胶条',color:0x211d1a,roughness:.94});
  const glass=new T.MeshStandardMaterial({name:'通高长虹玻璃',color:0xc6d3cd,metalness:0,roughness:.24,transparent:true,opacity:.49,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.1});
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
      normal.repeat.set(32,1);normal.anisotropy=8;glass.normalMap=normal;glass.normalScale.set(.58,.2);
    }
  }
  return shared={bronze,edge,gasket,glass};
}
const cube=new T.BoxGeometry(1,1,1),pane=new T.PlaneGeometry(1,1);
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

// Local X follows the opening; local Z is its depth. Every moulding has a
// different projection, so the reference's nested edges never share a face.
export function buildDoorTrim(parent,{x=0,y=0,z=0,width,height,axis='x',depth=.2,name='古铜多层门套'}={}){
  const m=finishes(),group=root(parent,{x,y,z,axis,name});
  group.userData.referenceDoorTrim={width,height,axis,depth};
  for(const side of [-1,1])block(group,'门套内衬',side*(width/2+.0225),height/2,0,.045,height,depth+.03,m.bronze);
  block(group,'门套顶部内衬',0,height+.0225,0,width+.09,.045,depth+.03,m.bronze);
  for(const face of [-1,1]){
    // Continuous bronze casing beneath the stepped beads, rather than loose
    // rails floating in front of exposed paint between adjacent profiles.
    for(const side of [-1,1])block(group,'门套连续底衬',side*(width/2+.054),height/2,face*(depth/2+.016),.108,height,.012,m.bronze);
    block(group,'门套连续顶衬',0,height+.054,face*(depth/2+.016),width+.216,.108,.012,m.bronze);
    for(const [offset,strip,projection,material] of [[.027,.042,.029,m.bronze],[.064,.018,.035,m.edge],[.085,.014,.041,m.bronze],[.103,.007,.047,m.edge]]){
      for(const side of [-1,1])block(group,'门套阶梯竖线',side*(width/2+offset),height/2,face*(depth/2+projection),strip,height,.012,material);
      block(group,'门套阶梯横线',0,height+offset,face*(depth/2+projection),width+2*offset+strip,strip,.012,material);
    }
  }
  return group;
}

function leaf(parent,{width,height,hinge,direction,angle,name}){
  const m=finishes(),group=new T.Group();group.name=name;group.position.x=hinge;group.rotation.y=angle;parent.add(group);
  const center=direction*width/2,stile=.052,rail=.067,paneWidth=width-2*stile-.012,paneHeight=height-2*rail-.012;
  group.userData.referenceDoorLeaf={width,height,openAngle:angle,reededGlass:true};
  for(const sign of [-1,1]){
    block(group,'门扇竖框',center+sign*(width/2-stile/2),height/2,0,stile,height,.064,m.bronze);
    block(group,'门扇横框',center,sign<0?rail/2:height-rail/2,0,width-2*stile,rail,.064,m.bronze);
    for(const face of [-1,1]){
      block(group,'长虹玻璃竖压条',center+sign*(paneWidth/2+.008),height/2,face*.021,.012,paneHeight+.02,.014,m.gasket);
      block(group,'长虹玻璃横压条',center,sign<0?rail+.002:height-rail-.002,face*.021,paneWidth,.01,.014,m.gasket);
    }
  }
  const glass=new T.Mesh(pane,m.glass);glass.name='门扇长虹玻璃';glass.position.set(center,height/2,0);glass.scale.set(paneWidth,paneHeight,1);glass.castShadow=false;glass.receiveShadow=true;glass.userData.referenceDoorGlass=true;group.add(glass);
  // Tall square pulls on both sides, with separate mounting blocks.
  const handleX=direction*(width-.115),handleHeight=Math.min(.70,height*.28),handleY=height*.49;
  for(const face of [-1,1]){
    for(const delta of [-1,1])block(group,'拉手连接座',handleX,handleY+delta*(handleHeight/2-.065),face*.055,.029,.032,.046,m.bronze);
    block(group,'古铜长拉手',handleX,handleY,face*.085,.025,handleHeight,.029,m.edge);
    block(group,'门锁盖',handleX,height*.29,face*.035,.028,.068,.012,m.edge);
  }
  for(const y of [height*.18,height*.5,height*.82])pin(group,'古铜门铰链',direction*.006,y,.005,.015,.115,m.edge);
  return group;
}

export function buildEntryDoor(parent,{x=0,y=0,z=0,width=1.8,height=2.7,axis='x',depth=.2,double=true,openAngle=1.35,hingeSide=1,trim=false,name='古铜长虹玻璃双开入户门'}={}){
  const group=root(parent,{x,y,z,axis,name});
  group.userData.referenceEntryDoor={width,height,axis,double,openAngle};
  if(trim)buildDoorTrim(group,{width,height,depth});
  if(double){
    for(const side of [-1,1])leaf(group,{width:width/2-.025,height:height-.075,hinge:side*(width/2-.012),direction:-side,angle:side*openAngle,name:side<0?'入户门左扇':'入户门右扇'});
  }else{
    leaf(group,{width:width-.04,height:height-.05,hinge:hingeSide*(width/2-.012),direction:-hingeSide,angle:-hingeSide*openAngle,name:'厨房长虹玻璃门扇'});
    group.userData.kitchenExteriorDoor=true;
  }
  return group;
}
