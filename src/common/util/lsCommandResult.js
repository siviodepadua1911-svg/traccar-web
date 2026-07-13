const RESULT_DICT = [
  ['RELAY 1 OK', 'BLOQUEIO executado com sucesso'],
  ['RELAY 0 OK', 'DESBLOQUEIO executado com sucesso'],
  ['Cut off the fuel supply: Success', 'BLOQUEIO executado com sucesso'],
  ['Restore fuel supply: Success', 'DESBLOQUEIO executado com sucesso'],
  ['already in the state of fuel supply cut-off', 'Ja estava bloqueado'],
  ['DYD=Success', 'BLOQUEIO executado com sucesso'],
  ['HFYD=Success', 'DESBLOQUEIO executado com sucesso'],
  ['The terminal will restart after 30 seconds', 'O rastreador vai reiniciar em 30 segundos'],
  ['GMT_OK', 'Fuso horario ajustado'],
  ['TIMER_OK', 'Intervalo de envio ajustado'],
  ['Charging', 'Carregando'],
  ['GPRS:Link Up', 'Dados: conectado'],
  ['NW Signal Level:strong', 'Sinal de rede: forte'],
  ['NW Signal Level:medium', 'Sinal de rede: medio'],
  ['NW Signal Level:weak', 'Sinal de rede: fraco'],
  ['GPS:FIXED', 'GPS: fixado'],
  ['SVS Used in fix:', 'Satelites em uso: '],
  ['GPS Signal Level:', 'Sinal dos satelites: '],
  ['ACC:ON', 'Ignicao: LIGADA'],
  ['ACC:OFF', 'Ignicao: DESLIGADA'],
  ['Defense:ON', 'Modo defesa: ativado'],
  ['Defense:OFF', 'Modo defesa: desativado'],
  ['Battery:', 'Bateria interna: '],
  ['Success', 'Sucesso'],
];

export const translateResult = (text) => {
  let out = String(text);
  RESULT_DICT.forEach(([en, pt]) => {
    out = out.split(en).join(pt);
  });
  return out;
};

export const friendlyCommandResult = (result) => {
  const r = String(result || '');
  const u = r.toUpperCase();
  const ok = u.includes('SUCCESS') || u.includes('OK');
  if (/RELAY\s*1/.test(u) && ok) return 'Veículo BLOQUEADO';
  if (/RELAY\s*0/.test(u) && ok) return 'Veículo DESBLOQUEADO';
  if (u.includes('CUT OFF THE FUEL SUPPLY') && ok) return 'Veículo BLOQUEADO';
  if (u.includes('RESTORE FUEL SUPPLY') && ok) return 'Veículo DESBLOQUEADO';
  if (u.includes('ALREADY IN THE STATE OF FUEL SUPPLY CUT-OFF')) return 'Veículo já estava bloqueado';
  if (u.includes('DYD') && u.includes('FAIL')) return 'Falha ao BLOQUEAR (veículo em movimento?)';
  if (u.includes('HFYD') && u.includes('FAIL')) return 'Falha ao DESBLOQUEAR';
  if (u.includes('DYD') && ok) return 'Veículo BLOQUEADO';
  if (u.includes('HFYD') && ok) return 'Veículo DESBLOQUEADO';
  if (u.includes('THE TERMINAL WILL RESTART')) return 'Rastreador vai reiniciar (30s)';
  if (!r) return 'Resposta do rastreador';
  return `Resposta: ${translateResult(r)}`;
};

export default friendlyCommandResult;
