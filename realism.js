import * as T from './vendor/three.module.js';
import {mat,house,assetPath,materialLoads} from './world.js';

// Two shared 1K photographed maps add fine fibres, without replacing the
// product scans' original colour, large folds, stitching or packed PBR maps.
// Rough Linen — colormass (photography), Rico Cilliers (processing), CC0.
let linenMaps=null;
export const realismStatus={photographedWeave:true,sharedTextureFiles:2,textureBytes:0,decodedTextureBytesWithMipmaps:0,fabricMaterials:0,productMaterials:0,independentFixtures:0,paintedWalls:true,greyTileFloors:true};
function weaveTextures(){
  if(linenMaps||typeof Image==='undefined')return linenMaps;
  const loader=new T.TextureLoader();
  const load=file=>{
    let settled;materialLoads.push(new Promise(resolve=>settled=resolve));
    const texture=loader.load(assetPath(file),loaded=>{
      realismStatus.decodedTextureBytesWithMipmaps+=Math.ceil(loaded.image.width*loaded.image.height*4*4/3);settled();
    },undefined,error=>{console.warn('细织物纹理未能载入，继续使用原始高清材质',file,error);settled();});
    texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=16;
    return texture;
  };
  linenMaps={normal:load('realism-linen-nor_gl.jpg'),roughness:load('realism-linen-rough.jpg')};
  realismStatus.textureBytes=2000568;
  return linenMaps;
}
function microWeave(material){
  const maps=weaveTextures();if(!maps||!material.normalMap||material.userData.realismWeave)return;
  material.userData.realismWeave=true;realismStatus.fabricMaterials++;
  // Expose shared maps to the existing warmResources texture uploader.
  material.realismWeaveNormal=maps.normal;material.realismWeaveRoughness=maps.roughness;
  const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.uniforms.realismLinenNormal={value:maps.normal};
    shader.uniforms.realismLinenRoughness={value:maps.roughness};
    shader.fragmentShader='uniform sampler2D realismLinenNormal;\nuniform sampler2D realismLinenRoughness;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      #if defined(USE_NORMALMAP_TANGENTSPACE)
        // PBR atlas roughness and metalness keep fibres off chrome legs and
        // polished hardware; normal-map mips retain stable distant detail.
        float fibreMask=(1.0-smoothstep(0.10,0.35,metalnessFactor))*smoothstep(0.40,0.72,roughnessFactor);
        vec3 fibreNormal=texture2D(realismLinenNormal,vNormalMapUv*8.0).xyz*2.0-1.0;
        normal=normalize(normal+tbn*vec3(fibreNormal.xy*0.17*fibreMask,0.0));
        float fibreRough=texture2D(realismLinenRoughness,vNormalMapUv*8.0).r;
        roughnessFactor=mix(roughnessFactor,clamp(roughnessFactor+0.045+(fibreRough-0.5)*0.10,0.58,0.98),fibreMask);
      #endif`);
  };
  material.customProgramCacheKey=()=>previousKey.call(material)+'|photographed-linen-micro-v1';
  material.needsUpdate=true;
}

export function tuneFurnitureMaterial(material,id){
  if(!material.isMeshStandardMaterial||material.userData.productRealism)return;
  material.userData.productRealism=id;realismStatus.productMaterials++;
  // The original metalness atlas remains authoritative. Reducing it globally
  // would turn the scanned steel fittings into plastic.
  if(['B075X4QMX3','B07B4ZM56C','B07QBQCG77'].includes(id))microWeave(material);
  if(['B07QD6TXWS','B07JGMW8DG','B07DBFFFYZ','B07HSG5DGP','B07B7J2VCD','B07HSBJDQP'].includes(id)){
    material.envMapIntensity=.82; // Satin finished timber, rather than wet varnish.
    material.roughness=Math.max(.87,material.roughness);
  }
  if(id==='bath-toilet'||id==='bath-basin'){
    // Glazed porcelain has dielectric reflections, while its photographed
    // normal and AO detail are kept at the original resolution.
    if(material.map){material.metalness=0;material.roughness=.28;material.envMapIntensity=1.02;}
  }
  if(id==='blendswap-cc-by-kitchenSink'||id==='scopia-kitchenHood'){
    // Materials without a metalness map in these converted models need an
    // explicit satin stainless-steel response, rather than uniformly glossy.
    if(!material.map&&material.color.getHSL({}).s<.14){material.metalness=.78;material.roughness=.30;}
  }
}

let architectureApplied=false;
export function applyArchitecturalRealism(){
  if(architectureApplied)return realismStatus;
  architectureApplied=true;
  // Dielectric glazing avoids the old opaque metallic-blue reflection. Alpha
  // glazing keeps mobile rendering to one pass (no transmission render target).
  mat.glass.color.set(0xe0ebed);mat.glass.metalness=0;mat.glass.roughness=.085;
  mat.glass.opacity=.24;mat.glass.envMapIntensity=1.15;mat.glass.needsUpdate=true;
  mat.interiorWall.roughness=.84;mat.interiorWall.normalScale.set(.025,.025);
  mat.skirting.roughness=.46;mat.trim.roughness=.65;
  // Original procedural furnishings use shared photograph-based Terlenka
  // cloth already. A softer normal avoids the overscaled embossed appearance.
  const seen=new Set();house.traverse(o=>{
    if(!o.material||o.userData.realFurniture)return;
    for(const material of Array.isArray(o.material)?o.material:[o.material]){
      if(seen.has(material))continue;seen.add(material);
      if(material.map&&material.normalMap&&material.roughness===1&&material.normalScale?.x===.35){material.normalScale.set(.22,.22);material.roughness=.96;}
    }
  });
  return realismStatus;
}

// Register both image promises before app.js snapshots materialLoads. Models
// decode asynchronously, and starting these in tuneFurnitureMaterial would
// register them too late for the initial GPU warm-up barrier.
weaveTextures();
