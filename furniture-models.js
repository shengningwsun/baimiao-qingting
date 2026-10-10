import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {assetPath,materialLoads,lamps} from './world.js';

// Real product meshes from Amazon Berkeley Objects, CC BY 4.0.
// Each self-contained GLB is decoded locally, including in the offline HTML.
const loader=new GLTFLoader(),cache=new Map();
let activeLoads=0;const loadQueue=[];
function pumpLoads(){
  while(activeLoads<2&&loadQueue.length){
    const {job,resolve,reject}=loadQueue.shift();activeLoads++;
    // Native fetch decodes data URLs without a huge synchronous atob/JS loop.
    setTimeout(()=>job().then(resolve,reject).finally(()=>{activeLoads--;pumpLoads();}),0);
  }
}
function queueLoad(job){return new Promise((resolve,reject)=>{loadQueue.push({job,resolve,reject});pumpLoads();});}
export const furnitureStatus={expected:0,loaded:0,failed:[],assets:[],instances:[]};
export const furnitureIds={sofa:'B075X4QMX3',bed:'B07B4ZM56C',nightstand:'B07QD6TXWS',wardrobe:'B07JGMW8DG',diningTable:'B07HSBJDQP',chair:'B07QBQCG77',coffeeTable:'B07DBFFFYZ',media:'B07HSG5DGP',bookcase:'B07B7J2VCD',lamp:'B07MBFDHMH',vase:'B075HR4ZDB',vanity:'B07S6XKT5X',mirror:'B07B4W5R8N',ceiling:'B07DBHC39X',balconyTable:'B072ZMSBQT',toilet:'bath-toilet',basin:'bath-basin',kitchenSink:'blendswap-cc-by-kitchenSink',kitchenBase:'blendswap-cc-by-kitchenLowerCabinet',kitchenDrawers:'blendswap-cc-by-kitchenDrawersCabinet',kitchenUpper:'blendswap-cc-by-kitchenUpperCabinet',range:'blendswap-cc-by-largeStove',fridge:'contributions-frigo',hood:'scopia-kitchenHood',espresso:'scopia-coffee_machine',riceCooker:'scopia-cooker',cup:'scopia-cup',placeSetting:'katorlegaz-plate-and-ustensils'};
function getModel(id){
  if(!cache.has(id)){
    const promise=queueLoad(async()=>{
      const url=assetPath(id+'.glb');
      const response=await fetch(url);if(!response.ok)throw Error(id+': '+response.status);
      const buffer=await response.arrayBuffer();
      const gltf=await new Promise((resolve,reject)=>loader.parse(buffer,'',resolve,reject));
      const source=gltf.scene;
      source.traverse(o=>{
        if(o.isLight||o.isCamera)o.removeFromParent();
        if(!o.isMesh)return;
        o.castShadow=true;o.receiveShadow=true;o.userData.realFurniture=true;
        const materials=Array.isArray(o.material)?o.material:[o.material];
        for(const m of materials){
          for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(m[key])m[key].anisotropy=16;
          if((id===furnitureIds.lamp||id===furnitureIds.ceiling)&&m.emissiveMap){m.emissive.set(0x655740);m.emissiveIntensity=.5;lamps.push(m);}
        }
      });
      furnitureStatus.assets.push(id);return source;
    });
    cache.set(id,promise);
  }
  return cache.get(id);
}
export function realFurniture(parent,id,{w,h,d,rotation=0,name='家具'}={}){
  const holder=new T.Group();holder.name=name;holder.userData.product=id;parent.add(holder);
  // Node-only navigation checks retain the same collision footprints.
  if(typeof Image==='undefined')return holder;
  furnitureStatus.expected++;
  const ready=getModel(id).then(source=>{
    const model=source.clone(true),orient=new T.Group();orient.rotation.y=rotation;orient.add(model);
    const bounds=new T.Box3().setFromObject(orient),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
    const scale=new T.Vector3(w? w/size.x:1,h? h/size.y:1,d? d/size.z:1);
    // Scale outside the orientation transform, so a 90-degree turn does not
    // exchange the requested width/depth or move models with an offset origin.
    const normalized=new T.Group();normalized.scale.copy(scale);
    orient.position.set(-center.x,-bounds.min.y,-center.z);normalized.add(orient);
    holder.add(normalized);furnitureStatus.loaded++;
    holder.updateWorldMatrix(true,true);
    const world=new T.Box3().setFromObject(holder);
    furnitureStatus.instances.push({id,name,min:world.min.toArray(),max:world.max.toArray()});
  }).catch(error=>{console.error('家具加载失败',id,error);furnitureStatus.failed.push({id,message:String(error)});});
  holder.userData.ready=ready;
  materialLoads.push(ready);return holder;
}
