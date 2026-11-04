import { useState } from 'react';
import { View } from 'react-native';
import { exerciseCategories, type ExerciseCategory } from '../../domain/exerciseLibrary';
import { Button, Choice } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';

export function ExerciseCategoryField({ value, theme, disabled = false, onChange }: {
  value: ExerciseCategory; theme: AppTheme; disabled?: boolean; onChange: (category: ExerciseCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 8 }}>
    <Button theme={theme} variant="link" label={`Category: ${value || 'Uncategorized'}`} disabled={disabled} onPress={() => setOpen(current => !current)} />
    {open && <Choice<ExerciseCategory> theme={theme} label="Exercise category" value={value} disabled={disabled}
      options={[{ value: '', label: 'Uncategorized' }, ...exerciseCategories.map(category => ({ value: category, label: category }))]}
      onChange={category => { onChange(category); setOpen(false); }} />}
  </View>;
}
