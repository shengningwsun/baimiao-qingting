import * as T from './vendor/three.module.js';
import {RGBELoader} from './vendor/RGBELoader.js';
import {scene,house,colliders,lamps,assetPath,materialLoads} from './world.js';
import './interior.js';
import {furnitureStatus} from './furniture-models.js';
import './garden.js';
import {optimizeScene} from './optimize.js';
import {createWallCulling,freezeStaticScene,warmResources,optimizeLighting} from './performance.js';
import {EYE,surfaceHeight,blocked,places,roomAt} from './navigation.js';
import {lightingPresets,lightingCycle,lightingMode} from './lighting.js';
import {prepareInteriorReflections,setReflectionLighting,detailStatus} from './interior-details.js';
const $=id=>document.getElementById(id);let renderer;
optimizeScene(scene);
try{renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').style.display='none';$('fatal').hidden=false;throw e}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=T.SRGBColorSpace;
scene.background=new T.Color(0xbaddec);scene.fog=new T.Fog(0xc5d9cf,85,175);
const hemi=new T.HemisphereLight(0xe2f5ff,0x747b82,.85);scene.add(hemi);const sun=new T.DirectionalLight(0xfff1d6,2.35);sun.position.set(-15,25,17);sun.castShadow=true;const shadowSize=Math.min(4096,renderer.capabilities.maxTextureSize);sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:85});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.blurSamples=12;scene.add(sun);const fill=new T.DirectionalLight(0xd7edff,.25);fill.position.set(8,15,-12);scene.add(fill);
const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(0x64b6ed)},bottom:{value:new T.Color(0xcbe4ef)}},vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){float h=pow(max(normalize(v).y,0.),0.3);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});const sky=new T.Mesh(new T.SphereGeometry(155,32,16),skyMat);scene.add(sky);
let hdrTexture=null;const hdrReady=new Promise(resolve=>new RGBELoader().load(assetPath('sky-day.hdr'),texture=>{texture.mapping=T.EquirectangularReflectionMapping;hdrTexture=texture;scene.environment=texture;scene.environmentIntensity=lightingPresets[lightMode].environment;resolve()},undefined,resolve));
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
const camera=new T.PerspectiveCamera(53,innerWidth/innerHeight,.12,180);let mode='orbit',angle=.3,elevation=.3,distance=29;const target=new T.Vector3(0,2.4,1);let yaw=0,pitch=0,feet=.08,lightMode='day',highQuality=false,mapFloor=0;
const nightSky=new T.Group();nightSky.name='夜晚月亮与星空';nightSky.visible=false;scene.add(nightSky);
const moon=new T.Mesh(new T.SphereGeometry(1.45,20,12),new T.MeshBasicMaterial({color:0xe3ecff,toneMapped:false}));moon.position.set(-32,38,-75);nightSky.add(moon);
let starSeed=73;const starRandom=()=>{starSeed=(starSeed*1664525+1013904223)>>>0;return starSeed/4294967296;};const starVertices=[];
for(let i=0;i<160;i++){const a=starRandom()*Math.PI*2,h=.15+starRandom()*.8,r=120,s=Math.sqrt(1-h*h);starVertices.push(Math.cos(a)*s*r,h*r,Math.sin(a)*s*r);}
const starGeometry=new T.BufferGeometry();starGeometry.setAttribute('position',new T.Float32BufferAttribute(starVertices,3));nightSky.add(new T.Points(starGeometry,new T.PointsMaterial({color:0xd0e0ff,size:1.35,sizeAttenuation:false,transparent:true,opacity:.8,depthWrite:false,toneMapped:false})));
const orbitTouches=new Map();let pinchSpan=0;
let lookPointer=null,stickPointer=null,sprinting=false;
let dragging=false,px=0,py=0,keys=new Set(),joystick={x:0,y:0},lastTime=performance.now(),lastMap=0,toastTimer;
const touch=matchMedia('(pointer:coarse)').matches;document.body.classList.toggle('touch',touch);if(touch){$('map-panel').classList.add('map-collapsed');$('map-toggle').textContent='+';}const position=new T.Vector3(0,feet+EYE,11.7);
let lightingOptimization=null,wallCulling=null,renderQueued=false,invalidated=true;
const renderStats={frames:0,ready:false};
function requestRender(){
  invalidated=true;
  if(!renderQueued&&!document.hidden){renderQueued=true;lastTime=performance.now();requestAnimationFrame(frame);}
}
function hasMotion(){return mode==='walk'&&!$('info-dialog').open&&([...keys].some(k=>/^(Key[WASD]|Arrow)/.test(k))||Math.abs(joystick.x)+Math.abs(joystick.y)>.001||Math.abs(position.y-feet-EYE)>.001);}
function showToast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300)}
function setSprint(value){sprinting=value;$('sprint').setAttribute('aria-pressed',String(value));$('sprint').setAttribute('aria-label',value?'恢复普通步行':'开启步行加速');$('sprint').innerHTML=value?'慢走 <span>1.7×</span>':'加速 <span>1×</span>';}
function stopInput(){
  keys.clear();joystick={x:0,y:0};dragging=false;pinchSpan=0;setSprint(false);
  const look=lookPointer,stick=stickPointer,orbitIds=[...orbitTouches.keys()];
  lookPointer=stickPointer=null;orbitTouches.clear();
  for(const id of new Set([...orbitIds,look]))if(id!==null&&$('world').hasPointerCapture(id))$('world').releasePointerCapture(id);
  if(stick!==null&&$('joystick').hasPointerCapture(stick))$('joystick').releasePointerCapture(stick);
  $('joystick').firstElementChild.style.transform='none';
}
function orbitCamera(){const d=distance*Math.max(1,.85/camera.aspect);camera.position.set(target.x+Math.sin(angle)*Math.cos(elevation)*d,target.y+Math.sin(elevation)*d,target.z+Math.cos(angle)*Math.cos(elevation)*d);camera.lookAt(target)}
function setMode(next){mode=next;stopInput();document.body.classList.toggle('walking',next==='walk');$('crosshair').hidden=next!=='walk';$('touch-controls').hidden=!(touch&&next==='walk');$('walk').classList.toggle('active',next==='walk');$('orbit').classList.toggle('active',next==='orbit');if(next==='orbit'){document.exitPointerLock?.();$('hint').textContent='拖动旋转 · 滚轮缩放';lastLocationLabel='';$('location-text').textContent='庭院全景';$('floor-text').textContent='室外'}else{$('hint').textContent=touch?'左侧摇杆行走 · 右侧拖动环顾 · 点加速快走':'W A S D 行走 · 鼠标拖动环顾 · 双击锁定视角 · Shift 加速 · Esc 释放';$('world').focus({preventScroll:true})}drawMap();requestRender()}
function goTo(key){const p=typeof key==='string'?places[key]:key;if(!p)throw Error('未知位置');document.exitPointerLock?.();setMode('walk');feet=p.y;position.set(p.x,p.y+EYE,p.z);yaw=p.yaw??0;pitch=p.pitch??0;camera.position.copy(position);camera.rotation.set(pitch,yaw,0,'YXZ');mapFloor=p.y>3.4?1:0;document.querySelectorAll('[data-place]').forEach(b=>b.classList.toggle('active',b.dataset.place===key));drawMap();updateLocation();showToast(p.name||roomAt(p.x,p.z,mapFloor));requestRender();return {location:p.name||roomAt(p.x,p.z,mapFloor),floor:mapFloor+1}}
$('walk').onclick=()=>{setMode('walk');showToast(touch?'左侧摇杆行走，右侧拖动转动视角':'W A S D 行走，按住鼠标拖动环顾')};$('orbit').onclick=()=>setMode('orbit');$('home').onclick=()=>{angle=.3;elevation=.3;distance=29;target.set(0,2.4,1);setMode('orbit')};document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>goTo(b.dataset.place));
$('world').addEventListener('pointerdown',e=>{if(e.button!==0||$('info-dialog').open)return;if(e.pointerType==='touch'&&mode==='walk'&&e.clientX<innerWidth*.4)return;if(e.pointerType==='touch'&&mode==='orbit'){if(orbitTouches.size>=2)return;orbitTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(orbitTouches.size===2){const [a,b]=[...orbitTouches.values()];pinchSpan=Math.hypot(a.x-b.x,a.y-b.y);}}else if(lookPointer!==null)return;lookPointer=e.pointerId;dragging=true;px=e.clientX;py=e.clientY;$('world').setPointerCapture(e.pointerId);$('world').focus({preventScroll:true})});
$('world').addEventListener('pointermove',e=>{if(orbitTouches.has(e.pointerId)&&mode==='orbit'){orbitTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(orbitTouches.size===2){const [a,b]=[...orbitTouches.values()],span=Math.hypot(a.x-b.x,a.y-b.y);if(pinchSpan>0&&span>0)distance=T.MathUtils.clamp(distance*pinchSpan/span,14,52);pinchSpan=span;return;}}const locked=document.pointerLockElement===$('world');if(!locked&&(!dragging||e.pointerId!==lookPointer))return;const dx=locked?e.movementX:e.clientX-px,dy=locked?e.movementY:e.clientY-py;px=e.clientX;py=e.clientY;if(mode==='orbit'){angle-=dx*.005;elevation=T.MathUtils.clamp(elevation+dy*.004,.07,1.25)}else{yaw-=dx*.003;pitch=T.MathUtils.clamp(pitch-dy*.0028,-1.24,1.24)}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(ev,e=>{if(e.pointerId!==lookPointer&&!orbitTouches.has(e.pointerId))return;orbitTouches.delete(e.pointerId);pinchSpan=0;const remaining=orbitTouches.entries().next().value;if(remaining){lookPointer=remaining[0];px=remaining[1].x;py=remaining[1].y;dragging=true}else{lookPointer=null;dragging=false}});
$('world').addEventListener('dblclick',async()=>{if(mode==='walk'&&!touch){try{await $('world').requestPointerLock?.()}catch{showToast('可以继续按住鼠标拖动环顾')}}});
$('world').addEventListener('wheel',e=>{if(mode==='orbit'){e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.014,14,52)}},{passive:false});
window.addEventListener('keydown',e=>{if($('info-dialog').open)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code)}if(e.code==='KeyM')$('map-toggle').click();if(e.code==='KeyR')goTo('garden')});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',()=>{stopInput();lastTime=performance.now()});
$('joystick').addEventListener('pointerdown',e=>{if(stickPointer!==null||mode!=='walk'||$('info-dialog').open)return;stickPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);moveStick(e)});$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===stickPointer&&$('joystick').hasPointerCapture(e.pointerId))moveStick(e)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(ev,e=>{if(e.pointerId!==stickPointer)return;stickPointer=null;joystick={x:0,y:0};$('joystick').firstElementChild.style.transform='none'});
$('sprint').onclick=()=>{if(mode==='walk'&&!$('info-dialog').open){setSprint(!sprinting);showToast(sprinting?'已开启加速 · 再点“慢走”恢复':'已恢复普通步行');requestRender()}};
function moveStick(e){const r=$('joystick').getBoundingClientRect();let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const len=Math.hypot(x,y);if(len>34){x=x/len*34;y=y/len*34}joystick={x:x/34,y:y/34};$('joystick').firstElementChild.style.transform=`translate(${x}px,${y}px)`}
function move(dt){if(mode!=='walk'||$('info-dialog').open)return;let fw=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joystick.y,side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joystick.x;if(keys.has('ArrowLeft'))yaw+=dt*1.25;if(keys.has('ArrowRight'))yaw-=dt*1.25;let len=Math.hypot(fw,side);if(len>1){fw/=len;side/=len}const speed=(sprinting||keys.has('ShiftLeft')||keys.has('ShiftRight')?3.4:2.05)*dt;const dx=(-Math.sin(yaw)*fw+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*fw-Math.sin(yaw)*side)*speed;const steps=Math.ceil(Math.hypot(dx,dz)/.065);for(let i=0;i<steps;i++){const nx=position.x+dx/steps,nz=position.z+dz/steps;if(!blocked(nx,position.z,feet,colliders))position.x=nx;if(!blocked(position.x,nz,feet,colliders))position.z=nz;feet=surfaceHeight(position.x,position.z,feet)??feet}position.y=T.MathUtils.lerp(position.y,feet+EYE,Math.min(1,dt*14));camera.position.copy(position);camera.rotation.set(pitch,yaw,0,'YXZ')}
function setLight(value){lightMode=lightingMode(value);const p=lightingPresets[lightMode];document.body.classList.toggle('night',lightMode!=='day');$('light').innerHTML=`${p.icon} <span>${p.label}</span>`;$('light').title='切换晴日、黄昏与夜晚';hemi.intensity=p.hemi;hemi.color.set(p.hemiColor);sun.intensity=p.sun;sun.color.set(p.sunColor);sun.position.set(...p.sunPosition);fill.intensity=p.fill;scene.fog.color.set(p.fog);skyMat.uniforms.top.value.set(p.top);skyMat.uniforms.bottom.value.set(p.bottom);scene.background=new T.Color(p.background);scene.environmentIntensity=p.environment;renderer.toneMappingExposure=p.exposure;nightSky.visible=lightMode==='night';setReflectionLighting(lightMode);for(const l of lamps){if(l.isLight)l.intensity=p.lamps;else l.emissiveIntensity=p.emissive}scene.updateMatrixWorld(true);renderer.shadowMap.needsUpdate=true;requestRender();return {light:p.label}}
$('light').onclick=()=>setLight(lightingCycle[(lightingCycle.indexOf(lightMode)+1)%lightingCycle.length]);$('quality').onclick=()=>{highQuality=!highQuality;renderer.setPixelRatio(Math.min(devicePixelRatio,highQuality?2.75:1.25));renderer.shadowMap.enabled=highQuality;renderer.shadowMap.needsUpdate=true;$('quality').textContent=highQuality?'写实画质':'流畅画质';showToast(highQuality?'写实画质 · 高清材质与高分辨率阴影':'流畅画质 · 降低像素密度与阴影开销')};$('quality').textContent='流畅画质';$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('app').requestFullscreen()}catch{showToast('当前窗口不支持全屏，可放大浏览器窗口')}};
function openDialog(html){document.exitPointerLock?.();stopInput();$('dialog-content').innerHTML=html;$('info-dialog').showModal();$('info-dialog').scrollTop=0;requestRender()}
function helpMarkup(){
  const controls=touch?`<h2>手机版操作帮助</h2><p class="help-intro">先点右上角“☰ 菜单”，选择“自由步行”。选择后菜单自动收起，把画面留给房屋。</p><div class="help-grid"><section><h3>行走与环顾</h3><p>左下角摇杆：推向前、后、左、右即可移动；推得越远，走得越快。松开立即停下。右侧空白画面：单指拖动转动视角，可边走边看。</p></section><section><h3>步行加速</h3><p>步行时点右下角“加速”，开启约 1.7 倍快走；按钮变为“慢走”，再点即可恢复。快走也需要推动摇杆。打开菜单、帮助或切到后台会恢复普通步行。</p></section><section><h3>观赏与缩放</h3><p>菜单选择“建筑观赏”，单指拖动环绕房屋，双指捏合或张开调整远近；点 ⌂ 回到初始全景。</p></section><section><h3>前往房间与上楼</h3><p>菜单中的“客厅”“餐厨”“二楼”“阳台”可直接前往。空间导览点 + 展开，选择 1F / 2F 后点房间。客厅后方左侧楼梯也可以走上去：沿左侧上行，到平台向右转，再沿右侧上二楼。</p></section><section><h3>画质、图纸与退出</h3><p>${globalThis.__mobileApp?.native ? "默认横屏、流畅画质" : "默认流畅画质；iPhone 请旋转手机到横屏，并关闭系统的竖排方向锁定"}；菜单中可切换写实画质和晴日 / 黄昏 / 夜晚。“原始图纸”可查看并缩放平面图。右上角 × 或系统返回键关闭帮助；菜单点“收起”恢复清爽画面。</p></section><section><h3>更新与分享</h3><p>${globalThis.__mobileApp?.native ? "房屋可以离线参观。联网后启动会检查新版，也可点菜单‘检查更新’。点 ↗ 分享安装包，朋友安装后也可离线使用。" : "先添加到主屏幕，并从桌面图标打开，等‘已保存 · 可离线打开’后可断网参观。联网后会保存新版，点提示应用更新，也可在菜单‘检查更新’。点 ↗ 分享安装网址，朋友需要首次联网保存资源。"}</p></section></div>`:`<h2>电脑操作帮助</h2><div class="help-row"><span><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></span>前后左右行走</div><div class="help-row"><span>鼠标按住并拖动</span>环顾四周</div><div class="help-row"><span>双击画面 / <kbd>Esc</kbd></span>锁定 / 释放鼠标</div><div class="help-row"><span><kbd>Shift</kbd> / <kbd>R</kbd></span>加快脚步 / 回到院子</div><p>建筑观赏：拖动环绕，滚轮缩放。菜单或导览图可直接前往房间；从客厅后方左侧楼梯可步行上二楼。</p>`;
  return controls+`<details class="help-credits"><summary>建模与素材来源</summary><p>建模依据：两层约 13 × 10 米平面图及外观效果图。室内家具为真实商品模型，门窗位置按两层平面图校正，室内装修为设计补全；这是可游玩的空间示意，不能代替施工图。</p><p>家具模型：Amazon Berkeley Objects，© Amazon.com, Inc.，<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>。模型经尺寸调整、贴图压缩与环境遮蔽配置，用于本住宅布局。<a href="https://amazon-berkeley-objects.s3.amazonaws.com/index.html" target="_blank" rel="noopener">素材数据集与作者说明</a>。</p><p>厨房与餐具：Jay-Artist、Scopia Visual Interfaces Systems, s.l.、Gael Bettinelli、Andrew Kator &amp; Jennifer Legaz、Emmanuel Puybaret；经 <a href="https://www.sweethome3d.com/free-3d-models/" target="_blank" rel="noopener">Sweet Home 3D</a> 分发，使用 CC BY 3.0（餐具 CC BY 3.0 US）。已转换格式、调整材质与摆放。</p><p>坐便器与洗手盆：loafbrr_1，<a href="https://opengameart.org/node/165996" target="_blank" rel="noopener">Toilets</a>，CC0；恢复原始贴图及物理材质。完整许可及作者说明随项目提供。</p></details>`;
}
$('help').onclick=()=>openDialog(helpMarkup());
$('plans').onclick=()=>openDialog(`<h2>从图纸走进空间</h2><p>户型、层数和外观以你提供的资料为依据。点击图片可在新页面查看原图。</p><div class="plan-grid"><figure><a href="./references/floor-1.jpg" target="_blank" rel="noopener"><img src="./references/floor-1.jpg" alt="一层建筑平面图"></a><figcaption>01 / 一楼 · 三卧室与客餐厨</figcaption></figure><figure><a href="./references/floor-2.jpg" target="_blank" rel="noopener"><img src="./references/floor-2.jpg" alt="二层建筑平面图"></a><figcaption>02 / 二楼 · 五卧室与休闲区</figcaption></figure><figure><a href="./references/exterior.jpg" target="_blank" rel="noopener"><img src="./references/exterior.jpg" alt="白墙灰瓦庭院住宅效果图"></a><figcaption>03 / 外观与庭院参考</figcaption><p>楼层高度按 3.6 米处理。院落、室内装修与家具为参考风格补全。</p></figure></div>`);
$('info-dialog').querySelector('.close').onclick=()=>$('info-dialog').close();$('info-dialog').addEventListener('click',e=>{if(e.target===$('info-dialog')){const r=$('info-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('info-dialog').close()}});
const map=$('minimap'),ctx=map.getContext('2d'),S=31.5;let mapRooms=[];const planWindows=[];scene.traverse(o=>{if(o.userData.architecturalWindow)planWindows.push(o.userData.architecturalWindow)});
function mapPoint(x,z){return [230+x*S,28+(z+5)*S]}
function drawMap(){ctx.clearRect(0,0,460,390);mapRooms=[];ctx.font='22px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const room=(x,z,w,d,label,point)=>{const [px,py]=mapPoint(x-w/2,z-d/2);ctx.fillStyle=label.includes('卫')?'#d6e2dd':label.includes('梯')?'#dddcd1':label==='阳台'?'#dfe7d3':'#eeeee3';ctx.fillRect(px,py,w*S,d*S);ctx.strokeStyle='#698274';ctx.lineWidth=2.5;ctx.strokeRect(px,py,w*S,d*S);ctx.fillStyle='#536d60';ctx.font=(label.length>4?'17':'20')+'px "Microsoft YaHei",sans-serif';ctx.fillText(label,px+w*S/2,py+d*S/2);mapRooms.push({x0:px,x1:px+w*S,y0:py,y1:py+d*S,p:{...point,y:mapFloor?4.05:.45,name:(mapFloor?'二楼':'一楼')+' · '+label}})};
room(-4.55,-2.9,3.9,4.2,'卧室',{x:-3.3,z:-1.6,yaw:.8});room(-1.3,-2.9,2.6,4.2,'楼梯',{x:mapFloor?-.63:-1.97,z:-.38,yaw:0});if(mapFloor){room(1.4,-2.9,2.8,4.2,'卧室',{x:2.05,z:-1.55,yaw:.65});room(4.65,-2.9,3.7,4.2,'卧室',{x:3.4,z:-1.6,yaw:-.8})}else{room(1.85,-2.9,3.7,4.2,'餐厅',places.dining);room(5.1,-2.9,2.8,4.2,'厨房',{x:5,z:-1.3,yaw:-.3,pitch:-.2})}
room(-5.3,.1,2.4,1.8,'卫',{x:-4.55,z:.1,yaw:.8});room(5.3,.1,2.4,1.8,'卫',{x:4.55,z:.1,yaw:-.8});room(-4.55,3,3.9,4,'卧室',{x:-5.4,z:1.35,yaw:Math.PI+.35,pitch:-.18});room(4.55,3,3.9,4,mapFloor?'卧室':'长辈卧室',{x:5.4,z:1.35,yaw:Math.PI-.35,pitch:-.18});room(0,1.5,5.2,4.6,mapFloor?'休闲区':'客厅',mapFloor?places.upstairs:places.living);if(mapFloor)room(0,4.85,5.2,2.1,'阳台',places.balcony);
// Window marks follow the blue openings in the original floor plans.
ctx.strokeStyle='#6aa4b7';ctx.lineWidth=5;for(const w of planWindows){if((w.bottom>=4?1:0)!==mapFloor)continue;const [a,b]=mapPoint(w.x,w.z),half=w.width*S/2;ctx.beginPath();if(w.axis==='x'){ctx.moveTo(a-half,b);ctx.lineTo(a+half,b)}else{ctx.moveTo(a,b-half);ctx.lineTo(a,b+half)}ctx.stroke()}
if(!mapFloor){const [a,b]=mapPoint(6.5,-1.45);ctx.strokeStyle='#eeeee3';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(a,b-.45*S);ctx.lineTo(a,b+.45*S);ctx.stroke();ctx.strokeStyle='#957c5c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a,b+.45*S);ctx.lineTo(a-.86*S,b+.45*S);ctx.stroke()}
ctx.strokeStyle='#f5f4eb';ctx.lineWidth=6;for(const x of [-3.4,3.4])for(const z of [-.8,1]){const [a,b]=mapPoint(x,z);ctx.beginPath();ctx.moveTo(a-12,b);ctx.lineTo(a+12,b);ctx.stroke()}ctx.fillStyle='#789385';ctx.font='16px sans-serif';ctx.fillText('北 ↑',427,13);
if(mode==='walk'&&(feet>3.45?1:0)===mapFloor){const [px,py]=mapPoint(position.x,position.z);ctx.save();ctx.translate(Math.max(8,Math.min(452,px)),Math.max(8,Math.min(379,py)));ctx.rotate(-yaw);ctx.fillStyle='#c18b35';ctx.shadowColor='#fff';ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(8,8);ctx.lineTo(0,4);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.restore()}document.querySelectorAll('[data-map]').forEach(b=>b.classList.toggle('active',+b.dataset.map===mapFloor));}
document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{mapFloor=+b.dataset.map;drawMap()});$('map-toggle').onclick=()=>{$('map-panel').classList.toggle('map-collapsed');$('map-toggle').textContent=$('map-panel').classList.contains('map-collapsed')?'+':'−'};
map.onclick=e=>{const r=map.getBoundingClientRect(),x=(e.clientX-r.left)*460/r.width,y=(e.clientY-r.top)*390/r.height;const room=mapRooms.find(a=>x>=a.x0&&x<=a.x1&&y>=a.y0&&y<=a.y1);if(room)goTo(room.p)};
let lastLocationLabel='',lastAccessibleLabel='';
function updateLocation(){if(mode!=='walk')return;const level=feet>3.45?1:0,room=roomAt(position.x,position.z,level);const floor=room==='院子'?'室外':room==='楼梯间'?'连接两层':level?'2F':'1F';
if(room+floor!==lastLocationLabel){lastLocationLabel=room+floor;$('location-text').textContent=room;$('floor-text').textContent=floor;}
const accessible=`三维漫游：${room}，${level?'二楼':'一楼或院子'}，位置 ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`;
if(accessible!==lastAccessibleLabel){lastAccessibleLabel=accessible;$('world').setAttribute('aria-label',accessible);}
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);requestRender()});
// Events schedule frames; the static house does not burn GPU/battery while idle.
$('world').addEventListener('pointermove',()=>{if(dragging||document.pointerLockElement===$('world'))requestRender();});
$('joystick').addEventListener('pointermove',e=>{if($('joystick').hasPointerCapture(e.pointerId))requestRender();});
for(const ev of ['pointerdown','pointerup','pointercancel','wheel','click','keydown','keyup'])window.addEventListener(ev,requestRender);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRender();});
$('world').addEventListener('webglcontextrestored',()=>{renderer.shadowMap.needsUpdate=true;requestRender();});
function frame(now){
  renderQueued=false;if(document.hidden)return;
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
  if(mode==='orbit')orbitCamera();else move(dt);
  const shadowRefresh=renderer.shadowMap.enabled && renderer.shadowMap.needsUpdate;
  wallCulling?.prepare(camera,shadowRefresh);
  if(invalidated){renderer.render(scene,camera);renderStats.frames++;invalidated=false;}
  const moving=hasMotion();
  if(mode==='walk'&&(now-lastMap>150||!moving)){lastMap=now;if(!$('map-panel').classList.contains('map-collapsed'))drawMap();updateLocation();}
  // A refresh includes all shadow casters. The next main frame can hide furniture
  // again while retaining precisely the same cached sunlight shadows.
  if(moving||(shadowRefresh&&wallCulling)){invalidated=true;if(!renderQueued){renderQueued=true;requestAnimationFrame(frame);}}
}
setLight(false);drawMap();requestRender();
Promise.all([...materialLoads,hdrReady]).then(async()=>{
  $('loading').textContent='正在准备高清画面…';
  lightingOptimization=optimizeLighting(scene);
  setLight(lightMode);
  await prepareInteriorReflections(renderer);
  setReflectionLighting(lightMode);
  await warmResources(renderer,scene,camera);
  globalThis.__releaseEmbeddedAssets?.();
  freezeStaticScene(scene);wallCulling=createWallCulling(scene);renderStats.ready=true;
  renderer.shadowMap.needsUpdate=true;requestRender();
  if(furnitureStatus.failed.length)showToast('部分家具加载失败，请刷新页面重试');
  $('loading')?.remove();
});
// Read-only diagnostics and deterministic viewpoints for local visual verification.
globalThis.__tour={scene,camera,renderer,furnitureStatus,details:detailStatus,performance:renderStats,get lighting(){return lightMode},get culling(){return wallCulling?.stats},setLightingOptimization(enabled){lightingOptimization?.setEnabled(enabled);requestRender();},setCulling(enabled){if(wallCulling){wallCulling.stats.enabled=enabled;requestRender();}},goTo,setLight,inspect(x,z,y,yawValue=0,pitchValue=-.25){goTo({x,z,y,yaw:yawValue,pitch:pitchValue,name:'室内参观'});}};
if(document.modelContext?.registerTool){const life=new AbortController();for(const tool of [{name:'navigate_house',title:'前往房间或庭院',description:'Move the tour visitor to a named area of this house.',inputSchema:{type:'object',properties:{place:{type:'string',enum:Object.keys(places)}},required:['place'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Object.hasOwn(places,input.place))throw Error('Unknown place');return goTo(input.place)}},{name:'set_house_lighting',title:'切换晴日、黄昏或夜晚',description:'Change the lighting of the current house tour.',inputSchema:{type:'object',properties:{lighting:{type:'string',enum:lightingCycle}},required:['lighting'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){return setLight(lightingMode(input?.lighting))}}]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:life.signal})).catch(()=>{})}catch{}}window.addEventListener('pagehide',()=>life.abort(),{once:true})}
