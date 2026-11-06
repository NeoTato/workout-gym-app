import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import { useProgressLibrary } from '../../features/progress/useExerciseProgress';
import { Button, Field, Screen, styles } from '../../ui/controls';
import { getTheme } from '../../ui/theme';

export default function ProgressLibraryRoute() {
  const theme = getTheme(useColorScheme()), { data, error, retry } = useProgressLibrary();
  const [search, setSearch] = useState('');
  const items = data?.filter(item => `${item.name} ${item.category} ${item.subcategory}`.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back to Home" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Exercise progress</Text>
    <Text style={{ color: theme.muted }}>Your completed sets, organized by exercise and equipment.</Text>
    <Field theme={theme} label="Search exercise progress" placeholder="Exercise or muscle group" value={search} onChangeText={setSearch} />
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry exercises" onPress={retry} /></>}
    {!data && !error && <Text style={{ color: theme.muted }}>Loading exercises...</Text>}
    {data && !data.length && <Text style={{ color: theme.muted }}>No completed exercises yet. Finish a workout to start your history.</Text>}
    {data && data.length > 0 && !items.length && <Text style={{ color: theme.muted }}>No exercises match your search.</Text>}
    {items.map(item => <View key={item.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Button theme={theme} label={item.name} accessibilityLabel={`View progress for ${item.name}, ${item.bodyweight ? 'bodyweight' : 'loaded'}`} onPress={() => router.push({ pathname: '/progress/[id]', params: { id: item.id } })} />
      <Text style={{ color: theme.muted }}>{[item.category, item.subcategory, item.bodyweight ? 'Bodyweight reps' : 'Loaded sets'].filter(Boolean).join(' / ')}</Text>
    </View>)}
  </Screen>;
}
