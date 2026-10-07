import { useState } from 'react';
import {
  Autocomplete,
  Button,
  Collapse,
  IconButton,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import BuildIcon from '@mui/icons-material/Build';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const useStyles = makeStyles()((theme) => ({
  form: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 128px) minmax(0, 1fr)',
    alignItems: 'center',
    gap: theme.spacing(1, 1.5),
    padding: theme.spacing(2),
  },
  label: {
    fontSize: '0.8125rem',
    color: theme.palette.text.primary,
    overflowWrap: 'anywhere',
  },
  field: {
    minWidth: 0,
    fontSize: '0.8125rem',
    '& .MuiInputBase-root, & .MuiInputBase-input': {
      fontSize: '0.8125rem',
    },
    // A little tighter than the default so a full date and time always fits.
    '& .MuiOutlinedInput-input:not(.MuiAutocomplete-input)': {
      paddingInline: theme.spacing(1.25),
    },
  },
  unit: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    minWidth: 0,
  },
  unitInput: {
    flexGrow: 1,
    minWidth: 0,
  },
  wide: {
    gridColumn: '1 / -1',
  },
  quick: {
    '& .MuiToggleButton-root': {
      textTransform: 'none',
      fontSize: '0.8125rem',
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
    },
  },
  actions: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
    '& .MuiButton-root': {
      textTransform: 'none',
      height: theme.spacing(4.25),
      minWidth: theme.spacing(11),
    },
  },
  section: {
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    margin: 0,
    padding: theme.spacing(1, 1, 1, 2),
    border: 0,
    background: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    font: 'inherit',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    textAlign: 'start',
    cursor: 'pointer',
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.secondary.main}`,
      outlineOffset: -2,
    },
  },
  sectionBody: {
    padding: theme.spacing(1.5, 2, 2),
  },
  subtitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: theme.spacing(0.75, 2),
    margin: 0,
    fontSize: '0.8125rem',
  },
  statLabel: {
    margin: 0,
    color: theme.palette.text.primary,
  },
  statValue: {
    margin: 0,
    textAlign: 'end',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  hint: {
    display: 'block',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1.5),
  },
  exportButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    '& .MuiButton-root': {
      textTransform: 'none',
    },
  },
}));

const QUICK = ['today', 'yesterday', 'week', 'month'];
const QUICK_LABELS = {
  today: 'messagesToday',
  yesterday: 'messagesYesterday',
  week: 'messagesWeek',
  month: 'messagesMonth',
};
const INTERVALS = ['custom', 'lastHour', 'last6h', 'last24h'];
const INTERVAL_LABELS = {
  custom: 'messagesIntervalCustom',
  lastHour: 'messagesIntervalLastHour',
  last6h: 'messagesIntervalLast6h',
  last24h: 'messagesIntervalLast24h',
};
const TYPES = ['data', 'events', 'commands'];
const TYPE_LABELS = {
  data: 'messagesTypeData',
  events: 'messagesTypeEvents',
  commands: 'messagesTypeCommands',
};

const Section = ({ title, defaultOpen = true, children }) => {
  const { classes } = useStyles();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={classes.section}>
      <button
        type="button"
        className={classes.sectionHeader}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </button>
      <Collapse in={open}>
        <div className={classes.sectionBody}>{children}</div>
      </Collapse>
    </section>
  );
};

const MessagesPanel = ({
  mt,
  devices,
  deviceId,
  onDeviceChange,
  onDeviceSettings,
  quick,
  onQuick,
  interval,
  onIntervalChange,
  from,
  to,
  onFromChange,
  onToChange,
  messageType,
  onMessageTypeChange,
  paramsMode,
  onParamsModeChange,
  loading,
  onClear,
  onExecute,
  statistics,
  exportFormats,
  onExport,
  canExport,
}) => {
  const { classes, cx } = useStyles();

  const device = devices.find((item) => item.id === deviceId) || null;
  const rolling = interval !== 'custom';

  return (
    <>
      <form
        className={classes.form}
        onSubmit={(event) => {
          event.preventDefault();
          onExecute();
        }}
      >
        <label className={classes.label} htmlFor="messages-unit">
          {`${mt('messagesUnit')}:`}
        </label>
        <div className={classes.unit}>
          <Autocomplete
            id="messages-unit"
            className={cx(classes.field, classes.unitInput)}
            size="small"
            disableClearable
            noOptionsText={mt('messagesNoOptions')}
            title={device ? device.name : undefined}
            options={devices}
            value={device}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={({ key, ...props }, option) => (
              <li key={option.id || key} {...props}>
                {option.name}
              </li>
            )}
            onChange={(_, value) => onDeviceChange(value ? value.id : null)}
            renderInput={(params) => (
              <TextField {...params} placeholder={mt('messagesUnitPlaceholder')} />
            )}
          />
          {onDeviceSettings && (
            <Tooltip title={mt('messagesUnitSettings')}>
              <span>
                <IconButton
                  size="small"
                  aria-label={mt('messagesUnitSettings')}
                  disabled={!device}
                  onClick={onDeviceSettings}
                >
                  <BuildIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </div>

        <ToggleButtonGroup
          className={cx(classes.wide, classes.quick)}
          size="small"
          fullWidth
          exclusive
          color="secondary"
          value={rolling ? null : quick}
        >
          {QUICK.map((key) => (
            // onClick instead of the group's onChange: clicking the active
            // period again must run the request again.
            <ToggleButton key={key} value={key} onClick={() => onQuick(key)}>
              {mt(QUICK_LABELS[key])}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <span className={classes.label} id="messages-interval-label">
          {`${mt('messagesInterval')}:`}
        </span>
        <Select
          className={classes.field}
          size="small"
          value={interval}
          onChange={(event) => onIntervalChange(event.target.value)}
          labelId="messages-interval-label"
          id="messages-interval"
        >
          {INTERVALS.map((key) => (
            <MenuItem key={key} value={key} dense>
              {mt(INTERVAL_LABELS[key])}
            </MenuItem>
          ))}
        </Select>

        <label className={classes.label} htmlFor="messages-from">
          {`${mt('messagesFrom')}:`}
        </label>
        <TextField
          id="messages-from"
          className={classes.field}
          size="small"
          type="datetime-local"
          value={from}
          disabled={rolling}
          onChange={(event) => onFromChange(event.target.value)}
        />

        <label className={classes.label} htmlFor="messages-to">
          {`${mt('messagesTo')}:`}
        </label>
        <TextField
          id="messages-to"
          className={classes.field}
          size="small"
          type="datetime-local"
          value={to}
          disabled={rolling}
          onChange={(event) => onToChange(event.target.value)}
        />

        <span className={classes.label} id="messages-type-label">
          {`${mt('messagesType')}:`}
        </span>
        <Select
          className={classes.field}
          size="small"
          value={messageType}
          onChange={(event) => onMessageTypeChange(event.target.value)}
          labelId="messages-type-label"
          id="messages-type"
        >
          {TYPES.map((key) => (
            <MenuItem key={key} value={key} dense>
              {mt(TYPE_LABELS[key])}
            </MenuItem>
          ))}
        </Select>

        <span className={classes.label} id="messages-params-label">
          {`${mt('messagesParams')}:`}
        </span>
        <Select
          className={classes.field}
          size="small"
          value={paramsMode}
          disabled={messageType !== 'data'}
          onChange={(event) => onParamsModeChange(event.target.value)}
          labelId="messages-params-label"
          id="messages-params"
        >
          <MenuItem value="sensors" dense>
            {mt('messagesParamsSensors')}
          </MenuItem>
          <MenuItem value="raw" dense>
            {mt('messagesParamsRaw')}
          </MenuItem>
        </Select>

        <div className={classes.actions}>
          <Button variant="outlined" color="secondary" onClick={onClear}>
            {mt('messagesClear')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disableElevation
            disabled={loading}
          >
            {mt(loading ? 'messagesLoading' : 'messagesExecute')}
          </Button>
        </div>
      </form>

      {statistics && (
        <Section title={mt('messagesResult')}>
          <Typography component="h3" className={classes.subtitle}>
            {mt('messagesStatistics')}
          </Typography>
          <dl className={classes.stats}>
            {statistics.map((item) => [
              <dt key={`${item.id}-label`} className={classes.statLabel}>
                {`${item.label}:`}
              </dt>,
              <dd key={`${item.id}-value`} className={classes.statValue}>
                {item.value}
              </dd>,
            ])}
          </dl>
        </Section>
      )}

      {statistics && (
        <Section title={mt('messagesExport')} defaultOpen={false}>
          <Typography variant="caption" className={classes.hint}>
            {mt('messagesExportHint')}
          </Typography>
          <div className={classes.exportButtons}>
            {exportFormats.map((format) => (
              <Button
                key={format.id}
                size="small"
                variant="outlined"
                color="secondary"
                disabled={!canExport}
                onClick={() => onExport(format.id)}
              >
                {format.label}
              </Button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
};

export default MessagesPanel;
