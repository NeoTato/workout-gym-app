import { useState } from 'react';
import { Text, View } from 'react-native';
import { sessionTypes, type Location, type WorkoutDraft } from '../../domain/workout';
import { Button, Choice, Field, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';
import { WorkoutTimeEditor } from './WorkoutTimeEditor';

export function WorkoutSessionDetails({ draft, locations, theme, busy, update, addGym }: {
  draft: WorkoutDraft; locations: Location[]; theme: AppTheme; busy: boolean;
  update: (change: (draft: WorkoutDraft) => WorkoutDraft) => void;
  addGym?: (name: string) => Promise<void>;
}) {
  const [showTime, setShowTime] = useState(Boolean(draft.timing));
  const [gymName, setGymName] = useState(''), [gymError, setGymError] = useState('');
  const [adding, setAdding] = useState(false);
  return <>
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Choice theme={theme} label="Workout location" value={draft.locationId} disabled={busy || adding}
        options={locations.map(location => ({ value: location.id, label: location.name }))}
        onChange={locationId => update(value => ({ ...value, locationId }))} />
      {addGym && <>
        <Field theme={theme} label="New gym name" value={gymName} editable={!busy && !adding} onChangeText={setGymName} placeholder="Add another gym" />
        <Button theme={theme} variant="add" label={adding ? 'Adding gym…' : '+ Add gym'} disabled={busy || adding} onPress={async () => {
          if (adding) return;
          setAdding(true); setGymError('');
          try { await addGym(gymName); setGymName(''); }
          catch { setGymError('Enter a gym name other than Home, or try again if storage is unavailable.'); }
          finally { setAdding(false); }
        }} />
        {!!gymError && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{gymError}</Text>}
      </>}
      <Choice theme={theme} label="Session type" value={draft.sessionType} disabled={busy}
        options={sessionTypes.map(type => ({ value: type, label: type }))}
        onChange={sessionType => update(value => ({ ...value, sessionType }))} />
      <Text style={[styles.subtitle, { color: theme.muted }]}>{draft.timing?.startDate ?? draft.activityDate} · {draft.timezone}</Text>
      <Button theme={theme} variant="link" label={showTime ? 'Hide date and time' : 'Change date and time'} disabled={busy} onPress={() => setShowTime(value => !value)} />
    </View>
    {showTime && <WorkoutTimeEditor draft={draft} theme={theme} disabled={busy} update={timing => update(value => ({ ...value, timing }))} />}
  </>;
}

export function WorkoutSessionSummary({ draft, locations, theme }: { draft: WorkoutDraft; locations: Location[]; theme: AppTheme }) {
  const rawDate = draft.timing?.startDate ?? draft.activityDate;
  const parsed = new Date(`${rawDate}T12:00:00Z`);
  const displayDate = Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(parsed) : rawDate;
  return <Text style={[styles.subtitle, { color: theme.muted }]}>
    {draft.sessionType} · {locations.find(location => location.id === draft.locationId)?.name ?? 'Choose location'} · {displayDate}
  </Text>;
}
