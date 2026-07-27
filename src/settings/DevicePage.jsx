import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Autocomplete,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FileInput from '../common/components/FileInput';
import EditItemView from './components/EditItemView';
import EditAttributesAccordion from './components/EditAttributesAccordion';
import SelectField from '../common/components/SelectField';
import deviceCategories from '../common/util/deviceCategories';
import { useTranslation } from '../common/components/LocalizationProvider';
import useDeviceAttributes from '../common/attributes/useDeviceAttributes';
import { useManager } from '../common/util/permissions';
import SettingsMenu from './components/SettingsMenu';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import { useCatch } from '../reactHelper';
import useSettingsStyles from './common/useSettingsStyles';
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';

const SERVER_ADDRESS = 'gps.lsautotruckrastreios.com.br';
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

const DevicePage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();

  const manager = useManager();

  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);

  const [searchParams] = useSearchParams();
  const uniqueId = searchParams.get('uniqueId');

  const [item, setItem] = useState(uniqueId ? { uniqueId } : null);
  const [showQr, setShowQr] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const handleFileInput = useCatch(async (newFile) => {
    setImageFile(newFile);
    if (newFile && item?.id) {
      const response = await fetchOrThrow(`/api/devices/${item.id}/image`, {
        method: 'POST',
        body: newFile,
      });
      setItem({ ...item, attributes: { ...item.attributes, deviceImage: await response.text() } });
    } else if (!newFile) {
      // eslint-disable-next-line no-unused-vars
      const { deviceImage, ...remainingAttributes } = item.attributes || {};
      setItem({ ...item, attributes: remainingAttributes });
    }
  });

  const validate = () => item && item.name && item.uniqueId;

  const matchedModel = item && modelCatalog.find((m) => m.model === item.model);

  return (
    <EditItemView
      endpoint="devices"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedDevice']}
    >
      {item && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              background: '#0d2a5c',
              color: '#fff',
              borderRadius: 12,
              padding: '12px 15px',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'rgba(255,255,255,.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DirectionsCarIcon fontSize="small" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {item.id ? 'Editar dispositivo' : 'Cadastrar dispositivo'}
              </div>
              <div style={{ fontSize: 10.5, color: '#a9c4e8' }}>Nome, IMEI, placa e modelo</div>
            </div>
          </div>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.name || ''}
                onChange={(event) => setItem({ ...item, name: event.target.value })}
                label={t('sharedName')}
              />
              <TextField
                value={item.attributes?.placa || ''}
                onChange={(event) =>
                  setItem({
                    ...item,
                    attributes: { ...item.attributes, placa: event.target.value.toUpperCase() },
                  })
                }
                label="Placa"
                helperText="Aparece junto do nome no card do veiculo"
              />
              <TextField
                value={item.uniqueId || ''}
                onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                label={t('deviceIdentifier')}
                helperText={t('deviceIdentifierHelp')}
                disabled={Boolean(uniqueId)}
              />
              <Autocomplete
                freeSolo
                options={modelCatalog}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.model)}
                inputValue={item.model || ''}
                onInputChange={(_, value) => setItem({ ...item, model: value })}
                renderInput={(params) => (
                  <TextField {...params} label={t('deviceModel')} placeholder="Busque o modelo homologado" />
                )}
              />
              {matchedModel && (
                <Alert severity="info">
                  Configure o rastreador para <strong>{SERVER_ADDRESS}</strong> porta{' '}
                  <strong>{matchedModel.port}</strong> (protocolo {matchedModel.protocol}, modo TCP)
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedExtra')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <SelectField
                value={item.groupId}
                onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                endpoint="/api/groups"
                label={t('groupParent')}
              />
              <TextField
                value={item.phone || ''}
                onChange={(event) => setItem({ ...item, phone: event.target.value })}
                label={t('sharedPhone')}
              />
              <TextField
                value={item.contact || ''}
                onChange={(event) => setItem({ ...item, contact: event.target.value })}
                label={t('deviceContact')}
              />
              <SelectField
                value={item.category || 'default'}
                onChange={(event) => setItem({ ...item, category: event.target.value })}
                data={deviceCategories
                  .map((category) => ({
                    id: category,
                    name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                  }))
                  .sort((a, b) => a.name.localeCompare(b.name))}
                label={t('deviceCategory')}
              />
              <SelectField
                value={item.calendarId}
                onChange={(event) => setItem({ ...item, calendarId: Number(event.target.value) })}
                endpoint="/api/calendars"
                label={t('sharedCalendar')}
              />
              <TextField
                label={t('userExpirationTime')}
                type="date"
                value={item.expirationTime ? item.expirationTime.split('T')[0] : '2099-01-01'}
                onChange={(e) => {
                  if (e.target.value) {
                    setItem({ ...item, expirationTime: new Date(e.target.value).toISOString() });
                  }
                }}
                disabled={!manager}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.disabled}
                    onChange={(event) => setItem({ ...item, disabled: event.target.checked })}
                  />
                }
                label={t('sharedDisabled')}
                disabled={!manager}
              />
              <Button variant="outlined" color="primary" onClick={() => setShowQr(true)}>
                {t('sharedQrCode')}
              </Button>
            </AccordionDetails>
          </Accordion>
          {item.id && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{t('attributeDeviceImage')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <FileInput
                  placeholder={t('attributeDeviceImage')}
                  value={imageFile}
                  onChange={handleFileInput}
                  slotProps={{ htmlInput: { accept: 'image/*' } }}
                />
              </AccordionDetails>
            </Accordion>
          )}
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={{ ...commonDeviceAttributes, ...deviceAttributes }}
          />
        </>
      )}
      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
    </EditItemView>
  );
};

export default DevicePage;
