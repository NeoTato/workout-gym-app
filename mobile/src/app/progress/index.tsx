import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useProgressLibrary } from '../../features/progress/useExerciseProgress';
import { ExerciseGroups } from '../../features/exercises/ExerciseGroups';
import { emptyProgressFilters, ProgressBrowseControls, type ProgressFilters } from '../../features/progress/ProgressBrowseControls';
import { Button, Screen, styles } from '../../ui/controls';
import { useAppTheme } from '../../ui/appearanceContext';
import { exerciseNameKey } from '../../domain/exerciseLibrary';
import { trackingLabel } from '../../domain/workout';

export default function ProgressLibraryRoute() {
  const theme = useAppTheme(), { data, error, retry } = useProgressLibrary();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProgressFilters>(emptyProgressFilters);
  const items = data?.filter(item => `${item.name} ${item.category ?? ''} ${item.subcategory ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
    && (filters.category === 'All' || (item.category ?? '') === filters.category)
    && (filters.subcategory === 'All' || (item.subcategory ?? '') === filters.subcategory)
    && (filters.mode === 'all' || (filters.mode === 'timed' ? Boolean(item.tracking) : !item.tracking && item.bodyweight === (filters.mode === 'bodyweight')))) ?? [];
  const directResults = Boolean(search.trim()) || filters.subcategory !== 'All';
  const nameCounts = new Map<string, number>();
  for (const item of items) { const key = exerciseNameKey(item.name); nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1); }
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back to Home" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Exercise progress</Text>
    <Text style={{ color: theme.muted }}>Your completed sets, organized by exercise and equipment.</Text>
    <ProgressBrowseControls theme={theme} search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} count={items.length} ready={Boolean(data) && !error} />
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry exercises" onPress={retry} /></>}
    {!data && !error && <Text style={{ color: theme.muted }}>Loading exercises...</Text>}
    {data && !data.length && <Text style={{ color: theme.muted }}>No completed exercises yet. Finish a workout to start your history.</Text>}
    {data && data.length > 0 && !items.length && <Text style={{ color: theme.muted }}>No exercises match your search or filters.</Text>}
    <ExerciseGroups items={items} searching={directResults} theme={theme} renderItem={item => <View style={directResults ? [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }] : undefined}>
      <Button theme={theme} label={(nameCounts.get(exerciseNameKey(item.name)) ?? 0) > 1 ? `${item.name} (${item.tracking ? trackingLabel(item) : item.bodyweight ? 'bodyweight' : 'loaded'})` : item.name} accessibilityLabel={`View progress for ${item.name}, ${item.tracking ? trackingLabel(item) : item.bodyweight ? 'bodyweight' : 'loaded'}`} onPress={() => router.push({ pathname: '/progress/[id]', params: { id: item.id } })} />
      {directResults && <Text style={{ color: theme.muted }}>{[item.category, item.subcategory, item.tracking ? trackingLabel(item) : item.bodyweight ? 'Bodyweight reps' : 'Loaded sets'].filter(Boolean).join(' / ')}</Text>}
    </View>} />
  </Screen>;
}
