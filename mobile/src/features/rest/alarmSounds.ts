export const alarmSounds = [
  { value: 'beep', label: 'Digital beep', source: require('../../../assets/sounds/rest-alarm.wav') },
  { value: 'chime', label: 'Gentle chime', source: require('../../../assets/sounds/rest-chime.wav') },
  { value: 'ring', label: 'Ringing', source: require('../../../assets/sounds/rest-ring.wav') },
] as const;
export type AlarmSound = typeof alarmSounds[number]['value'];
export const alarmSource = (sound: AlarmSound) => alarmSounds.find(item => item.value === sound)!.source;
