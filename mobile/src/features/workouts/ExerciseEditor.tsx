import { useRef, useState } from 'react';
import { restClock } from '../../domain/restTimer';
import { Alert, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { Convention, ExerciseDraft, LoadUnit, SetDraft, Tracking } from '../../domain/workout';
import { cardioDefault, canCompleteSet, trackingOf, trackingLabel } from '../../domain/workout';
import { Button, Choice, Field, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import type { LoggedExercise } from '../../domain/exerciseLibrary';
import { ExerciseNameField } from './ExerciseNameField';
import { SetRow } from './SetRow';
import { ExerciseCategoryField } from './ExerciseCategoryField';
import type { ReferenceContext } from '../../domain/workoutReferences';
import { PreviousExerciseSets } from './WorkoutReferences';

export function ExerciseEditor({ exercise, index, theme, disabled, update, remove, newId, library = [], initiallyExpanded = index === 0, references, onRest, onSetLogged, restSeconds = 90 }: {
  exercise: ExerciseDraft; index: number; theme: AppTheme; disabled: boolean;
  update: (exercise: ExerciseDraft) => void; remove: () => void; newId: () => string;
  library?: LoggedExercise[]; initiallyExpanded?: boolean;
  references?: ReferenceContext | null;
  onRest?: (label: string) => void; onSetLogged?: (label: string) => void;
  restSeconds?: number;
}) {
  const announced = useRef(new Set(exercise.sets.filter(set => set.completed).map(set => set.id)));
  function announceSet(set: SetDraft, setIndex: number) {
    if (!set.completed || !canCompleteSet(set, exercise.bodyweight, exercise.tracking) || announced.current.has(set.id)) return;
    announced.current.add(set.id); onSetLogged?.(`${exercise.name || 'Exercise'} / set ${setIndex + 1}`);
  }
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [setup, setSetup] = useState(!exercise.name);
  const [pendingTracking, setPendingTracking] = useState<Tracking | null>(null);
  function changeTracking(value: Tracking) {
    update({ ...exercise, catalogId: undefined, convention: value === 'duration' || value === 'distance_duration' ? 'total' : exercise.convention,
      bodyweight: value === 'reps', tracking: value === 'duration' || value === 'distance_duration' ? value : undefined,
      sets: exercise.sets.map(set => ({ id: set.id, weight: '', reps: '', completed: false })) });
    setPendingTracking(null);
  }
  const largeText = useWindowDimensions().fontScale > 1.3;
  const completed = exercise.sets.filter(set => set.completed).length;
  function changeSet(id: string, patch: Partial<SetDraft>) {
    update({ ...exercise, sets: exercise.sets.map(set => {
      if (set.id !== id) return set;
      const next = { ...set, ...patch };
      const valid = canCompleteSet(next, exercise.bodyweight, exercise.tracking);
      if (patch.completed === true && valid) announceSet({ ...next, completed: true }, exercise.sets.findIndex(item => item.id === id));
      return { ...next, completed: valid && (patch.weight !== undefined || patch.reps !== undefined || patch.duration !== undefined || patch.distance !== undefined ? true : next.completed) };
    }) });
  }
  function confirmRemove(action: () => void, completed: boolean) {
    if (!completed) return action();
    Alert.alert('Remove completed work?', 'These sets will be removed from this workout.', [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: action }]);
  }
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Modal visible={pendingTracking !== null} transparent animationType="fade" onRequestClose={() => { if (!disabled) setPendingTracking(null); }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000066' }}>
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, maxWidth: 440, width: '100%', alignSelf: 'center' }]}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20 }}>Change exercise tracking?</Text>
          <Text style={{ color: theme.muted }}>This clears the load, reps, duration and distance entered for this exercise. Your other exercises stay as they are.</Text>
          <Button theme={theme} variant="danger" label="Clear inputs and change tracking" disabled={disabled} onPress={() => { if (pendingTracking) changeTracking(pendingTracking); }} />
          <Button theme={theme} label="Keep current tracking" disabled={disabled} onPress={() => setPendingTracking(null)} />
        </View>
      </View>
    </Modal>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={(expanded ? 'Collapse' : 'Expand') + ' exercise ' + (index + 1)} accessibilityState={{ expanded, disabled }} disabled={disabled}
        onPress={() => setExpanded(value => !value)} style={{ flex: 1, minHeight: 44, justifyContent: 'center', gap: 4 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 17 }}>{exercise.name || ('Exercise ' + (index + 1))}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{completed}/{exercise.sets.length} sets done {expanded ? '-' : '+'}</Text>
      </Pressable>
      <Button theme={theme} variant="info" label="Setup" accessibilityLabel={'Exercise ' + (index + 1) + ' settings'} disabled={disabled}
        onPress={() => { setExpanded(true); setSetup(value => !value); }} />
    </View>
    {expanded && <>
    {setup && <View style={{ gap: 16, padding: 12, borderRadius: 12, backgroundColor: theme.soft }}>
    <ExerciseNameField exercise={exercise} index={index} theme={theme} disabled={disabled} items={library} update={update} />
    <ExerciseCategoryField value={exercise.category ?? ''} subcategory={exercise.subcategory ?? ''} theme={theme} disabled={disabled}
      onChange={category => update(cardioDefault({ ...exercise, category, subcategory: category === exercise.category ? exercise.subcategory : '' }))}
      onSubcategoryChange={subcategory => update({ ...exercise, subcategory })} />
    <Field theme={theme} label={`Exercise ${index + 1} equipment label`} caption="Equipment / setup" value={exercise.equipment} placeholder="e.g. Dumbbells or chest machine 1" editable={!disabled}
      onChangeText={equipment => update({ ...exercise, equipment })} />
    <Choice theme={theme} label="Tracking" value={trackingOf(exercise)} disabled={disabled}
      options={[{ value: 'load_reps', label: 'Load + reps' }, { value: 'reps', label: 'Bodyweight reps' }, { value: 'duration', label: 'Duration' }, { value: 'distance_duration', label: 'Distance + duration' }]}
      onChange={value => {
        if (value === trackingOf(exercise)) return;
        if (exercise.sets.some(set => set.weight || set.reps || set.duration || set.distance)) setPendingTracking(value);
        else changeTracking(value);
      }} />
    {!exercise.bodyweight && !exercise.tracking && <>
      <Choice<LoadUnit> theme={theme} label="Load unit" value={exercise.unit} disabled={disabled} options={[{ value: 'lb', label: 'lbs' }, { value: 'kg', label: 'kg' }, { value: 'plates', label: 'Plates' }]}
        onChange={unit => update({ ...exercise, unit })} />
      <Choice<Convention> theme={theme} label="Load means" value={exercise.convention} disabled={disabled} options={[{ value: 'total', label: 'Total' }, { value: 'per_hand', label: 'Per hand' }, { value: 'per_side', label: 'Per side' }]}
        onChange={convention => update({ ...exercise, convention })} />
      <Text style={{ color: theme.muted, fontSize: 12 }}>Changing the unit or load meaning keeps your set values and Done status. Loads are not converted.</Text>
    </>}
    <Button theme={theme} variant="danger" label={`Remove exercise ${index + 1}`} disabled={disabled} onPress={() => confirmRemove(remove, exercise.sets.some(set => set.completed))} />
    <Button theme={theme} variant="info" label="Done setup" disabled={disabled} onPress={() => setSetup(false)} />
    </View>}
    {!setup && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {!!exercise.equipment && <Text style={{ color: theme.text, fontFamily: fonts.medium, flexShrink: 1 }}>{exercise.equipment}</Text>}
      <Text style={{ color: theme.info, fontSize: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.infoSoft }}>{exercise.tracking ? trackingLabel(exercise) : exercise.bodyweight ? 'Bodyweight reps' : `${exercise.unit === 'lb' ? 'lbs' : exercise.unit} ${exercise.convention.replaceAll('_', ' ')}`}</Text>
    </View>}
    {references !== undefined && <PreviousExerciseSets context={references} exercise={exercise} theme={theme} />}
    {!largeText && exercise.sets.length > 0 && <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ width: 22, color: theme.muted, fontSize: 10 }}>SET</Text>
      <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
        {!exercise.bodyweight && !exercise.tracking && <Text style={{ flex: 1, color: theme.muted, textAlign: 'center', fontSize: 10 }}>LOAD</Text>}
        <Text style={{ flex: 1, color: theme.muted, textAlign: 'center', fontSize: 10 }}>{exercise.tracking === 'distance_duration' ? 'KM / SECONDS' : exercise.tracking ? 'SECONDS' : 'REPS'}</Text>
      </View>
      <Text style={{ width: 44, color: theme.muted, textAlign: 'center', fontSize: 10 }}>DONE</Text><View style={{ width: 44 }} />
    </View>}
    {exercise.tracking && <Text style={{ color: theme.muted, fontSize: 12 }}>Enter whole seconds{exercise.tracking === 'distance_duration' ? ' and kilometres' : ''}. Valid measurements mark the set done.</Text>}
    <View>{exercise.sets.map((set, setIndex) => <SetRow key={set.id} set={set} index={setIndex} exerciseIndex={index} theme={theme} unit={exercise.unit}
      bodyweight={exercise.bodyweight} tracking={exercise.tracking} disabled={disabled} largeText={largeText} change={patch => changeSet(set.id, patch)} onInputEnd={() => announceSet(set, setIndex)}
      remove={() => confirmRemove(() => update({ ...exercise, sets: exercise.sets.filter(item => item.id !== set.id) }), set.completed)} />)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {onRest && completed > 0 && <View style={{ flex: 1, minWidth: 110 }}><Button theme={theme} variant="info" label={`Rest ${restClock(restSeconds * 1000)}`} accessibilityLabel={`Rest after ${exercise.name}`} disabled={disabled} onPress={() => onRest(`${exercise.name} / set ${exercise.sets.findLastIndex(set => set.completed) + 1}`)} /></View>}
    <View style={{ flex: 1, minWidth: 110 }}><Button theme={theme} variant="add" label="+ Add set" disabled={disabled} onPress={() => {
      const last = exercise.sets.at(-1);
      update({ ...exercise, sets: [...exercise.sets, { id: newId(), weight: last?.weight ?? '', reps: last?.reps ?? '', ...(last?.duration !== undefined ? { duration: last.duration } : {}), ...(last?.distance !== undefined ? { distance: last.distance } : {}), completed: false }] });
    }} /></View></View>

    </>}
  </View>;
}
