// Uses the same completed sample sessions as the calendar; no independent totals.
function createWorkoutSummary({records, today, calendar, dateKey, element}) {
  const [year, month, day] = today.split('-').map(Number);
  const currentDate = new Date(year, month - 1, day, 12);
  let anchor = new Date(currentDate), period = 'month';
  const opener = element('button', 'View workout summaries →', 'full summary-opener');
  opener.id = 'open-summary';
  opener.setAttribute('aria-haspopup', 'dialog');
  opener.setAttribute('aria-controls', 'summary-dialog');
  calendar.append(opener);
  const dialog = document.createElement('dialog');
  dialog.id = 'summary-dialog';
  dialog.setAttribute('aria-labelledby', 'summary-title');
  dialog.innerHTML = `
    <div class="row day-dialog-top"><div class="eyebrow">Your progress · Sample</div><button id="close-summary" aria-label="Close workout summary" autofocus>✕</button></div>
    <h2 id="summary-title">Workout summary</h2>
    <div class="summary-periods" role="group" aria-label="Summary period">
      <button data-summary-period="week" aria-pressed="false">Week</button>
      <button data-summary-period="month" aria-pressed="true">Month</button>
      <button data-summary-period="year" aria-pressed="false">Year</button>
    </div>
    <div class="row calendar-toolbar">
      <button id="summary-previous" class="month-arrow" aria-label="Previous month">‹</button>
      <h3 id="summary-period-title" aria-live="polite"></h3>
      <button id="summary-next" class="month-arrow" aria-label="Next month">›</button>
    </div>
    <p id="summary-period-status" class="hint muted"></p>
    <div class="summary-metrics" aria-live="polite">
      <div><strong id="summary-active"></strong><small>Active days</small></div>
      <div><strong id="summary-sessions"></strong><small>Completed sessions</small></div>
      <div><strong id="summary-time"></strong><small>Training time</small></div>
    </div>
    <p id="summary-goal" class="summary-goal" hidden></p>
    <section class="card summary-card" aria-labelledby="breakdown-title">
      <h3 id="breakdown-title">Sessions by type</h3>
      <p class="hint muted">Each completed session counts once under its chosen routine.</p>
      <div id="summary-breakdown"></div>
    </section>
    <section class="card summary-card" aria-labelledby="location-title"><h3 id="location-title">Where you trained</h3><div class="summary-location"><span>Gym <strong id="summary-gym"></strong></span><span>Home <strong id="summary-home"></strong></span></div></section>
    <section class="card summary-card" aria-labelledby="coverage-title"><h3 id="coverage-title">Muscle groups trained</h3><p class="hint muted">Sessions with completed exercises for each group. A session can cover several groups.</p><div id="summary-coverage" class="summary-coverage"></div></section>
    <p class="hint muted">Active days count once, even with multiple sessions. Shortened sessions still count under their chosen routine. These summaries use fictional calendar records, not your in-progress sample sets.</p>`;
  document.body.append(dialog);
  const get = id => document.getElementById(id);
  const groups = {
    'Incline dumbbell press':['Chest','Shoulders','Triceps'], 'Flat dumbbell press':['Chest','Shoulders','Triceps'], 'Pec deck':['Chest'],
    'Lat pulldown':['Back','Biceps'], 'Seated cable row':['Back','Biceps'], 'Pull-ups':['Back','Biceps'],
    'Leg press':['Quads','Glutes'], 'Leg extension':['Quads'], 'Leg curl':['Hamstrings'],
    'Squat':['Quads','Glutes'], 'Push-ups':['Chest','Shoulders','Triceps'], 'Dumbbell row':['Back','Biceps'],
    'Crunches':['Core'], 'Leg raises':['Core'],
  };
  function bounds() {
    const start = new Date(anchor), end = new Date(anchor);
    if (period === 'week') {
      start.setDate(start.getDate() - (start.getDay() + 6) % 7);
      end.setTime(start.getTime()); end.setDate(end.getDate() + 7);
    } else if (period === 'month') {
      start.setDate(1); end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1);
    } else {
      start.setFullYear(start.getFullYear(), 0, 1); end.setFullYear(start.getFullYear() + 1, 0, 1);
    }
    return {start, end};
  }
  function render() {
    const {start, end} = bounds();
    const startKey = dateKey(start), endKey = dateKey(end);
    const sessions = records.filter(record => record.date >= startKey && record.date < endKey && record.date <= today);
    const activeDays = new Set(sessions.map(record => record.date)).size;
    const minutes = sessions.reduce((sum, record) => sum + record.minutes, 0);
    const counts = new Map(), coverage = new Map();
    sessions.forEach(session => {
      counts.set(session.routine, (counts.get(session.routine) || 0) + 1);
      const trained = new Set(session.exercises.filter(item => item.sets.length).flatMap(item => groups[item.name] || []));
      trained.forEach(group => coverage.set(group, (coverage.get(group) || 0) + 1));
    });
    const shortDate = date => new Intl.DateTimeFormat('en', {month:'short', day:'numeric', year:'numeric'}).format(date);
    const last = new Date(end); last.setDate(last.getDate() - 1);
    get('summary-period-title').textContent = period === 'week' ? `${shortDate(start)} – ${shortDate(last)}` : new Intl.DateTimeFormat('en', period === 'month' ? {month:'long', year:'numeric'} : {year:'numeric'}).format(start);
    const current = today >= startKey && today < endKey;
    get('summary-period-status').textContent = current ? `This ${period}, so far · through ${shortDate(currentDate)}` : (startKey > today ? 'Upcoming period · no completed workouts yet' : 'Completed period · sample history');
    get('summary-active').textContent = activeDays;
    get('summary-sessions').textContent = sessions.length;
    get('summary-time').textContent = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
    get('summary-gym').textContent = sessions.filter(session => session.location !== 'Home').length;
    get('summary-home').textContent = sessions.filter(session => session.location === 'Home').length;
    get('summary-goal').hidden = period !== 'week';
    get('summary-goal').textContent = `${activeDays} / 3 active days · sample weekly target${activeDays >= 3 ? ' met ✓' : ''}`;
    get('summary-previous').setAttribute('aria-label', `Previous ${period}`);
    get('summary-next').setAttribute('aria-label', `Next ${period}`);
    const breakdown = get('summary-breakdown'); breakdown.replaceChildren();
    if (!counts.size) breakdown.append(element('p', 'No completed workouts in this period.', 'empty-summary muted'));
    const maxCount = Math.max(1, ...counts.values());
    counts.forEach((count, routine) => {
      const row = element('div', '', 'summary-breakdown-row'); row.dataset.summaryRoutine = routine;
      const label = element('div', '', 'row'); label.append(element('span', routine), element('strong', count));
      const track = element('div', '', 'summary-track'), bar = element('span', '', 'summary-fill');
      track.setAttribute('aria-hidden', 'true'); bar.style.width = `${count / maxCount * 100}%`;
      track.append(bar); row.append(label, track); breakdown.append(row);
    });
    const coverageList = get('summary-coverage'); coverageList.replaceChildren();
    if (!coverage.size) coverageList.append(element('p', 'No completed exercise data in this period.', 'hint muted'));
    coverage.forEach((count, group) => coverageList.append(element('span', `${group} · ${count}`, 'chip')));
  }
  opener.addEventListener('click', () => {render(); dialog.showModal();});
  get('close-summary').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-summary-period]').forEach(button => button.addEventListener('click', () => {
    period = button.dataset.summaryPeriod;
    dialog.querySelectorAll('[data-summary-period]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    render();
  }));
  function move(direction) {
    const {start} = bounds(); anchor = start;
    if (period === 'week') anchor.setDate(anchor.getDate() + direction * 7);
    else if (period === 'month') anchor.setMonth(anchor.getMonth() + direction);
    else anchor.setFullYear(anchor.getFullYear() + direction);
    render();
  }
  get('summary-previous').addEventListener('click', () => move(-1));
  get('summary-next').addEventListener('click', () => move(1));
}
