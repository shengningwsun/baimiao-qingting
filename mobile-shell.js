(() => {
  document.getElementById('retry-scene').onclick=()=>location.reload();
  const native = typeof globalThis.TourApp?.shareApp === 'function';
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const status = document.getElementById('offline-status');
  const state = globalThis.__mobileApp = {native, installed, offlineReady: native, offlineError: null, version: null};
  document.body.classList.toggle('app-native', native);
  document.body.classList.toggle('app-installed', installed);
  const menu = document.getElementById('menu-toggle');
  function setMenu(open) {
    document.body.classList.toggle('ui-collapsed', !open);
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? '× 收起' : '☰ 菜单';
    if(open) window.dispatchEvent(new Event('blur'));
  }
  setMenu(false);
  menu.onclick = () => setMenu(document.body.classList.contains('ui-collapsed'));
  document.addEventListener('click', event => {
    if(event.composedPath().some(node=>node instanceof Element && node.matches('#places button,#orbit,#walk,#plans,#home,#help,#quality,#light,#share-app,#update-app,#install-app,#minimap'))) setMenu(false);
  });
  document.getElementById('world').addEventListener('pointerdown',()=>setMenu(false));
  const updateButton = document.getElementById('update-app');
  updateButton.hidden = native ? typeof globalThis.TourApp.checkForUpdates !== 'function' : !('serviceWorker' in navigator && isSecureContext);
  updateButton.onclick = async () => {
    if(native) {globalThis.TourApp.checkForUpdates();return;}
    if(await applyUpdate()) return;
    try {
      badge('正在检查更新…');
      await registerOffline(true);
      if(registration?.waiting) announceUpdate();
      else if(!registration?.installing) badge(state.offlineReady ? '当前已是最新版 · 可离线使用' : '正在准备离线资源',5000);
    } catch {badge('暂时无法检查更新 · 请联网后重试',5000);}
  };
  if(native && typeof globalThis.TourApp.sceneReady === 'function') {
    const updateTimer = setInterval(()=>{
      if(globalThis.__tour?.performance.ready){clearInterval(updateTimer);globalThis.TourApp.sceneReady();}
    },400);
  }
  let installPrompt = null, registration = null, hideStatus = null, readyTimer = null, pendingUpdate = null;
  status.onclick = async () => {
    if(await applyUpdate()) return;
    if(state.offlineError){state.offlineError = null;registerOffline(true);}
  };
  function announceUpdate() {badge('新版已保存 · 点此更新');}
  async function applyUpdate() {
    if(native || !('serviceWorker' in navigator)) return false;
    const current = await navigator.serviceWorker.getRegistration(new URL('./',location.href).href);
    const worker = current?.waiting || pendingUpdate;
    if(!worker || worker.state === 'redundant') return false;
    window.dispatchEvent(new Event('blur'));
    badge('正在打开新版…');
    worker.postMessage({kind:'APPLY_UPDATE'});
    return true;
  }

  function badge(text, hideAfter = 0) {
    clearTimeout(hideStatus);status.textContent = text;status.hidden = false;
    if (hideAfter) hideStatus = setTimeout(() => status.hidden = true, hideAfter);
  }
  function notify(text) {
    const toast = document.getElementById('toast');toast.textContent = text;toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3300);
  }
  function installHelp() {
    const dialog = document.getElementById('info-dialog');
    const offline = state.offlineReady ? '本机已保存，可离线打开。' : '请保持联网，等画面出现“已保存 · 可离线打开”。';
    document.getElementById('dialog-content').innerHTML = `<h2>把白庙晴庭装到手机上</h2><p>${ios ? '使用 Safari 打开本网址，点击浏览器的分享按钮，再选“添加到主屏幕”。' : '打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。'}</p><p>从桌面上的“白庙晴庭”图标打开一次，等待高清资源保存完成，之后便能断网参观。${offline}</p><p>点击右上角 ↗ 可把安装网址分享给别人。每个人的手机需要首次联网保存自己的离线资源。</p><p>所有家具与贴图保留原有精度。<a href="./asset-credits.md" target="_blank" rel="noopener">完整素材来源</a></p>`;
    dialog.showModal();
  }

  window.addEventListener('beforeinstallprompt', event => {event.preventDefault();installPrompt = event;});
  window.addEventListener('appinstalled', () => {state.installed = true;document.body.classList.add('app-installed');});
  document.getElementById('install-app').onclick = async () => {
    if (native) return;
    if (state.offlineError) {state.offlineError = null;await registerOffline(true);}
    if (installPrompt) {await installPrompt.prompt();await installPrompt.userChoice;installPrompt = null;}
    else installHelp();
  };
  document.getElementById('share-app').onclick = async () => {
    if (native) {globalThis.TourApp.shareApp();return;}
    const url = new URL('./', location.href).href;
    try {
      if (navigator.share) await navigator.share({title:'白庙晴庭 · 3D 房屋漫游',text:'添加到主屏幕，保存后可离线参观两层住宅与院落。',url});
      else {await navigator.clipboard.writeText(url);notify('安装网址已复制，可以发给朋友。');}
    } catch (error) {if(error.name !== 'AbortError') notify('请复制浏览器中的网址发给朋友。');}
  };

  // Android bridge access stays on this bundled origin. Plans open in a native
  // zoomable viewer; attribution links open the phone's external browser.
  if (native) document.addEventListener('click', event => {
    const link = event.target.closest('a');if (!link) return;
    const url = new URL(link.href, location.href);event.preventDefault();
    if (url.origin === location.origin && /^\/assets\/references\/(floor-1|floor-2|exterior)\.jpg$/.test(url.pathname)) globalThis.TourApp.viewPlan(url.pathname.slice(8));
    else if (url.protocol === 'https:' && url.origin !== location.origin) globalThis.TourApp.openExternal(url.href);
    else if(url.origin === location.origin) notify('素材许可与来源随安装包完整提供，操作说明中也有作者和来源。');
  });

  function receive(event) {
    const data = event.data;if (!data?.kind) return;
    if(data.kind === 'OFFLINE_PROGRESS') badge(`${state.offlineReady ? '正在保存新版' : '正在保存离线'} · ${data.percent}%`);
    if(data.kind === 'UPDATE_READY') {pendingUpdate=event.source;announceUpdate();}
    if(data.kind === 'OFFLINE_READY') {
      state.offlineReady = true;state.offlineError = null;state.version = data.version;
      badge('已保存 · 可离线打开', 6000);
      if(installed) navigator.storage?.persist?.().catch(() => {});
      if(registration?.waiting) announceUpdate();
    }
    if(data.kind === 'OFFLINE_FAILED') {state.offlineError = data.message;badge('离线保存未完成 · 联网后点此重试');}
  }

  async function registerOffline(retry = false) {
    if(native) return;
    if(!isSecureContext || !('serviceWorker' in navigator)) {state.offlineError = '需要 HTTPS 和支持离线应用的浏览器';return;}
    try {
      registration = await navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'});
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed' && registration.waiting) announceUpdate();});
      });
      if(retry) await registration.update();
      registration.active?.postMessage({kind:'OFFLINE_STATUS'});
      navigator.serviceWorker.controller?.postMessage({kind:'OFFLINE_STATUS'});
      // Registration may already have an installing/waiting worker. Its status
      // messages are delivered to uncontrolled first-time clients as well.
      if(!registration.active) badge('正在保存离线 · 0%');
      if(registration.waiting) announceUpdate();
    } catch(error) {state.offlineError = String(error);badge('离线保存未完成 · 联网后点此重试');}
  }
  state.registerOffline = registerOffline;
  if(!native && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', receive);
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if(hadController) {location.reload();return;}
      hadController=true;
      navigator.serviceWorker.controller?.postMessage({kind:'OFFLINE_STATUS'});
    });
    // Let the full-resolution tour finish decoding before background downloads.
    readyTimer = setInterval(() => {if(globalThis.__tour?.performance.ready){clearInterval(readyTimer);readyTimer = null;registerOffline();}},400);
  }
})();
