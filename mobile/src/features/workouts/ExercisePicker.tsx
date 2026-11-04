import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cleanExerciseName, exerciseNameKey, matchingExercises, type LoggedExercise } from '../../domain/exerciseLibrary';
import { Button, Field, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function ExercisePicker({ theme, items, loading, error, retry, cancel, add }: {
  theme: AppTheme; items: LoggedExercise[]; loading: boolean; error: string; retry: () => void;
  cancel: () => void; add: (name: string, option?: LoggedExercise) => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<LoggedExercise>();
  const submitted = useRef(false);
  const matches = matchingExercises(items, name);
  return <Modal transparent animationType="fade" onRequestClose={cancel}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 16 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '100%' }}>
        <View testID="exercise-picker" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, flexShrink: 1 }]} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Add exercise</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Choose an exercise you’ve logged before, or enter a new name.</Text>
          <Field theme={theme} label="Search exercise names" value={name} autoFocus autoCorrect={false} maxLength={100}
            placeholder="Search or add an exercise" onChangeText={value => { setName(value); setSelected(undefined); }} />
          <Text style={{ color: theme.muted, fontFamily: fonts.medium }}>Previously logged</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, maxHeight: 240 }} contentContainerStyle={{ gap: 8 }}>
            {loading && <Text style={{ color: theme.muted }}>Loading suggestions…</Text>}
            {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry suggestions" onPress={retry} /></>}
            {!loading && !error && !matches.length && <Text style={[styles.subtitle, { color: theme.muted }]}>
              {items.length ? 'No matches. You can add this as a new exercise.' : 'No logged exercises yet. Enter your first exercise name.'}
            </Text>}
            {matches.slice(0, 50).map(item => <Pressable key={item.id} accessibilityRole="button"
              accessibilityLabel={`Use ${item.name}, ${item.bodyweight ? 'bodyweight' : 'load and reps'}`} accessibilityState={{ selected: selected?.id === item.id }}
              onPress={() => { setName(item.name); setSelected(item); }}
              style={[styles.input, { borderWidth: 1, borderColor: selected?.id === item.id ? theme.primary : theme.border, backgroundColor: selected?.id === item.id ? theme.accentSoft : theme.soft, gap: 4 }]}>
              <Text style={{ color: theme.text, fontFamily: fonts.medium }}>{item.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>{item.bodyweight ? 'Bodyweight reps' : 'Load + reps'}</Text>
            </Pressable>)}
            {matches.length > 50 && <Text style={{ color: theme.muted }}>Showing 50 matches. Keep typing to narrow the list.</Text>}
          </ScrollView>
          <Button theme={theme} variant="add" label="+ Add exercise" disabled={!cleanExerciseName(name)} onPress={() => {
            if (submitted.current || !cleanExerciseName(name)) return;
            submitted.current = true;
            const option = selected ?? matches.find(item => exerciseNameKey(item.name) === exerciseNameKey(name));
            add(option?.name ?? cleanExerciseName(name), option);
          }} />
          <Button theme={theme} label="Cancel" onPress={cancel} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
