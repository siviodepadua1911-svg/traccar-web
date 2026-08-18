import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Typography,
  Button,
  Radio,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Box,
  Switch,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatchCallback } from '../reactHelper';
import { LS_TOGGLES, DEFAULT_ON } from '../common/util/lsAlerts';
import { LS_SOUND_PRESETS, playPreset } from '../common/util/lsSounds';

const FLAGS = {
  ver: { readonly: true, deviceReadonly: true, limitCommands: true },
  alertas: { readonly: false, deviceReadonly: true, limitCommands: true },
  bloqueio: { readonly: false, deviceReadonly: true, limitCommands: true },
};

const LS_COMMANDS = [
  { type: 'engineStop', description: 'Bloquear' },
  { type: 'engineResume', description: 'Desbloquear' },
];

const PERFIS = [
  {
    key: 'ver',
    title: 'Só acompanhar',
    desc: 'Vê no mapa, replay e relatórios. Não mexe em nada.',
  },
  {
    key: 'alertas',
    title: 'Acompanhar + alertas',
    desc: 'O de cima, e ativa os próprios alertas (sininho, Telegram).',
  },
  {
    key: 'bloqueio',
    title: 'Acompanhar + alertas + bloqueio',
    desc: 'O de cima, e pode bloquear/desbloquear o veículo.',
  },
];

const STEPS = ['Dados', 'Equipamento', 'Acesso', 'Alertas', 'Pronto'];
const MENU_OPTS = [
  { k: 'rel', label: 'Relatórios' },
  { k: 'geo', label: 'Cercas eletrônicas' },
  { k: 'not', label: 'Alertas' },
  { k: 'drv', label: 'Motoristas' },
  { k: 'dev', label: 'Dispositivos' },
  { k: 'cfg', label: 'Configurações' },
];
const AZUL = '#1C7ED6';

const acessoTexto = (email, senha) =>
  `Plataforma LS Autotruck Rastreios\nSite: https://plataforma.lsautotruckrastreios.com.br\nLogin: ${email}\nSenha: ${senha}`;

const LsClientPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [step, setStep] = useState(1);
  const [original, setOriginal] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [perfil, setPerfil] = useState('alertas');
  const [devices, setDevices] = useState([]);
  const [checked, setChecked] = useState([]);
  const [linkedBefore, setLinkedBefore] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumo, setResumo] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newImei, setNewImei] = useState('');
  const [newModel, setNewModel] = useState('J16');
  const [newName, setNewName] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverCode, setDriverCode] = useState('');
  const [menuItems, setMenuItems] = useState({
    rel: true,
    geo: true,
    not: true,
    drv: false,
    dev: false,
    cfg: false,
  });
  const [alerts, setAlerts] = useState(() => {
    const o = {};
    LS_TOGGLES.forEach((tg) => {
      o[tg.key] = DEFAULT_ON.includes(tg.key);
    });
    return o;
  });
  const [alertSounds, setAlertSounds] = useState(() => {
    const o = {};
    LS_TOGGLES.forEach((tg) => {
      o[tg.key] = tg.defaultSound;
    });
    return o;
  });

  const load = useCatchCallback(async () => {
    const allResponse = await fetchOrThrow('/api/devices');
    setDevices(await allResponse.json());
    if (id) {
      const usersResponse = await fetchOrThrow('/api/users');
      const users = await usersResponse.json();
      const user = users.find((u) => u.id === Number(id));
      if (user) {
        setOriginal(user);
        setName(user.name || '');
        setEmail(user.email || '');
        setWhatsapp((user.attributes && user.attributes.lsWhatsapp) || '');
        setCpf((user.attributes && user.attributes.lsCpfCnpj) || '');
        setPerfil((user.attributes && user.attributes.lsPerfil) || 'alertas');
        const menu = (user.attributes && user.attributes.lsMenu) || '';
        if (menu) {
          const setk = menu.split(',');
          const mi = {};
          MENU_OPTS.forEach((o) => {
            mi[o.k] = setk.includes(o.k);
          });
          setMenuItems(mi);
        }
      }
      const linkedResponse = await fetchOrThrow(`/api/devices?userId=${id}`);
      const linked = await linkedResponse.json();
      const ids = linked.map((d) => d.id);
      setChecked(ids);
      setLinkedBefore(ids);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDevice = (deviceId) => {
    setChecked((prev) =>
      prev.includes(deviceId) ? prev.filter((x) => x !== deviceId) : [...prev, deviceId],
    );
  };

  const addNewDevice = useCatchCallback(async () => {
    setAddingDevice(true);
    try {
      const response = await fetchOrThrow('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim() || newImei.trim(),
          uniqueId: newImei.trim(),
          category: 'car',
          model: newModel,
        }),
      });
      const created = await response.json();
      setDevices((prev) => [...prev, created]);
      setChecked((prev) => [...prev, created.id]);
      setAddOpen(false);
      setNewImei('');
      setNewName('');
      setNewModel('J16');
    } finally {
      setAddingDevice(false);
    }
  }, [newImei, newName, newModel]);

  const syncCommands = async (deviceIds, clientUserId) => {
    const response = await fetchOrThrow('/api/commands');
    const all = await response.json();
    const ours = [];
    for (const def of LS_COMMANDS) {
      let cmd = all.find((c) => c.type === def.type && c.attributes && c.attributes.ls);
      if (!cmd && perfil === 'bloqueio') {
        const created = await fetchOrThrow('/api/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: def.description,
            type: def.type,
            textChannel: false,
            attributes: { ls: true },
          }),
        });
        cmd = await created.json();
      }
      if (cmd) {
        ours.push(cmd);
      }
    }
    if (!ours.length) {
      return;
    }
    for (const cmd of ours) {
      try {
        if (perfil === 'bloqueio') {
          await fetchOrThrow('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: clientUserId, commandId: cmd.id }),
          });
        } else {
          await fetchOrThrow('/api/permissions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: clientUserId, commandId: cmd.id }),
          });
        }
      } catch {
        // permissao ja existia ou nao existia
      }
    }
    for (const deviceId of deviceIds) {
      const listResponse = await fetchOrThrow(`/api/commands?deviceId=${deviceId}`);
      const existing = await listResponse.json();
      for (const cmd of ours) {
        const linked = existing.some((c) => c.id === cmd.id);
        if (perfil === 'bloqueio' && !linked) {
          await fetchOrThrow('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, commandId: cmd.id }),
          });
        } else if (perfil !== 'bloqueio' && linked) {
          await fetchOrThrow('/api/permissions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, commandId: cmd.id }),
          });
        }
      }
    }
  };

  const buildSoundList = (kind) => {
    const vals = [];
    LS_TOGGLES.forEach((tg) => {
      if (tg.soundKind === kind && alerts[tg.key] && alertSounds[tg.key] !== 'none') {
        tg.soundValues.forEach((v) => vals.push(v));
      }
    });
    return vals.join(',');
  };

  const buildAlertSoundsMap = () => {
    const m = {};
    LS_TOGGLES.forEach((tg) => {
      if (alerts[tg.key]) {
        m[tg.key] = alertSounds[tg.key];
      }
    });
    return m;
  };

  const syncAlerts = async (clientUserId, deviceIds) => {
    const allResp = await fetchOrThrow('/api/notifications');
    const all = await allResp.json();
    for (const toggle of LS_TOGGLES) {
      const want = !!alerts[toggle.key];
      for (const type of toggle.types) {
        let notification = all.find(
          (n) =>
            n.type === type &&
            !n.always &&
            n.attributes &&
            n.attributes.ls &&
            (!toggle.alarms ||
              String((n.attributes && n.attributes.alarms) || '')
                .split(',')
                .some((a) => toggle.alarms.includes(a))),
        );
        if (want) {
          if (!notification) {
            const body = {
              type,
              always: false,
              notificators: 'web,firebase',
              calendarId: 0,
              attributes: { ls: true },
            };
            if (toggle.alarms) {
              body.attributes.alarms = toggle.alarms;
            }
            const created = await fetchOrThrow('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            notification = await created.json();
            all.push(notification);
          }
          try {
            await fetchOrThrow('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: clientUserId, notificationId: notification.id }),
            });
          } catch {
            /* ja existe */
          }
          for (const deviceId of deviceIds) {
            try {
              await fetchOrThrow('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, notificationId: notification.id }),
              });
            } catch {
              /* ja existe */
            }
          }
        } else if (notification) {
          try {
            await fetchOrThrow('/api/permissions', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: clientUserId, notificationId: notification.id }),
            });
          } catch {
            /* nao existia */
          }
          for (const deviceId of deviceIds) {
            try {
              await fetchOrThrow('/api/permissions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, notificationId: notification.id }),
              });
            } catch {
              /* nao existia */
            }
          }
        }
      }
    }
  };

  const syncDriver = async (deviceIds) => {
    if (!driverName.trim()) {
      return;
    }
    const uniqueId = driverCode.trim() || `ls${Date.now()}`;
    const created = await fetchOrThrow('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: driverName.trim(), uniqueId, attributes: { ls: true } }),
    });
    const driver = await created.json();
    for (const deviceId of deviceIds) {
      try {
        await fetchOrThrow('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, driverId: driver.id }),
        });
      } catch {
        // ja vinculado
      }
    }
  };

  const handleSave = useCatchCallback(async () => {
    setSaving(true);
    try {
      if (!id) {
        const usersResp = await fetchOrThrow('/api/users');
        const users = await usersResp.json();
        if (users.some((u) => String(u.email || '').toLowerCase() === email.trim().toLowerCase())) {
          throw Error(
            'Já existe um cliente com esse e-mail. Use outro e-mail ou edite o cliente que já existe.',
          );
        }
      }
      const base = original || {};
      const attributes = { ...(base.attributes || {}), lsPerfil: perfil };
      if (whatsapp.trim()) {
        attributes.lsWhatsapp = whatsapp.trim();
      } else {
        delete attributes.lsWhatsapp;
      }
      if (cpf.trim()) {
        attributes.lsCpfCnpj = cpf.trim();
      } else {
        delete attributes.lsCpfCnpj;
      }
      if (!id && !attributes.activeMapStyles) {
        attributes.activeMapStyles =
          'osm,openFreeMap,carto,openTopoMap,esriSatellite,esriHybrid,googleHybrid,googleRoad';
      }
      attributes.soundEvents = buildSoundList('events');
      attributes.soundAlarms = buildSoundList('alarms');
      attributes.lsAlertSounds = JSON.stringify(buildAlertSoundsMap());
      attributes.lsMenu = ['map', ...MENU_OPTS.filter((o) => menuItems[o.k]).map((o) => o.k)].join(
        ',',
      );
      const payload = {
        ...base,
        name: name.trim(),
        email: email.trim(),
        ...FLAGS[perfil],
        attributes,
      };
      if (password.trim()) {
        payload.password = password.trim();
      }
      let saved;
      if (id) {
        const response = await fetchOrThrow(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        saved = await response.json();
      } else {
        const response = await fetchOrThrow('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        saved = await response.json();
      }
      for (const deviceId of checked) {
        if (!linkedBefore.includes(deviceId)) {
          await fetchOrThrow('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: saved.id, deviceId }),
          });
        }
      }
      for (const deviceId of linkedBefore) {
        if (!checked.includes(deviceId)) {
          await fetchOrThrow('/api/permissions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: saved.id, deviceId }),
          });
        }
      }
      await syncCommands(checked, saved.id);
      await syncAlerts(saved.id, checked);
      await syncDriver(checked);
      if (!id) {
        setResumo({ email: payload.email, senha: password });
        setStep(5);
      } else {
        navigate('/settings/clients');
      }
    } finally {
      setSaving(false);
    }
  }, [
    original,
    name,
    email,
    password,
    whatsapp,
    cpf,
    perfil,
    checked,
    linkedBefore,
    alerts,
    alertSounds,
    driverName,
    driverCode,
    menuItems,
    id,
    navigate,
  ]);

  const canAdvance = () => {
    if (step === 1) {
      return Boolean(name.trim() && email.trim() && (id || password.trim()));
    }
    return true;
  };

  const handleNext = () => {
    if (step === 4) {
      handleSave();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle']}>
      <Container maxWidth="sm" style={{ padding: 16 }}>
        <Paper style={{ borderRadius: 12, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#0F1E45', color: '#fff', p: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
              {id ? 'Editar cliente' : 'Novo cliente'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mt: 1.2 }}>
              {STEPS.map((label, i) => {
                const n = i + 1;
                const state = n < step ? 'done' : n === step ? 'on' : 'off';
                return (
                  <Box
                    key={label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      fontSize: 12,
                      px: 1.1,
                      py: 0.5,
                      borderRadius: 20,
                      bgcolor:
                        state === 'done'
                          ? '#2e7d32'
                          : state === 'on'
                            ? '#fff'
                            : 'rgba(255,255,255,0.08)',
                      color: state === 'on' ? '#0F1E45' : state === 'done' ? '#fff' : '#b9c9e8',
                      fontWeight: state === 'on' ? 700 : 400,
                    }}
                  >
                    {state === 'done' ? <CheckIcon sx={{ fontSize: 15 }} /> : <span>{n}</span>}
                    {label}
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <>
                {step === 1 && (
                  <>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>
                      Quem é o cliente?
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                      Dados básicos pra criar o acesso.
                    </Typography>
                    <TextField
                      label="Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1.3 }}
                    />
                    <TextField
                      label="E-mail (será o login)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1.3 }}
                    />
                    <TextField
                      label={id ? 'Nova senha (vazio = manter)' : 'Senha'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1.3 }}
                    />
                    <TextField
                      label="WhatsApp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1.3 }}
                    />
                    <TextField
                      label="CPF / CNPJ"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>
                      Qual o equipamento?
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
                      Opcional — marque os veículos do cliente ou cadastre um novo aqui mesmo.
                    </Typography>
                    <div
                      style={{
                        maxHeight: 190,
                        overflow: 'auto',
                        border: '1px solid #dde3ee',
                        borderRadius: 6,
                        padding: '4px 10px',
                        marginBottom: 10,
                      }}
                    >
                      {devices.length === 0 && (
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', p: 1 }}>
                          Nenhum aparelho cadastrado ainda — cadastre um abaixo.
                        </Typography>
                      )}
                      {devices.map((device) => (
                        <FormControlLabel
                          key={device.id}
                          style={{ display: 'flex' }}
                          control={
                            <Checkbox
                              size="small"
                              checked={checked.includes(device.id)}
                              onChange={() => toggleDevice(device.id)}
                            />
                          }
                          label={device.name}
                        />
                      ))}
                    </div>
                    {!addOpen ? (
                      <Button startIcon={<AddIcon />} onClick={() => setAddOpen(true)} size="small">
                        Cadastrar aparelho novo
                      </Button>
                    ) : (
                      <Box sx={{ border: '1px solid #dde3ee', borderRadius: 1.5, p: 1.5 }}>
                        <TextField
                          label="IMEI (etiqueta do aparelho)"
                          value={newImei}
                          onChange={(e) => setNewImei(e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        <TextField
                          label="Apelido do veículo"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        <TextField
                          label="Modelo"
                          value={newModel}
                          onChange={(e) => setNewModel(e.target.value)}
                          select
                          SelectProps={{ native: true }}
                          fullWidth
                          size="small"
                          sx={{ mb: 1 }}
                        >
                          <option>J16</option>
                          <option>GT06</option>
                          <option>Outro</option>
                        </TextField>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            onClick={() => setAddOpen(false)}
                            size="small"
                            disabled={addingDevice}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={addNewDevice}
                            disabled={addingDevice || !newImei.trim()}
                          >
                            {addingDevice ? <CircularProgress size={16} /> : 'Adicionar'}
                          </Button>
                        </Box>
                      </Box>
                    )}
                    <Typography
                      sx={{ fontSize: 13, fontWeight: 700, color: '#33415a', mt: 1.5, mb: 0.5 }}
                    >
                      Motorista (opcional)
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
                      Só se o equipamento reconhece o motorista (iButton/cartão). Em branco = sem
                      motorista.
                    </Typography>
                    <TextField
                      label="Nome do motorista"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Código iButton/RFID (opcional)"
                      value={driverCode}
                      onChange={(e) => setDriverCode(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </>
                )}

                {step === 3 && (
                  <>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>
                      Que acesso ele tem?
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                      Pelo que o cliente pode fazer no próprio veículo.
                    </Typography>
                    {PERFIS.map((p) => (
                      <Box
                        key={p.key}
                        onClick={() => setPerfil(p.key)}
                        sx={{
                          display: 'flex',
                          gap: 1,
                          alignItems: 'flex-start',
                          cursor: 'pointer',
                          mb: 1,
                          p: 1.2,
                          borderRadius: 2,
                          border: perfil === p.key ? `2px solid ${AZUL}` : '1px solid #dde3ee',
                          bgcolor: perfil === p.key ? '#f0f7ff' : '#fff',
                        }}
                      >
                        <Radio size="small" checked={perfil === p.key} />
                        <div>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{p.title}</Typography>
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                            {p.desc}
                          </Typography>
                        </div>
                      </Box>
                    ))}
                    <Typography sx={{ fontWeight: 700, fontSize: 13, mt: 2, mb: 0.3 }}>
                      O que o cliente vê no menu de cima
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 0.3 }}>
                      Monitoramento (mapa) sempre aparece. Marque o resto que ele pode ver.
                    </Typography>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {MENU_OPTS.map((o) => (
                        <FormControlLabel
                          key={o.k}
                          style={{ width: '48%', marginLeft: 0 }}
                          control={
                            <Checkbox
                              size="small"
                              checked={!!menuItems[o.k]}
                              onChange={(e) =>
                                setMenuItems({ ...menuItems, [o.k]: e.target.checked })
                              }
                            />
                          }
                          label={o.label}
                        />
                      ))}
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>
                      Quais alertas e sons?
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
                      Ligue os alertas do cliente e escolha o som (toque no alto-falante pra ouvir).
                    </Typography>
                    {LS_TOGGLES.map((tg) => (
                      <Box
                        key={tg.key}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          py: 0.3,
                          borderBottom: '1px solid #f0f1f5',
                        }}
                      >
                        <Switch
                          size="small"
                          checked={!!alerts[tg.key]}
                          onChange={(e) => setAlerts({ ...alerts, [tg.key]: e.target.checked })}
                        />
                        <Typography sx={{ flex: 1, fontSize: 13 }}>{tg.label}</Typography>
                        {alerts[tg.key] && (
                          <>
                            <Select
                              size="small"
                              value={alertSounds[tg.key]}
                              onChange={(e) =>
                                setAlertSounds({ ...alertSounds, [tg.key]: e.target.value })
                              }
                              sx={{ fontSize: 12.5, minWidth: 128 }}
                            >
                              {Object.keys(LS_SOUND_PRESETS).map((k) => (
                                <MenuItem key={k} value={k} sx={{ fontSize: 12.5 }}>
                                  {LS_SOUND_PRESETS[k].label}
                                </MenuItem>
                              ))}
                            </Select>
                            <IconButton
                              size="small"
                              onClick={() => playPreset(alertSounds[tg.key])}
                              disabled={alertSounds[tg.key] === 'none'}
                            >
                              <VolumeUpIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    ))}
                  </>
                )}

                {step === 5 && resumo && (
                  <>
                    <Box sx={{ textAlign: 'center', pb: 1 }}>
                      <Box
                        sx={{
                          width: 54,
                          height: 54,
                          borderRadius: '50%',
                          bgcolor: '#e8f4ea',
                          color: '#2e7d32',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 1,
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 30 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                        Cliente criado!
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        Copie o acesso e mande no WhatsApp do cliente.
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: '#0F1E45',
                        color: '#dbe6f7',
                        borderRadius: 2,
                        p: 1.5,
                        fontFamily: 'monospace',
                        fontSize: 13.5,
                        whiteSpace: 'pre-line',
                        my: 1.5,
                      }}
                    >
                      {acessoTexto(resumo.email, resumo.senha)}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() =>
                          navigator.clipboard.writeText(acessoTexto(resumo.email, resumo.senha))
                        }
                      >
                        Copiar acesso
                      </Button>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => navigate('/settings/clients')}
                      >
                        Concluir
                      </Button>
                    </Box>
                  </>
                )}
              </>
            )}
          </Box>

          {!loading && step < 5 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                p: 2,
                borderTop: '1px solid #eef1f6',
              }}
            >
              <Button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1 || saving}
                startIcon={<ArrowBackIcon />}
              >
                Voltar
              </Button>
              <Button variant="contained" onClick={handleNext} disabled={saving || !canAdvance()}>
                {saving ? (
                  <CircularProgress size={18} />
                ) : step === 4 ? (
                  id ? (
                    'Salvar'
                  ) : (
                    'Criar cliente'
                  )
                ) : (
                  'Continuar'
                )}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </PageLayout>
  );
};

export default LsClientPage;
