import * as T from './vendor/three.module.js';
import {house,scene,mat,box,cylinder,sphere,bar,lamps,occlusionWalls,floorSurfaces} from './world.js';
import {rounded,upholstery} from './furniture.js';

const quartz=new T.MeshStandardMaterial({color:0xdedfdc,roughness:.28});
const pages=new T.MeshStandardMaterial({color:0xeee9df,roughness:.95});
const bookCovers=[0x4b6160,0x9a705e,0xb8afa0].map(color=>new T.MeshStandardMaterial({color,roughness:.78}));
const ceramic=new T.MeshStandardMaterial({color:0xf5f3ed,roughness:.22});
const dark=new T.MeshStandardMaterial({color:0x646c6c,roughness:.55});
const glow=new T.MeshStandardMaterial({color:0xfff3d6,emissive:0xffd49a,emissiveIntensity:.5,roughness:.4});lamps.push(glow);
let edgeMaterial=null;
const mirrors=[];
const sunlight=[];
export const detailStatus={paintedWalls:true,greyTileFloors:true,lightRooms:16,mirrorProbes:0,edgeShadows:0};

function edgeShadow(axis,fixed,a,b,y,direction){
  if(typeof document==='undefined'||typeof Image==='undefined'||b-a<.03)return;
  if(!edgeMaterial){
    const c=document.createElement('canvas');c.width=8;c.height=128;
    const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,128);
    g.addColorStop(0,'rgba(20,24,29,.25)');g.addColorStop(.25,'rgba(20,24,29,.10)');g.addColorStop(1,'rgba(20,24,29,0)');ctx.fillStyle=g;ctx.fillRect(0,0,8,128);
    edgeMaterial=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
  }
  const width=.22,verts=axis===0?[fixed,y,a,fixed,y,b,fixed+direction*width,y,a,fixed+direction*width,y,b]:[a,y,fixed,b,y,fixed,a,y,fixed+direction*width,b,y,fixed+direction*width];
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));geometry.setAttribute('uv',new T.Float32BufferAttribute([0,1,1,1,0,0,1,0],2));geometry.setIndex(direction*(axis===0?1:-1)>0?[0,1,2,1,3,2]:[0,2,1,1,2,3]);geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,edgeMaterial);mesh.userData.staticContact=true;house.add(mesh);detailStatus.edgeShadows++;
}
function floorEdges(){
  for(const level of [.45,4.05])for(const w of occlusionWalls){
    if(w.axis===1||w.min[1]>level+.1||w.max[1]<level+.3)continue;
    const a=w.axis===0?2:0;
    for(const side of [-1,1]){
      const fixed=(side>0?w.max[w.axis]:w.min[w.axis])+side*.003,mid=(w.min[a]+w.max[a])/2;
      const x=w.axis===0?fixed+side*.1:mid,z=w.axis===0?mid:fixed+side*.1;
      if(!floorSurfaces.some(f=>Math.abs(f.y-level)<.01&&x>f.x0&&x<f.x1&&z>f.z0&&z<f.z1))continue;
      edgeShadow(w.axis,fixed,w.min[a],w.max[a],level+.007,side);
    }
  }
}
function book(x,z,y,width=.25,depth=.18,index=0){
  rounded(x,y+.017,z,width,.034,depth,pages,.008);
  for(const yy of [y+.002,y+.034])box(x,yy,z,width+.009,.004,depth+.009,bookCovers[index%3]);
  box(x-width/2-.004,y+.018,z,.009,.037,depth+.009,bookCovers[index%3]);
}
function wallSwitch(x,z,y,facing=0){
  const parent=new T.Group();parent.position.set(x,y,z);parent.rotation.y=facing;house.add(parent);
  rounded(0,0,0,.083,.083,.012,mat.skirting,.008,parent);
  rounded(0,.002,.010,.051,.059,.009,ceramic,.004,parent);
  box(0,-.022,.016,.016,.001,.001,dark,parent);
}
function towel(x,z,y){
  const g=new T.Group();g.position.set(x,y,z);house.add(g);
  for(const side of [-1,1]){cylinder(side*.24,0,.016,.024,.035,mat.metal,g).rotation.x=Math.PI/2;bar([side*.24,0,.024],[side*.24,0,.078],.014,mat.metal,g);}
  bar([-.25,0,.078],[.25,0,.078],.014,mat.metal,g);
  const verts=[],uv=[],indices=[];
  for(let row=0;row<=22;row++)for(let col=0;col<=18;col++){
    const a=col/18,b=row/22;verts.push((a-.5)*.34,-b*.44,.085+.017*Math.sin(a*Math.PI*8)*(b*.7+.3));uv.push(a,b*1.3);
    if(row<22&&col<18){const k=row*19+col;indices.push(k,k+19,k+1,k+1,k+19,k+20);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,upholstery.ivory);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
}
function bathAccessories(x,z,y,side){
  towel(x,z+.786,y+1.33);
  wallSwitch(x-side*.92,z+.787,y+1.15,Math.PI);
  const basin=x+side*.43;
  cylinder(basin+side*.22,y+1.073,z-.57,.025,.11,ceramic);cylinder(basin+side*.22,y+1.142,z-.57,.013,.03,mat.metal);
  box(basin+side*.20,y+1.163,z-.57,.064,.009,.013,mat.metal);
  const reflector=new T.Mesh(new T.PlaneGeometry(.59,.51),new T.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.08,envMapIntensity:.75}));
  reflector.position.set(basin,y+1.585,z-.691);reflector.name='浴室镜面反射';reflector.userData.lateDetail=true;house.add(reflector);mirrors.push(reflector);
}
export function finishRooms(){
  floorEdges();
  windowLight();
  for(const f of floorSurfaces){
    if(f.material!=='interiorTile'||f.name.includes('走廊')||f.name.includes('楼梯'))continue;
    const x=(f.x0+f.x1)/2,z=(f.z0+f.z1)/2,w=f.x1-f.x0,d=f.z1-f.z0,y=f.y+3.29;
    for(const side of [-1,1]){
      rounded(x+side*(w/2-.145),y,z,.066,.058,d-.22,mat.skirting,.018);
      rounded(x,y,z+side*(d/2-.145),w-.22,.058,.066,mat.skirting,.018);
    }
    if(f.name.includes('卧室')){
      for(const side of [-1,1])box(x+side*(w/2-.119),f.y+.06,z,.038,.11,d-.26,mat.skirting);
      wallSwitch(f.x0+.127,f.z0+.40,f.y+1.14,Math.PI/2);
    }
  }
  for(const y of [.45,4.05]){
    bathAccessories(-5.3,.1,y,1);bathAccessories(5.3,.1,y,-1);
    book(y>3?.31:-1.12,y>3?2.13:2.31,y+.485,.26,.19,0);
    book(y>3?.34:-1.10,y>3?2.12:2.31,y+.524,.23,.17,1);
  }
  wallSwitch(2.475,3.31,1.59,-Math.PI/2);wallSwitch(-.125,-1.3,1.59,-Math.PI/2);
  // Continuous worktop, a wipeable splashback and warm under-cabinet strips.
  rounded(6.03,.45+.947,-2.93,.79,.016,2.17,quartz,.006);
  box(6.374,.45+1.025,-2.94,.024,.15,2.12,quartz);
  box(5.04,.45+1.35,-4.888,2.23,.70,.020,quartz);
  box(4.5,.45+1.662,-4.545,1.07,.013,.025,glow);
  box(5.57,.45+1.749,-4.325,.65,.009,.020,glow);
  rounded(6.295,.45+1.165,-2.09,.014,.41,.26,mat.wood,.006);
  for(const [x,z] of [[5.94,-3.85],[6.04,-3.69]]){cylinder(x,.45+1.016,z,.042,.12,ceramic);cylinder(x,.45+1.083,z,.044,.014,mat.metal);}
  book(-2.28,2.53,4.05+.49,.23,.16,2);
  // A lathed porcelain bowl and softly irregular fruit, as in the reference dining scene.
  const profile=[[.0,.0],[.045,.005],[.11,.035],[.14,.09],[.145,.105],[.137,.106],[.13,.086],[.105,.04],[.025,.016]].map(p=>new T.Vector2(...p));
  const bowl=new T.Mesh(new T.LatheGeometry(profile,32),ceramic);bowl.position.set(1.80,.45+.8,-2.86);bowl.castShadow=bowl.receiveShadow=true;house.add(bowl);
  const fruit=new T.MeshStandardMaterial({color:0xd7b448,roughness:.63});
  for(const [x,z] of [[1.74,-2.87],[1.86,-2.84]])sphere(x,.45+.87,z,.051,fruit,house,[1.15,.83,.78]);
}

// Capture each bathroom once, after the real furniture loads. No per-frame reflection render.
export async function prepareInteriorReflections(renderer){
  scene.updateMatrixWorld(true);for(const m of mirrors)m.visible=false;
  try{
    for(const mirror of mirrors){
      const target=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
      const probe=new T.CubeCamera(.08,8,target);probe.position.copy(mirror.position);probe.position.z+=.10;
      probe.update(renderer,scene);mirror.material.envMap=target.texture;mirror.material.needsUpdate=true;
      mirror.userData.reflectionTarget=target;detailStatus.mirrorProbes++;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{for(const mirror of mirrors)mirror.visible=true;}
}
export function setReflectionLighting(mode){for(const mirror of mirrors)mirror.material.envMapIntensity=mode==='night'?.38:mode==='dusk'?.60:.75;for(const patch of sunlight)patch.visible=patch.userData.lightMode===mode;}

// Fixed window projections add gentle daylight even when mobile dynamic shadows are off.
// They follow the sunny/dusk light direction, live on the floor and never animate.
function windowLight(){
  if(typeof Image==='undefined')return;
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),pixels=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,edge=Math.min(x,y,127-x,127-y)/6;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(255*Math.min(1,Math.max(0,edge)));}ctx.putImageData(pixels,0,0);
  const map=new T.CanvasTexture(c);
  const windows=[];house.traverse(o=>{const w=o.userData.architecturalWindow;if(w&&w.axis==='x'&&w.z>0)windows.push(w);});
  for(const [mode,slopeX,slopeZ,color,opacity] of [['day',.6,-.68,0xfff6df,.14],['dusk',2.875,-.75,0xffc98a,.11]]){
    const vertices=[],uv=[];
    for(const w of windows){
      const floorY=w.bottom>4?4.05:.45;
      for(const [left,right] of [[-w.width/2+.065,-.034],[.034,w.width/2-.065]])for(const [bottom,top] of [[w.bottom+.06,w.bottom+w.height*.75-.035],[w.bottom+w.height*.75+.035,w.bottom+w.height-.06]]){
        if(bottom>=top)continue;
        const project=(x,y)=>[w.x+x+(y-floorY)*slopeX,floorY+.009,w.z+(y-floorY)*slopeZ];
        const points=[project(left,bottom),project(right,bottom),project(right,top),project(left,top)];
        // Limit patches to the existing floor regions; a shallow dusk ray often hits a wall first.
        if(!points.every(([x,y,z])=>floorSurfaces.some(f=>Math.abs(f.y-floorY)<.01&&x>f.x0+.1&&x<f.x1-.1&&z>f.z0+.1&&z<f.z1-.1)))continue;
        for(const i of [0,1,2,0,2,3]){vertices.push(...points[i]);uv.push(...[[0,0],[1,0],[1,1],[0,1]][i]);}
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
    const patch=new T.Mesh(geometry,new T.MeshBasicMaterial({map,color,opacity,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));patch.userData.lateDetail=true;patch.userData.lightMode=mode;patch.name='窗边自然光斑 · '+mode;patch.visible=mode==='day';house.add(patch);sunlight.push(patch);
  }
}
