'use strict';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const exercises = [
  { id: 'pullups', name: 'Pull Ups', equipment: 'Pull-up bar', unit: '', sets: [[null,5],[null,5],[null,2]] },
  { id: 'pulldown', name: 'Lateral Pulldowns', equipment: 'Cable machine', unit: 'lb', sets: [[70,13],[100,12],[100,8]] },
  { id: 'row', name: 'Close Grip Horizontal Pull', equipment: 'Cable machine', unit: 'lb', sets: [[85,12],[85,6],[85,8]] },
  { id: 'preacher', name: 'Dumbbell Preacher Curl', equipment: 'Dumbbells · per hand', unit: 'kg', sets: [[12.5,4],[10,8],[10,8]] },
  { id: 'hammer', name: 'Hammer Dumbbell Curl', equipment: 'Dumbbells · per hand', unit: 'kg', sets: [[5,12],[5,12],[7.5,10]] },
  { id: 'situps', name: 'Inclined Situps', equipment: 'Incline bench', unit: 'kg', sets: [[10,18],[10,18]] },
  { id: 'halos', name: 'Halos', equipment: 'Kettlebell', unit: 'kg', sets: [[10,12],[10,12],[10,12]] },
];
const groups = [
  { id: 'back', title: 'Pull / Back', ids: ['pullups','pulldown','row'] },
  { id: 'biceps', title: 'Pull / Biceps', ids: ['preacher','hammer'] },
  { id: 'core', title: 'Core', ids: ['situps','halos'] },
];
let currentScreen = 'home', currentTab = 'home', detailReturn = 'home', selectedExercise = null, chooserScroll = 0, toastTimeout;
const viewport = $('#viewport');

function showScreen(name) {
  currentScreen = name;
  $$('[data-screen]').forEach(section => { section.hidden = section.dataset.screen !== name; });
  const focused = name === 'edit' || name === 'exercise' || name === 'workout';
  $('.phone').dataset.focused = String(focused);
  $('.bottom-nav').hidden = focused;
  $('#edit-footer').hidden = name !== 'edit';
  $('#exercise-footer').hidden = name !== 'exercise';
  $$('[data-nav]').forEach(button => {
    if (button.closest('.bottom-nav') && button.dataset.nav === currentTab) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  $('#toast').textContent = '';
  requestAnimationFrame(() => {
    viewport.scrollTop = name === 'edit' ? chooserScroll : 0;
    $(`[data-screen="${name}"] h2`).focus({ preventScroll: true });
  });
}
function navigate(name) { currentTab = name; showScreen(name); }
$$('[data-nav]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.nav)));
$$('[data-go]').forEach(button => button.addEventListener('click', () => button.dataset.go === 'home' ? navigate('home') : showScreen(button.dataset.go)));
$$('[data-open-workout]').forEach(button => button.addEventListener('click', () => {
  detailReturn = currentTab;
  $('#detail-back span').textContent = detailReturn === 'history' ? 'History' : 'Home';
  showScreen('detail');
}));
$('#detail-back').addEventListener('click', () => navigate(detailReturn));
$('#workout-action').addEventListener('click', () => showScreen('workout'));
$('#draft-toggle').addEventListener('change', event => {
  const hasDraft = event.target.checked;
  $('#resume-card').hidden = !hasDraft;
  $('#workout-action').setAttribute('aria-label', hasDraft ? 'Resume workout' : 'Start workout');
  $('#workout-title').textContent = hasDraft ? 'Your workout' : 'Set up workout';
  $('#draft-description').textContent = hasDraft ? 'Continue your unfinished session. Your existing entries stay intact.' : 'Start with your date, location and session type.';
});
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme').setAttribute('aria-pressed', String(theme === 'dark'));
  $('#theme').textContent = theme === 'dark' ? 'Light appearance' : 'Dark appearance';
  $$('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme)));
}
$('#theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$$('[data-theme-choice]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.themeChoice)));
$$('[data-report]').forEach(button => button.addEventListener('click', () => {
  const summary = button.dataset.report === 'summary';
  $('#report-panel').hidden = false;
  $('#report-title').textContent = summary ? 'November at a glance' : 'Your exercise library';
  $('#report-copy').textContent = summary ? '6 workouts · Push 2 · Pull 2 · Legs 2. Week, month and year controls belong in this view.' : 'Search and category filters belong here. Existing exercise progress charts and equipment comparisons stay available.';
}));

for (const label of ['M','T','W','T','F','S','S']) {
  const cell = document.createElement('span'); cell.textContent = label; $('#calendar').append(cell);
}
for (let blank = 0; blank < 6; blank++) $('#calendar').append(document.createElement('span'));
for (let day = 1; day <= 30; day++) {
  const cell = document.createElement('button'); cell.type = 'button'; cell.textContent = day;
  cell.setAttribute('aria-label', `November ${day}${[7,10,12,17,19,21].includes(day) ? ', workout completed' : ''}`);
  if ([7,10,12,17,19,21].includes(day)) cell.classList.add('logged');
  if (day === 22) cell.classList.add('current');
  cell.disabled = day !== 21;
  if (day === 21) cell.addEventListener('click', () => { detailReturn = 'history'; $('#detail-back span').textContent = 'History'; showScreen('detail'); });
  $('#calendar').append(cell);
}

function renderGroups(container, editable) {
  for (const group of groups) {
    const section = document.createElement('div'); section.className = 'group';
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML = `<span>${group.title}<small>${group.ids.length} exercises</small></span><span aria-hidden="true">+</span>`;
    toggle.setAttribute('aria-controls', `${editable ? 'edit' : 'summary'}-${group.id}`);
    const list = document.createElement('div'); list.className = 'group-items'; list.hidden = true; list.id = `${editable ? 'edit' : 'summary'}-${group.id}`;
    toggle.addEventListener('click', () => { list.hidden = !list.hidden; toggle.setAttribute('aria-expanded', String(!list.hidden)); toggle.lastElementChild.textContent = list.hidden ? '+' : '−'; });
    for (const id of group.ids) {
      const exercise = exercises.find(item => item.id === id);
      const row = document.createElement(editable ? 'button' : 'div'); row.className = editable ? 'exercise-row' : 'summary-row';
      if (editable) {
        row.type = 'button'; row.dataset.exercise = id;
        row.innerHTML = `<span><strong>${exercise.name}</strong><small>${exercise.sets.length} sets · ${exercise.equipment}</small></span>${icon('arrow')}`;
        row.addEventListener('click', () => openEditor(exercise, group.title));
      } else { const title = document.createElement('strong'); title.textContent = exercise.name; const detail = document.createElement('p'); detail.dataset.summaryId = id; row.append(title,detail); }
      list.append(row);
    }
    section.append(toggle,list); container.append(section);
  }
}
renderGroups($('#edit-groups'), true);
renderGroups($('#summary-exercises'), false);
function refreshSummary() {
  for (const exercise of exercises) {
    $(`[data-summary-id="${exercise.id}"]`).textContent = exercise.sets.map(([load,reps]) => load == null ? `${reps} reps` : `${load} ${exercise.unit} × ${reps}`).join(' · ');
    $(`[data-exercise="${exercise.id}"] small`).textContent = `${exercise.sets.length} sets · ${exercise.equipment}`;
  }
}
refreshSummary();
$('#edit-workout').addEventListener('click', () => { chooserScroll = 0; showScreen('edit'); });
$('#done-editing').addEventListener('click', () => showScreen('detail'));
$('#cancel-exercise').addEventListener('click', () => showScreen('edit'));

function openEditor(exercise, category) {
  chooserScroll = viewport.scrollTop; selectedExercise = exercise;
  $('#exercise-title').textContent = exercise.name; $('#exercise-category').textContent = category;
  $('#equipment').value = exercise.equipment; $('#edit-error').textContent = ''; $('#set-fields').replaceChildren();
  exercise.sets.forEach(([load,reps], index) => {
    const row = document.createElement('div'); row.className = 'set-row';
    row.innerHTML = `<span>${index+1}</span><label for="load-${index}">${load == null ? 'Load' : exercise.unit + ' / per hand or total'}<input id="load-${index}" aria-label="Set ${index+1} load" inputmode="decimal" type="number" min="0" step="any"></label><label for="reps-${index}">Reps<input id="reps-${index}" aria-label="Set ${index+1} reps" inputmode="numeric" type="number" min="1" step="1"></label>`;
    const input = row.querySelector('[id^="load-"]'); input.value = load ?? ''; input.disabled = load == null;
    row.querySelector('[id^="reps-"]').value = reps;
    $('#set-fields').append(row);
  });
  showScreen('exercise');
}
$('#save-exercise').addEventListener('click', () => {
  if (!selectedExercise) return;
  const nextSets = selectedExercise.sets.map(([load], index) => [load == null ? null : Number($(`#load-${index}`).value), Number($(`#reps-${index}`).value)]);
  if (nextSets.some(([load,reps], index) => !Number.isSafeInteger(reps) || reps < 1 || load != null && (!Number.isFinite(load) || load < 0 || $(`#load-${index}`).value.trim() === ''))) {
    $('#edit-error').textContent = 'Enter a nonnegative load and positive whole reps for each set.'; return;
  }
  selectedExercise.sets = nextSets; selectedExercise.equipment = $('#equipment').value.trim(); refreshSummary(); showScreen('edit');
  // The chooser DOM is retained: expanded groups, list position and exercise context survive saving.
  clearTimeout(toastTimeout); $('#toast').textContent = `${selectedExercise.name} saved`;
  toastTimeout = setTimeout(() => { $('#toast').textContent = ''; }, 4500);
  requestAnimationFrame(() => $(`[data-exercise="${selectedExercise.id}"]`).focus({ preventScroll: true }));
});
