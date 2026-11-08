import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { exerciseCategories, subcategoriesFor, type ExerciseCategory, type ExerciseSubcategory } from '../../domain/exerciseLibrary';
import { Button, Choice, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export type ProgressFilters = { category: ExerciseCategory | 'All'; subcategory: ExerciseSubcategory | 'All'; mode: 'all' | 'loaded' | 'bodyweight' | 'timed' };
export const emptyProgressFilters: ProgressFilters = { category: 'All', subcategory: 'All', mode: 'all' };

export function ProgressBrowseControls({ theme, search, onSearch, filters, onFilters, count, ready }: {
  theme: AppTheme; search: string; onSearch: (value: string) => void; filters: ProgressFilters; onFilters: (value: ProgressFilters) => void; count: number; ready: boolean;
}) {
  const [open, setOpen] = useState(false), [focused, setFocused] = useState(false);
  const active = Number(filters.category !== 'All') + Number(filters.subcategory !== 'All') + Number(filters.mode !== 'all');
  const groups = filters.category === 'All' ? [] : subcategoriesFor(filters.category);
  const summary = [filters.category === 'All' ? '' : filters.category || 'Uncategorized', filters.subcategory === 'All' ? '' : filters.subcategory || 'Not assigned', filters.mode === 'all' ? '' : filters.mode === 'loaded' ? 'Loaded' : 'Bodyweight'].filter(Boolean).join(' / ');
  return <View style={{ gap: 16 }}>
    <View style={{ gap: 8 }}>
    <Text style={{ color: theme.text, fontFamily: fonts.bold }}>Find an exercise</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: focused ? theme.primary : theme.muted, borderRadius: 14, backgroundColor: theme.surface }}>
      <TextInput accessibilityLabel="Search exercise progress" placeholder="Type an exercise or muscle group..." placeholderTextColor={theme.muted} value={search} onChangeText={onSearch} autoCorrect={false} returnKeyType="search" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ flex: 1, minWidth: 0, minHeight: 48, padding: 14, color: theme.text, fontFamily: fonts.medium, fontSize: 16 }} />
      {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onSearch('')} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: theme.muted, fontSize: 22 }}>×</Text></Pressable>}
    </View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
      <Button theme={theme} variant="info" label={active ? `Filters (${active})` : 'Filters'} onPress={() => { Keyboard.dismiss(); setOpen(true); }} />
      {ready && <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }}>{count} {count === 1 ? 'exercise' : 'exercises'}</Text>}
    </View>
    {!!summary && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.muted, flexGrow: 1, flexShrink: 1, minWidth: 120 }}>{summary}</Text>
      <Button theme={theme} variant="link" label="Clear filters" onPress={() => onFilters(emptyProgressFilters)} />
    </View>}
    {open && <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#00000066' }}>
        <View accessibilityViewIsModal style={[styles.card, { gap: 16, backgroundColor: theme.surface, borderColor: theme.border, width: '100%', maxWidth: 520, maxHeight: '90%', alignSelf: 'center' }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Filter exercises</Text>
          <ScrollView contentContainerStyle={{ gap: 16 }} style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">
            <Choice<ProgressFilters['mode']> theme={theme} label="Exercise type" value={filters.mode} options={[{ value: 'all', label: 'All' }, { value: 'loaded', label: 'Loaded' }, { value: 'bodyweight', label: 'Bodyweight' }, { value: 'timed', label: 'Timed / cardio' }]} onChange={mode => onFilters({ ...filters, mode })} />
            <Choice<ExerciseCategory | 'All'> theme={theme} label="Category" value={filters.category} options={[{ value: 'All', label: 'All' }, ...exerciseCategories.map(value => ({ value, label: value })), { value: '', label: 'Uncategorized' }]} onChange={category => onFilters({ ...filters, category, subcategory: 'All' })} />
            {groups.length > 0 && <Choice<ExerciseSubcategory | 'All'> theme={theme} label="Subcategory" value={filters.subcategory} options={[{ value: 'All', label: 'All' }, ...groups.map(value => ({ value, label: value })), { value: '', label: 'Not assigned' }]} onChange={subcategory => onFilters({ ...filters, subcategory })} />}
          </ScrollView>
          <Button theme={theme} variant="link" label="Reset filters" onPress={() => onFilters(emptyProgressFilters)} />
          <Button theme={theme} primary label="Show all exercises" onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>}
  </View>;
}
