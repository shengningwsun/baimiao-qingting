export const DEFAULT_TOUCH_SENSITIVITY=1.15;
const KEY='baimiao-qingting.touch-sensitivity.v1';
function valid(value){return Number.isFinite(value)?Math.min(2,Math.max(.5,value)):DEFAULT_TOUCH_SENSITIVITY;}
let sensitivity=DEFAULT_TOUCH_SENSITIVITY;
try{const saved=localStorage.getItem(KEY);if(saved!==null)sensitivity=valid(Number(saved));}catch{}
export function getTouchSensitivity(){return sensitivity;}
export function setTouchSensitivity(value){
  sensitivity=valid(Number(value));
  try{localStorage.setItem(KEY,String(sensitivity));}catch{}
  return sensitivity;
}
export function showTouchSettings(openDialog){
  openDialog(`<h2>滑动灵敏度</h2><p>调整单指滑动时转动视角的速度。数值越高，同样的滑动距离转得越快；同时适用于自由步行和建筑观赏。</p><div class="sensitivity-setting"><label for="touch-sensitivity">视角滑动 <output id="sensitivity-value" for="touch-sensitivity">${Math.round(sensitivity*100)}%</output></label><input id="touch-sensitivity" type="range" min="50" max="200" step="5" value="${Math.round(sensitivity*100)}"><div class="sensitivity-scale"><span>50% · 慢</span><span>200% · 快</span></div><button id="reset-sensitivity" type="button">恢复默认 · 115%</button></div><p>拖动滑条立即生效，关闭后可试滑；设置会保存在本机，下次打开继续使用。默认比原来的滑动速度提高 15%。摇杆步速和双指缩放保持原来的操作方式。</p>`);
  const slider=document.getElementById('touch-sensitivity'),output=document.getElementById('sensitivity-value');
  const update=()=>{const value=setTouchSensitivity(Number(slider.value)/100);output.value=Math.round(value*100)+'%';};
  slider.addEventListener('input',update);
  document.getElementById('reset-sensitivity').onclick=()=>{slider.value=String(DEFAULT_TOUCH_SENSITIVITY*100);update();};
}
