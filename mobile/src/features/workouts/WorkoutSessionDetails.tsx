import { useState } from 'react';
import { Text, View } from 'react-native';
import { sessionTypes, type Location, type WorkoutDraft } from '../../domain/workout';
import { Button, Choice, Field, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import { WorkoutTimeEditor } from './WorkoutTimeEditor';
import { LocationManager } from './LocationManager';

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
  const [showNewGym, setShowNewGym] = useState(false);
  return <>
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Choice theme={theme} label="Workout location" value={draft.locationId} disabled={busy || adding}
        options={locations.filter(location => !location.archived || location.id === draft.locationId).map(location => ({ value: location.id, label: location.name + (location.archived ? ' (removed)' : '') }))}
        onChange={locationId => update(value => ({ ...value, locationId }))} />
      {(addGym || removeLocation) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {addGym && <Button theme={theme} variant="add" label={showNewGym ? 'Hide new gym' : '+ New gym'} disabled={busy || adding} onPress={() => setShowNewGym(value => !value)} />}
        {removeLocation && <Button theme={theme} variant="info" label="Manage locations" disabled={busy || adding} onPress={() => setManaging(true)} />}
      </View>}
      {managing && removeLocation && <LocationManager locations={locations} theme={theme} busy={busy || adding} remove={removeLocation} close={() => setManaging(false)} />}
      {addGym && showNewGym && <View style={{ gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
        <Field theme={theme} label="New gym name" value={gymName} editable={!busy && !adding} onChangeText={setGymName} placeholder="Add another gym" />
        <Button theme={theme} variant="add" label={adding ? 'Adding gym…' : '+ Add gym'} disabled={busy || adding} onPress={async () => {
          if (adding) return;
          setAdding(true); setGymError('');
          try { await addGym(gymName); setGymName(''); setShowNewGym(false); }
          catch { setGymError('Enter a gym name other than Home, or try again if storage is unavailable.'); }
          finally { setAdding(false); }
        }} />
        {!!gymError && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{gymError}</Text>}
      </View>}
    </View>
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Choice theme={theme} label="Session type" value={draft.sessionType} disabled={busy}
        options={sessionTypes.map(type => ({ value: type, label: type }))}
        onChange={sessionType => update(value => ({ ...value, sessionType }))} />
    </View>
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ gap: 4 }}><Text style={{ color: theme.muted, fontSize: 12 }}>Workout date</Text><Text style={{ color: theme.text, fontFamily: fonts.bold }}>{draft.timing?.startDate ?? draft.activityDate}</Text></View>
        <Button theme={theme} variant="info" label={showTime ? 'Hide date and time' : 'Change date and time'} disabled={busy} onPress={() => setShowTime(value => !value)} />
      </View>
    </View>
    {showTime && <WorkoutTimeEditor draft={draft} theme={theme} disabled={busy} update={timing => update(value => ({ ...value, timing }))} />}
  </>;
}

export function WorkoutSessionSummary({ draft, locations, theme }: { draft: WorkoutDraft; locations: Location[]; theme: AppTheme }) {
  const rawDate = draft.timing?.startDate ?? draft.activityDate;
  const parsed = new Date(`${rawDate}T12:00:00Z`);
  const displayDate = Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(parsed) : rawDate;
  return <View style={{ gap: 6 }}>
    <Text style={{ color: theme.info, fontFamily: fonts.bold, fontSize: 18 }}>{draft.sessionType}</Text>
    <Text style={{ color: theme.text, fontFamily: fonts.medium }}>{locations.find(location => location.id === draft.locationId)?.name ?? 'Choose location'}</Text>
    <Text style={{ color: theme.muted, fontSize: 12 }}>{displayDate}</Text>
  </View>;
}
