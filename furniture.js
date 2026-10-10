import * as T from './vendor/three.module.js';
import {realFurniture,furnitureIds as IDs} from './furniture-models.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {house,mat,box,cylinder,sphere,bar,material,materialLoads,assetPath,colliders} from './world.js';

// Photograph-based woven upholstery, shared by every room.
function texture(name,srgb=false){
  if(typeof Image==='undefined')return null;
  const loader=new T.TextureLoader();
  let finish;
  materialLoads.push(new Promise(resolve=>finish=resolve));
  const t=loader.load(assetPath(name),finish,undefined,finish);
  t.wrapS=t.wrapT=T.RepeatWrapping;
  t.repeat.set(2.2,2.2);
  t.anisotropy=16;
  if(srgb)t.colorSpace=T.SRGBColorSpace;
  return t;
}
const weave=texture('terlenka-diffuse.jpg',true);
const weaveNormal=texture('terlenka-nor_gl.jpg');
function cloth(color){
  const m=new T.MeshStandardMaterial({color,roughness:1,metalness:0});
  if(weave){m.map=weave;m.normalMap=weaveNormal;m.normalScale.set(.35,.35)}
  return m;
}
export const upholstery={
  ivory:cloth(0xfff8ee),
  sage:cloth(0xaac9b7),
  clay:cloth(0xf0bca8),
  olive:cloth(0x9caa82),
  warm:cloth(0xe6d9c4)
};
const seam=new T.MeshStandardMaterial({color:0x9b9483,roughness:1});
const darkWood=new T.MeshStandardMaterial({color:0x66513e,roughness:.62});
const ceramic=new T.MeshStandardMaterial({color:0xf3f0e8,roughness:.24});
const quartz=new T.MeshStandardMaterial({color:0xe8e5df,roughness:.28});
const appliance=new T.MeshStandardMaterial({color:0xaeb8b5,metalness:.65,roughness:.28});
const blackGlass=new T.MeshStandardMaterial({color:0x19232a,metalness:.22,roughness:.12});
const mirror=new T.MeshPhysicalMaterial({color:0xc9d7d7,metalness:.88,roughness:.07,envMapIntensity:1.35});

function mesh(geometry,m,parent=house){
  const o=new T.Mesh(geometry,m);
  o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
export function rounded(x,y,z,w,h,d,m,r=.08,parent=house){
  const o=mesh(new RoundedBoxGeometry(w,h,d,5,Math.min(r,w*.29,h*.29,d*.29)),m,parent);
  o.position.set(x,y,z);return o;
}

let shadowMap=null,shadowMaterial=null;
export function contactShadow(parent,w,d){
  if(typeof Image==='undefined'||typeof document==='undefined')return;
  if(!shadowMap){
    const c=document.createElement('canvas');c.width=c.height=128;
    const a=c.getContext('2d'),g=a.createRadialGradient(64,64,10,64,64,64);
    g.addColorStop(0,'rgba(20,22,24,.60)');g.addColorStop(.55,'rgba(20,22,24,.24)');g.addColorStop(1,'rgba(20,22,24,0)');
    a.fillStyle=g;a.fillRect(0,0,128,128);shadowMap=new T.CanvasTexture(c);
  }
  if(!shadowMaterial)shadowMaterial=new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false});
  const o=new T.Mesh(new T.PlaneGeometry(w,d),shadowMaterial);o.userData.staticContact=true;o.rotation.x=-Math.PI/2;o.position.y=.010;parent.add(o);
}

function furnitureGroup(x,z,y,rotation=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;house.add(g);return g}
export function sofa(x,z,y,len=2.35,color=upholstery.sage,rotation=0){
  const g=furnitureGroup(x,z,y,rotation);
  colliders.push({x0:x-.45,x1:x+.45,z0:z-len/2,z1:z+len/2,y0:y,y1:y+.98});
  contactShadow(g,1.15,len+.2);
  realFurniture(g,IDs.sofa,{w:.86,h:.95,d:len,rotation:Math.PI/2,name:'Westport 亚麻扣钉沙发'});
  return g;
}
function nightstand(parent,x){
  const g=new T.Group();g.position.set(x,0,-.74);parent.add(g);
  realFurniture(g,IDs.nightstand,{w:.4,h:.56,d:.39,name:'Claremont 双抽屉床头柜'});
  const lamp=new T.Group();lamp.position.set(x,.56,-.74);parent.add(lamp);
  realFurniture(lamp,IDs.lamp,{w:.23,h:.43,d:.23,name:'Stone & Beam 陶瓷与织物台灯'});
}
export function bed(x,z,y,cover=upholstery.sage,rotation=0){
  const g=furnitureGroup(x,z,y,rotation);
  contactShadow(g,2.2,2.45);
  const product=realFurniture(g,IDs.bed,{w:1.78,h:1.43,d:2.26,name:'Prudence 拉扣软包床 · 枕头与床品'});
  bedThrow(g,product,cover);
  nightstand(g,-1.11);nightstand(g,1.11);
  return g;
}
export function wardrobe(x,z,y,facing=-Math.PI/2){
  const g=furnitureGroup(x,z,y);
  contactShadow(g,.8,1.08);
  colliders.push({x0:x-.31,x1:x+.31,z0:z-.46,z1:z+.46,y0:y,y1:y+2.12});
  realFurniture(g,IDs.wardrobe,{w:.58,h:2.12,d:.88,rotation:facing,name:'Movian Fils 双门衣柜'});
  return g;
}
export function mediaCabinet(x,z,y){
  const g=furnitureGroup(x,z,y);
  contactShadow(g,.63,1.92);
  colliders.push({x0:x-.215,x1:x+.215,z0:z-.85,z1:z+.85,y0:y,y1:y+.52});
  realFurniture(g,IDs.media,{w:.43,h:.52,d:1.7,rotation:-Math.PI/2,name:'Roxmere 实木电视柜'});
  return g;
}
export function bookcase(x,z,y){
  const g=furnitureGroup(x,z,y);
  contactShadow(g,.56,1.12);
  colliders.push({x0:x-.19,x1:x+.19,z0:z-.485,z1:z+.485,y0:y,y1:y+2.16});
  realFurniture(g,IDs.bookcase,{w:.38,h:2.16,d:.97,rotation:Math.PI/2,name:'Stone & Beam 木与藤编书柜'});
  return g;
}

export function curtains(x,z,y,width=1.8,facing=0,top=2.72,bottom=.06){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=facing;house.add(g);
  const sheer=new T.MeshStandardMaterial({map:weave,color:0xfff9ef,roughness:1,transparent:true,opacity:.86,side:T.DoubleSide,depthWrite:false});
  const rod=mesh(new T.CylinderGeometry(.017,.017,width+.38,16),mat.gold,g);
  rod.rotation.z=Math.PI/2;rod.position.y=top+.05;
  for(const side of [-1,1]){
    sphere(side*(width/2+.17),top+.05,0,.045,mat.gold,g);
    const pw=.54,ph=top-bottom,verts=[],uv=[],idx=[];
    for(let row=0;row<=14;row++)for(let col=0;col<=10;col++){
      const a=col/10,b=row/14;
      verts.push(side*(width/2-.27)+(a-.5)*pw*(1+.08*b),top-b*ph,.052*Math.sin(a*Math.PI*6)+.02*b);
      uv.push(a*1.6,b*3.5);
      if(row<14&&col<10){const k=row*11+col;idx.push(k,k+11,k+1,k+1,k+11,k+12)}
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.setIndex(idx);geometry.computeVertexNormals();
    const panel=mesh(geometry,sheer,g);panel.castShadow=false;
    box(side*(width/2-.27),bottom+ph*.47,.055,.47,.035,.07,upholstery.warm,g);
  }
}

export function diningChair(x,z,y,angle=0){
  const g=furnitureGroup(x,z,y,angle);contactShadow(g,.72,.75);
  const halfW=(Math.abs(Math.cos(angle))*.54+Math.abs(Math.sin(angle))*.57)/2,halfD=(Math.abs(Math.sin(angle))*.54+Math.abs(Math.cos(angle))*.57)/2;
  colliders.push({x0:x-halfW,x1:x+halfW,z0:z-halfD,z1:z+halfD,y0:y,y1:y+.93});
  realFurniture(g,IDs.chair,{w:.54,h:.93,d:.57,rotation:Math.PI,name:'Rivet 曲面软包餐椅'});
  return g;
}
export function diningTable(x,z,y,diameter=1.4){
  const g=furnitureGroup(x,z,y);g.name='六人圆形餐桌';contactShadow(g,diameter+.25,diameter+.25);
  realFurniture(g,IDs.diningTable,{w:diameter,h:.795,d:diameter,name:'Stone & Beam 芒果木与金属圆餐桌'});
  for(let i=0;i<6;i++){
    const angle=i*Math.PI/3,xx=Math.sin(angle)*.45,zz=Math.cos(angle)*.45;
    const setting=new T.Group();setting.position.set(xx,.805,zz);setting.rotation.y=angle;g.add(setting);
    rounded(0,.002,0,.3,.008,.26,upholstery.warm,.005,setting);
    realFurniture(setting,IDs.placeSetting,{w:.30,h:.14,d:.32,name:'陶瓷餐盘、杯子与金属餐具'});
  }
  const vase=new T.Group();vase.position.set(0,.798,-.16);g.add(vase);
  realFurniture(vase,IDs.vase,{w:.16,h:.2,d:.16,name:'Stone & Beam 浮雕陶瓷花瓶'});
  return g;
}
export function coffeeTable(x,z,y,w=1.05,d=.7){
  const g=furnitureGroup(x,z,y);contactShadow(g,w+.25,d+.25);
  colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y0:y,y1:y+.477});
  realFurniture(g,IDs.coffeeTable,{w,h:.477,d,name:'Justin 木与金属双层茶几'});
  const cup=new T.Group();cup.position.set(.16,.483,-.11);g.add(cup);
  realFurniture(cup,IDs.cup,{w:.15,h:.085,d:.15,name:'瓷杯、杯柄与杯碟'});
  return g;
}

// Imported fixtures keep their detailed handles, burners, drains and curved surfaces.
function fixture(id,x,z,y,options){const g=furnitureGroup(x,z,y);if([IDs.toilet,IDs.kitchenSink,IDs.kitchenBase,IDs.kitchenDrawers,IDs.range,IDs.fridge,IDs.balconyTable].includes(id))contactShadow(g,options.w+.18,options.d+.18);return realFurniture(g,id,options)}

// A knitted throw follows the scanned mattress instead of floating above it.
function bedThrow(parent,product,m){
  if(!product.userData.ready)return;
  const vertices=[],uv=[],indices=[],nx=40,nz=12;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const x=(i/nx-.5)*1.92,z=.28+j/nz*.69,edge=Math.max(0,Math.abs(x)-.82);
    vertices.push(x,.025*Math.sin(x*19+j*.3)*(.3+.7*Math.pow(Math.abs(x),2))-edge*2.4,z);
    uv.push(i/nx*2,j/nz*1.5);
    if(j<nz&&i<nx){const k=j*(nx+1)+i;indices.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const clothMaterial=m.clone();clothMaterial.side=T.DoubleSide;
  const throwMesh=new T.Mesh(geometry,clothMaterial);throwMesh.name='织物床尾毯';throwMesh.castShadow=true;throwMesh.receiveShadow=true;throwMesh.userData.lateDetail=true;parent.add(throwMesh);
  materialLoads.push(product.userData.ready.then(()=>{
    parent.updateWorldMatrix(true,true);
    const from=parent.localToWorld(new T.Vector3(0,2,.6)),ray=new T.Raycaster(from,new T.Vector3(0,-1,0));
    const hit=ray.intersectObject(product,true)[0];
    if(hit){const local=parent.worldToLocal(hit.point.clone());throwMesh.position.y=local.y+.052;}else throwMesh.visible=false;
  }));
}
export function kitchen(y){
  fixture(IDs.kitchenSink,4.47,-4.44,y,{w:1.12,h:1.06,d:.78,name:'Country Kitchen 水槽、混合龙头与双门柜'});
  fixture(IDs.kitchenBase,6.03,-3.36,y,{w:.78,h:.94,d:1.24,rotation:-Math.PI/2,name:'Country Kitchen 木纹台面与双门地柜'});
  fixture(IDs.range,5.57,-4.44,y,{w:1.06,h:.94,d:.78,name:'Country Kitchen 六炉头灶与双烤箱'});
  fixture(IDs.kitchenDrawers,6.03,-2.31,y,{w:.78,h:.94,d:.86,rotation:-Math.PI/2,name:'Country Kitchen 抽屉地柜与台面'});
  fixture(IDs.fridge,4.29,-1.45,y,{w:.67,h:1.48,d:.7,name:'家用冰箱 · 门封与金属门把手'});
  fixture(IDs.kitchenUpper,4.5,-4.68,y+1.67,{w:1.13,h:.66,d:.32,name:'Country Kitchen 双门吊柜'});
  fixture(IDs.kitchenUpper,5.65,-4.71,y+2.46,{w:1.05,h:.63,d:.26,name:'Country Kitchen 双门吊柜'});
  fixture(IDs.hood,5.57,-4.54,y+1.75,{w:.9,h:.17,d:.54,name:'不锈钢抽油烟机 · 滤网与控制键'});
  fixture(IDs.espresso,6.02,-3.17,y+.95,{w:.32,h:.28,d:.45,rotation:-Math.PI/2,name:'双头意式咖啡机 · 蒸汽管与接水盘'});
  fixture(IDs.riceCooker,6.02,-2.27,y+.95,{w:.28,h:.26,d:.37,rotation:-Math.PI/2,name:'电饭煲 · 显示屏与开盖按键'});
  colliders.push({x0:3.91,x1:6.1,z0:-4.83,z1:-4.04,y0:y,y1:y+1.1},{x0:5.63,x1:6.43,z0:-3.98,z1:-1.88,y0:y,y1:y+1},{x0:3.95,x1:4.63,z0:-1.8,z1:-1.1,y0:y,y1:y+1.5});
}
export function bathFixtures(x,z,y,side){
  const basinX=x+side*.43,toiletX=x-side*.72;
  fixture(IDs.toilet,toiletX,z-.24,y,{w:.46,h:.75,d:.69,name:'陶瓷坐便器 · 水箱、冲水柄与曲面座圈'});
  fixture(IDs.vanity,basinX,z-.49,y+.17,{w:.62,h:.56,d:.45,name:'AmazonBasics 白橡木双门浴室柜'});
  fixture(IDs.basin,basinX,z-.46,y+.7,{w:.63,h:.32,d:.47,name:'陶瓷洗手盆 · 排水口与金属混合龙头'});
  fixture(IDs.mirror,basinX,z-.72,y+1.26,{w:.72,h:.65,d:.035,name:'Rivet 胡桃木框浴室镜'});
  colliders.push({x0:toiletX-.23,x1:toiletX+.23,z0:z-.59,z1:z+.105,y0:y,y1:y+.76},{x0:basinX-.32,x1:basinX+.32,z0:z-.72,z1:z-.23,y0:y,y1:y+1.04});
}
export function ceilingFixture(x,z,y,r=.32){
  fixture(IDs.ceiling,x,z,y+3.12,{w:r*2,h:.2,d:r*2,name:'Ravenna 织物灯罩与金属吸顶灯'});
}
export function balconyTable(x,z,y){
  colliders.push({x0:x-.31,x1:x+.31,z0:z-.31,z1:z+.31,y0:y,y1:y+.57});
  fixture(IDs.balconyTable,x,z,y,{w:.62,h:.57,d:.62,name:'Rivet Molly 大理石与不锈钢双层圆桌'});
}
