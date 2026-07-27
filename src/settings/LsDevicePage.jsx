import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Autocomplete,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import SelectField from '../common/components/SelectField';
import deviceCategories from '../common/util/deviceCategories';
import { useTranslation } from '../common/components/LocalizationProvider';
import LsSmsSetup from './LsSmsSetup';
import { useManager } from '../common/util/permissions';

const AZUL = '#0F1E45';
const SERVER_ADDRESS = 'gps.lsautotruckrastreios.com.br';
const STEPS = ['Veículo', 'Rastreador', 'Detalhes', 'Revisar'];

const modelCatalog = [
  { model: 'Concox GT06N', protocol: 'GT06', port: 5023 },
  { model: 'Concox GT06E', protocol: 'GT06', port: 5023 },
  { model: 'Concox GT07', protocol: 'GT06', port: 5023 },
  { model: 'Concox X3', protocol: 'GT06', port: 5023 },
  { model: 'Jimi JV200', protocol: 'GT06', port: 5023 },
  { model: 'Jimi JM-VL01', protocol: 'GT06', port: 5023 },
  { model: 'Jimi JM-VL02', protocol: 'GT06', port: 5023 },
  { model: 'Jimi JM-LL301', protocol: 'GT06', port: 5023 },
  { model: 'WanWay S20', protocol: 'GT06', port: 5023 },
  { model: 'J16', protocol: 'GT06', port: 5023 },
  { model: 'E3+', protocol: 'GT06', port: 5023 },
  { model: 'SL42 / SL44 / SL48', protocol: 'GT06', port: 5023 },
  { model: 'Suntech ST310U', protocol: 'Suntech', port: 5011 },
  { model: 'Suntech ST300', protocol: 'Suntech', port: 5011 },
  { model: 'Suntech ST340', protocol: 'Suntech', port: 5011 },
  { model: 'Suntech ST4305', protocol: 'Suntech', port: 5011 },
  { model: 'Suntech ST4315', protocol: 'Suntech', port: 5011 },
  { model: 'Sinotrack ST-901', protocol: 'H02', port: 5013 },
  { model: 'Sinotrack ST-906', protocol: 'H02', port: 5013 },
  { model: 'LKGPS LK209', protocol: 'H02', port: 5013 },
  { model: 'Teltonika FMB920', protocol: 'Teltonika', port: 5027 },
  { model: 'Teltonika FMB130', protocol: 'Teltonika', port: 5027 },
  { model: 'Teltonika FMC130', protocol: 'Teltonika', port: 5027 },
  { model: 'Teltonika FMB140', protocol: 'Teltonika', port: 5027 },
  { model: 'Queclink GV50', protocol: 'GL200', port: 5004 },
  { model: 'Queclink GV55', protocol: 'GL200', port: 5004 },
  { model: 'Queclink GV75', protocol: 'GL200', port: 5004 },
  { model: 'Queclink GV300', protocol: 'GL200', port: 5004 },
  { model: 'Coban TK102', protocol: 'GPS103', port: 5001 },
  { model: 'Coban TK103', protocol: 'GPS103', port: 5001 },
  { model: 'Coban GPS303', protocol: 'GPS103', port: 5001 },
  { model: 'GT02A / TK110', protocol: 'GT02', port: 5022 },
  { model: 'Meitrack MT90', protocol: 'Meitrack', port: 5020 },
  { model: 'Meitrack T366', protocol: 'Meitrack', port: 5020 },
  { model: 'Jointech JT701', protocol: 'JT600', port: 5014 },
  { model: 'Eelink TK116', protocol: 'Eelink', port: 5064 },
  { model: 'Eelink TK119', protocol: 'Eelink', port: 5064 },
  { model: 'iStartek VT100', protocol: 'Startek', port: 5222 },
  { model: 'Relogio GPS Q50 / Q90', protocol: 'Watch', port: 5093 },
  { model: 'JMAK J-R11', protocol: 'JMAK', port: 5259 },
  { model: 'JMAK J-R12', protocol: 'JMAK', port: 5259 },
  { model: 'Celular (app Traccar Client)', protocol: 'OsmAnd', port: 5055 },
];

const Rev = ({ label, value, last }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 2,
      px: 1.5,
      py: 1,
      borderBottom: last ? 'none' : '1px solid #f4f6f9',
      fontSize: 13.5,
    }}
  >
    <span style={{ color: '#7a8699' }}>{label}</span>
    <span style={{ color: '#16233a', fontWeight: 600, textAlign: 'right' }}>{value}</span>
  </Box>
);

const LsDevicePage = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const manager = useManager();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [placa, setPlaca] = useState('');
  const [model, setModel] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [category, setCategory] = useState('default');
  const [groupId, setGroupId] = useState(0);
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');
  const [expiration, setExpiration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [img, setImg] = useState(null);
  const [imgBusy, setImgBusy] = useState(false);

  const categoryData = deviceCategories
    .map((c) => ({ id: c, name: t(`category${c.replace(/^\w/, (ch) => ch.toUpperCase())}`) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const matchedModel = modelCatalog.find((m) => m.model === model);
  const idClean = uniqueId.trim();
  const idIsNum = /^\d+$/.test(idClean);
  const idValid = idClean.length >= 6 && !/\s/.test(idClean);
  const idMsg =
    idIsNum && idClean.length === 15 ? 'IMEI válido (15 dígitos)' : idValid ? 'Identificador válido' : null;

  const canAdvance = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return idValid;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        uniqueId: idClean,
        category: category || 'default',
        attributes: placa.trim() ? { placa: placa.trim().toUpperCase() } : {},
      };
      if (model.trim()) body.model = model.trim();
      if (groupId) body.groupId = groupId;
      if (phone.trim()) body.phone = phone.trim();
      if (contact.trim()) body.contact = contact.trim();
      if (expiration) body.expirationTime = new Date(expiration).toISOString();
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        if (/duplicate|already|unique|exists/i.test(text)) {
          throw new Error('Esse IMEI/identificador já está cadastrado em outro veículo.');
        }
        throw new Error('Não foi possível salvar. Confira os dados e tente de novo.');
      }
      setCreated(await response.json());
      setStep(5);
    } catch (e) {
      setError(e.message || 'Erro ao salvar.');
    }
    setSaving(false);
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !created) return;
    setImgBusy(true);
    try {
      const resp = await fetch(`/api/devices/${created.id}/image`, { method: 'POST', body: file });
      if (!resp.ok) throw new Error('img');
      const filename = await resp.text();
      const updated = { ...created, attributes: { ...created.attributes, deviceImage: filename } };
      await fetch(`/api/devices/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setCreated(updated);
      setImg(`/api/media/${created.uniqueId}/${filename}?t=${Date.now()}`);
    } catch {
      window.alert('Nao foi possivel enviar a foto.');
    }
    setImgBusy(false);
  };

  const handleNext = () => {
    if (step === 4) {
      handleSave();
      return;
    }
    setStep(step + 1);
  };

  const reset = () => {
    setName('');
    setPlaca('');
    setModel('');
    setUniqueId('');
    setCategory('default');
    setGroupId(0);
    setPhone('');
    setContact('');
    setExpiration('');
    setError(null);
    setCreated(null);
    setImg(null);
    setStep(1);
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'sharedDevice']}>
      <Container maxWidth="sm" style={{ padding: 16 }}>
        <Paper style={{ borderRadius: 12, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: AZUL, color: '#fff', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DirectionsCarIcon fontSize="small" />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Cadastrar dispositivo</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mt: 1.3 }}>
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
                        state === 'done' ? '#2e7d32' : state === 'on' ? '#fff' : 'rgba(255,255,255,0.08)',
                      color: state === 'on' ? AZUL : state === 'done' ? '#fff' : '#b9c9e8',
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
            {step === 1 && (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>Qual é o veículo?</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                  Como ele vai aparecer no mapa e pro cliente.
                </Typography>
                <TextField
                  label="Nome do veículo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 1.3 }}
                  placeholder="Ex: Fiorino da obra"
                />
                <TextField
                  label="Placa"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  fullWidth
                  size="small"
                  helperText="Aparece junto do nome no card do veículo"
                />
              </>
            )}

            {step === 2 && (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>Qual o rastreador?</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                  Escolha o modelo — a configuração aparece pronta.
                </Typography>
                <Autocomplete
                  freeSolo
                  options={modelCatalog}
                  getOptionLabel={(o) => (typeof o === 'string' ? o : o.model)}
                  inputValue={model}
                  onInputChange={(_, v) => setModel(v)}
                  renderInput={(params) => (
                    <TextField {...params} label="Modelo" size="small" placeholder="Busque o modelo homologado" />
                  )}
                  sx={{ mb: 1.3 }}
                />
                {matchedModel && (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    Configure o rastreador para <strong>{SERVER_ADDRESS}</strong> porta{' '}
                    <strong>{matchedModel.port}</strong> (protocolo {matchedModel.protocol}, modo TCP)
                  </Alert>
                )}
                <TextField
                  label="Identificador (IMEI)"
                  value={uniqueId}
                  onChange={(e) => setUniqueId(e.target.value)}
                  fullWidth
                  size="small"
                  error={uniqueId.length > 0 && !idValid}
                  helperText={
                    uniqueId.length > 0 && !idValid
                      ? 'Confira: use só o número do aparelho, sem espaços.'
                      : 'IMEI, número de série ou outro ID único do aparelho.'
                  }
                />
                {idValid && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#2e7d32',
                      fontWeight: 600,
                      mt: 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <CheckIcon sx={{ fontSize: 15 }} /> {idMsg}
                  </Typography>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>Detalhes</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                  Opcional — pode preencher agora ou depois.
                </Typography>
                <Box sx={{ mb: 1.3 }}>
                  <SelectField
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    data={categoryData}
                    label="Categoria (ícone no mapa)"
                  />
                </Box>
                <Box sx={{ mb: 1.3 }}>
                  <SelectField
                    value={groupId}
                    onChange={(e) => setGroupId(Number(e.target.value))}
                    endpoint="/api/groups"
                    label="Grupo"
                  />
                </Box>
                <TextField
                  label="Telefone (chip)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 1.3 }}
                />
                <TextField
                  label="Contato (responsável)"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 1.3 }}
                />
                <TextField
                  label="Validade (vencimento)"
                  type="date"
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}

            {step === 4 && (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.3 }}>Confira antes de salvar</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                  Está tudo certo? É só criar.
                </Typography>
                <Box sx={{ border: '1px solid #eef1f6', borderRadius: 2, overflow: 'hidden' }}>
                  <Rev label="Veículo" value={name || '—'} />
                  <Rev label="Placa" value={placa || '—'} />
                  <Rev label="Identificador" value={idClean || '—'} />
                  <Rev label="Modelo" value={model || '—'} />
                  {category && category !== 'default' && (
                    <Rev label="Categoria" value={categoryData.find((c) => c.id === category)?.name || category} />
                  )}
                  {phone.trim() && <Rev label="Telefone" value={phone.trim()} />}
                  {contact.trim() && <Rev label="Contato" value={contact.trim()} />}
                  {expiration && <Rev label="Validade" value={expiration.split('-').reverse().join('/')} />}
                  <Rev
                    label="Configuração"
                    value={matchedModel ? `${SERVER_ADDRESS}:${matchedModel.port}` : '—'}
                    last
                  />
                </Box>
                {error && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    {error}
                  </Alert>
                )}
              </>
            )}

            {step === 5 && (
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 54, color: '#2e7d32' }} />
                <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 1 }}>Dispositivo cadastrado!</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, mb: 1.5 }}>
                  {name}
                  {placa ? ` · ${placa}` : ''}
                </Typography>
                <Box
                  sx={{
                    height: 130,
                    borderRadius: 2,
                    border: '1px solid #eef1f6',
                    background: '#f6f8fb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    mb: 1,
                  }}
                >
                  {img ? (
                    <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <DirectionsCarIcon sx={{ fontSize: 46, color: '#c2cbd6' }} />
                  )}
                </Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CameraAltIcon />}
                  disabled={imgBusy}
                  sx={{ mb: 2 }}
                >
                  {imgBusy ? 'Enviando...' : img ? 'Trocar foto' : 'Adicionar foto do veículo'}
                  <input type="file" accept="image/*" hidden onChange={onFile} disabled={imgBusy} />
                </Button>
                {matchedModel && manager && (
                  <Box sx={{ mb: 2 }}>
                    <LsSmsSetup protocol={matchedModel.protocol} port={matchedModel.port} />
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button fullWidth variant="outlined" onClick={reset}>
                    Cadastrar outro
                  </Button>
                  <Button fullWidth variant="contained" onClick={() => navigate('/settings/devices')}>
                    Concluir
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {step < 5 && (
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
                {saving ? <CircularProgress size={18} /> : step === 4 ? 'Criar dispositivo' : 'Continuar'}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </PageLayout>
  );
};

export default LsDevicePage;
