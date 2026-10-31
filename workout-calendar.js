// Fictional records for the design preview, not imported personal workout data.
(() => {
  const today = '2026-10-31';
  const exercise = (name, load, reps = [10, 10, 8]) => ({name, sets: reps.map(rep => `${load} × ${rep} reps`)});
  const routines = {
    Push: [exercise('Incline dumbbell press', '40 lbs per hand', [10, 10, 8, 8]), exercise('Flat dumbbell press', '30 lbs per hand', [10, 10, 10, 8]), exercise('Pec deck', '80 lbs', [12, 12, 10, 10])],
    Pull: [exercise('Lat pulldown', '90 lbs'), exercise('Seated cable row', '66 lbs'), exercise('Pull-ups', 'Bodyweight', [4, 4, 3])],
    Legs: [exercise('Leg press', '135 lbs per side'), exercise('Leg extension', '70 lbs'), exercise('Leg curl', '70 lbs')],
    'Full Body': [exercise('Squat', 'Bodyweight', [15, 15, 12]), exercise('Push-ups', 'Bodyweight', [12, 10, 8]), exercise('Dumbbell row', '20 lbs per hand')],
    Core: [exercise('Crunches', 'Bodyweight', [15, 15, 12]), exercise('Leg raises', 'Bodyweight', [10, 10, 8])],
  };
  const records = [
    [2, 'Push', 'Gym A', '17:30', 45], [5, 'Pull', 'Gym A', '18:00', 48],
    [7, 'Legs', 'Gym B', '17:45', 52], [9, 'Full Body', 'Home', '08:00', 30],
    [12, 'Push', 'Gym A', '18:15', 44], [14, 'Pull', 'Gym A', '18:00', 46],
    [16, 'Legs', 'Gym B', '17:30', 50], [19, 'Full Body', 'Home', '07:30', 28],
    [24, 'Push', 'Gym A', '10:00', 46], [26, 'Full Body', 'Home', '08:00', 32],
    [28, 'Pull', 'Gym A', '17:30', 48], [28, 'Core', 'Home', '20:00', 12],
  ].map(([day, routine, location, time, minutes]) => ({
    date: `2026-10-${String(day).padStart(2, '0')}`, routine, location, time, minutes, exercises: routines[routine],
  }));
  const byDate = new Map();
  records.forEach(record => byDate.set(record.date, [...(byDate.get(record.date) || []), record]));
  let month = new Date(2026, 9, 1, 12);
  const fullDate = date => new Intl.DateTimeFormat('en', {weekday:'long', month:'long', day:'numeric', year:'numeric'}).format(date);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const calendar = document.createElement('section');
  calendar.className = 'card calendar-card';
  calendar.setAttribute('aria-labelledby', 'calendar-title');
  calendar.innerHTML = `
    <div class="row"><h3 id="calendar-title">Your month</h3><span class="chip">Sample</span></div>
    <div class="row calendar-toolbar">
      <button id="calendar-previous" class="month-arrow" aria-label="Previous month">‹</button>
      <h4 id="calendar-month" aria-live="polite"></h4>
      <button id="calendar-next" class="month-arrow" aria-label="Next month">›</button>
    </div>
    <div class="calendar-weekdays" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
    <div id="calendar-days" class="calendar-days" role="group" aria-label="Days of the month"></div>
    <p id="calendar-summary" class="calendar-summary" aria-live="polite"></p>
    <small class="calendar-legend"><span aria-hidden="true">✓</span> Completed workout · Tap a day for details</small>`;
  const recentTitle = [...document.querySelectorAll('h3')].find(heading => heading.textContent === 'Recent workouts');
  recentTitle.before(calendar);
  const dialog = document.createElement('dialog');
  dialog.id = 'day-dialog';
  dialog.setAttribute('aria-labelledby', 'day-title');
  dialog.innerHTML = `<div class="row day-dialog-top"><div class="eyebrow">Workout history · Sample</div><button id="close-day" aria-label="Close workout details" autofocus>✕</button></div><h2 id="day-title"></h2><p id="day-summary" class="muted"></p><div id="day-sessions"></div>`;
  document.body.append(dialog);
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function showDay(date, trigger) {
    const key = dateKey(date);
    const sessions = byDate.get(key) || [];
    calendar.querySelectorAll('[data-calendar-date]').forEach(button => button.setAttribute('aria-pressed', String(button === trigger)));
    document.getElementById('day-title').textContent = fullDate(date);
    document.getElementById('day-summary').textContent = sessions.length ? `${sessions.length} completed workout${sessions.length === 1 ? '' : 's'} · ${sessions.reduce((sum, session) => sum + session.minutes, 0)} min total` : 'A little space between sessions is okay.';
    const container = document.getElementById('day-sessions');
    container.replaceChildren();
    if (!sessions.length) {
      container.append(element('p', 'No completed workouts on this day.', 'empty-day'));
    }
    sessions.forEach(session => {
      const card = element('article', '', 'day-session');
      card.append(element('span', `${session.time} · ${session.minutes} min`, 'chip'), element('h3', session.routine), element('p', session.location, 'muted'));
      const count = session.exercises.reduce((sum, item) => sum + item.sets.length, 0);
      card.append(element('p', `${session.exercises.length} exercises · ${count} completed sets`, 'hint muted'));
      session.exercises.forEach(item => {
        const group = element('section', '', 'day-exercise');
        group.append(element('h4', item.name));
        const list = document.createElement('ol');
        item.sets.forEach((set, index) => {
          const row = document.createElement('li');
          row.append(element('span', `Set ${index + 1}`, 'muted'), element('strong', set));
          list.append(row);
        });
        group.append(list);
        card.append(group);
      });
      container.append(card);
    });
    dialog.showModal();
  }
  function renderMonth() {
    const monthLabel = new Intl.DateTimeFormat('en', {month:'long', year:'numeric'}).format(month);
    document.getElementById('calendar-month').textContent = monthLabel;
    const days = document.getElementById('calendar-days');
    days.setAttribute('aria-label', monthLabel);
    days.replaceChildren();
    const offset = (month.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('span');
      blank.setAttribute('aria-hidden', 'true');
      days.append(blank);
    }
    const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    let activeDays = 0, workoutCount = 0;
    for (let day = 1; day <= length; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day, 12);
      const key = dateKey(date), sessions = byDate.get(key) || [];
      const button = element('button', '', 'calendar-day');
      button.type = 'button';
      button.dataset.calendarDate = key;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'day-dialog');
      button.setAttribute('aria-label', `${fullDate(date)}${key === today ? ', today' : ''}, ${sessions.length ? `${sessions.length} completed workout${sessions.length === 1 ? '' : 's'}` : 'no completed workouts'}`);
      button.append(element('span', String(day)));
      const marker = element('span', sessions.length ? '✓' : '', 'calendar-marker');
      marker.setAttribute('aria-hidden', 'true');
      button.append(marker);
      if (sessions.length) {button.classList.add('has-workout'); activeDays++; workoutCount += sessions.length;}
      if (key === today) button.setAttribute('aria-current', 'date');
      button.addEventListener('click', () => showDay(date, button));
      days.append(button);
    }
    document.getElementById('calendar-summary').textContent = `${activeDays} active days · ${workoutCount} workouts`;
  }
  document.getElementById('calendar-previous').addEventListener('click', () => {month = new Date(month.getFullYear(), month.getMonth() - 1, 1, 12); renderMonth();});
  document.getElementById('calendar-next').addEventListener('click', () => {month = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12); renderMonth();});
  document.getElementById('close-day').addEventListener('click', () => dialog.close());
  renderMonth();
  createWorkoutSummary({records, today, calendar, dateKey, element});
})();
