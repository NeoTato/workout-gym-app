(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let toastTimer, pendingRemoval;
  function notify(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500); }
  function navigate(screen) {
    $('.screens').dataset.active = screen;
    $$('[data-screen]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.screen === screen)));
    const panel = $(`[data-panel="${screen}"]`);
    if (matchMedia('(max-width:760px)').matches) $('.screen-tabs').scrollIntoView({ block: 'start' });
    else panel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function confirm(title, copy, action, label = 'Remove') {
    $('#confirm-title').textContent = title; $('#confirm-copy').textContent = copy; $('#confirm-remove').textContent = label;
    pendingRemoval = action; $('#confirm-dialog').showModal(); $('#confirm-cancel').focus();
  }
  function updateCount() {
    const completed = $$('#sets [aria-checked="true"]').length;
    $('#done-count').textContent = completed;
  }
  function valid(row) {
    const [load, reps] = row.querySelectorAll('input');
    return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(load.value.trim()) && Number.isFinite(Number(load.value)) && /^\d+$/.test(reps.value.trim()) && Number.isSafeInteger(Number(reps.value)) && Number(reps.value) > 0;
  }
  function mark(row, done) { row.classList.toggle('complete', done); row.querySelector('.set-check').setAttribute('aria-checked', String(done)); row.querySelector('.set-check').disabled = !valid(row); updateCount(); }
  function renumber() { $$('#sets [data-set]').forEach((row, index) => { row.querySelector('.set-number').textContent = index + 1; const [load, reps] = row.querySelectorAll('input'); load.setAttribute('aria-label', `Set ${index + 1} load`); reps.setAttribute('aria-label', `Set ${index + 1} reps`); row.querySelector('.set-check').setAttribute('aria-label', `Set ${index + 1} done`); row.querySelector('.remove-set').setAttribute('aria-label', `Remove set ${index + 1}`); }); updateCount(); }
  $$('[data-direction]').forEach(button => button.addEventListener('click', () => { document.documentElement.dataset.style = button.dataset.direction; $$('[data-direction]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); }));
  $('#theme-toggle').addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#theme-toggle').setAttribute('aria-pressed', String(dark)); $('#theme-toggle').textContent = dark ? '☀ Light appearance' : '☾ Dark appearance'; });
  $$('[data-screen]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.screen)));
  $$('[data-notice]').forEach(button => button.addEventListener('click', () => notify(button.dataset.notice)));
  $$('[data-location]').forEach(button => button.addEventListener('click', () => { $$('[data-location]').forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); }); $$('[data-gym]').forEach(item => { item.textContent = button.dataset.location; }); }));
  $$('[data-type]').forEach(button => button.addEventListener('click', () => { $$('[data-type]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); $$('[data-session]').forEach(item => { item.textContent = button.dataset.type; }); }));
  $('#date-toggle').addEventListener('click', () => { const open = $('#date-fields').hidden; $('#date-fields').hidden = !open; $('#date-toggle').setAttribute('aria-expanded', String(open)); });
  $('#start-date').addEventListener('change', event => { const value = event.target.value; if (!value) return; const date = new Date(`${value}T12:00:00Z`); const label = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date); $('#setup-date-label').textContent = label; $$('[data-date]').forEach(item => { item.textContent = `${label} · 6:30 PM`; }); });
  $('#continue').addEventListener('click', () => navigate('logging'));
  $('#edit-details').addEventListener('click', () => navigate('setup'));
  $('#edit-saved').addEventListener('click', () => { navigate('logging'); notify('Preview: edit the sets above. The actual app will keep explicit Save and Cancel.'); });
  $('#back-home').addEventListener('click', () => { navigate('setup'); notify('Preview returned to setup. Your real app data is untouched.'); });
  $('#edit-exercise').addEventListener('click', () => { $('#exercise-settings').hidden = !$('#exercise-settings').hidden; });
  $('#exercise-name').addEventListener('input', event => { $('#press-card h4').textContent = event.target.value || 'Untitled exercise'; });
  $('#load-unit').addEventListener('change', event => { $('#load-description').textContent = `${event.target.value} / per hand`; });
  $('#sets').addEventListener('input', event => { const row = event.target.closest('[data-set]'); if (row) mark(row, valid(row)); });
  $('#sets').addEventListener('click', event => {
    const row = event.target.closest('[data-set]'); if (!row) return;
    if (event.target.closest('.set-check') && valid(row)) mark(row, row.querySelector('.set-check').getAttribute('aria-checked') !== 'true');
    if (event.target.closest('.remove-set')) { const remove = () => { row.remove(); renumber(); }; if (row.classList.contains('complete')) confirm('Remove completed set?', 'This removes the set from this preview workout. Keep it if you want it included.', remove); else remove(); }
  });
  $('#add-set').addEventListener('click', () => {
    const rows = $$('#sets [data-set]'); const last = rows.at(-1); const row = document.createElement('div'); row.className = 'set-row'; row.dataset.set = '';
    row.innerHTML = '<span class="set-number"></span><input inputmode="decimal"><input inputmode="numeric"><button class="set-check" role="checkbox" aria-checked="false">✓</button><button class="remove-set" title="Remove set">×</button>';
    const fields = row.querySelectorAll('input'); fields[0].value = last?.querySelectorAll('input')[0].value ?? ''; fields[1].value = last?.querySelectorAll('input')[1].value ?? '';
    $('#sets').append(row); mark(row, false); renumber(); row.scrollIntoView({ block: 'nearest' }); notify('Set added. Copied values stay incomplete until edited or confirmed.');
  });
  $('#fly-toggle').addEventListener('click', () => { const open = $('#fly-details').hidden; $('#fly-details').hidden = !open; $('#fly-toggle').setAttribute('aria-expanded', String(open)); });
  $('#remove-fly').addEventListener('click', () => { $('.compact-exercise').hidden = true; notify('Optional exercise removed from the preview.'); });
  $('#add-exercise').addEventListener('click', () => { $('.compact-exercise').hidden = false; $('#fly-details').hidden = false; $('#fly-toggle').setAttribute('aria-expanded', 'true'); notify('Exercise added to this preview.'); });
  $('#remove-exercise').addEventListener('click', () => confirm('Remove this exercise?', 'All its sets will be removed from this preview workout.', () => { $('#press-card').hidden = true; notify('Exercise removed from preview. Reload the HTML to reset.'); }));
  $('#discard').addEventListener('click', () => confirm('Discard this workout?', 'This clears the preview’s exercise sets. Your real app data is untouched.', () => { $('#sets').replaceChildren(); updateCount(); navigate('setup'); notify('Preview workout discarded. Reload to reset the sample.'); }, 'Discard workout'));
  $('#delete-workout').addEventListener('click', () => confirm('Delete this workout?', 'This action is permanent in the app. Here it only demonstrates the confirmation design.', () => { notify('Workout deleted in this preview only.'); navigate('setup'); }, 'Delete workout'));
  $('#confirm-cancel').addEventListener('click', () => { $('#confirm-dialog').close(); pendingRemoval = undefined; });
  $('#confirm-dialog').addEventListener('cancel', () => { pendingRemoval = undefined; });
  $('#confirm-remove').addEventListener('click', () => { $('#confirm-dialog').close(); const action = pendingRemoval; pendingRemoval = undefined; action?.(); });
  $('#finish').addEventListener('click', () => {
    const rows = $$('#sets [data-set]').filter(row => row.querySelector('.set-check').getAttribute('aria-checked') === 'true');
    if (!rows.length || $('#press-card').hidden) { notify('Complete at least one set before finishing.'); return; }
    $('#saved-sets').textContent = rows.length; $('#saved-name').textContent = $('#exercise-name').value;
    $('#saved-values').replaceChildren(...rows.map((row, index) => { const line = document.createElement('p'); const label = document.createElement('span'); label.textContent = `Set ${index + 1}`; const value = document.createElement('strong'); const inputs = row.querySelectorAll('input'); value.textContent = `${inputs[0].value} ${$('#load-unit').value} × ${inputs[1].value}`; line.append(label, value); return line; }));
    navigate('review'); notify('Workout saved in this preview.');
  });
  $('#add-gym').addEventListener('click', () => { $('#gym-dialog').showModal(); $('#gym-name').focus(); });
  $('#gym-cancel').addEventListener('click', () => $('#gym-dialog').close());
  $('#gym-form').addEventListener('submit', event => { event.preventDefault(); const name = $('#gym-name').value.trim(); if (!name) return; const button = $('.location-options .choice'); button.dataset.location = name; button.querySelector('span:nth-child(2)').firstChild.textContent = name; button.click(); $('#gym-dialog').close(); notify('Gym added to this preview.'); });
})();
