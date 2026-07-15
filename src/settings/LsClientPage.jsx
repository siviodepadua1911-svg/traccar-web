import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Paper, TextField, Typography, Button, Radio, RadioGroup,
  FormControlLabel, Checkbox, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Divider,
} from '@mui/material';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatchCallback } from '../reactHelper';

const FLAGS = {
  ver: { readonly: true, deviceReadonly: true, limitCommands: true },
  alertas: { readonly: false, deviceReadonly: true, limitCommands: true },
  bloqueio: { readonly: false, deviceReadonly: true, limitCommands: true },
};

const LS_COMMANDS = [
  { type: 'engineStop', description: 'Bloquear' },
  { type: 'engineResume', description: 'Desbloquear' },
];

const acessoTexto = (email, senha) => (
  `Plataforma LS Autotruck Rastreios\nSite: https://plataforma.lsautotruckrastreios.com.br\nLogin: ${email}\nSenha: ${senha}`
);

const LsClientPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

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
      }
      const linkedResponse = await fetchOrThrow(`/api/devices?userId=${id}`);
      const linked = await linkedResponse.json();
      const ids = linked.map((d) => d.id);
      setChecked(ids);
      setLinkedBefore(ids);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleDevice = (deviceId) => {
    setChecked((prev) => (
      prev.includes(deviceId) ? prev.filter((x) => x !== deviceId) : [...prev, deviceId]
    ));
  };

  const syncCommands = async (deviceIds) => {
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
            description: def.description, type: def.type, textChannel: false, attributes: { ls: true },
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

  const handleSave = useCatchCallback(async () => {
    setSaving(true);
    try {
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
      await syncCommands(checked);
      if (!id) {
        setResumo({ email: payload.email, senha: password });
      } else {
        navigate('/settings/clients');
      }
    } finally {
      setSaving(false);
    }
  }, [original, name, email, password, whatsapp, cpf, perfil, checked, linkedBefore, id, navigate]);

  const incompleto = !name.trim() || !email.trim() || (!id && !password.trim());

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle']}>
      <Container maxWidth="xs" style={{ padding: 16 }}>
        <Paper style={{ padding: 16 }}>
          <Typography variant="h6" style={{ marginBottom: 12 }}>
            {id ? 'Editar cliente' : 'Novo cliente'}
          </Typography>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <CircularProgress size={28} />
            </div>
          ) : (
            <>
              <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" style={{ marginBottom: 10 }} />
              <TextField label="E-mail (vai ser o login)" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" style={{ marginBottom: 10 }} />
              <TextField label={id ? 'Nova senha (deixe vazio pra manter)' : 'Senha'} value={password} onChange={(e) => setPassword(e.target.value)} fullWidth size="small" style={{ marginBottom: 10 }} />
              <TextField label="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} fullWidth size="small" style={{ marginBottom: 10 }} />
              <TextField label="CPF/CNPJ" value={cpf} onChange={(e) => setCpf(e.target.value)} fullWidth size="small" style={{ marginBottom: 10 }} />
              <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 4 }}>Perfil de acesso</Typography>
              <RadioGroup value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                <FormControlLabel value="ver" control={<Radio size="small" />} label="Somente ver (mapa, replay e relatórios)" />
                <FormControlLabel value="alertas" control={<Radio size="small" />} label="Ver + alertas (sininho, sons e Telegram)" />
                <FormControlLabel value="bloqueio" control={<Radio size="small" />} label="Ver + alertas + bloqueio (cadeado liberado)" />
              </RadioGroup>
              <Divider style={{ margin: '10px 0' }} />
              <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 4 }}>Veículos deste cliente</Typography>
              <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #dde3ee', borderRadius: 6, padding: '4px 10px' }}>
                {devices.map((device) => (
                  <FormControlLabel
                    key={device.id}
                    style={{ display: 'flex' }}
                    control={(
                      <Checkbox
                        size="small"
                        checked={checked.includes(device.id)}
                        onChange={() => toggleDevice(device.id)}
                      />
                    )}
                    label={device.name}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <Button onClick={() => navigate('/settings/clients')} disabled={saving}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving || incompleto}>
                  {saving ? <CircularProgress size={18} /> : (id ? 'Salvar' : 'Criar cliente e vincular')}
                </Button>
              </div>
            </>
          )}
        </Paper>
      </Container>
      {resumo && (
        <Dialog open>
          <DialogTitle>Cliente criado!</DialogTitle>
          <DialogContent>
            <DialogContentText component="div" style={{ whiteSpace: 'pre-line', fontFamily: 'monospace', fontSize: 14 }}>
              {acessoTexto(resumo.email, resumo.senha)}
            </DialogContentText>
            <Typography variant="caption" color="textSecondary">
              Copie agora — a senha não fica visível depois. Cole no CRM/WhatsApp do cliente.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => navigator.clipboard.writeText(acessoTexto(resumo.email, resumo.senha))}>Copiar</Button>
            <Button variant="contained" onClick={() => navigate('/settings/clients')}>Concluir</Button>
          </DialogActions>
        </Dialog>
      )}
    </PageLayout>
  );
};

export default LsClientPage;
