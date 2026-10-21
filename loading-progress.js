export function createLoadingProgress(element){
  const label=element.querySelector('[data-loading-label]'),detail=element.querySelector('[data-loading-detail]'),value=element.querySelector('output'),bar=element.querySelector('progress');
  const state={percent:0,phase:'resources',completed:0,total:0,ready:false,error:null,history:[]};
  function update(percent,text,description='',phase=state.phase){
    if(state.error)return;
    state.percent=Math.max(state.percent,Math.min(100,Math.floor(percent)));state.phase=phase;
    label.textContent=text;detail.textContent=description;value.value=state.percent+'%';bar.value=state.percent;
    bar.setAttribute('aria-valuetext',`${text}，${state.percent}%`);
    const last=state.history.at(-1);if(!last||last.percent!==state.percent||last.phase!==phase)state.history.push({percent:state.percent,phase});
  }
  async function track(promises){
    state.total=promises.length;update(0,'正在加载高清资源',`已完成 0 / ${state.total}`,'resources');
    return Promise.all(promises.map(promise=>Promise.resolve(promise).then(result=>{
      state.completed++;update(state.completed/state.total*70,'正在加载高清资源',`已完成 ${state.completed} / ${state.total}`);return result;
    })));
  }
  async function finish(){
    state.ready=true;update(100,'高清画面已就绪','可以开始参观','ready');
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    element.classList.add('loading-complete');setTimeout(()=>element.remove(),350);
  }
  function fail(error){state.error=String(error);element.classList.add('loading-error');label.textContent='画面准备未完成';detail.textContent='请点击重试';element.querySelector('[data-loading-retry]').hidden=false;}
  element.querySelector('[data-loading-retry]').onclick=()=>location.reload();
  return {state,track,update,finish,fail};
}
