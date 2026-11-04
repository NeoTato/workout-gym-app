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
  `--user-data-dir=${fromRoot('.preview-browser/activity-check')}`, 'about:blank',
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


  await command('Page.navigate',{url:pathToFileURL(fromRoot('previews/ui-overhaul/activity-preview.html')).href});
  await evaluate("new Promise(resolve=>{if(document.readyState==='complete')resolve();else addEventListener('load',resolve,{once:true})}).then(()=>document.fonts.ready).then(()=>true)");
  assert.equal(await evaluate('document.querySelector("#calendar-total").textContent'),'2 active days \u00b7 3 workouts');
  assert.equal(await evaluate('document.querySelector("#summary-sessions").textContent'),'3');
  assert.equal(await evaluate('document.querySelector("#summary-days").textContent'),'2');
  assert.equal(await evaluate('document.querySelector("#summary-time").textContent'),'1h 45m');
  assert.equal(await evaluate('document.querySelector("#current-streak").textContent'),'5');
  assert.equal(await evaluate('Array.from(document.querySelectorAll(".type-row")).reduce((sum,row)=>sum+Number(row.dataset.count),0)'),3);
  assert.equal(await evaluate('document.querySelector("#summary-gym").textContent'),'2');
  assert.equal(await evaluate('document.querySelector("#summary-home").textContent'),'1');
  await screenshot('activity-preview-desktop.png');
  await click('[data-history-day="2026-11-04"]');
  assert.equal(await evaluate('document.querySelectorAll(".day-session").length'),2);
  assert.equal(await evaluate('document.querySelector("#day-overview").textContent.includes("1 active day")'),true);
  await screenshot('activity-preview-day-details.png');await key('Escape');
  assert.equal(await evaluate('document.activeElement.dataset.historyDay'),'2026-11-04');
  await click('[data-history-day="2026-11-03"]');assert.equal(await evaluate('document.querySelectorAll(".day-session").length'),0);await click('#close-day');
  await click('[data-filter="home"]');assert.equal(await evaluate('document.querySelector("#calendar-total").textContent'),'1 active day \u00b7 1 workout');
  await click('[data-filter="all"]');await click('#history-next');assert.equal(await evaluate('document.querySelector("#calendar-total").textContent'),'0 active days \u00b7 0 workouts');
  await click('#history-previous');await click('#history-previous');assert.equal(await evaluate('document.querySelector("#calendar-total").textContent'),'13 active days \u00b7 13 workouts');await click('#history-next');
  await click('[data-period="week"]');assert.equal(await evaluate('document.querySelector("#summary-sessions").textContent'),'3');
  await click('#summary-previous');assert.equal(await evaluate('document.querySelector("#summary-days").textContent'),'3');
  await click('[data-period="year"]');assert.equal(await evaluate('document.querySelector("#summary-sessions").textContent'),'18');assert.equal(await evaluate('document.querySelector("#summary-days").textContent'),'17');
  assert.equal(await evaluate('document.querySelectorAll(".chart-column").length'),12);
  assert.equal(await evaluate('document.querySelector("#summary-goal-context").textContent.includes("5 weeks")'),true);
  await click('#summary-previous');assert.equal(await evaluate('document.querySelector("#summary-empty").hidden'),false);
  await click('[data-period="month"]');await click('#summary-next');assert.equal(await evaluate('document.querySelector("#summary-sessions").textContent'),'0');
  await click('[data-period="month"]');
  await click('#change-goal');await evaluate('document.querySelector("#goal-select").value="5"');await click('#cancel-goal');
  assert.equal(await evaluate('document.querySelector("#pending-goal").hidden'),true);
  await click('#change-goal');assert.equal(await evaluate('document.querySelector("#goal-select").value'),'3');
  await evaluate('document.querySelector("#goal-select").value="4"');await click('#goal-form button[type="submit"]');
  assert.equal(await evaluate('document.querySelector("#pending-goal").textContent.includes("Nov 9: 4")'),true);
  assert.equal(await evaluate('document.querySelector(".goal-track").getAttribute("aria-valuemax")'),'3');
  assert.equal(await evaluate('document.querySelector("#current-streak").textContent'),'5');
  await click('#theme-toggle');await evaluate('document.querySelectorAll(".phone-content").forEach(el=>el.scrollTop=0);scrollTo(0,0)');await screenshot('activity-preview-dark.png');await click('#theme-toggle');
  for(const width of [390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:true});
    for(const page of ['history','summary','consistency']){
      await click('[data-activity-screen="'+page+'"]');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'No overflow '+width+' '+page);
      if(width===390){await evaluate('scrollTo(0,0)');await screenshot('activity-preview-'+page+'-mobile.png');}
    }
    await click('[data-activity-screen="history"]');await click('[data-history-day="2026-11-04"]');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await key('Escape');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: history calendar, multiple sessions per day, day details and focus restoration, rest days, location filters, month navigation, weekly/monthly/annual summaries, type/location totals, empty periods, weekly streak, next-week-only goal changes, light/dark, and 320/390px layouts.');
} finally {
  if(socket?.readyState===WebSocket.OPEN)socket.close();browser.kill();
}
