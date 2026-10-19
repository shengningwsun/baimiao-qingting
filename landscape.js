import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// This terrain and its height query share exactly the same continuous surface.
// The house apron remains flat and 15 mm below the existing paving finish.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const hill=(x,z,cx,cz,rx,rz,h)=>h*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
export function landscapeHeightAt(x,z){
  const dx=Math.max(-12.4-x,0,x-14.2),dz=Math.max(-11-z,0,z-17),d=Math.hypot(dx,dz);
  const rough=.48+.34*Math.sin(x*.105+z*.072)+.28*Math.cos(z*.15-x*.081);
  return .085+smooth(0,13,d)*(rough+
    hill(x,z,-36,-43,24,27,10)+hill(x,z,39,-38,25,23,13)+
    hill(x,z,-78,-82,36,39,35)+hill(x,z,70,-92,39,33,38)+
    hill(x,z,-85,38,34,40,21)+hill(x,z,91,44,39,35,25)+
    hill(x,z,-15,103,43,33,20));
}
export function landscapeContains(x,z){return (x/34)**2+((z-2)/36)**2<=1;}
export {landscapeHeightAt as heightAt,landscapeContains as contains};
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const asset=name=>globalThis.__assetUrls?.[name]||'./assets/'+name;

function terrainGeometry(){
  // Dense close to the visitor; broad, shared vertices on distant ridgelines.
  const grid=[];for(let n=-130;n<-40;n+=5)grid.push(n);for(let n=-40;n<=40;n++)grid.push(n);for(let n=45;n<=130;n+=5)grid.push(n);
  const positions=[],uv=[],colors=[],indices=[],color=new T.Color(),size=grid.length;
  for(const z of grid)for(const x of grid){
    const y=landscapeHeightAt(x,z),variation=.045*Math.sin(x*.24+z*.18)+.025*Math.sin(x*.8-z*.63);
    positions.push(x,y,z);uv.push(x/3,z/3);
    color.setRGB(.89+variation,1+variation,.82+variation);colors.push(color.r,color.g,color.b);
  }
  for(let z=0;z<size-1;z++)for(let x=0;x<size-1;x++){const a=z*size+x,b=a+1,c=a+size,d=c+1;indices.push(a,c,b,b,c,d);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();return geo;
}

function buildTreeGeometry(detailed){
  const rng=random(341),branches=[],leafPositions=[],leafUV=[],leafColors=[];
  const up=new T.Vector3(0,1,0),dummy=new T.Object3D(),color=new T.Color();
  function branch(a,b,r0,r1){
    const geo=new T.CylinderGeometry(r1,r0,a.distanceTo(b),detailed?8:5,1,true),matrix=new T.Matrix4();
    dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());dummy.scale.set(1,1,1);dummy.updateMatrix();matrix.copy(dummy.matrix);geo.applyMatrix4(matrix);
    const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*a.distanceTo(b)/1.6);branches.push(geo);
  }
  // Each card is an actual photographed pine twig, not an opaque canopy blob.
  // UVs isolate the first needle sprig from the source atlas's cones and twigs.
  function sprig(at,width,height,rotation,lean){
    dummy.position.copy(at);dummy.rotation.set(lean,rotation,(rng()-.5)*1.2);dummy.scale.set(width,height,1);dummy.updateMatrix();
    const points=[[-.5,0,0],[.5,0,0],[.5,1,0],[-.5,0,0],[.5,1,0],[-.5,1,0]],uvs=[[.07,.60],[.20,.60],[.20,.97],[.07,.60],[.20,.97],[.07,.97]];
    const shade=.92+rng()*.20;color.setRGB(shade*.95,shade,shade*.89);
    for(let i=0;i<6;i++){const p=new T.Vector3(...points[i]).applyMatrix4(dummy.matrix);leafPositions.push(p.x,p.y,p.z);leafUV.push(...uvs[i]);leafColors.push(color.r,color.g,color.b);}
  }
  for(let i=0;i<7;i++)branch(new T.Vector3(.045*Math.sin(i),i*1.45,0),new T.Vector3(.045*Math.sin(i+1),(i+1)*1.45,0),.19*(1-i/7)+.018,.19*(1-(i+1)/7)+.018);
  const layers=detailed?9:7,arms=detailed?7:5;
  for(let layer=0;layer<layers;layer++){
    const t=layer/(layers-1),y=2.5+t*6.8,radius=2.55*(1-t*.82),spin=layer*1.86;
    for(let arm=0;arm<arms;arm++){
      const a=spin+arm*Math.PI*2/arms+(rng()-.5)*.3,length=radius*(.78+rng()*.36),root=new T.Vector3(0,y+(rng()-.5)*.35,0),tip=new T.Vector3(Math.cos(a)*length,y+.17+t*.35,Math.sin(a)*length);
      branch(root,tip,.065*(1-t*.65),.009);
      const sprigs=detailed?8:6;
      for(let j=0;j<sprigs;j++){
        const q=.29+.71*j/(sprigs-1),side=j%2?1:-1,at=root.clone().lerp(tip,q),out=.2+(.45*(1-q));
        at.x+=Math.cos(a+side*1.2)*out;at.z+=Math.sin(a+side*1.2)*out;at.y-=.12+rng()*.10;
        if(detailed&&j%2===0)branch(root.clone().lerp(tip,q),at,.015,.004);
        sprig(at,(.40+rng()*.24)*(detailed?1:1.45),(.78+rng()*.35)*(detailed?1:1.4),a+side*1.1,(rng()-.5)*1.2);
        if(detailed&&j%3===0)sprig(at.clone().add(new T.Vector3(0,.16,0)),.46,.80,a+Math.PI*.6,(rng()-.5)*1.1);
      }
    }
  }
  for(let j=0;j<5;j++)sprig(new T.Vector3(0,9.4,0),.4,.85,j*1.26,.15);
  const trunk=mergeGeometries(branches,false);branches.forEach(g=>g.dispose());
  const foliage=new T.BufferGeometry();foliage.setAttribute('position',new T.Float32BufferAttribute(leafPositions,3));foliage.setAttribute('uv',new T.Float32BufferAttribute(leafUV,2));foliage.setAttribute('color',new T.Float32BufferAttribute(leafColors,3));foliage.computeVertexNormals();
  trunk.computeBoundingSphere();foliage.computeBoundingSphere();return {trunk,foliage};
}

function instances(geometry,material,items,name){
  const mesh=new T.InstancedMesh(geometry,material,items.length),dummy=new T.Object3D(),color=new T.Color();mesh.name=name;mesh.userData.landscape=true;mesh.userData.dynamicRoot=true;mesh.userData.lateDetail=true;
  for(let i=0;i<items.length;i++){const p=items[i];dummy.position.set(p.x,landscapeHeightAt(p.x,p.z),p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.scale*p.width,p.scale,p.scale*p.width);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.setRGB(p.tint*.95,p.tint,p.tint*.91);mesh.setColorAt(i,color);}
  mesh.instanceMatrix.setUsage(T.StaticDrawUsage);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

function grassGeometry(){
  const points=[],normals=[],uvs=[],rng=random(843);
  for(let i=0;i<6;i++){const angle=i*Math.PI/3,r=.025+rng()*.04,w=.005+rng()*.007,h=.09+rng()*.14,x=Math.sin(angle)*r,z=Math.cos(angle)*r;points.push(x-w,0,z,x+w,0,z,x+.03*Math.sin(angle),h,z+.03*Math.cos(angle));normals.push(0,1,0,0,1,0,0,1,0);uvs.push(0,0,1,0,.5,1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingSphere();return g;
}

export function createLandscape(){
  const group=new T.Group();group.name='白庙山林 · 分区景观';group.userData.dynamicRoot=true;group.userData.landscape=true;
  const loads=[],loader=typeof document!=='undefined'&&typeof Image!=='undefined'?new T.TextureLoader():null;
  function texture(file){
    if(!loader)return null;
    const pending=new Promise(resolve=>{const t=loader.load(asset(file),()=>resolve(t),undefined,()=>resolve(null));});loads.push(pending);
    return pending;
  }
  // Load once and share each decoded texture among every visible tree sector.
  const groundMat=new T.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true,normalScale:new T.Vector2(.5,.5),envMapIntensity:.1});
  const barkMat=new T.MeshStandardMaterial({color:0xb8b1a4,roughness:.96,envMapIntensity:.05});
  const needleMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.88,side:T.DoubleSide,alphaTest:.43,alphaToCoverage:true,vertexColors:true,envMapIntensity:.08});
  const grassMat=new T.MeshStandardMaterial({color:0x8f9f58,roughness:1,side:T.DoubleSide,envMapIntensity:.05});
  for(const m of [groundMat,barkMat,needleMat,grassMat])m.userData.landscape=true;
  const setTexture=(file,material,key,srgb,repeat)=>{const p=texture(file,srgb,repeat);if(p)p.then(t=>{if(!t)return;if(srgb)t.colorSpace=T.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;material[key]=t;material.needsUpdate=true;});};
  setTexture('landscape-grass-diffuse.jpg',groundMat,'map',true,true);setTexture('landscape-grass-normal.jpg',groundMat,'normalMap',false,true);setTexture('landscape-bark-diffuse.jpg',barkMat,'map',true,true);setTexture('landscape-pine-diffuse.jpg',needleMat,'map',true,false);setTexture('landscape-pine-alpha.jpg',needleMat,'alphaMap',false,false);
  const terrain=new T.Mesh(terrainGeometry(),groundMat);terrain.name='连续草坡与远山';terrain.receiveShadow=true;terrain.userData.lateDetail=true;terrain.userData.landscape=true;group.add(terrain);
  const trees=[],rng=random(28537),sectors=Array.from({length:12},()=>[]);
  for(let i=0;i<1500&&trees.length<176;i++){
    const angle=rng()*Math.PI*2,r=19+Math.pow(rng(),.7)*84,x=Math.cos(angle)*r,z=Math.sin(angle)*r-4;
    // Keep the house silhouette, all paved exits and the front approach open.
    if(x>-15&&x<16&&z>-14&&z<21)continue;
    if(Math.hypot(x+16,z-13)<2.2)continue;
    if(z>12&&Math.abs(x)<7+Math.max(0,z-15)*.12)continue;
    const spacing=r<38?4.4:5.7;if(trees.some(p=>Math.hypot(p.x-x,p.z-z)<spacing))continue;
    const tree={x,z,angle:rng()*Math.PI*2,scale:.76+rng()*.60,width:.82+rng()*.30,tint:.78+rng()*.28};trees.push(tree);sectors[(Math.hypot(x,z)>42?6:0)+Math.min(5,Math.floor((Math.atan2(z,x)+Math.PI)/(Math.PI/3)))].push(tree);
  }
  const highTree=buildTreeGeometry(true),lowTree=buildTreeGeometry(false),cells=[];
  for(let i=0;i<sectors.length;i++){
    const items=sectors[i],high=new T.Group(),low=new T.Group(),cell=new T.Group();cell.name='山林分区 '+(i+1);cell.userData.dynamicRoot=true;
    high.add(instances(highTree.trunk,barkMat,items,'近景树干与分枝'),instances(highTree.foliage,needleMat,items,'近景照片针叶'));
    low.add(instances(lowTree.trunk,barkMat,items,'远景树干与分枝'),instances(lowTree.foliage,needleMat,items,'远景照片针叶'));high.visible=false;cell.add(high,low);group.add(cell);
    const center=new T.Vector3();for(const p of items)center.add(new T.Vector3(p.x,landscapeHeightAt(p.x,p.z)+4,p.z));center.multiplyScalar(1/Math.max(1,items.length));cells.push({high,low,center,items});
  }
  const grasses=[];for(let i=0;i<3200;i++){const x=(rng()-.5)*72,z=(rng()-.5)*72;if((x>-11.8&&x<13.8&&z>-10&&z<16)||!landscapeContains(x,z))continue;grasses.push({x,z,angle:rng()*6.28,scale:.7+rng()*.6,width:1,tint:.72+rng()*.35});}
  const grass=instances(grassGeometry(),grassMat,grasses,'近处草叶细节');grass.castShadow=false;group.add(grass);
  const trunkColliders=trees.filter(p=>landscapeContains(p.x,p.z)).map(p=>({x:p.x,z:p.z,radius:.20*p.scale*p.width,y0:landscapeHeightAt(p.x,p.z),y1:landscapeHeightAt(p.x,p.z)+p.scale*9.5,landscape:true}));
  const stats={trees:trees.length,sectors:cells.length,grassClumps:grasses.length,walkRadius:34,walkBounds:{x:34,z:36,centerZ:2},textureCount:5,estimatedTextureBytesWithMips:Math.ceil(5*1024*1024*4*4/3),textureFiles:['landscape-grass-diffuse.jpg','landscape-grass-normal.jpg','landscape-bark-diffuse.jpg','landscape-pine-diffuse.jpg','landscape-pine-alpha.jpg'],nearSectors:0,drawCalls:26,terrainTriangles:terrain.geometry.index.count/3,treeTriangles:{near:(highTree.trunk.index.count+highTree.foliage.attributes.position.count)/3,far:(lowTree.trunk.index.count+lowTree.foliage.attributes.position.count)/3},ready:false};
  let lastX=Infinity,lastZ=Infinity,lastQuality=null,lastIndoors=null;
  function update(camera,{quality='smooth',indoors=false}={}){
    const at=camera.position||camera,high=quality===true||quality==='realistic'||quality==='high';
    if(Math.hypot(at.x-lastX,at.z-lastZ)<2.5&&high===lastQuality&&indoors===lastIndoors)return false;
    lastX=at.x;lastZ=at.z;lastQuality=high;lastIndoors=indoors;stats.nearSectors=0;
    for(const cell of cells){const near=!indoors&&cell.items.some(p=>Math.hypot(at.x-p.x,at.z-p.z)<(high?36:27));cell.high.visible=near;cell.low.visible=!near;if(near)stats.nearSectors++;}
    grass.visible=!indoors;stats.drawCalls=cells.length*2+1+(grass.visible?1:0);return true;
  }
  const ready=Promise.all(loads).then(()=>{stats.ready=true;return stats;});
  return {group,ready,update,heightAt:landscapeHeightAt,contains:landscapeContains,colliders:trunkColliders,stats};
}
