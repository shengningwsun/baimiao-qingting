import * as T from './vendor/three.module.js';
import {house,scene,mat,box,cylinder,sphere,bar,wall as structuralWall,material,materialLoads,lamps,colliders,rand,assetPath} from './world.js';
import {upholstery,rounded,sofa,bed as furnishedBed,wardrobe,curtains,diningChair,diningTable,coffeeTable,kitchen,bathFixtures,mediaCabinet,bookcase,ceilingFixture,balconyTable} from './furniture.js';
import {finishRooms} from './interior-details.js';
const oak=mat.wood,linen=upholstery.ivory,sage=upholstery.sage,clay=upholstery.clay,cream=mat.white;
let pictureTexture=null;
if(typeof Image!=='undefined'){
  let finish;materialLoads.push(new Promise(resolve=>finish=resolve));
  pictureTexture=new T.TextureLoader().load(assetPath('orchard-art.png'),finish,undefined,finish);
  pictureTexture.colorSpace=T.SRGBColorSpace;
}
const D=(t,w=1.05,h=2.45)=>({t,w,b:0,h,type:'door'});
// Finish both faces, stopping the skirting at door jambs to keep openings clear.
function wall(axis,x,z,length,base,height,openings=[]){
  structuralWall(axis,x,z,length,base,height,openings,.2,mat.interiorWall);
  const strip=(center,width,y,h,depth,m)=>axis==='x'?box(x+center,y,z,width,h,depth,m):box(x,y,z+center,depth,h,width,m);
  let at=-length/2;
  for(const opening of [...openings].sort((a,b)=>a.t-b.t)){
    const left=opening.t-opening.w/2-.07;
    if(left>at)strip((at+left)/2,left-at,base+.065,.11,.238,mat.skirting);
    at=opening.t+opening.w/2+.07;
  }
  if(at<length/2)strip((at+length/2)/2,length/2-at,base+.065,.11,.238,mat.skirting);
  strip(0,length,base+height-.035,.065,.235,mat.trim);
}
function ceilingLight(x,z,y,r=.32){ceilingFixture(x,z,y,r)}
function rug(x,z,w,d,y,color){
  rounded(x,y+.026,z,w,.025,d,upholstery.warm,.02);
  const border=material(0xb7aa91,.98);
  for(const side of [-1,1]){
    box(x,y+.043,z+side*(d/2-.075),w-.08,.006,.018,border);
    for(let i=0;i<24;i++)box(x-w/2+.05+i*(w-.1)/23,y+.025,z+side*(d/2+.065),.005,.005,.12,linen);
  }
}
function table(x,z,y,w=1.3,d=.6,h=.46){box(x,y+h,z,w,.065,d,oak);for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.12),y+h/2,z+b*(d/2-.12),.045,h,.045,mat.metal)}
function picture(x,z,y,w=1,axis='x'){
  const group=new T.Group();group.position.set(x,y,z);
  if(axis==='z')group.rotation.y=Math.PI/2;
  if(axis==='z-')group.rotation.y=-Math.PI/2;
  house.add(group);
  const h=w*.66;
  box(0,0,0,w,h,.05,oak,group);
  box(0,0,.029,w-.07,h-.07,.012,material(0xf2ede2,.92),group);
  const art=new T.Mesh(new T.PlaneGeometry(w-.15,h-.15),new T.MeshStandardMaterial({map:pictureTexture,color:0xffffff,roughness:.88}));
  art.position.z=.038;art.castShadow=false;group.add(art);
}
function bedroom(x,z,w,d,y,color,index){
  const bedZ=z>0?z+.55:z-.65;
  colliders.push({x0:x-1.07,x1:x+.87,z0:bedZ-1.13,z1:bedZ+1.13,y0:y,y1:y+.8});
  rug(x,z+.25,2.4,2.7,y,0xd8d0bc);
  furnishedBed(x-.1,bedZ,y,color===linen?upholstery.olive:color,z>0?Math.PI:0);
  wardrobe(x<0&&z>0?x-w/2+.46:x+w/2-.46,z-d/2+.55,y,x<0&&z>0?Math.PI/2:-Math.PI/2);
  picture(x+(x<0?w/2-.17:-w/2+.17),z+(z>0?-.45:.75),y+1.95,1.1,x<0?'z-':'z');
  // Curtain pairs follow the sole front/rear window of each bedroom.
  const windowTop=z>0?(y>3?2.9:3.2):(y>3?(x<0?2.65:2.7):2.9);
  curtains(x,z>0?4.79:-4.79,y,z<0&&x>0&&x<2.8?1.2:1.8,z>0?Math.PI:0,windowTop+.035);

  ceilingLight(x,z,y);
}
function bathroom(x,z,y,side){
  bathFixtures(x,z,y,side);
  ceilingLight(x,z,y,.22);
}
export function buildInteriors(){
for(let f=0;f<2;f++){const y=.45+f*3.6;
wall('x',-4.55,-.8,3.9,y,3.36,[D(1.15)]);wall('x',4.55,-.8,3.9,y,3.36,f?[D(-1.15)]:[]);
wall('x',-4.55,1,3.9,y,3.36,[D(1.15)]);wall('x',4.55,1,3.9,y,3.36,[D(-1.15)]);
wall('z',-2.6,3,4,y,3.36);wall('z',2.6,3,4,y,3.36);
wall('z',-4.1,.1,1.8,y,3.36,[D(0,.86,2.2)]);wall('z',4.1,.1,1.8,y,3.36,[D(0,.86,2.2)]);
wall('z',-2.6,-2.9,4.2,y,3.36);wall('z',0,-2.9,4.2,y,3.36);
wall('x',-1.3,-.8,2.6,y,3.36,[D(f?.65:-.65,1,2.65)]);
if(f){wall('z',2.8,-2.9,4.2,y,3.36);wall('x',1.4,-.8,2.8,y,3.36,[D(.55)]);bedroom(1.4,-2.9,2.8,4.2,y,clay,4);bedroom(4.65,-2.9,3.7,4.2,y,sage,5)}
else{wall('z',3.7,-2.9,4.2,y,3.36,[D(.95,1.05)]);wall('x',1.85,-.8,3.7,y,3.36,[D(0,1.95,2.85)]);}
bedroom(-4.55,-2.9,3.9,4.2,y,sage,0);bedroom(-4.55,3,3.9,4,y,linen,1);bedroom(4.55,3,3.9,4,y,f?clay:sage,2);
bathroom(-5.3,.1,y,1);bathroom(5.3,.1,y,-1);
// Skirting and cove detail to give the rooms a finished edge.
for(const z of [-4.88,4.87]){box(-4.55,y+.07,z,3.65,.12,.035,mat.skirting);box(4.55,y+.07,z,3.65,.12,.035,mat.skirting)}
}
// Two flights, landing and handrails. The upper floor opening stays unobstructed.
for(let i=0;i<10;i++){const h=(i+1)*.18;box(-1.97,.45+h/2,-1.0-i*.31,1.05,h,.31,oak);box(-.63,2.25+h/2,-3.79+i*.31,1.06,h,.31,oak);box(-1.97,.45+h-.014,-.848-i*.31,1.05,.025,.035,mat.trim);box(-.63,2.25+h-.014,-3.942+i*.31,1.06,.025,.035,mat.trim)}
const stairLanding=box(-1.3,2.15,-4.4125,2.4,.2,.935,oak);stairLanding.name='楼梯转角平台';
box(-.63,4.025,-.8225,1.06,.05,.045,oak);
box(-1.3,1.28,-2.37,.06,1.7,3.15,mat.wall);
for(let i=0;i<10;i++){const z=-1-i*.31;bar([-2.45,.45+(i+1)*.18,z],[-2.45,1.38+(i+1)*.18,z],.017,mat.metal);const z2=-3.79+i*.31;bar([-.1,2.25+(i+1)*.18,z2],[-.1,3.18+(i+1)*.18,z2],.017,mat.metal)}bar([-2.45,1.56,-1],[-2.45,3.18,-3.79],.033,oak);bar([-.1,3.36,-3.79],[-.1,4.98,-1],.033,oak);bar([-2.45,3.2,-4.77],[-.1,3.2,-4.77],.032,oak);
colliders.push({x0:-1.42,x1:-1.18,z0:-3.9,z1:-.88,y0:.45,y1:5.1});
// Living room arranged to keep the entry and through-route clear.
const y=.45;
rug(-.7,2.03,2.95,2.4,y,0xc5baa1);
sofa(-2.07,2,y,2.35,sage);
picture(-2.46,2.05,y+1.87,1.4,'z');
coffeeTable(-.8,2.15,y,1,.72);
mediaCabinet(2.3,2,y);
rounded(2.38,y+1.38,2,.055,.88,1.5,mat.metal,.015);
box(2.341,y+1.38,2,.01,.78,1.4,material(0x172026,.13));
ceilingLight(0,1.65,y,.52);
// Dining, pendant and six chairs.
colliders.push({x0:1.125,x1:2.275,z0:-4.05,z1:-1.95,y0:y,y1:y+.85});
diningTable(1.7,-3,y,1.15,2.1);
for(const xx of [.68,2.72])for(const zz of [-3.65,-3,-2.35])diningChair(xx,zz,y,xx<1.7?-Math.PI/2:Math.PI/2);

picture(.12,-3.7,2.13,1.35,'z');ceilingLight(1.7,-2.6,y,.3);
// L-shaped kitchen and small appliances.
kitchen(y);ceilingLight(5.15,-2.6,y);
// Upstairs family lounge, books and balcony chairs.
const u=4.05;
rug(.5,2,3.1,2.3,u,0xd4cbbb);
sofa(1.97,1.95,u,2.05,clay,Math.PI);
coffeeTable(.6,2,u,1.1,.7);
bookcase(-2.31,2.65,u);
ceilingLight(0,1.9,u,.45);
for(const x of [-1.65,1.65])diningChair(x,4.75,u,0);
balconyTable(0,4.85,u);
// Interior illumination remains gentle in daylight, warm after sunset.
for(const level of [.45,4.05]){
  const upper=level>3;
  const rooms=[[-2.5,2.5,-.7,3.7],[-6.4,-2.7,-4.9,-.9],[-6.4,-2.7,1.1,4.9],[2.7,6.4,1.1,4.9],[.1,upper?2.7:3.6,-4.9,-.9],[upper?2.9:3.8,6.4,-4.9,-.9],[-6.4,-4.2,-.7,.9],[4.2,6.4,-.7,.9]];
  for(const [x0,x1,z0,z1] of rooms){const l=new T.PointLight(0xffe5c3,4.5,6,2);l.position.set((x0+x1)/2,level+2.95,(z0+z1)/2);l.userData.roomBounds={min:[x0-.12,level-.05,z0-.12],max:[x1+.12,level+3.4,z1+.12]};scene.add(l);lamps.push(l);}
}
finishRooms();
}
buildInteriors();
