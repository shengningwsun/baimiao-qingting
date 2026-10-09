import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Batch the exact same material, including individual painted/stucco wall faces.
// Distinct normal/roughness maps and custom shaders must never be conflated.
export function optimizeScene(scene){
  scene.updateMatrixWorld(true);
  const groups=new Map(),original=[];
  function add(geometry,material,object){
    const key=[material.uuid,object.castShadow,object.receiveShadow].join('|');
    if(!groups.has(key))groups.set(key,{material,geometries:[],shadow:object.castShadow,receive:object.receiveShadow});
    if(material.userData.worldTiling){
      const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,s=material.userData.worldTiling;
      for(let i=0;i<p.count;i++){
        const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
        if(ay>ax&&ay>az)uv.setXY(i,p.getX(i)*s,p.getZ(i)*s);
        else if(ax>az)uv.setXY(i,p.getZ(i)*s,p.getY(i)*s);
        else uv.setXY(i,p.getX(i)*s,p.getY(i)*s);
      }uv.needsUpdate=true;
    }
    groups.get(key).geometries.push(geometry);
  }
  scene.traverse(o=>{
    if(!o.isMesh||o.userData.realFurniture||o.isInstancedMesh||o.userData.lateDetail)return;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    if(materials.some(m=>m.isShaderMaterial||(m.transparent&&!o.userData.staticContact)))return;
    const transformed=o.geometry.clone();transformed.applyMatrix4(o.matrixWorld);
    const geometry=transformed.index?transformed.toNonIndexed():transformed;
    if(geometry!==transformed)transformed.dispose();
    if(materials.length===1)add(geometry,materials[0],o);
    else{
      for(const group of geometry.groups){
        const face=new T.BufferGeometry();
        for(const [name,attr] of Object.entries(geometry.attributes))face.setAttribute(name,new T.BufferAttribute(attr.array.slice(group.start*attr.itemSize,(group.start+group.count)*attr.itemSize),attr.itemSize,attr.normalized));
        add(face,materials[group.materialIndex],o);
      }geometry.dispose();
    }
    original.push(o);
  });
  for(const o of original)o.removeFromParent();
  for(const item of groups.values()){
    const geometry=mergeGeometries(item.geometries,false);
    if(!geometry)throw Error('Unable to batch static house geometry');
    const mesh=new T.Mesh(geometry,item.material);mesh.castShadow=item.shadow;mesh.receiveShadow=item.receive;scene.add(mesh);
    item.geometries.forEach(g=>g.dispose());
  }
}
