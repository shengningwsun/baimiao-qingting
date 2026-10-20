import {getTouchSensitivity,setTouchSensitivity,DEFAULT_TOUCH_SENSITIVITY} from './touch-settings.js';

export function setupMenuSettings({setView,getView,requestRender}){
  const slider=document.getElementById('menu-sensitivity'),output=document.getElementById('menu-sensitivity-value'),perspective=document.getElementById('menu-perspective');
  function refresh(){slider.value=String(Math.round(getTouchSensitivity()*100));output.value=slider.value+'%';perspective.value=getView();}
  slider.addEventListener('input',()=>{output.value=Math.round(setTouchSensitivity(Number(slider.value)/100)*100)+'%';});
  document.getElementById('menu-reset-sensitivity').onclick=()=>{setTouchSensitivity(DEFAULT_TOUCH_SENSITIVITY);refresh();};
  perspective.onchange=()=>{setView(perspective.value);refresh();requestRender();};
  window.addEventListener('tourmenuchange',()=>{refresh();requestRender();});
  document.getElementById('info-dialog').addEventListener('close',refresh);
  refresh();
}
