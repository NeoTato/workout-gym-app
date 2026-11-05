import { useState } from 'react';
import { View } from 'react-native';
import { exerciseCategories, subcategoriesFor, type ExerciseCategory, type ExerciseSubcategory } from '../../domain/exerciseLibrary';
import { Button, Choice } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';

export function ExerciseCategoryField({ value, subcategory = '', theme, disabled = false, onChange, onSubcategoryChange }: {
  value: ExerciseCategory; subcategory?: ExerciseSubcategory; theme: AppTheme; disabled?: boolean;
  onChange: (category: ExerciseCategory) => void; onSubcategoryChange?: (subcategory: ExerciseSubcategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const groups = subcategoriesFor(value);
  return <View style={{ gap: 8 }}>
    <Button theme={theme} variant="link" label={`Category: ${value || 'Uncategorized'}`} disabled={disabled} onPress={() => setOpen(current => !current)} />
    {open && <Choice<ExerciseCategory> theme={theme} label="Exercise category" value={value} disabled={disabled}
      options={[{ value: '', label: 'Uncategorized' }, ...exerciseCategories.map(category => ({ value: category, label: category }))]}
      onChange={category => { onChange(category); setOpen(false); setSubOpen(false); }} />}
    {groups.length > 0 && onSubcategoryChange && <>
      <Button theme={theme} variant="link" label={`Subcategory: ${subcategory || 'Not assigned'}`} disabled={disabled} onPress={() => setSubOpen(current => !current)} />
      {subOpen && <Choice<ExerciseSubcategory> theme={theme} label="Exercise subcategory" value={subcategory} disabled={disabled}
        options={[{ value: '', label: 'Not assigned' }, ...groups.map(group => ({ value: group, label: group }))]}
        onChange={group => { onSubcategoryChange(group); setSubOpen(false); }} />}
    </>}
  </View>;
}
