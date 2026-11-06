import { Fragment, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { exerciseCategories, subcategoriesFor, type ExerciseCategory, type ExerciseSubcategory } from '../../domain/exerciseLibrary';
import { fonts, type AppTheme } from '../../ui/theme';

type Groupable = { id: string; category?: ExerciseCategory; subcategory?: ExerciseSubcategory };

export function ExerciseGroups<T extends Groupable>({ items, theme, renderItem, searching = false }: {
  items: T[]; theme: AppTheme; renderItem: (item: T) => ReactNode; searching?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  if (searching) return <>{items.map(item => <Fragment key={item.id}>{renderItem(item)}</Fragment>)}</>;
  const groups = new Map<string, { label: string; category: ExerciseCategory; subcategory: ExerciseSubcategory; items: T[] }>();
  for (const item of items) {
    const category = item.category ?? '';
    const subcategory = item.subcategory && subcategoriesFor(category).includes(item.subcategory) ? item.subcategory : '';
    const key = `${category}:${subcategory}`;
    const group = groups.get(key) ?? { category, subcategory, label: !category ? 'Uncategorized' : subcategory ? `${category} / ${subcategory}` : subcategoriesFor(category).length ? `${category} / Other exercises` : category, items: [] };
    group.items.push(item); groups.set(key, group);
  }
  const categoryOrder = (category: ExerciseCategory) => category ? exerciseCategories.indexOf(category) : exerciseCategories.length;
  const subcategoryOrder = (category: ExerciseCategory, subcategory: ExerciseSubcategory) => subcategory ? subcategoriesFor(category).indexOf(subcategory) : subcategoriesFor(category).length;
  const ordered = [...groups.entries()].sort(([, a], [, b]) => categoryOrder(a.category) - categoryOrder(b.category) || subcategoryOrder(a.category, a.subcategory) - subcategoryOrder(b.category, b.subcategory));
  return <>{ordered.map(([key, group]) => {
    const open = expanded.has(key), count = `${group.items.length} ${group.items.length === 1 ? 'exercise' : 'exercises'}`;
    return <View key={key} style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${group.label}, ${count}`} accessibilityState={{ expanded: open }} accessibilityHint={open ? 'Hide exercises' : 'Show exercises'} onPress={() => setExpanded(previous => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next; })}
        style={{ minHeight: 56, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.text, fontFamily: fonts.bold }}>{group.label}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{count}</Text></View>
        <Text accessible={false} style={{ color: theme.muted, fontSize: 20 }}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open && group.items.map(item => <Fragment key={item.id}>{renderItem(item)}</Fragment>)}
    </View>;
  })}</>;
}
