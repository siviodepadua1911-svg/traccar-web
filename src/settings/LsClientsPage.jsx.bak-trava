import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  IconButton,
  Tooltip,
  Chip,
  Fab,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LoginIcon from '@mui/icons-material/Login';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import RemoveDialog from '../common/components/RemoveDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatchCallback } from '../reactHelper';

const PERFIL_LABEL = {
  ver: 'Somente ver',
  alertas: 'Ver + alertas',
  bloqueio: 'Ver + alertas + bloqueio',
};
const PERFIL_COLOR = { ver: 'info', alertas: 'warning', bloqueio: 'success' };
const FLAGS = {
  ver: { readonly: true, deviceReadonly: true, limitCommands: true },
  alertas: { readonly: false, deviceReadonly: true, limitCommands: true },
  bloqueio: { readonly: false, deviceReadonly: true, limitCommands: true },
};

const LsClientsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPerfil, setImportPerfil] = useState('alertas');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = useCatchCallback(async () => {
    const response = await fetchOrThrow('/api/users');
    const users = await response.json();
    setItems(users.filter((u) => u.attributes && u.attributes.lsPerfil));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSuspend = useCatchCallback(
    async (user) => {
      await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, disabled: !user.disabled }),
      });
      load();
    },
    [load],
  );

  const handleLogin = useCatchCallback(async (userId) => {
    await fetchOrThrow(`/api/session/${userId}`);
    window.location.replace('/');
  }, []);

  const copyAccess = (user) => {
    const texto = `Plataforma LS Autotruck Rastreios\nSite: https://plataforma.lsautotruckrastreios.com.br\nLogin: ${user.email}`;
    navigator.clipboard.writeText(texto);
  };

  const handleExport = () => {
    const header = 'Nome,Telefone,CPF/CNPJ,e-mail';
    const rows = (items || []).map((u) =>
      [
        u.name || '',
        (u.attributes && u.attributes.lsWhatsapp) || '',
        (u.attributes && u.attributes.lsCpfCnpj) || '',
        u.email || '',
      ].join(','),
    );
    const blob = new Blob(['\ufeff' + [header].concat(rows).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes-ls-autotruck.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = useCatchCallback(async () => {
    setImporting(true);
    try {
      const text = await importFile.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (!lines.length) {
        throw Error('Arquivo vazio');
      }
      const delim = lines[0].includes(';') ? ';' : ',';
      const rows = lines.filter((l) => !l.toLowerCase().startsWith('nome'));
      const existingResponse = await fetchOrThrow('/api/users');
      const existing = await existingResponse.json();
      const emails = new Set(existing.map((u) => String(u.email || '').toLowerCase()));
      let criados = 0;
      let repetidos = 0;
      const erros = [];
      for (const line of rows) {
        const parts = line.split(delim).map((x) => x.trim());
        const nome = parts[0];
        const telefone = parts[1];
        const cpf = parts[2];
        const email = parts[3];
        if (!email || !email.includes('@')) {
          erros.push(nome || line);
          continue;
        }
        if (emails.has(email.toLowerCase())) {
          repetidos += 1;
          continue;
        }
        const attributes = { lsPerfil: importPerfil };
        if (telefone) {
          attributes.lsWhatsapp = telefone;
        }
        if (cpf) {
          attributes.lsCpfCnpj = cpf;
        }
        await fetchOrThrow('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nome || email,
            email,
            password: telefone || cpf || email,
            ...FLAGS[importPerfil],
            attributes,
          }),
        });
        emails.add(email.toLowerCase());
        criados += 1;
      }
      setImportOpen(false);
      setImportFile(null);
      setImportResult({ criados, repetidos, erros });
      load();
    } finally {
      setImporting(false);
    }
  }, [importFile, importPerfil, load]);

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle']}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px 0',
        }}
      >
        <Typography variant="h6">Clientes</Typography>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" variant="outlined" onClick={() => setImportOpen(true)}>
            Importar CSV
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleExport}
            disabled={!items || !items.length}
          >
            Exportar CSV
          </Button>
        </div>
      </div>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Login (e-mail)</TableCell>
            <TableCell>Perfil</TableCell>
            <TableCell>WhatsApp</TableCell>
            <TableCell>Situação</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items &&
            items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={PERFIL_COLOR[user.attributes.lsPerfil] || 'default'}
                    label={PERFIL_LABEL[user.attributes.lsPerfil] || user.attributes.lsPerfil}
                  />
                </TableCell>
                <TableCell>{(user.attributes && user.attributes.lsWhatsapp) || '—'}</TableCell>
                <TableCell>
                  {user.disabled ? (
                    <Chip size="small" color="error" label="Suspenso" />
                  ) : (
                    <Chip size="small" color="success" variant="outlined" label="Ativo" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Entrar como este cliente">
                    <IconButton size="small" color="primary" onClick={() => handleLogin(user.id)}>
                      <LoginIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copiar dados de acesso">
                    <IconButton size="small" onClick={() => copyAccess(user)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/settings/client/${user.id}`)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={user.disabled ? 'Reativar' : 'Suspender (inadimplente)'}>
                    <IconButton size="small" onClick={() => toggleSuspend(user)}>
                      {user.disabled ? (
                        <PlayArrowIcon fontSize="small" color="success" />
                      ) : (
                        <PauseIcon fontSize="small" color="warning" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton size="small" color="error" onClick={() => setRemoving(user.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          {items && !items.length && (
            <TableRow>
              <TableCell colSpan={6}>
                Nenhum cliente ainda — clique no + ou importe o CSV da Infinity.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Fab
        color="primary"
        style={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => navigate('/settings/client')}
      >
        <AddIcon />
      </Fab>
      <Dialog
        open={importOpen}
        onClose={() => !importing && setImportOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Importar clientes (CSV da Infinity)</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ fontSize: 13, marginBottom: 10 }}>
            Modelo aceito: Nome, Telefone, CPF/CNPJ, e-mail (o mesmo que a Infinity exporta).
          </DialogContentText>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setImportFile(e.target.files[0] || null)}
          />
          <Typography variant="body2" style={{ fontWeight: 600, margin: '14px 0 4px' }}>
            Perfil para todos deste arquivo
          </Typography>
          <RadioGroup value={importPerfil} onChange={(e) => setImportPerfil(e.target.value)}>
            <FormControlLabel value="ver" control={<Radio size="small" />} label="Somente ver" />
            <FormControlLabel
              value="alertas"
              control={<Radio size="small" />}
              label="Ver + alertas"
            />
            <FormControlLabel
              value="bloqueio"
              control={<Radio size="small" />}
              label="Ver + alertas + bloqueio"
            />
          </RadioGroup>
          <Typography variant="caption" color="textSecondary">
            Senha inicial = telefone do cliente. Veículos você vincula depois, na edição de cada
            cliente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleImport} disabled={importing || !importFile}>
            {importing ? <CircularProgress size={18} /> : 'Importar'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(importResult)} onClose={() => setImportResult(null)}>
        <DialogTitle>Importação concluída</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" style={{ fontSize: 14 }}>
            {importResult &&
              `Criados: ${importResult.criados} · Já existiam: ${importResult.repetidos} · Com erro: ${importResult.erros.length}`}
            {importResult && importResult.erros.length > 0 && (
              <div
                style={{ marginTop: 8, fontSize: 12.5 }}
              >{`Linhas com problema (sem e-mail válido): ${importResult.erros.join(', ')}`}</div>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setImportResult(null)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      <RemoveDialog
        open={Boolean(removing)}
        endpoint="users"
        itemId={removing}
        onResult={(done) => {
          setRemoving(null);
          if (done) load();
        }}
      />
    </PageLayout>
  );
};

export default LsClientsPage;
