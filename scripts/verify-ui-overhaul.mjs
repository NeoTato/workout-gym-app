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
  `--user-data-dir=${fromRoot('.preview-browser/ui-overhaul-check')}`, 'about:blank',
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

  await command('Page.navigate',{url:pathToFileURL(fromRoot('previews/ui-overhaul/ui-overhaul-preview.html')).href});
  await evaluate("new Promise(resolve=>{if(document.readyState==='complete')resolve();else addEventListener('load',resolve,{once:true})}).then(()=>document.fonts.ready).then(()=>true)");
  assert.equal(await evaluate("document.fonts.check('700 30px Recursive')"),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  assert.equal(await evaluate('document.querySelectorAll("#sets [data-set]").length'),3);
  assert.equal(await evaluate('document.querySelectorAll(".set-check")[2].disabled'),true);
  await screenshot('ui-overhaul-desktop.png');
  const colors=await evaluate('({add:getComputedStyle(document.querySelector("#add-set")).color,remove:getComputedStyle(document.querySelector(".remove-set")).color,back:getComputedStyle(document.querySelector("#edit-details")).color})');
  assert.notEqual(colors.add,colors.remove);assert.notEqual(colors.add,colors.back);
  await click('[data-direction="current"]');assert.equal(await evaluate('document.documentElement.dataset.style'),'current');
  await click('[data-direction="proposed"]');
  await click('#theme-toggle');assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');
  await evaluate('scrollTo(0,0)');await screenshot('ui-overhaul-dark.png');await click('#theme-toggle');
  await evaluate('(()=>{const input=document.querySelectorAll("#sets input")[5];input.value="8";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
  assert.equal(await evaluate('document.querySelector("#done-count").textContent'),'3');
  await click('#add-set');assert.equal(await evaluate('document.querySelectorAll("#sets [data-set]").length'),4);
  assert.equal(await evaluate('document.querySelectorAll(".set-check")[3].getAttribute("aria-checked")'),'false');
  await click('[aria-label="Set 4 done"]');await click('[aria-label="Remove set 4"]');
  assert.equal(await evaluate('document.querySelector("#confirm-dialog").open'),true);
  await click('#confirm-cancel');assert.equal(await evaluate('document.querySelectorAll("#sets [data-set]").length'),4);
  await click('[aria-label="Remove set 4"]');await click('#confirm-remove');
  assert.equal(await evaluate('document.querySelectorAll("#sets [data-set]").length'),3);
  await evaluate('(()=>{const input=document.querySelectorAll("#sets input")[1];input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
  assert.equal(await evaluate('document.querySelectorAll(".set-check")[0].disabled'),true);
  await click('#finish');assert.equal(await evaluate('document.querySelector("#saved-sets").textContent'),'2');
  await click('#delete-workout');await key('Escape');assert.equal(await evaluate('document.querySelector("#confirm-dialog").open'),false);
  await click('#add-gym');await evaluate('document.querySelector("#gym-name").value="New gym"');await click('#gym-form button[type="submit"]');
  assert.equal(await evaluate('document.querySelector("[data-gym]").textContent'),'New gym');
  for(const width of [390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:true});
    for(const screen of ['setup','logging','review']){await click('[data-screen="'+screen+'"]');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'No overflow at '+width+' / '+screen);}
  }
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
  await click('[data-screen="logging"]');await evaluate('document.querySelector("[data-panel=logging] .phone-content").scrollTop=0;document.querySelector("#toast").hidden=true;scrollTo(0,0)');await screenshot('ui-overhaul-mobile.png');
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop/light/dark/320px/390px layouts, color comparison, distinct action colors, automatic completion, copied sets, removal confirmation/cancellation, finish, modal Escape, and gym selection.');
} finally {
  if(socket?.readyState===WebSocket.OPEN)socket.close();browser.kill();
}
