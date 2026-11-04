import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { sessionTypes, type Location, type WorkoutDraft } from '../../domain/workout';
import { Button, Choice, Field, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';
import { WorkoutTimeEditor } from './WorkoutTimeEditor';

export function WorkoutSessionDetails({ draft, locations, theme, busy, update, addGym, removeLocation }: {
  draft: WorkoutDraft; locations: Location[]; theme: AppTheme; busy: boolean;
  update: (change: (draft: WorkoutDraft) => WorkoutDraft) => void;
  addGym?: (name: string) => Promise<void>;
  removeLocation?: (id: string) => Promise<void>;
}) {
  const [showTime, setShowTime] = useState(Boolean(draft.timing));
  const [gymName, setGymName] = useState(''), [gymError, setGymError] = useState('');
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  return <>
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Choice theme={theme} label="Workout location" value={draft.locationId} disabled={busy || adding}
        options={locations.filter(location => !location.archived || location.id === draft.locationId).map(location => ({ value: location.id, label: location.name + (location.archived ? ' (removed)' : '') }))}
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
      {removeLocation && <>
        <Button theme={theme} variant="link" label={managing ? 'Done managing locations' : 'Manage locations'} disabled={busy || adding} onPress={() => setManaging(value => !value)} />
        {managing && <>
          <Text style={{ color: theme.muted }}>Remove gyms from future choices. Past workouts keep their location. Add the same gym again to restore it.</Text>
          {locations.filter(location => location.kind === 'gym' && !location.archived).map(location => <Button key={location.id} theme={theme} variant="danger" label={`Remove ${location.name}`} disabled={busy || adding}
            onPress={() => Alert.alert(`Remove ${location.name}?`, 'Past workouts will be kept. If selected for this draft, choose another location before continuing.', [
              { text: 'Keep', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: async () => {
                setAdding(true); setGymError('');
                try { await removeLocation(location.id); }
                catch { setGymError('Unable to remove this location. Try again.'); }
                finally { setAdding(false); }
              } },
            ])} />)}
          {!locations.some(location => location.kind === 'gym' && !location.archived) && <Text style={{ color: theme.muted }}>No saved gyms to remove. Home is always available.</Text>}
        </>}
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
