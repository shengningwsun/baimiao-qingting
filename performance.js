import * as T from './vendor/three.module.js';
import {occlusionWalls} from './world.js';

// Three's finite-range point lights contribute exactly zero outside their
// radius. Avoid evaluating the full PBR BRDF there; keep all twelve lights.
export function optimizeLighting(scene){
  const rooms=[];scene.traverse(o=>{if(o.isPointLight)rooms.push(o.userData.roomBounds||{min:[-100,-100,-100],max:[100,100,100]});});
  const roomMin=rooms.map(r=>new T.Vector3(...r.min)),roomMax=rooms.map(r=>new T.Vector3(...r.max));
  const original=T.ShaderChunk.lights_fragment_begin;
  const fast=original.replace(
    'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
    'if ( directLight.visible && all(greaterThanEqual(tourWorldPosition,tourRoomMin[ i ])) && all(lessThanEqual(tourWorldPosition,tourRoomMax[ i ])) ) { RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); }'
  );
  const materials=new Set();
  scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.isMeshStandardMaterial)materials.add(m);});
  const originals=new Map([...materials].map(m=>[m,{compile:m.onBeforeCompile,key:m.customProgramCacheKey}]));
  let enabled=true;
  for(const m of materials){
    const previous=originals.get(m);
    m.onBeforeCompile=function(shader,renderer){
      previous.compile.call(this,shader,renderer);
      if(enabled){
        shader.uniforms.tourRoomMin={value:roomMin};shader.uniforms.tourRoomMax={value:roomMax};
        shader.vertexShader='varying vec3 tourWorldPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ntourWorldPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
        shader.fragmentShader=`varying vec3 tourWorldPosition;uniform vec3 tourRoomMin[${rooms.length}];uniform vec3 tourRoomMax[${rooms.length}];\n`+shader.fragmentShader.replace('#include <lights_fragment_begin>',fast);
      }
    };
    m.customProgramCacheKey=()=>previous.key.call(m)+'|house-room-range-v2-'+rooms.length+'-'+enabled;
    m.needsUpdate=true;
  }
  return {setEnabled(value){enabled=value;for(const m of materials)m.needsUpdate=true;}};
}

// A static house needs no object-matrix updates between camera movements.
export function freezeStaticScene(scene){
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{if(!o.isLight&&!o.isCamera){o.matrixAutoUpdate=false;}});
  scene.matrixWorldAutoUpdate=false;
}

// Only discard a whole furniture bounding box if all eight corners project
// inside ONE opaque wall face. Window/door holes are separate wall segments.
// This is conservative: partial visibility always keeps the original model.
export function hiddenByWall(camera,box,wall){
  const axis=wall.axis,other=axis===0?2:0,margin=.015;
  const p=Array.isArray(camera)?camera:[camera.x,camera.y,camera.z];let face;
  if(p[axis]<wall.min[axis]-margin){
    if(box.min[axis]<wall.max[axis]+margin)return false;
    face=wall.min[axis];
  }else if(p[axis]>wall.max[axis]+margin){
    if(box.max[axis]>wall.min[axis]-margin)return false;
    face=wall.max[axis];
  }else return false;
  const a=axis===1?0:1,b=axis===1?2:other;
  for(const v of box.corners){
    const t=(face-p[axis])/(v[axis]-p[axis]);
    const atA=p[a]+(v[a]-p[a])*t,atB=p[b]+(v[b]-p[b])*t;
    if(atA<wall.min[a]+margin||atA>wall.max[a]-margin||atB<wall.min[b]+margin||atB>wall.max[b]-margin)return false;
  }
  return true;
}

export function createWallCulling(scene){
  const targets=[];
  scene.traverse(o=>{
    if(!o.userData.product)return;
    const box=new T.Box3().setFromObject(o);
    if(!box.isEmpty()){
      const min=box.min.toArray(),max=box.max.toArray(),corners=[];
      for(let i=0;i<8;i++)corners.push([i&1?max[0]:min[0],i&2?max[1]:min[1],i&4?max[2]:min[2]]);
      targets.push({object:o,bounds:box.clone().expandByScalar(.025),box:{min,max,corners}});
    }
  });
  const frustum=new T.Frustum(),projection=new T.Matrix4();
  const stats={total:targets.length,hidden:0,offscreen:0,enabled:true};
  function restore(){for(const t of targets)t.object.visible=true;stats.hidden=stats.offscreen=0;}
  return {stats,restore,prepare(camera,shadowRefresh=false){
    // Cached sunlight must include all casters, even those behind a wall.
    if(shadowRefresh||!stats.enabled){restore();return;}
    stats.hidden=stats.offscreen=0;camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const eye=camera.position.toArray();
    for(const t of targets){
      const offscreen=!frustum.intersectsBox(t.bounds);
      const hidden=offscreen||occlusionWalls.some(w=>hiddenByWall(eye,t.box,w));
      t.object.visible=!hidden;if(hidden)stats.hidden++;
      if(offscreen)stats.offscreen++;
    }
  }};
}

// Upload every original-resolution texture and compile all material variants
// before the visitor moves indoors. Yield between uploads for touch/UI events.
export async function warmResources(renderer,scene,camera){
  const textures=new Set();
  scene.traverse(o=>{
    if(!o.material)return;
    for(const m of Array.isArray(o.material)?o.material:[o.material])
      for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  });
  for(const texture of textures){renderer.initTexture(texture);await new Promise(r=>setTimeout(r,0));}
  if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
  else renderer.compile(scene,camera);
}
