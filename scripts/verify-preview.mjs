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
  `--user-data-dir=${fromRoot('.preview-browser/coral-check')}`, 'about:blank',
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
  await command('Page.navigate',{url:pathToFileURL(fromRoot('previews/coral-daylight/design-preview.html')).href});
  await evaluate(`new Promise(resolve=>{if(document.readyState==='complete')resolve();else addEventListener('load',resolve,{once:true})}).then(()=>document.fonts.ready).then(()=>true)`);
  assert.equal(await evaluate(`document.fonts.check('700 30px Recursive')`),true);
  assert.equal(await evaluate(`document.querySelectorAll('.progress-hero circle').length`),2);
  assert.equal(await evaluate(`document.querySelectorAll('.nav .icon').length`),4);
  assert.equal(await evaluate(`document.querySelectorAll('[data-calendar-date]').length`),31,'October has 31 selectable dates');
  assert.equal(await evaluate(`document.getElementById('calendar-summary').textContent`),'11 active days · 12 workouts');
  await click('[data-calendar-date="2026-10-28"]');
  assert.equal(await evaluate(`document.getElementById('day-dialog').open`),true);
  assert.equal(await evaluate(`document.querySelectorAll('#day-sessions .day-session').length`),2,'A day can contain gym and home workouts');
  assert.equal(await evaluate(`document.getElementById('day-sessions').textContent.includes('Lat pulldown')`),true);
  assert.equal(await evaluate(`document.getElementById('day-sessions').textContent.includes('90 lbs × 10 reps')`),true);
  await screenshot('calendar-details.png');
  await key('Escape');
  assert.equal(await evaluate(`document.activeElement.dataset.calendarDate`),'2026-10-28','Closing restores focus to the selected date');
  await click('[data-calendar-date="2026-10-27"]');
  assert.equal(await evaluate(`document.getElementById('day-sessions').textContent.includes('No completed workouts')`),true);
  await click('#close-day');
  await click('#calendar-next');
  assert.equal(await evaluate(`document.getElementById('calendar-month').textContent`),'November 2026');
  assert.equal(await evaluate(`document.querySelectorAll('[data-calendar-date]').length`),30);
  await click('#calendar-previous');
  assert.equal(await evaluate(`document.getElementById('calendar-month').textContent`),'October 2026');
  await click('#open-summary');
  assert.equal(await evaluate(`document.getElementById('summary-dialog').open`),true);
  assert.equal(await evaluate(`document.getElementById('summary-active').textContent`),'11');
  assert.equal(await evaluate(`document.getElementById('summary-sessions').textContent`),'12');
  assert.equal(await evaluate(`document.getElementById('summary-time').textContent`),'8h 1m');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-summary-routine]')].map(row=>[row.dataset.summaryRoutine,Number(row.querySelector('strong').textContent)])`),[['Push',3],['Pull',3],['Legs',2],['Full Body',3],['Core',1]]);
  await screenshot('workout-summary.png');
  await click('[data-summary-period="week"]');
  assert.equal(await evaluate(`document.getElementById('summary-active').textContent`),'2');
  assert.equal(await evaluate(`document.getElementById('summary-sessions').textContent`),'3');
  assert.equal(await evaluate(`document.getElementById('summary-goal').textContent.includes('2 / 3 active days')`),true);
  await click('[data-summary-period="year"]');
  assert.equal(await evaluate(`document.getElementById('summary-sessions').textContent`),'12');
  await click('#summary-previous');
  assert.equal(await evaluate(`document.getElementById('summary-sessions').textContent`),'0');
  assert.equal(await evaluate(`document.getElementById('summary-breakdown').textContent.includes('No completed workouts')`),true);
  await click('#summary-next');
  await click('[data-summary-period="month"]');
  await key('Escape');
  assert.equal(await evaluate(`document.activeElement.id`),'open-summary');
  await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
  await evaluate('window.scrollTo(0,0)');
  await screenshot('design-preview.png');
  await click('.done');assert.equal(await evaluate(`document.querySelector('.done').getAttribute('aria-pressed')`),'true');
  await click('.done');assert.equal(await evaluate(`document.querySelector('.done').getAttribute('aria-pressed')`),'false');
  await click('[data-routine="Pull"]');assert.equal(await evaluate(`document.getElementById('begin').textContent`),'Start Pull →');
  await click('[data-routine="Push"]');
  await choose('#gym',['Home','ArrowDown','Enter']);
  assert.equal(await evaluate(`document.getElementById('last-title').textContent`),'No matching session yet');
  await click('#begin');assert.equal(await evaluate(`document.getElementById('exercise').hidden`),true);
  await command('Page.navigate',{url:pathToFileURL(fromRoot('previews/coral-daylight/design-preview.html')).href});
  await evaluate(`new Promise(resolve=>{if(document.readyState==='complete')resolve();else addEventListener('load',resolve,{once:true})}).then(()=>document.fonts.ready).then(()=>true)`);
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
  assert.equal(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()`),'#19191c');
  await screenshot('design-preview-dark.png');
  await choose('#theme',['Home','ArrowDown','Enter']);
  assert.equal(await evaluate(`document.documentElement.dataset.theme`),'light');
  for(const width of [320,768,1024,1440]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===320});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Overflow at ${width}px`);
    await click('#open-summary');
    assert.equal(await evaluate(`document.getElementById('summary-dialog').scrollWidth<=document.getElementById('summary-dialog').clientWidth`),true,`Summary overflow at ${width}px`);
    if(width===320)await screenshot('workout-summary-mobile.png');
    await click('#close-summary');
    await click('[data-calendar-date="2026-10-28"]');
    assert.equal(await evaluate(`document.getElementById('day-dialog').scrollWidth<=document.getElementById('day-dialog').clientWidth`),true,`Day detail overflow at ${width}px`);
    if(width===320)await screenshot('calendar-details-mobile.png');
    await key('Escape');
    if(width===320)await screenshot('design-preview-mobile.png');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: weekly/monthly/annual summaries, routine counts, unique active days, training time, empty periods, period navigation, monthly calendar, multi-session day details, exercise sets, empty days, month navigation, dialog dismissal/focus restoration, local font, Solar icons, set completion/undo, routine selection, gym separation, system dark mode, manual theme override, and no horizontal overflow at 320/768/1024/1440px. No browser errors.');
} finally {
  if(socket?.readyState===WebSocket.OPEN)socket.close();
  browser.kill();
}
