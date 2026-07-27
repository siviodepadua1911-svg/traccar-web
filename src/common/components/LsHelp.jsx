import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import HelpIcon from '@mui/icons-material/Help';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MapIcon from '@mui/icons-material/Map';
import RouteIcon from '@mui/icons-material/Route';
import DescriptionIcon from '@mui/icons-material/Description';
import CropFreeIcon from '@mui/icons-material/CropFree';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LockIcon from '@mui/icons-material/Lock';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const GUIDES = [
  {
    key: 'map',
    match: '/',
    Icon: MapIcon,
    color: '#1565c0',
    title: 'Mapa (Monitoramento)',
    text: 'Aqui você vê seus veículos no mapa em tempo real. Toque num veículo para ver velocidade, localização, foto e o botão de bloquear. Arraste a folha para cima para ver mais detalhes.',
  },
  {
    key: 'replay',
    match: '/replay',
    Icon: RouteIcon,
    color: '#00897b',
    title: 'Trajeto',
    text: 'Mostra por onde o veículo passou. Escolha o veículo, o período (ex: Hoje) e toque em Mostrar — o caminho aparece no mapa.',
  },
  {
    key: 'reports',
    match: '/reports',
    Icon: DescriptionIcon,
    color: '#5e35b1',
    title: 'Relatórios',
    text: 'Resumos de viagens, paradas, velocidade, alertas e mais. Escolha o veículo e o período e toque em Mostrar.',
  },
  {
    key: 'geofence',
    match: '/geofence',
    Icon: CropFreeIcon,
    color: '#2e7d32',
    title: 'Cercas eletrônicas',
    text: 'Desenhe áreas no mapa (ex: garagem, região de trabalho). Você recebe um aviso quando o veículo entra ou sai delas.',
  },
  {
    key: 'alerts',
    match: '/settings/notification',
    Icon: NotificationsIcon,
    color: '#e65100',
    title: 'Alertas',
    text: 'Avisos automáticos: ignição ligada/desligada, bloqueio, excesso de velocidade, bateria e mais. Ligue os que quiser receber.',
  },
  {
    key: 'block',
    Icon: LockIcon,
    color: '#c62828',
    title: 'Bloquear / Desbloquear',
    text: 'Toque no veículo e use o botão Bloquear (ou Desbloquear). Ele pede confirmação e mostra o estado atual, com data e hora.',
  },
  {
    key: 'device',
    match: '/settings/device',
    Icon: DirectionsCarIcon,
    color: '#0d2a5c',
    title: 'Cadastrar veículo',
    text: 'Siga o passo a passo: Veículo → Rastreador → Detalhes → Revisar. Dá para copiar um veículo já configurado e só trocar a placa.',
  },
];

const LsHelp = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState(null);

  const path = location.pathname;
  const current = GUIDES.find(
    (g) => g.match && (g.match === '/' ? path === '/' : path.startsWith(g.match)),
  );

  const openPanel = () => {
    setOpenKey(current ? current.key : GUIDES[0].key);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label="Ajuda"
        style={{
          position: 'fixed',
          right: 14,
          bottom: 74,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#0d2a5c',
          color: '#fff',
          border: 'none',
          boxShadow: '0 3px 12px rgba(0,0,0,.3)',
          cursor: 'pointer',
          zIndex: 1250,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HelpIcon />
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1390 }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(380px, 92vw)',
              background: '#eef1f6',
              zIndex: 1400,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,.25)',
            }}
          >
            <div
              style={{
                background: '#0d2a5c',
                color: '#fff',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flex: 'none',
              }}
            >
              <HelpIcon />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Ajuda rápida</div>
                <div style={{ fontSize: 11, color: '#a9c4e8' }}>Explicações simples de cada tela</div>
              </div>
              <CloseIcon style={{ cursor: 'pointer' }} onClick={() => setOpen(false)} />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {current && (
                <div style={{ fontSize: 11, color: '#7a8699', margin: '2px 4px 8px' }}>
                  Você está em: <b style={{ color: '#0d2a5c' }}>{current.title}</b>
                </div>
              )}
              {GUIDES.map((g) => {
                const isOpen = openKey === g.key;
                const { Icon } = g;
                const isCurrent = current && g.key === current.key;
                return (
                  <div
                    key={g.key}
                    style={{
                      background: '#fff',
                      borderRadius: 10,
                      marginBottom: 8,
                      overflow: 'hidden',
                      border: isCurrent ? '1.5px solid #2F6FB0' : '1px solid #e3e8ef',
                    }}
                  >
                    <div
                      onClick={() => setOpenKey(isOpen ? null : g.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '11px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${g.color}1a`,
                          color: g.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 'none',
                        }}
                      >
                        <Icon fontSize="small" />
                      </div>
                      <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#16233a' }}>
                        {g.title}
                      </div>
                      <ExpandMoreIcon
                        style={{
                          color: '#9aa4b2',
                          transform: isOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform .2s',
                        }}
                      />
                    </div>
                    {isOpen && (
                      <div
                        style={{
                          padding: '0 12px 12px 54px',
                          fontSize: 12.5,
                          color: '#4a5568',
                          lineHeight: 1.5,
                        }}
                      >
                        {g.text}
                      </div>
                    )}
                  </div>
                );
              })}
              <div
                style={{
                  fontSize: 11.5,
                  color: '#7a8699',
                  textAlign: 'center',
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                Precisa de mais ajuda? Fale com a <b style={{ color: '#0d2a5c' }}>LS Autotruck</b>.
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default LsHelp;
