// Definicoes dos alertas LS - compartilhado pelo assistente de clientes e pelo SocketController.
export const LS_TOGGLES = [
  {
    key: 'powerCut',
    label: 'Corte de energia',
    types: ['alarm'],
    alarms: 'powerCut,powerOff',
    soundKind: 'alarms',
    soundValues: ['powerCut', 'powerOff'],
    defaultSound: 'siren',
  },
  {
    key: 'lowBattery',
    label: 'Bateria fraca',
    types: ['alarm'],
    alarms: 'lowBattery,lowPower',
    soundKind: 'alarms',
    soundValues: ['lowBattery', 'lowPower'],
    defaultSound: 'double',
  },
  {
    key: 'inactive',
    label: 'Sem sinal (mais de 1h)',
    types: ['deviceInactive'],
    soundKind: 'events',
    soundValues: ['deviceInactive'],
    defaultSound: 'low',
  },
  {
    key: 'ignitionOn',
    label: 'Ignição ligada',
    types: ['ignitionOn'],
    soundKind: 'events',
    soundValues: ['ignitionOn'],
    defaultSound: 'beep',
  },
  {
    key: 'ignitionOff',
    label: 'Ignição desligada',
    types: ['ignitionOff'],
    soundKind: 'events',
    soundValues: ['ignitionOff'],
    defaultSound: 'beep',
  },
  {
    key: 'moving',
    label: 'Início de movimento',
    types: ['deviceMoving'],
    soundKind: 'events',
    soundValues: ['deviceMoving'],
    defaultSound: 'beep',
  },
  {
    key: 'overspeed',
    label: 'Excesso de velocidade',
    types: ['deviceOverspeed'],
    soundKind: 'events',
    soundValues: ['deviceOverspeed'],
    defaultSound: 'rising',
  },
  {
    key: 'geofence',
    label: 'Cerca virtual (entrar/sair)',
    types: ['geofenceEnter', 'geofenceExit'],
    soundKind: 'events',
    soundValues: ['geofenceEnter', 'geofenceExit'],
    defaultSound: 'ping',
  },
];

export const DEFAULT_ON = ['powerCut', 'lowBattery', 'inactive'];

export const eventMatchesToggle = (event, toggle) => {
  if (!toggle.types.includes(event.type)) {
    return false;
  }
  if (toggle.alarms) {
    const alarm = String((event.attributes && event.attributes.alarm) || '');
    return toggle.alarms.split(',').some((a) => alarm.includes(a));
  }
  return true;
};

export const presetForEvent = (event, soundsMap) => {
  const toggle = LS_TOGGLES.find((t) => eventMatchesToggle(event, t));
  if (!toggle) {
    return null;
  }
  return (soundsMap && soundsMap[toggle.key]) || toggle.defaultSound || 'beep';
};
