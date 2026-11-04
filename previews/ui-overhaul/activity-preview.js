(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const asOf = '2026-11-04', goal = 3;
  const date = value => new Date(`${value}T12:00:00Z`);
  const iso = value => value.toISOString().slice(0, 10);
  const shift = (value, days) => { const result = date(value); result.setUTCDate(result.getUTCDate() + days); return iso(result); };
  const fmt = (value, options) => new Intl.DateTimeFormat('en', { timeZone: 'UTC', ...options }).format(date(value));
  const weekStart = value => shift(value, -((date(value).getUTCDay() + 6) % 7));
  const monthStart = value => `${value.slice(0, 7)}-01`;
  const addMonths = (value, amount) => { const result = date(monthStart(value)); result.setUTCMonth(result.getUTCMonth() + amount); return iso(result); };
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const duration = minutes => minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`;
  const activeDays = items => new Set(items.map(item => item.day)).size;
  const exercise = (name, load, reps, groups) => ({ name, groups, sets: [{ load, reps }, { load, reps }] });
  const exercises = {
    Push: [exercise('Incline dumbbell press', '35 lbs per hand', 10, ['Chest', 'Shoulders', 'Triceps'])],
    Pull: [exercise('Lat pulldown', '90 lbs', 10, ['Back', 'Biceps'])],
    Legs: [exercise('Leg press', '135 lbs per side', 10, ['Quads', 'Glutes'])],
    Upper: [exercise('Dumbbell press', '40 lbs per hand', 8, ['Chest', 'Shoulders']), exercise('Cable row', '100 lbs', 10, ['Back', 'Biceps'])],
    Lower: [exercise('Goblet squat', '45 lbs', 10, ['Quads', 'Glutes'])],
    'Full Body': [exercise('Goblet squat', '45 lbs', 10, ['Quads', 'Glutes']), exercise('Cable row', '100 lbs', 10, ['Back', 'Biceps'])],
    Core: [exercise('Crunches', 'Bodyweight', 15, ['Core'])],
  };
  // Shared fictional history: five achieved weeks, then an open week with two active days.
  const closedDates = ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26', '2026-10-28', '2026-10-30'];
  const types = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'];
  const sessions = closedDates.map((day, index) => ({ day, type: types[index % types.length], kind: index % 4 === 3 ? 'home' : 'gym', minutes: 45 + (index % 3) * 5, time: '18:30' }));
  sessions.push({ day: '2026-11-02', type: 'Upper', kind: 'gym', minutes: 50, time: '18:30' }, { day: asOf, type: 'Push', kind: 'gym', minutes: 40, time: '07:00' }, { day: asOf, type: 'Core', kind: 'home', minutes: 15, time: '19:00' });
  sessions.forEach((session, index) => { session.id = `sample-${index}`; session.exercises = exercises[session.type]; session.location = session.kind === 'home' ? 'Home' : 'The neighborhood gym'; });
  const between = (start, end) => sessions.filter(session => session.day >= start && session.day < end);
  let historyMonth = monthStart(asOf), locationFilter = 'all', summaryMode = 'month', summaryAnchor = monthStart(asOf), pendingGoal = null;
  function showScreen(screen) {
    $('.activity-screens').dataset.active = screen;
    $$('[data-activity-screen]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.activityScreen === screen)));
    $(`[data-panel="${screen}"] .phone-content`).scrollTop = 0;
    if (matchMedia('(max-width:760px)').matches) $('.screen-tabs').scrollIntoView({ block: 'start' });
  }
  function filtered(items) { return items.filter(session => locationFilter === 'all' || session.kind === locationFilter); }
  function openDay(day) {
    const items = filtered(sessions.filter(session => session.day === day));
    $('#day-title').textContent = fmt(day, { weekday: 'long', month: 'long', day: 'numeric' });
    $('#day-overview').textContent = items.length ? `${items.length} workout${items.length === 1 ? '' : 's'} · 1 active day · ${duration(items.reduce((sum, item) => sum + item.minutes, 0))} recorded` : 'No workouts recorded for this day and location filter.';
    const cards = items.map(item => {
      const card = el('article', 'day-session'); card.append(el('h3', '', `${item.type} session`), el('p', 'muted', `${item.location} · ${item.time} · ${item.minutes} min`));
      item.exercises.forEach(entry => {
        const block = el('div', 'day-exercise'); block.append(el('strong', '', entry.name));
        entry.sets.forEach((set, index) => block.append(el('p', 'muted', `Set ${index + 1}: ${set.load} × ${set.reps} reps`))); card.append(block);
      }); return card;
    });
    $('#day-workouts').replaceChildren(...(cards.length ? cards : [el('p', 'day-empty', 'A rest day is part of the bigger picture.')]));
    $('#day-dialog').showModal(); $('#close-day').focus();
  }
  function renderHistory() {
    const end = addMonths(historyMonth, 1), items = filtered(between(historyMonth, end));
    $('#calendar-month').textContent = fmt(historyMonth, { month: 'long', year: 'numeric' });
    $('#calendar-total').textContent = `${activeDays(items)} active day${activeDays(items) === 1 ? '' : 's'} · ${items.length} workout${items.length === 1 ? '' : 's'}`;
    $('#history-list-title').textContent = historyMonth === monthStart(asOf) ? 'This month' : fmt(historyMonth, { month: 'long' });
    const cells = Array.from({ length: (date(historyMonth).getUTCDay() + 6) % 7 }, () => { const blank = el('span'); blank.setAttribute('aria-hidden', 'true'); return blank; });
    for (let day = historyMonth; day < end; day = shift(day, 1)) {
      const matches = items.filter(item => item.day === day);
      const button = el('button', `${matches.length ? 'has-workout' : ''} ${matches.length > 1 ? 'multiple' : ''} ${day === asOf ? 'today' : ''} ${day > asOf ? 'future' : ''}`, String(date(day).getUTCDate()));
      button.dataset.historyDay = day;
      button.setAttribute('aria-label', `${fmt(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${matches.length} workouts${day === asOf ? ', today' : ''}`);
      if (day === asOf) button.setAttribute('aria-current', 'date');
      button.addEventListener('click', () => openDay(day)); cells.push(button);
    }
    $('#calendar-days').replaceChildren(...cells);
    const rows = items.slice().sort((a, b) => b.day.localeCompare(a.day) || b.time.localeCompare(a.time)).map(item => {
      const button = el('button', 'history-entry'); button.setAttribute('aria-label', `Open ${item.type} workout on ${item.day}`);
      const tile = el('span', 'date-tile'); tile.append(el('strong', '', String(date(item.day).getUTCDate())), el('small', '', fmt(item.day, { weekday: 'short' })));
      const copy = el('span', 'entry-copy'); copy.append(el('strong', '', `${item.type} session`), el('small', '', `${item.location} · ${item.minutes} min`));
      const arrow = el('span', 'entry-arrow', '›'); arrow.setAttribute('aria-hidden', 'true'); button.append(tile, copy, arrow); button.addEventListener('click', () => openDay(item.day)); return button;
    });
    $('#history-list').replaceChildren(...(rows.length ? rows : [el('p', 'empty-history', 'No workouts recorded here yet. Choose another month or location.')]));
  }
  function summaryRange() {
    if (summaryMode === 'week') { const start = weekStart(summaryAnchor); return { start, end: shift(start, 7) }; }
    if (summaryMode === 'year') return { start: `${summaryAnchor.slice(0, 4)}-01-01`, end: `${Number(summaryAnchor.slice(0, 4)) + 1}-01-01` };
    return { start: monthStart(summaryAnchor), end: addMonths(summaryAnchor, 1) };
  }
  function renderSummary() {
    const { start, end } = summaryRange(), items = between(start, end);
    const label = summaryMode === 'year' ? start.slice(0, 4) : summaryMode === 'month' ? fmt(start, { month: 'long', year: 'numeric' }) : `${fmt(start, { month: 'short', day: 'numeric' })}–${fmt(shift(end, -1), { month: 'short', day: 'numeric' })}`;
    $('#summary-period-title').textContent = label;
    $('#summary-period-note').textContent = start <= asOf && end > asOf ? 'So far · through Nov 4' : start > asOf ? 'No recorded activity' : 'Completed period';
    $('#summary-days').textContent = activeDays(items); $('#summary-sessions').textContent = items.length; $('#summary-time').textContent = duration(items.reduce((sum, item) => sum + item.minutes, 0));
    $('#summary-gym').textContent = items.filter(item => item.kind === 'gym').length; $('#summary-home').textContent = items.filter(item => item.kind === 'home').length;
    $('#summary-empty').hidden = items.length > 0;
    $('#summary-goal-context').hidden = summaryMode === 'month';
    if (summaryMode === 'week') $('#summary-goal-context').textContent = `${activeDays(items)} / ${goal} active days · Weekly goal`;
    if (summaryMode === 'year') {
      let running = 0, longest = 0;
      for (let week = weekStart(start); week < end; week = shift(week, 7)) {
        running = activeDays(between(week, shift(week, 7))) >= goal ? running + 1 : 0;
        longest = Math.max(longest, running);
      }
      $('#summary-goal-context').textContent = `Longest weekly streak: ${longest} weeks in this year`;
    }
    const buckets = [];
    if (summaryMode === 'year') {
      for (let month = 0; month < 12; month++) { const bucket = `${start.slice(0, 4)}-${String(month + 1).padStart(2, '0')}-01`; buckets.push({ label: fmt(bucket, { month: 'narrow' }), description: fmt(bucket, { month: 'long' }), value: activeDays(items.filter(item => item.day.startsWith(bucket.slice(0, 7)))) }); }
    } else if (summaryMode === 'week') {
      for (let offset = 0; offset < 7; offset++) { const bucket = shift(start, offset); buckets.push({ label: fmt(bucket, { weekday: 'narrow' }), description: fmt(bucket, { weekday: 'long' }), value: activeDays(items.filter(item => item.day === bucket)) }); }
    } else {
      for (let bucket = start; bucket < end; bucket = shift(bucket, 7)) {
        const next = shift(bucket, 7) < end ? shift(bucket, 7) : end;
        buckets.push({ label: `${date(bucket).getUTCDate()}–${date(shift(next, -1)).getUTCDate()}`, description: `Days ${date(bucket).getUTCDate()}–${date(shift(next, -1)).getUTCDate()}`, value: activeDays(items.filter(item => item.day >= bucket && item.day < next)) });
      }
    }
    const max = Math.max(1, ...buckets.map(bucket => bucket.value));
    $('#chart-unit').textContent = summaryMode === 'year' ? 'Active days / month' : summaryMode === 'month' ? 'Active days / date range' : 'Activity by day';
    $('#activity-chart').setAttribute('aria-label', buckets.map(bucket => `${bucket.description}: ${bucket.value} active days`).join(', '));
    $('#activity-chart').replaceChildren(...buckets.map(bucket => { const column = el('div', 'chart-column'); const bar = el('span', `bar${bucket.value ? '' : ' zero'}`); bar.style.height = `${Math.max(2, bucket.value / max * 65)}px`; column.append(el('strong', '', String(bucket.value)), bar, el('small', '', bucket.label)); return column; }));
    const shownTypes = [...new Set(['Push', 'Pull', 'Legs', ...items.map(item => item.type)])];
    $('#type-breakdown').replaceChildren(...shownTypes.map(type => {
      const count = items.filter(item => item.type === type).length;
      const row = el('div', 'type-row'); row.dataset.type = type; row.dataset.count = count;
      const track = el('span', 'type-track'), fill = el('span', 'type-fill'); fill.style.width = `${items.length ? count / items.length * 100 : 0}%`; track.append(fill); row.append(el('span', '', type), track, el('strong', '', String(count))); return row;
    }));
    const groups = [...new Set(items.flatMap(item => item.exercises.flatMap(entry => entry.groups)))].sort();
    $('#muscle-chips').replaceChildren(...(groups.length ? groups.map(group => el('span', '', group)) : [el('p', 'small muted', 'No exercise coverage recorded in this period.')]));
  }
  function renderConsistency() {
    const current = weekStart(asOf), first = weekStart(sessions[0].day), weeks = [];
    for (let start = first; start <= current; start = shift(start, 7)) { const days = activeDays(between(start, shift(start, 7))); weeks.push({ start, days, met: days >= goal }); }
    let longest = 0, running = 0;
    weeks.forEach(week => { running = week.met ? running + 1 : 0; longest = Math.max(longest, running); });
    let cursor = weeks.length - 1, streak = 0; if (!weeks[cursor].met) cursor--;
    while (cursor >= 0 && weeks[cursor].met) { streak++; cursor--; }
    $('#current-streak').textContent = streak; $('#longest-streak').textContent = `${longest} weeks`;
    const currentDays = weeks.at(-1).days; $('#week-active').textContent = currentDays;
    $('.goal-track').setAttribute('aria-valuenow', String(Math.min(goal, currentDays))); $('.goal-track>span').style.width = `${Math.min(1, currentDays / goal) * 100}%`;
    $('#consistency-week').replaceChildren(...Array.from({ length: 7 }, (_, index) => {
      const day = shift(current, index), active = sessions.some(item => item.day === day);
      const cell = el('span', `${active ? 'active' : ''} ${day === asOf ? 'today' : ''}`); cell.setAttribute('aria-label', `${fmt(day, { weekday: 'long', month: 'short', day: 'numeric' })}, ${active ? 'workout completed' : 'no workout logged'}`); cell.append(el('small', '', fmt(day, { weekday: 'narrow' })), el('b', '', active ? '✓' : String(date(day).getUTCDate()))); return cell;
    }));
    $('#past-weeks').replaceChildren(...weeks.slice(0, -1).reverse().map(week => { const row = el('div', 'past-week'); row.append(el('span', '', `${fmt(week.start, { month: 'short', day: 'numeric' })}–${fmt(shift(week.start, 6), { month: 'short', day: 'numeric' })}`), el('span', week.met ? 'met' : 'muted', week.met ? `✓ ${week.days}/${goal} days` : `${week.days}/${goal} days`)); return row; }));
  }
  $('#theme-toggle').addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#theme-toggle').setAttribute('aria-pressed', String(dark)); $('#theme-toggle').textContent = dark ? '☀ Light appearance' : '☾ Dark appearance'; });
  $$('[data-activity-screen]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.activityScreen)));
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => { locationFilter = button.dataset.filter; $$('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); renderHistory(); }));
  $('#history-previous').addEventListener('click', () => { historyMonth = addMonths(historyMonth, -1); renderHistory(); });
  $('#history-next').addEventListener('click', () => { historyMonth = addMonths(historyMonth, 1); renderHistory(); });
  $('#close-day').addEventListener('click', () => $('#day-dialog').close());
  $$('[data-period]').forEach(button => button.addEventListener('click', () => { summaryMode = button.dataset.period; summaryAnchor = asOf; $$('[data-period]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); renderSummary(); }));
  function moveSummary(direction) { summaryAnchor = summaryMode === 'week' ? shift(summaryAnchor, 7 * direction) : addMonths(summaryAnchor, (summaryMode === 'year' ? 12 : 1) * direction); renderSummary(); }
  $('#summary-previous').addEventListener('click', () => moveSummary(-1)); $('#summary-next').addEventListener('click', () => moveSummary(1));
  $('#open-consistency').addEventListener('click', () => showScreen('consistency'));
  $('#change-goal').addEventListener('click', () => { $('#goal-select').value = String(pendingGoal ?? goal); $('#goal-dialog').showModal(); });
  $('#cancel-goal').addEventListener('click', () => $('#goal-dialog').close());
  $('#goal-form').addEventListener('submit', event => { event.preventDefault(); pendingGoal = Number($('#goal-select').value); $('#pending-goal').hidden = false; $('#pending-goal').textContent = `Next Monday, Nov 9: ${pendingGoal} active days per week.`; $('#goal-dialog').close(); });
  renderHistory(); renderSummary(); renderConsistency();
})();
