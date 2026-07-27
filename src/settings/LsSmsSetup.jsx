import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const gt06Data = (domain, port) => ({
  subir: [
    { label: 'Servidor LS', cmd: `SERVER,1,${domain},${port},#` },
    { label: 'APN allcom', cmd: 'APN,allcom.br,allcom,allcom#' },
    { label: 'APN hinova', cmd: 'APN,hinova.com,hinova,hinova#' },
    { label: 'Ligar dados (GPRS)', cmd: 'GPRSON,1#' },
    { label: 'Conferir conexão', cmd: 'STATUS#' },
  ],
  grupos: [
    {
      titulo: 'Bloqueio',
      itens: [
        { label: 'Bloquear', cmd: 'RELAY,1#' },
        { label: 'Desbloquear', cmd: 'RELAY,0#' },
        { label: 'Bloqueio em qualquer velocidade', cmd: 'SZCS#SOURCE_OFF_TYPE=1' },
      ],
    },
    {
      titulo: 'Consultas',
      itens: [
        { label: 'Última posição', cmd: 'WHERE#' },
        { label: 'Versão do aparelho', cmd: 'VERSION#' },
        { label: 'Configuração completa', cmd: 'PARAM#' },
      ],
    },
    {
      titulo: 'Alertas',
      itens: [
        { label: 'Corte de energia', cmd: 'POWERALM,ON,1,2,1#' },
        { label: 'Movimento (ignição off)', cmd: 'SENALM,ON,0#' },
      ],
    },
    {
      titulo: 'Tempo e manutenção',
      itens: [
        { label: 'Intervalo (ligado/desligado)', cmd: 'TIMER,30,2600#' },
        { label: 'Pulso com ignição off', cmd: 'HBT,600,600#' },
        { label: 'Hora (usa o servidor)', cmd: 'GMT,W,0,0#' },
        { label: 'Reiniciar', cmd: 'RESET#' },
        { label: 'Padrão de fábrica', cmd: 'FACTORY#' },
      ],
    },
    {
      titulo: 'Protocolo completo (mais dados)',
      itens: [
        {
          label: 'Ativar protocolo completo + hodômetro/horímetro + tensão',
          cmd: 'SZCS#GT06SEL=1#GT06METER=1#GT06IEXVOL=2',
        },
      ],
    },
    {
      titulo: 'Economia de dados e bateria',
      itens: [
        {
          label: 'Combo economia (fica off no sistema, mas recebe SMS)',
          cmd: 'SZCS#GT06SEL=1#GT06METER=1#GT06IEXVOL=2#SLEEPT=1#SLPDISCONNECT=1#GPS_DISSLP=0#MTK_DISSLP=0#ANGLEVALUE=05-045#BLIND_DEBUG=1#SOURCE_OFF_TYPE=1#BATT_VERIFY=1',
        },
        { label: 'Intervalo maior (menos dados)', cmd: 'TIMER,60,18000#' },
        { label: 'Pulso com ignição off (economia)', cmd: 'HBT,900,900#' },
        { label: 'Off-line após o tempo de defesa', cmd: 'SZCS#MTK_DISSLP=0' },
        { label: 'Online obedecendo o TIMER', cmd: 'SZCS#MTK_DISSLP=1' },
        { label: 'Desliga GPS em repouso', cmd: 'SZCS#GPS_DISSLP=0' },
      ],
    },
    {
      titulo: 'Moto',
      itens: [
        { label: 'Ignição virtual por acelerômetro', cmd: 'SZCS#ACCLINE=0' },
        { label: 'Modo defesa (moto)', cmd: 'DEFENSE,10#' },
      ],
    },
  ],
});

const Cmd = ({ label, cmd, copied, onCopy }) => (
  <Box sx={{ mb: 0.9 }}>
    <Typography sx={{ fontSize: 11, color: '#7a8699', mb: 0.3 }}>{label}</Typography>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: '#0f1720',
        borderRadius: 1.2,
        px: 1.2,
        py: 0.8,
      }}
    >
      <Typography
        sx={{
          flex: 1,
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          fontSize: 12,
          color: '#7ee787',
          wordBreak: 'break-all',
        }}
      >
        {cmd}
      </Typography>
      <Button
        size="small"
        onClick={() => onCopy(cmd)}
        startIcon={copied === cmd ? <CheckIcon /> : <ContentCopyIcon />}
        sx={{ color: '#fff', minWidth: 0, textTransform: 'none', fontSize: 11, flex: 'none' }}
      >
        {copied === cmd ? 'Copiado' : 'Copiar'}
      </Button>
    </Box>
  </Box>
);

const LsSmsSetup = ({ protocol, port, domain = 'gps.lsautotruckrastreios.com.br' }) => {
  const [copied, setCopied] = useState(null);
  const [more, setMore] = useState(false);

  const copy = (cmd) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd).then(
        () => {
          setCopied(cmd);
          setTimeout(() => setCopied((c) => (c === cmd ? null : c)), 1500);
        },
        () => {},
      );
    }
  };

  if (protocol !== 'GT06') {
    return (
      <Box sx={{ border: '1px solid #eef1f6', borderRadius: 2, p: 1.5, textAlign: 'left' }}>
        <Typography sx={{ fontSize: 12.5, color: '#4a5568', lineHeight: 1.5 }}>
          Configure o rastreador para <strong>{domain}</strong> porta <strong>{port}</strong>. Os
          comandos SMS deste modelo podem variar — fale com a LS Autotruck para os comandos certos.
        </Typography>
      </Box>
    );
  }

  const data = gt06Data(domain, port);

  return (
    <Box
      sx={{ border: '1px solid #eef1f6', borderRadius: 2, overflow: 'hidden', textAlign: 'left' }}
    >
      <Box sx={{ background: '#0d2a5c', color: '#fff', px: 1.5, py: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Subir o equipamento (SMS)</Typography>
        <Typography sx={{ fontSize: 10.5, color: '#a9c4e8' }}>
          Envie do celular para o número do chip, nesta ordem
        </Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        {data.subir.map((c) => (
          <Cmd key={c.cmd} label={c.label} cmd={c.cmd} copied={copied} onCopy={copy} />
        ))}

        <Box
          onClick={() => setMore((v) => !v)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            mt: 1,
            color: '#0d2a5c',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <ExpandMoreIcon
            sx={{ transform: more ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
          />
          Mais comandos
        </Box>

        {more &&
          data.grupos.map((g) => (
            <Box key={g.titulo} sx={{ mt: 1.3 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0d2a5c',
                  textTransform: 'uppercase',
                  letterSpacing: '.03em',
                  mb: 0.7,
                }}
              >
                {g.titulo}
              </Typography>
              {g.itens.map((c) => (
                <Cmd key={c.cmd} label={c.label} cmd={c.cmd} copied={copied} onCopy={copy} />
              ))}
            </Box>
          ))}

        <Typography
          sx={{
            fontSize: 10.5,
            color: '#6b5310',
            background: '#fff7e6',
            border: '1px solid #ffe0a3',
            borderRadius: 1,
            p: 1,
            mt: 1.3,
            lineHeight: 1.45,
          }}
        >
          Senha padrão do aparelho: <strong>123456</strong>. Use o APN conforme o chip (allcom ou
          hinova).
        </Typography>
      </Box>
    </Box>
  );
};

export default LsSmsSetup;
