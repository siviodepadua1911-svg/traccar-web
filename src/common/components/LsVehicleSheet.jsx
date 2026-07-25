import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import KeyIcon from '@mui/icons-material/Key';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import MapIcon from '@mui/icons-material/Map';
import StreetviewIcon from '@mui/icons-material/Streetview';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { devicesActions } from '../../store';
import { formatTime } from '../util/formatter';
import { lsCardColors } from '../theme/lsCardColors';

const OK = '#2e7d32';
const WARN = '#ed6c02';
const BAD = '#d32f2f';
const RED = '#c62828';

const SPEEDO_MAX = 120;
const spPoint = (deg, r) => {
  const rad = (deg * Math.PI) / 180;
  return [110 + r * Math.cos(rad), 110 - r * Math.sin(rad)];
};
const spTicks = [];
for (let v = 0; v <= SPEEDO_MAX; v += 20) {
  const ang = 210 - (v / SPEEDO_MAX) * 240;
  const [x1, y1] = spPoint(ang, 88);
  const [x2, y2] = spPoint(ang, 78);
  const [lx, ly] = spPoint(ang, 63);
  spTicks.push({ v, x1, y1, x2, y2, lx, ly });
}

const Speedo = ({ speed }) => {
  const shown = Math.max(0, Math.round(speed));
  const value = Math.min(shown, SPEEDO_MAX);
  const angle = -120 + (value / SPEEDO_MAX) * 240;
  return (
    <svg viewBox="0 0 220 190" style={{ display: 'block', width: '100%' }}>
      <circle cx="110" cy="110" r="100" fill="#23272e" stroke="#3d4451" strokeWidth="2" />
      <path d="M 33.8 154 A 88 88 0 0 1 166.6 42.6" fill="none" stroke="#2e7d32" strokeWidth="6" />
      <path d="M 166.6 42.6 A 88 88 0 0 1 196.7 125.3" fill="none" stroke="#ed6c02" strokeWidth="6" />
      <path d="M 196.7 125.3 A 88 88 0 0 1 186.2 154" fill="none" stroke="#d32f2f" strokeWidth="6" />
      {spTicks.map((tk) => (
        <g key={tk.v}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="#e8eaed" strokeWidth="3" />
          <text x={tk.lx} y={tk.ly + 4} textAnchor="middle" fontSize="12" fill="#e8eaed">
            {tk.v}
          </text>
        </g>
      ))}
      <text x="110" y="152" textAnchor="middle" fontSize="30" fontWeight="500" fill="#ffffff">
        {shown}
      </text>
      <text x="110" y="170" textAnchor="middle" fontSize="11" fill="#9aa0a6">
        km/h
      </text>
      <g
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '110px 110px',
          transition: 'transform 0.8s ease',
        }}
      >
        <line x1="110" y1="124" x2="110" y2="42" stroke="#e53935" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="110" cy="110" r="9" fill="#3d4451" />
      <circle cx="110" cy="110" r="3.5" fill="#e53935" />
    </svg>
  );
};

const kmh = (kn) => Math.round((kn || 0) * 1.852);

const ignInfo = (a) => {
  if (!('ignition' in a)) return { value: '—' };
  return a.ignition ? { value: 'Ligada', color: OK } : { value: 'Desligada', color: WARN };
};

const sigInfo = (a) => {
  if (!('rssi' in a)) return { value: '—' };
  const v = Number(a.rssi);
  const max = v > 5 ? 31 : 5;
  const pct = Math.round((v / max) * 100);
  const color = pct >= 70 ? OK : pct >= 40 ? WARN : BAD;
  return { value: `${pct}%`, color };
};

const batInfo = (a) => {
  if (!('power' in a)) return { value: '—', charging: false };
  const va = Number(a.power);
  const sys24 = va > 18;
  const vMin = sys24 ? 25 : 13;
  const charging = va >= vMin;
  let color = '#8a8f98';
  if (charging || va > (sys24 ? 24 : 12.8)) color = OK;
  return { value: `${va.toFixed(1)}V`, charging, color };
};

const two = (n) => String(n).padStart(2, '0');
const shortWhen = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const hm = `${two(d.getHours())}:${two(d.getMinutes())}`;
  return d.toDateString() === now.toDateString()
    ? `hoje ${hm}`
    : `${two(d.getDate())}/${two(d.getMonth() + 1)} ${hm}`;
};

const Tile = ({ c, icon, label, value, color }) => (
  <div style={{ flex: 1, background: c.surfaceAlt, borderRadius: 9, padding: '8px 3px', textAlign: 'center' }}>
    <div style={{ color: color || c.accent, display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ fontSize: 9, color: c.textSecondary, marginTop: 1 }}>{label}</div>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: c.text }}>{value}</div>
  </div>
);

const Row = ({ c, l, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}>
    <span style={{ color: c.textSecondary }}>{l}</span>
    <span style={{ color: c.text, fontWeight: 600 }}>{v}</span>
  </div>
);

const LsVehicleSheet = ({
  device,
  position,
  onClose,
  onMenu,
  canEdit,
  disableActions,
  canBlock,
  blocked,
  sendCommand,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const c = lsCardColors(theme.palette.mode === 'dark');
  const a = position.attributes || {};
  const lat = position.latitude;
  const lon = position.longitude;

  const sheetRef = useRef(null);
  const dragRef = useRef({ dragging: false, startY: 0, startH: 0 });
  const peek = Math.min(384, Math.round(window.innerHeight * 0.6));
  const maxH = Math.round(window.innerHeight * 0.82);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const initialImg = device.attributes?.deviceImage
    ? `/api/media/${device.uniqueId}/${device.attributes.deviceImage}`
    : null;
  const [img, setImg] = useState(initialImg);
  const [busy, setBusy] = useState(false);

  const sinceKey = `lsBlkSince_${device.id}`;
  const readSince = () => {
    try {
      return JSON.parse(localStorage.getItem(sinceKey) || 'null');
    } catch {
      return null;
    }
  };
  const [since, setSince] = useState(readSince);

  useEffect(() => {
    const cur = readSince();
    if (!cur) {
      const rec = { blocked, ts: null };
      localStorage.setItem(sinceKey, JSON.stringify(rec));
      setSince(rec);
    } else if (cur.blocked !== blocked) {
      const rec = { blocked, ts: Date.now() };
      localStorage.setItem(sinceKey, JSON.stringify(rec));
      setSince(rec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  useEffect(() => {
    if (sheetRef.current) sheetRef.current.style.height = `${peek}px`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d.dragging) return;
      const y = (e.touches ? e.touches[0] : e).clientY;
      let h = d.startH + (d.startY - y);
      h = Math.max(peek, Math.min(maxH, h));
      if (sheetRef.current) sheetRef.current.style.height = `${h}px`;
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d.dragging) return;
      d.dragging = false;
      if (sheetRef.current) {
        const h = sheetRef.current.offsetHeight;
        sheetRef.current.style.transition = 'height .22s ease';
        sheetRef.current.style.height = `${h > (peek + maxH) / 2 ? maxH : peek}px`;
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [peek, maxH]);

  const startDrag = (e) => {
    const y = (e.touches ? e.touches[0] : e).clientY;
    dragRef.current = {
      dragging: true,
      startY: y,
      startH: sheetRef.current ? sheetRef.current.offsetHeight : peek,
    };
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/devices/${device.id}/image`, { method: 'POST', body: file });
      if (!resp.ok) throw new Error('img');
      const filename = await resp.text();
      const updated = { ...device, attributes: { ...device.attributes, deviceImage: filename } };
      const put = await fetch(`/api/devices/${device.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (put.ok) {
        dispatch(devicesActions.update([updated]));
        setImg(`/api/media/${device.uniqueId}/${filename}?t=${Date.now()}`);
      } else {
        window.alert('Foto enviada, mas nao foi possivel salvar (permissao). Fale com a LS Autotruck.');
      }
    } catch {
      window.alert('Nao foi possivel enviar a foto.');
    }
    setBusy(false);
  };

  const doToggle = () => {
    setConfirmOpen(false);
    localStorage.setItem(sinceKey, JSON.stringify({ blocked: !blocked, ts: Date.now() }));
    sendCommand(blocked ? 'engineResume' : 'engineStop');
  };

  const speed = kmh(position.speed);
  const moving = Boolean(a.motion);
  const stateLabel = moving ? 'Em movimento' : 'Parado';
  const ign = ignInfo(a);
  const sig = sigInfo(a);
  const bat = batInfo(a);
  const sinceTxt = since && since.blocked === blocked && since.ts ? `desde ${shortWhen(since.ts)}` : 'estado atual';
  const blockDisabled = disableActions || !canBlock;

  const sheetStyle = {
    pointerEvents: 'auto',
    width: 'calc(100% - 12px)',
    maxWidth: 480,
    background: c.surface,
    borderRadius: '18px 18px 0 0',
    boxShadow: '0 -4px 20px rgba(0,0,0,.28)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };
  const secLab = {
    fontSize: 10,
    fontWeight: 700,
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '.03em',
    margin: '14px 0 6px',
  };
  const mapBtnStyle = {
    flex: 1,
    background: c.surfaceAlt,
    border: `1px solid ${c.border}`,
    borderRadius: 9,
    padding: '8px 4px',
    textAlign: 'center',
    fontSize: 10.5,
    color: c.accent,
    fontWeight: 600,
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  };
  const roundBtn = {
    position: 'absolute',
    top: 8,
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'rgba(0,0,0,.42)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  return (
    <div ref={sheetRef} style={sheetStyle}>
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        style={{ padding: '8px 0 4px', cursor: 'grab', touchAction: 'none', flex: 'none' }}
      >
        <div style={{ width: 42, height: 5, borderRadius: 3, background: c.border, margin: '0 auto' }} />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            position: 'relative',
            height: 118,
            background: c.surfaceAlt,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {img ? (
            <img src={img} alt={device.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <DirectionsCarIcon style={{ fontSize: 46, color: c.textSecondary }} />
          )}
          <div style={{ ...roundBtn, left: 9 }} onClick={onClose}>
            <ArrowBackIcon style={{ color: '#fff', fontSize: 18 }} />
          </div>
          {onMenu && (
            <div style={{ ...roundBtn, right: 9 }} onClick={onMenu}>
              <MoreVertIcon style={{ color: '#fff', fontSize: 18 }} />
            </div>
          )}
          {canEdit && (
            <label
              style={{
                position: 'absolute',
                right: 9,
                bottom: 8,
                background: '#fff',
                borderRadius: 16,
                padding: '4px 9px',
                fontSize: 10.5,
                color: '#0d47a1',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <CameraAltIcon style={{ fontSize: 13 }} />
              {busy ? 'Enviando...' : img ? 'Trocar foto' : 'Adicionar foto'}
              <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} />
            </label>
          )}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(10,20,40,.55)',
              padding: '5px 12px',
              color: '#fff',
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{device.name}</div>
            <div style={{ fontSize: 10.5, color: '#cfe0f5' }}>
              {`${stateLabel} · ${speed} km/h · ${formatTime(position.fixTime, 'minutes')}`}
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 13px 14px' }}>
          {blocked ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: RED,
                borderRadius: 12,
                padding: '9px 11px',
                marginBottom: 11,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LockIcon style={{ color: '#fff' }} />
              </div>
              <div style={{ color: '#fff' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '.02em' }}>VEÍCULO BLOQUEADO</div>
                <div style={{ fontSize: 10.5, opacity: 0.9 }}>{sinceTxt}</div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: c.surfaceAlt,
                borderRadius: 12,
                padding: '9px 11px',
                marginBottom: 11,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(46,125,50,.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LockOpenIcon style={{ color: OK }} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>Desbloqueado</div>
                <div style={{ fontSize: 10.5, color: c.textSecondary }}>{`funcionando normal · ${sinceTxt}`}</div>
              </div>
            </div>
          )}

          <div style={{ maxWidth: 168, margin: '0 auto', width: '100%' }}>
            <Speedo speed={speed} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Tile c={c} icon={<KeyIcon fontSize="small" />} label="Ignição" value={ign.value} color={ign.color} />
            <Tile
              c={c}
              icon={<SignalCellularAltIcon fontSize="small" />}
              label="Sinal"
              value={sig.value}
              color={sig.color}
            />
            <Tile
              c={c}
              icon={bat.charging ? <BatteryChargingFullIcon fontSize="small" /> : <BatteryFullIcon fontSize="small" />}
              label="Bateria"
              value={bat.value}
              color={bat.color}
            />
          </div>

          <div style={secLab}>Localização</div>
          <div style={{ fontSize: 12.5, color: c.text, marginBottom: 8 }}>
            {position.address || 'Toque abaixo para ver o local no mapa'}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <a
              style={mapBtnStyle}
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapIcon style={{ fontSize: 17 }} />
              Google Maps
            </a>
            <a
              style={mapBtnStyle}
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`}
              target="_blank"
              rel="noreferrer"
            >
              <StreetviewIcon style={{ fontSize: 17 }} />
              Street View
            </a>
          </div>

          <div style={secLab}>GPS & Veículo</div>
          {a.sat !== undefined && <Row c={c} l="Satélites" v={a.sat} />}
          {a.totalDistance !== undefined && (
            <Row
              c={c}
              l="Hodômetro"
              v={`${(a.totalDistance / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`}
            />
          )}
          <Row c={c} l="Hora GPS" v={formatTime(position.fixTime, 'seconds')} />
        </div>
      </div>

      <div style={{ flex: 'none', padding: '7px 10px 6px', borderTop: `1px solid ${c.border}`, background: c.surface }}>
        <button
          type="button"
          disabled={blockDisabled}
          onClick={() => setConfirmOpen(true)}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 24,
            padding: 13,
            fontWeight: 700,
            fontSize: 14,
            cursor: blockDisabled ? 'default' : 'pointer',
            color: '#fff',
            background: blockDisabled ? c.border : blocked ? OK : RED,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          {blocked ? <LockOpenIcon /> : <LockIcon />}
          {blocked ? 'Desbloquear' : 'Bloquear'}
        </button>
      </div>

      {confirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,15,25,.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1700,
            padding: 24,
            pointerEvents: 'auto',
          }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: c.surface, borderRadius: 18, padding: '20px 18px', width: '100%', maxWidth: 320, textAlign: 'center' }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: blocked ? 'rgba(46,125,50,.15)' : 'rgba(198,40,40,.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              {blocked ? <LockOpenIcon style={{ color: OK }} /> : <LockIcon style={{ color: RED }} />}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: c.text }}>
              {blocked ? 'Desbloquear o motor do veículo?' : 'Bloquear o motor do veículo?'}
            </div>
            <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 4 }}>
              {blocked ? 'O veículo voltará a ligar normalmente.' : 'O motor será impedido de ligar.'}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{
                  flex: 1,
                  background: c.surfaceAlt,
                  border: 'none',
                  borderRadius: 12,
                  padding: 11,
                  fontSize: 13,
                  fontWeight: 600,
                  color: c.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doToggle}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: 12,
                  padding: 11,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: blocked ? OK : RED,
                  cursor: 'pointer',
                }}
              >
                {blocked ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LsVehicleSheet;
