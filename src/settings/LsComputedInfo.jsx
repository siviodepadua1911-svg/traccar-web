import { useState } from 'react';
import CalculateIcon from '@mui/icons-material/Calculate';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Ex = ({ bg, color, icon, name, need }) => (
  <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f2f6' }}>
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#16233a' }}>{name}</div>
      <div style={{ fontSize: 11, color: '#7a8699', lineHeight: 1.35 }}>{need}</div>
    </div>
  </div>
);

const LsComputedInfo = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: '8px 16px 0' }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e3e8ef',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,.06)',
        }}
      >
        <div
          onClick={() => setOpen((v) => !v)}
          style={{
            background: '#0d2a5c',
            color: '#fff',
            padding: '12px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(255,255,255,.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalculateIcon fontSize="small" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>O que são Atributos Calculados?</div>
            <div style={{ fontSize: 10.5, color: '#a9c4e8' }}>
              Transforme os dados do rastreador em informação fácil
            </div>
          </div>
          <ExpandMoreIcon
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
          />
        </div>
        {open && (
          <div style={{ padding: '13px 15px' }}>
            <div style={{ fontSize: 13, color: '#2b3648', lineHeight: 1.5, marginBottom: 12 }}>
              São <b>fórmulas</b> que pegam os dados crus que o rastreador envia e transformam em
              informação fácil de ler. Rodam <b>sozinhas</b> em cada atualização do veículo e podem
              virar coluna nos relatórios ou disparar alertas.
            </div>
            <Ex
              bg="#e8f5e9"
              color="#2e7d32"
              icon={<LocalGasStationIcon fontSize="small" />}
              name="Combustível (%)"
              need={(
                <>
                  Mostra o nível do tanque. <b style={{ color: '#c77700' }}>Precisa de sensor de combustível.</b>
                </>
              )}
            />
            <Ex
              bg="#e3f2fd"
              color="#1565c0"
              icon={<MeetingRoomIcon fontSize="small" />}
              name="Porta / baú aberto"
              need={(
                <>
                  Avisa quando abre. <b style={{ color: '#c77700' }}>Precisa de sensor na porta.</b>
                </>
              )}
            />
            <Ex
              bg="#fff3e0"
              color="#e65100"
              icon={<DeviceThermostatIcon fontSize="small" />}
              name="Temperatura"
              need={(
                <>
                  Para baú refrigerado. <b style={{ color: '#c77700' }}>Precisa de sensor de temperatura.</b>
                </>
              )}
            />
            <Ex
              bg="#ede7f6"
              color="#5e35b1"
              icon={<VpnKeyIcon fontSize="small" />}
              name="Ignição · Bloqueio · Velocidade"
              need={(
                <>
                  A <b style={{ color: '#2e7d32' }}>maioria dos rastreadores já envia</b> — dá pra usar em alertas.
                </>
              )}
            />
            <div
              style={{
                marginTop: 12,
                background: '#fff7e6',
                border: '1px solid #ffe0a3',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                gap: 9,
                alignItems: 'flex-start',
              }}
            >
              <WarningAmberIcon style={{ color: '#b8860b', fontSize: 19, flex: 'none' }} />
              <div style={{ fontSize: 11.5, color: '#6b5310', lineHeight: 1.45 }}>
                <b>Depende do hardware.</b> Só dá pra calcular o que o aparelho realmente envia. Sem o
                sensor instalado (combustível, porta, temperatura), esse dado não existe. Rastreadores
                com mais entradas/sensores permitem mais atributos.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LsComputedInfo;
