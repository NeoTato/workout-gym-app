import { Pressable, Text, TextInput, View } from 'react-native';
import { canCompleteSet, type TimedTracking, type SetDraft } from '../../domain/workout';
import { fonts, type AppTheme } from '../../ui/theme';

export function SetRow({ set, index, exerciseIndex, unit, bodyweight, tracking, theme, disabled, largeText, change, remove }: {
  set: SetDraft; index: number; exerciseIndex: number; unit: string; bodyweight: boolean; tracking?: TimedTracking; theme: AppTheme; disabled: boolean; largeText: boolean;
  change: (patch: Partial<SetDraft>) => void; remove: () => void;
}) {
  const valid = canCompleteSet(set, bodyweight, tracking);
  const prefix = `Exercise ${exerciseIndex + 1} set ${index + 1}`;
  const inputStyle = { minHeight: 48, padding: 8, borderRadius: 10, fontFamily: fonts.bold, fontSize: 17, color: theme.text,
    backgroundColor: set.completed ? theme.successSoft : theme.soft, textAlign: 'center' as const, minWidth: 0, flex: 1 };
  return <View style={{ gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
    {largeText && <Text style={{ color: theme.muted, fontFamily: fonts.medium }}>Set {index + 1}</Text>}
    <View style={{ flexDirection: largeText ? 'column' : 'row', gap: 6, alignItems: largeText ? 'stretch' : 'center' }}>
      {!largeText && <Text style={{ width: 22, color: theme.muted, fontFamily: fonts.medium }}>{index + 1}</Text>}
      <View style={{ flexDirection: 'row', flex: largeText ? undefined : 1, gap: 6 }}>
        {!bodyweight && !tracking && <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          {largeText && <Text style={{ color: theme.muted }}>Load ({unit === 'lb' ? 'lbs' : unit})</Text>}
          <TextInput accessibilityLabel={`${prefix} load (${unit})`} value={set.weight} placeholder="—" placeholderTextColor={theme.muted}
            editable={!disabled} keyboardType="decimal-pad" style={inputStyle} onChangeText={weight => change({ weight })} />
        </View>}
        {!tracking && <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          {largeText && <Text style={{ color: theme.muted }}>Reps</Text>}
          <TextInput accessibilityLabel={`${prefix} reps`} value={set.reps} placeholder="—" placeholderTextColor={theme.muted}
            editable={!disabled} keyboardType="number-pad" style={inputStyle} onChangeText={reps => change({ reps })} />
        </View>}
        {tracking && <>
          {tracking === 'distance_duration' && <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>km</Text>
            <TextInput accessibilityLabel={`${prefix} distance (km)`} value={set.distance ?? ''} placeholder="0.0" placeholderTextColor={theme.muted} editable={!disabled} keyboardType="decimal-pad" style={inputStyle} onChangeText={distance => change({ distance })} />
          </View>}
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>seconds</Text>
            <TextInput accessibilityLabel={`${prefix} duration (seconds)`} value={set.duration ?? ''} placeholder="0" placeholderTextColor={theme.muted} editable={!disabled} keyboardType="number-pad" style={inputStyle} onChangeText={duration => change({ duration })} />
          </View>
        </>}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`${prefix} done`} aria-checked={set.completed}
          accessibilityHint={tracking ? 'Valid measurements complete the set automatically.' : bodyweight ? 'Valid reps complete the set automatically.' : 'Valid load and reps complete the set automatically.'}
          accessibilityState={{ checked: set.completed, disabled: disabled || !valid }} disabled={disabled || !valid}
          onPress={() => change({ completed: !set.completed })}
          style={{ minWidth: 44, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: set.completed ? theme.successBorder : theme.border,
            backgroundColor: set.completed ? theme.successSoft : theme.soft, alignItems: 'center', justifyContent: 'center', opacity: disabled || !valid ? 0.5 : 1 }}>
          <Text style={{ color: set.completed ? theme.success : theme.muted, fontFamily: fonts.bold, fontSize: 18 }}>{set.completed ? '✓' : '○'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove set ${index + 1}`} accessibilityState={{ disabled }} disabled={disabled}
          onPress={remove} style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.danger, fontSize: 22 }}>×</Text>
        </Pressable>
      </View>
    </View>
  </View>;
}
