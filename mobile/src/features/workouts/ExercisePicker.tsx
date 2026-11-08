import { trackingLabel } from '../../domain/workout';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cleanExerciseName, exerciseNameKey, exerciseCategories, matchingExercises, subcategoriesFor, type ExerciseCategory, type ExerciseSubcategory, type LoggedExercise } from '../../domain/exerciseLibrary';
import { Button, Choice, Field, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import { ExerciseCategoryField } from './ExerciseCategoryField';

export function ExercisePicker({ theme, items, loading, error, retry, cancel, add }: {
  theme: AppTheme; items: LoggedExercise[]; loading: boolean; error: string; retry: () => void;
  cancel: () => void; add: (name: string, option?: LoggedExercise, category?: ExerciseCategory, subcategory?: ExerciseSubcategory) => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<LoggedExercise>();
  const [filter, setFilter] = useState<ExerciseCategory | 'All'>('All');
  const [category, setCategory] = useState<ExerciseCategory>();
  const [subcategory, setSubcategory] = useState<ExerciseSubcategory>();
  const [subFilter, setSubFilter] = useState<ExerciseSubcategory | 'All'>('All');
  const submitted = useRef(false);
  const matches = matchingExercises(items, name, filter, subFilter);
  const option = selected ?? matchingExercises(items, name).find(item => exerciseNameKey(item.name) === exerciseNameKey(name));
  const assignedCategory = category ?? option?.category ?? (filter === 'All' ? '' : filter);
  const defaultSubcategory = option
    ? (assignedCategory === option.category ? option.subcategory ?? '' : '')
    : (assignedCategory === filter && subFilter !== 'All' ? subFilter : '');
  const assignedSubcategory = subcategory ?? defaultSubcategory;
  const filterGroups = filter === 'All' ? [] : subcategoriesFor(filter);
  return <Modal transparent animationType="fade" onRequestClose={cancel}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 16 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '100%' }}>
        <View testID="exercise-picker" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, flexShrink: 1 }]} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Add exercise</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Choose an exercise you’ve logged before, or enter a new name.</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
          <Field theme={theme} label="Search exercise names" value={name} autoCorrect={false} maxLength={100}
            placeholder="Search or add an exercise" onChangeText={value => {
              if (selected) { setCategory(undefined); setSubcategory(undefined); }
              setName(value); setSelected(undefined);
            }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
            {(['All', ...exerciseCategories, ''] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Filter exercises: ${value || 'Uncategorized'}`}
              accessibilityState={{ selected: filter === value }} onPress={() => {
                if (category === undefined && !option) setSubcategory(undefined);
                setFilter(value); setSubFilter('All');
              }}
              style={[styles.choice, { borderColor: filter === value ? theme.primary : 'transparent', backgroundColor: filter === value ? theme.accentSoft : theme.soft }]}>
              <Text style={{ color: filter === value ? theme.accent : theme.muted, fontFamily: fonts.medium }}>{value || 'Uncategorized'}</Text>
            </Pressable>)}
          </ScrollView>
          {filterGroups.length > 0 && <Choice<ExerciseSubcategory | 'All'> theme={theme} label="Filter subcategory" value={subFilter}
            options={[{ value: 'All', label: 'All' }, ...filterGroups.map(group => ({ value: group, label: group })), { value: '', label: 'Not assigned' }]}
            onChange={setSubFilter} />}
          <Text style={{ color: theme.muted, fontFamily: fonts.medium }}>Previously logged</Text>
          <View style={{ gap: 8 }}>
            {loading && <Text style={{ color: theme.muted }}>Loading suggestions…</Text>}
            {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry suggestions" onPress={retry} /></>}
            {!loading && !error && !matches.length && <Text style={[styles.subtitle, { color: theme.muted }]}>
              {items.length ? 'No matches. You can add this as a new exercise.' : 'No logged exercises yet. Enter your first exercise name.'}
            </Text>}
            {matches.slice(0, 50).map(item => <Pressable key={item.id} accessibilityRole="button"
              accessibilityLabel={`Use ${item.name}, ${item.tracking ? trackingLabel(item).toLowerCase() : item.bodyweight ? 'bodyweight' : 'load and reps'}`} accessibilityState={{ selected: selected?.id === item.id }}
              onPress={() => { setName(item.name); setSelected(item); setCategory(item.category ?? ''); setSubcategory(item.subcategory ?? ''); }}
              style={[styles.input, { borderWidth: 1, borderColor: selected?.id === item.id ? theme.primary : theme.border, backgroundColor: selected?.id === item.id ? theme.accentSoft : theme.soft, gap: 4 }]}>
              <Text style={{ color: theme.text, fontFamily: fonts.medium }}>{item.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>{trackingLabel(item)}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>{[item.category, item.subcategory].filter(Boolean).join(' · ') || 'Uncategorized'}</Text>
            </Pressable>)}
            {matches.length > 50 && <Text style={{ color: theme.muted }}>Showing 50 matches. Keep typing to narrow the list.</Text>}
          </View>
          <ExerciseCategoryField value={assignedCategory} subcategory={assignedSubcategory} theme={theme}
            onChange={value => { setCategory(value); setSubcategory(value === assignedCategory ? assignedSubcategory : ''); }} onSubcategoryChange={setSubcategory} />
          <Text style={{ color: theme.muted, fontSize: 12 }}>Category is remembered when you save the workout. It does not change the session type.</Text>
          </ScrollView>
          <Button theme={theme} variant="add" label="+ Add exercise" disabled={!cleanExerciseName(name)} onPress={() => {
            if (submitted.current || !cleanExerciseName(name)) return;
            submitted.current = true;
            add(option?.name ?? cleanExerciseName(name), option, assignedCategory, assignedSubcategory);
          }} />
          <Button theme={theme} label="Cancel" onPress={cancel} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
