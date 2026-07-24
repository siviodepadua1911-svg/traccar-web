import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MapIcon from '@mui/icons-material/Map';
import StreetviewIcon from '@mui/icons-material/Streetview';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { devicesActions } from '../../store';
import { formatTime } from '../util/formatter';

const kmh = (kn) => Math.round((kn || 0) * 1.852);

const useStyles = makeStyles()(() => ({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1600,
    background: '#c4cbd6',
    display: 'flex',
    justifyContent: 'center',
    overflow: 'auto',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: 480,
    minHeight: '100%',
    background: '#eef1f6',
    fontFamily: 'Inter, Roboto, sans-serif',
    '@media (min-width:600px)': {
      minHeight: 'auto',
      margin: '24px 0',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,.35)',
    },
  },
  header: {
    background: '#0d2a5c',
    color: '#fff',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 'none',
  },
  hName: { flex: 1, minWidth: 0 },
  body: { flex: 1, overflow: 'auto' },
  photo: {
    position: 'relative',
    height: 180,
    background: 'linear-gradient(135deg,#2b3a52,#516b8f)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,.6)',
    overflow: 'hidden',
    flex: 'none',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  photoBtn: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    background: '#fff',
    borderRadius: 20,
    padding: '6px 11px',
    fontSize: 11.5,
    color: '#0d47a1',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,.25)',
  },
  sec: { background: '#fff', borderRadius: 12, padding: '11px 13px', margin: '10px 11px 0' },
  secTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#0d2a5c',
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    marginBottom: 7,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  row: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' },
  rowL: { color: '#607d8b' },
  rowV: { color: '#16233a', fontWeight: 600 },
  addr: { fontSize: 12.5, color: '#16233a', padding: '2px 0 9px' },
  mapsRow: { display: 'flex', gap: 8 },
  mapBtn: {
    flex: 1,
    background: '#f2f8ff',
    border: '1px solid #cfe0f5',
    borderRadius: 9,
    padding: '8px 4px',
    textAlign: 'center',
    fontSize: 11,
    color: '#0d47a1',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  end: { height: 16 },
}));

const Row = ({ label, value, color }) => {
  const { classes } = useStyles();
  return (
    <div className={classes.row}>
      <span className={classes.rowL}>{label}</span>
      <span className={classes.rowV} style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
};

const LsFichaCompleta = ({ device, position, onClose }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const a = position.attributes || {};
  const lat = position.latitude;
  const lon = position.longitude;
  const initial =
    device.attributes && device.attributes.deviceImage
      ? `/api/media/${device.uniqueId}/${device.attributes.deviceImage}`
      : null;
  const [img, setImg] = useState(initial);
  const [busy, setBusy] = useState(false);

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
        window.alert(
          'Foto enviada, mas nao foi possivel salvar (permissao). Fale com a LS Autotruck.',
        );
      }
    } catch (err) {
      window.alert('Nao foi possivel enviar a foto.');
    }
    setBusy(false);
  };

  const share = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    if (navigator.share) {
      navigator
        .share({ title: device.name, text: `${device.name} - localizacao`, url })
        .catch(() => {});
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className={classes.overlay}>
      <div className={classes.panel}>
        <div className={classes.header}>
          <ArrowBackIcon style={{ cursor: 'pointer' }} onClick={onClose} />
          <div className={classes.hName}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{device.name}</div>
            <div style={{ fontSize: 10.5, color: '#a9c4e8' }}>Ficha completa</div>
          </div>
          <ShareIcon style={{ cursor: 'pointer', color: '#a9c4e8' }} onClick={share} />
        </div>

        <div className={classes.body}>
          <div className={classes.photo}>
            {img ? (
              <img src={img} alt={device.name} className={classes.photoImg} />
            ) : (
              <DirectionsCarIcon style={{ fontSize: 52 }} />
            )}
            <label className={classes.photoBtn}>
              <CameraAltIcon style={{ fontSize: 14 }} />{' '}
              {busy ? 'Enviando...' : img ? 'Trocar foto' : 'Adicionar foto'}
              <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} />
            </label>
          </div>

          <div className={classes.sec}>
            <div className={classes.secTitle}>Situacao agora</div>
            <Row label="Velocidade" value={`${kmh(position.speed)} km/h`} />
            {a.ignition !== undefined && (
              <Row
                label="Ignicao"
                value={a.ignition ? 'Ligada' : 'Desligada'}
                color={a.ignition ? '#2e7d32' : '#607d8b'}
              />
            )}
            {a.blocked !== undefined && (
              <Row
                label="Bloqueio"
                value={a.blocked ? 'Bloqueado' : 'Liberado'}
                color={a.blocked ? '#c62828' : '#2e7d32'}
              />
            )}
            {a.motion !== undefined && (
              <Row label="Movimento" value={a.motion ? 'Em movimento' : 'Parado'} />
            )}
          </div>

          {(a.rssi !== undefined || a.sat !== undefined) && (
            <div className={classes.sec}>
              <div className={classes.secTitle}>Sinal & GPS</div>
              {a.rssi !== undefined && <Row label="Sinal GSM" value={a.rssi} />}
              {a.sat !== undefined && <Row label="Satelites" value={a.sat} />}
            </div>
          )}

          {(a.power !== undefined || a.batteryLevel !== undefined) && (
            <div className={classes.sec}>
              <div className={classes.secTitle}>Energia</div>
              {a.power !== undefined && (
                <Row label="Voltagem" value={`${Number(a.power).toFixed(1)} V`} />
              )}
              {a.batteryLevel !== undefined && (
                <Row label="Bateria interna" value={`${a.batteryLevel}%`} />
              )}
              {a.charge !== undefined && (
                <Row
                  label="Carga"
                  value={a.charge ? 'Carregando' : 'Nao'}
                  color={a.charge ? '#2e7d32' : '#607d8b'}
                />
              )}
            </div>
          )}

          <div className={classes.sec}>
            <div className={classes.secTitle}>Localizacao</div>
            <div className={classes.addr}>
              {position.address || 'Toque abaixo para ver o local no mapa'}
            </div>
            <div className={classes.mapsRow}>
              <a
                className={classes.mapBtn}
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                target="_blank"
                rel="noreferrer"
              >
                <MapIcon style={{ fontSize: 17 }} />
                Google Maps
              </a>
              <a
                className={classes.mapBtn}
                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`}
                target="_blank"
                rel="noreferrer"
              >
                <StreetviewIcon style={{ fontSize: 17 }} />
                Street View
              </a>
            </div>
            <div style={{ marginTop: 6 }}>
              <Row label="Hora GPS" value={formatTime(position.fixTime, 'seconds')} />
            </div>
          </div>

          <div className={classes.sec}>
            <div className={classes.secTitle}>Veiculo</div>
            {a.totalDistance !== undefined && (
              <Row
                label="Hodometro"
                value={`${(a.totalDistance / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`}
              />
            )}
            {a.odometer !== undefined && a.odometer > 0 && (
              <Row
                label="Odometro"
                value={`${(a.odometer / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`}
              />
            )}
            <Row label="Categoria" value={device.category || 'rastreador'} />
          </div>

          <div className={classes.end} />
        </div>
      </div>
    </div>
  );
};

export default LsFichaCompleta;
