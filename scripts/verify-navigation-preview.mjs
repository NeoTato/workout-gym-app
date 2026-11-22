// Dependency-free browser checks for the local design prototype.
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const fromRoot = (...parts) => resolve(workspaceRoot, ...parts);

const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
  `--user-data-dir=${fromRoot('.preview-browser', 'navigation-check-' + Date.now())}`, 'about:blank',
], {windowsHide:true, stdio:['ignore','ignore','pipe']});
let socket;
try {
  const endpoint = await new Promise((resolveEndpoint,reject) => {
    const timer = setTimeout(()=>reject(new Error('Browser startup timed out')),20000);
    browser.on('error',reject);
    browser.stderr.on('data',chunk=>{
      const match=String(chunk).match(/DevTools listening on (ws:\/\/\S+)/);
      if(match){clearTimeout(timer);resolveEndpoint(match[1]);}
    });
  });
  socket=new WebSocket(endpoint);
  await new Promise((ready,reject)=>{socket.onopen=ready;socket.onerror=reject;});
  let next=0;
  const pending=new Map();
  const errors=[];
  socket.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
    if(message.method==='Log.entryAdded'&&message.params.entry.level==='error')errors.push(message.params.entry.text);
    if(!message.id)return;
    const callback=pending.get(message.id);
    pending.delete(message.id);
    if(message.error)callback.reject(new Error(message.error.message));else callback.resolve(message.result);
  };
  const send=(method,params={},sessionId)=>new Promise((resolveCommand,reject)=>{
    const id=++next;pending.set(id,{resolve:resolveCommand,reject});
    socket.send(JSON.stringify({id,method,params,sessionId}));
  });
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const command=(method,params={})=>send(method,params,sessionId);
  const evaluate=async expression=>{
    const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const click=async selector=>{
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
    const position=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...position});
    await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...position});
  };
  const key=async keyName=>{
    const code={Escape:27,Tab:9,Enter:13,Home:36,ArrowDown:40}[keyName];
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:keyName,code:keyName,windowsVirtualKeyCode:code});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:keyName,code:keyName,windowsVirtualKeyCode:code});
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  };
  const choose=async(selector,keys)=>{await click(selector);for(const name of keys)await key(name);await key('Tab');};
  const screenshot=async name=>{
    const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    await mkdir(fromRoot('screenshots'),{recursive:true});
    await writeFile(fromRoot('screenshots',name),Buffer.from(data,'base64'));
  };
  await command('Page.enable');await command('Runtime.enable');await command('Log.enable');
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1600,deviceScaleFactor:1,mobile:false});
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});



  await command('Page.navigate',{url:pathToFileURL(fromRoot('previews/navigation/index.html')).href});
  await evaluate('new Promise((resolve,reject)=>{const deadline=Date.now()+20000;const check=()=>document.querySelector("#edit-biceps")?resolve():Date.now()>deadline?reject(new Error("Preview did not initialize")):setTimeout(check,50);check()}).then(()=>document.fonts.ready).then(()=>true)');
  const settle=()=>evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const screen=()=>evaluate('document.querySelector("[data-screen]:not([hidden])").dataset.screen');
  const phoneShot=async name=>{await settle();const clip=await evaluate('(()=>{const r=document.querySelector(".phone").getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()');const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});await mkdir(fromRoot('screenshots'),{recursive:true});await writeFile(fromRoot('screenshots',name),Buffer.from(data,'base64'));};
  assert.equal(await screen(),'home');assert.equal(await evaluate('document.querySelectorAll(".bottom-nav>button").length'),5);
  const floatingGap=()=>evaluate('(()=>{const bar=document.querySelector(".bottom-nav").getBoundingClientRect(),button=document.querySelector(".plus-disc").getBoundingClientRect();return bar.top-button.bottom})()');
  assert.equal(await floatingGap()>=8,true);
  await screenshot('navigation-preview-desktop.png');await phoneShot('navigation-preview-home.png');
  await click('.latest');await settle();await click('#edit-workout');await settle();assert.equal(await screen(),'edit');
  for(const group of ['back','biceps','core'])await click('#edit-groups [aria-controls="edit-'+group+'"]');
  await evaluate('document.querySelector("[data-exercise=preacher]").scrollIntoView({block:"center"});window.savedChooserScroll=document.querySelector("#viewport").scrollTop');
  await click('[data-exercise=preacher]');await settle();assert.equal(await screen(),'exercise');assert.equal(await evaluate('document.querySelector(".bottom-nav").hidden'),true);
  await evaluate('document.querySelector("#load-0").value="15"');await click('#save-exercise');await settle();
  assert.equal(await screen(),'edit');assert.equal(await evaluate('document.querySelector("#edit-biceps").hidden'),false);
  assert.equal(await evaluate('Math.abs(document.querySelector("#viewport").scrollTop-window.savedChooserScroll)<2'),true);
  assert.equal(await evaluate('document.querySelector("#toast").textContent.includes("saved")'),true);
  await phoneShot('navigation-preview-edit-chooser.png');
  await click('[data-exercise=hammer]');await settle();await click('#save-exercise');await settle();assert.equal(await screen(),'edit');
  await click('#done-editing');await settle();assert.equal(await screen(),'detail');await click('#summary-exercises [aria-controls="summary-biceps"]');
  assert.equal(await evaluate('document.querySelector("[data-summary-id=preacher]").textContent.startsWith("15 kg × 4")'),true);
  await click('.bottom-nav [data-nav=history]');await settle();assert.equal(await screen(),'history');await click('[data-screen=history] [data-open-workout]');await settle();await click('#detail-back');await settle();assert.equal(await screen(),'history');
  await click('.bottom-nav [data-nav=progress]');await settle();await click('[data-report=summary]');assert.equal(await evaluate('document.querySelector("#report-panel").hidden'),false);
  await click('.bottom-nav [data-nav=settings]');await settle();await click('[data-theme-choice=dark]');assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');
  await click('.bottom-nav [data-nav=home]');await settle();await phoneShot('navigation-preview-dark.png');
  await click('#draft-toggle');await settle();assert.equal(await evaluate('document.querySelector("#resume-card").hidden'),false);assert.equal(await evaluate('document.querySelector("#workout-action").getAttribute("aria-label")'),'Resume workout');
  await click('#workout-action');await settle();assert.equal(await screen(),'workout');assert.equal(await evaluate('document.querySelector("#workout-title").textContent'),'Your workout');
  await click('[data-screen=workout] [data-go=home]');await settle();assert.equal(await evaluate('document.querySelector(".bottom-nav [aria-current=page]").dataset.nav'),'home');
  await click('#theme');await settle();await phoneShot('navigation-preview-resume.png');
  for(const width of [320,390]){await command('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:true});await settle();assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);assert.equal(await evaluate('[...document.querySelectorAll(".bottom-nav>button")].every(n=>n.getBoundingClientRect().width>=44&&n.getBoundingClientRect().height>=44)'),true);assert.equal(await floatingGap()>=8,true);}
  assert.deepEqual(errors,[]);console.log('PASS: navigation, latest workout, focused editing, saved exercise returns to chooser with categories/scroll/focus intact, persisted preview edits, draft resume, light/dark and 320/390px layouts.');
} finally { if(socket?.readyState===WebSocket.OPEN)socket.close();browser.kill(); }
