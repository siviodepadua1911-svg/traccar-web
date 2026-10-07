import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector, useStore } from 'react-redux';
import dayjs from 'dayjs';
import {
  AppBar,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Link,
  Paper,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HistoryIcon from '@mui/icons-material/History';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '../common/components/LocalizationProvider';
import BackIcon from '../common/components/BackIcon';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import usePersistedState from '../common/util/usePersistedState';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { useDeviceReadonly } from '../common/util/permissions';
import { deviceEquality } from '../common/util/deviceEquality';
import { altitudeUnitString, speedFromKnots, speedUnitString } from '../common/util/converter';
import { formatDistance, formatSpeed, formatTime } from '../common/util/formatter';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { errorsActions } from '../store';
import ResizeHandle from '../reports/components/ResizeHandle';
import MessagesMap from './MessagesMap';
import MessagesPanel from './MessagesPanel';
import MessagesTable from './MessagesTable';
import MessagesPager, { PAGE_SIZES } from './MessagesPager';
import MessagesChart, { MAX_CHART_PARAMETERS } from './MessagesChart';
import { useMessagesTranslation } from './messagesStrings';
import { useMessagesDisabled } from './messagesAccess';
import {
  buildFileName,
  collectAttributeKeys,
  collectChartKeys,
  computeEventStatistics,
  computeStatistics,
  createFilter,
  exportCsv,
  exportExcel,
  formatAlarms,
  formatAltitudeNumber,
  formatCoordinates,
  formatDateTime,
  formatDelay,
  formatDuration,
  formatEventDetails,
  formatEventType,
  formatRawParameters,
  formatSensorValue,
  formatSpeedNumber,
  getParameterName,
  hasCoordinates,
  messageTime,
  quickRange,
  rollingRange,
  toInputValue,
} from './messagesUtil';

const EMPTY = [];

// Columns shown by default in "sensor values" when the unit reports them.
const DEFAULT_SENSORS = [
  'ignition',
  'power',
  'battery',
  'batteryLevel',
  'odometer',
  'blocked',
  'alarm',
];
const OPTIONAL_PROPERTIES = ['fixTime', 'course', 'accuracy', 'valid', 'outdated', 'protocol'];
const DEFAULT_CHART_KEYS = ['speed', 'ignition', 'power'];

// A message registered this long after it was generated came from the
// tracker's memory (what Wialon calls the black box).
const DELAY_THRESHOLD = 120000;

const JSON_HEADERS = { Accept: 'application/json' };

// Addresses are kept by coordinates rounded to about 11 m, so one answer also
// serves the other messages sent from the same spot.
const addressKey = (position) => `${position.latitude.toFixed(4)},${position.longitude.toFixed(4)}`;

// How long a message stays selected before its address is requested, so that
// clicking through the table does not flood the geocoder.
const ADDRESS_DELAY = 400;

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    backgroundColor: theme.palette.background.default,
    [theme.breakpoints.down('md')]: {
      height: 'auto',
      minHeight: '100%',
      flexDirection: 'column',
    },
  },
  panel: {
    // A little wider than the app drawer so unit names and dates fit.
    width: `calc(${theme.dimensions.drawerWidthDesktop} + ${theme.spacing(4)})`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 2,
    overflow: 'hidden',
  },
  panelCollapsed: {
    width: theme.spacing(7),
  },
  panelToolbar: {
    gap: theme.spacing(1),
  },
  panelToolbarCollapsed: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: theme.spacing(1),
    paddingInline: 0,
    height: '100%',
  },
  title: {
    flexGrow: 1,
  },
  panelBody: {
    flexGrow: 1,
    overflowY: 'auto',
    backgroundColor: theme.palette.background.paper,
  },
  mobileBar: {
    zIndex: 2,
  },
  content: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      height: '100%',
    },
  },
  map: {
    position: 'relative',
    flexShrink: 0,
    flexBasis: 'var(--report-map-height, 42%)',
    minHeight: 120,
    [theme.breakpoints.down('md')]: {
      flexBasis: 'auto',
      height: '38vh',
      minHeight: 220,
    },
  },
  bottom: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    [theme.breakpoints.down('md')]: {
      minHeight: 240,
    },
  },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  tabsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingInlineEnd: theme.spacing(2),
  },
  tabs: {
    minHeight: theme.spacing(5),
    flexShrink: 0,
    '& .MuiTab-root': {
      minHeight: theme.spacing(5),
      textTransform: 'none',
      fontSize: '0.875rem',
    },
  },
  resultCaption: {
    marginInlineStart: 'auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '0.8125rem',
    color: theme.palette.text.secondary,
    fontVariantNumeric: 'tabular-nums',
  },
  resultUnit: {
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginInlineEnd: theme.spacing(1),
  },
  tableScroll: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    [theme.breakpoints.down('md')]: {
      overflowY: 'visible',
    },
  },
  chartArea: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      overflow: 'hidden',
    },
  },
  stale: {
    opacity: 0.5,
    transition: theme.transitions.create('opacity'),
  },
  message: {
    padding: theme.spacing(5, 3),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  messageHint: {
    display: 'block',
    maxWidth: 520,
    margin: theme.spacing(1, 'auto', 0),
  },
  delayed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  delayIcon: {
    fontSize: '0.95rem',
    color: theme.palette.info.main,
  },
}));

const toTime = (value) => (value ? new Date(value).getTime() : null);

const MessagesPage = () => {
  const { classes, cx } = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useStore();
  const t = useTranslation();
  const mt = useMessagesTranslation();

  const [searchParams] = useSearchParams();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const disabled = useMessagesDisabled();
  const deviceReadonly = useDeviceReadonly();

  const positionAttributes = usePositionAttributes(t);

  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));
  const geofences = useSelector((state) => state.geofences.items);
  const storeSelectedId = useSelector((state) => state.devices.selectedId);
  const geocoderEnabled = useSelector((state) => state.session.server.geocoderEnabled);

  const deviceList = useMemo(
    () => Object.values(devices).sort((a, b) => a.name.localeCompare(b.name)),
    [devices],
  );

  // --- Request form ---------------------------------------------------------

  const [deviceId, setDeviceId] = useState(null);
  const [quick, setQuick] = useState('today');
  const [intervalType, setIntervalType] = useState('custom');
  const [from, setFrom] = useState(() => toInputValue(dayjs().startOf('day')));
  const [to, setTo] = useState(() => toInputValue(dayjs().endOf('day')));
  const [messageType, setMessageType] = useState('data');
  const [paramsMode, setParamsMode] = usePersistedState('messagesParams', 'sensors');

  const [panelOpen, setPanelOpen] = useState(true);

  // Starts on the unit from the link (?deviceId=), the one selected on the map,
  // or the only unit of the account.
  const requestedDeviceId = searchParams.get('deviceId');
  const deviceInitializedRef = useRef(false);
  useEffect(() => {
    if (deviceInitializedRef.current) {
      return;
    }
    const ids = Object.keys(devices);
    if (!ids.length) {
      return;
    }
    deviceInitializedRef.current = true;
    const candidate = [requestedDeviceId, storeSelectedId].find(
      (id) => id !== null && id !== undefined && devices[id],
    );
    if (candidate !== undefined) {
      setDeviceId(Number(candidate));
    } else if (ids.length === 1) {
      setDeviceId(Number(ids[0]));
    }
  }, [devices, requestedDeviceId, storeSelectedId]);

  useEffect(() => {
    if (disabled) {
      navigate('/', { replace: true });
    }
  }, [disabled, navigate]);

  // --- Result ---------------------------------------------------------------

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectionSource, setSelectionSource] = useState('table');

  const [tab, setTab] = useState('table');
  const [filterInput, setFilterInput] = useState('');
  const [filterText, setFilterText] = useState('');
  const [sortDescending, setSortDescending] = usePersistedState('messagesSortDescending', true);
  const [storedPageSize, setPageSize] = usePersistedState('messagesPageSize', 50);
  const [page, setPage] = useState(0);
  const [storedColumns, setStoredColumns] = usePersistedState('messagesColumns', null);
  const [storedChartKeys, setStoredChartKeys] = usePersistedState('messagesChartKeys', null);

  const pageSize = PAGE_SIZES.includes(storedPageSize) ? storedPageSize : 50;

  const controllerRef = useRef(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const context = useMemo(
    () => ({
      t,
      mt,
      positionAttributes,
      speedUnit,
      distanceUnit,
      altitudeUnit,
      volumeUnit,
      coordinateFormat,
      geofences,
    }),
    [
      t,
      mt,
      positionAttributes,
      speedUnit,
      distanceUnit,
      altitudeUnit,
      volumeUnit,
      coordinateFormat,
      geofences,
    ],
  );

  const load = async ({ type, targetDeviceId, fromDate, toDate }) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();
    const query = new URLSearchParams({ deviceId: targetDeviceId, from: fromIso, to: toIso });
    const fetchPositions = async () => {
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`, {
        signal,
        headers: JSON_HEADERS,
      });
      return response.json();
    };

    setLoading(true);
    try {
      let rows;
      if (type === 'data') {
        const positions = await fetchPositions();
        rows = positions.map((position) => {
          const time = toTime(messageTime(position));
          const serverTime = toTime(position.serverTime);
          const alarm = position.attributes?.alarm;
          return {
            id: position.id,
            time,
            timeText: formatDateTime(time),
            serverTimeText: formatDateTime(serverTime),
            position,
            raw: formatRawParameters(position.attributes),
            delay: serverTime !== null ? serverTime - time : null,
            alarm: alarm ? `${mt('messagesAlarmRow')}: ${formatAlarms(alarm, t)}` : null,
          };
        });
      } else {
        const eventsQuery = new URLSearchParams(query);
        (type === 'commands' ? ['commandResult', 'queuedCommandSent'] : ['allEvents']).forEach(
          (eventType) => eventsQuery.append('type', eventType),
        );
        const response = await fetchOrThrow(`/api/reports/events?${eventsQuery.toString()}`, {
          signal,
          headers: JSON_HEADERS,
        });
        const events = await response.json();

        // Positions give the events their coordinates and address. A handful
        // is fetched by id; many are cheaper to read as one range request.
        const positionIds = [
          ...new Set(events.map((event) => event.positionId).filter((id) => id)),
        ];
        const positionsById = new Map();
        const fetchByIds = async (ids) => {
          const idsQuery = new URLSearchParams();
          ids.forEach((id) => idsQuery.append('id', id));
          const idsResponse = await fetchOrThrow(`/api/positions?${idsQuery.toString()}`, {
            signal,
            headers: JSON_HEADERS,
          });
          (await idsResponse.json()).forEach((position) =>
            positionsById.set(position.id, position),
          );
        };
        if (positionIds.length > 100) {
          (await fetchPositions()).forEach((position) => positionsById.set(position.id, position));
        }
        const missing = positionIds.filter((id) => !positionsById.has(id)).slice(0, 100);
        if (missing.length) {
          await fetchByIds(missing);
        }

        rows = events.map((event) => {
          const time = toTime(event.eventTime);
          return {
            id: event.id,
            time,
            timeText: formatDateTime(time),
            event,
            position: positionsById.get(event.positionId) || null,
            raw: formatRawParameters(event.attributes),
            delay: null,
            alarm: event.type === 'alarm' ? formatEventType(event, t) : null,
          };
        });
      }
      rows.sort((a, b) => a.time - b.time || a.id - b.id);

      setResult({
        key: Date.now(),
        type,
        deviceId: targetDeviceId,
        from: fromIso,
        to: toIso,
        rows,
      });
      setSelectedId(null);
      setPage(0);
      if (type !== 'data') {
        setTab('table');
      }
      if (!desktop) {
        setPanelOpen(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        dispatch(errorsActions.push(error.message));
      }
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const execute = (range) => {
    if (deviceId === null) {
      dispatch(errorsActions.push(mt('messagesErrorUnit')));
      return;
    }
    let fromDate;
    let toDate;
    if (range) {
      [fromDate, toDate] = range;
    } else if (intervalType !== 'custom') {
      [fromDate, toDate] = rollingRange(intervalType);
      setFrom(toInputValue(fromDate));
      setTo(toInputValue(toDate));
    } else {
      fromDate = dayjs(from);
      // The field has minute precision: "23:59" means until the end of that minute.
      toDate = dayjs(to).endOf('minute');
    }
    if (!fromDate.isValid() || !toDate.isValid() || !fromDate.isBefore(toDate)) {
      dispatch(errorsActions.push(mt('messagesErrorInterval')));
      return;
    }
    load({ type: messageType, targetDeviceId: deviceId, fromDate, toDate });
  };

  const handleQuick = (key) => {
    const range = quickRange(key);
    setQuick(key);
    setIntervalType('custom');
    setFrom(toInputValue(range[0]));
    setTo(toInputValue(range[1]));
    if (deviceId === null) {
      dispatch(errorsActions.push(mt('messagesErrorUnit')));
      return;
    }
    load({ type: messageType, targetDeviceId: deviceId, fromDate: range[0], toDate: range[1] });
  };

  const handleIntervalChange = (value) => {
    setIntervalType(value);
    const range = rollingRange(value);
    if (range) {
      setFrom(toInputValue(range[0]));
      setTo(toInputValue(range[1]));
    }
  };

  const handleClear = () => {
    controllerRef.current?.abort();
    setLoading(false);
    setResult(null);
    setSelectedId(null);
    setPage(0);
  };

  // --- Addresses ------------------------------------------------------------

  // The server may store positions without an address and resolve addresses on
  // request. The table then asks for one at a time: for the selected message,
  // or when the link in a row is clicked.
  const [addresses, setAddresses] = useState(() => new Map());
  const addressRequestsRef = useRef(new Set());

  const requestAddress = useCallback(
    async (position, silent) => {
      const key = addressKey(position);
      if (addressRequestsRef.current.has(key)) {
        return;
      }
      addressRequestsRef.current.add(key);
      try {
        const query = new URLSearchParams({
          latitude: position.latitude,
          longitude: position.longitude,
        });
        const response = await fetchOrThrow(`/api/server/geocode?${query.toString()}`);
        const text = (await response.text()).trim();
        if (text) {
          setAddresses((current) => new Map(current).set(key, text));
        } else {
          addressRequestsRef.current.delete(key);
        }
      } catch (error) {
        // Forgotten on failure, so the link in the row can try again.
        addressRequestsRef.current.delete(key);
        if (!silent) {
          dispatch(errorsActions.push(error.message));
        }
      }
    },
    [dispatch],
  );

  // --- Derived data ---------------------------------------------------------

  const rows = result ? result.rows : EMPTY;
  const resultType = result ? result.type : null;
  const dataResult = resultType === 'data';

  const statistics = useMemo(() => {
    if (!result) {
      return null;
    }
    return result.type === 'data' ? computeStatistics(rows) : computeEventStatistics(rows);
  }, [result, rows]);

  const statisticsItems = useMemo(() => {
    if (!statistics) {
      return null;
    }
    const items = [
      { id: 'total', label: mt('messagesStatTotal'), value: String(statistics.total) },
      { id: 'time', label: mt('messagesStatTime'), value: formatDuration(statistics.duration, mt) },
    ];
    if (statistics.distance !== null) {
      items.push(
        {
          id: 'distance',
          label: mt('messagesStatDistance'),
          value: formatDistance(statistics.distance, distanceUnit, t),
        },
        {
          id: 'average',
          label: mt('messagesStatAvgSpeed'),
          value: formatSpeed(statistics.averageSpeed || 0, speedUnit, t),
        },
        {
          id: 'maximum',
          label: mt('messagesStatMaxSpeed'),
          value: formatSpeed(statistics.maxSpeed || 0, speedUnit, t),
        },
      );
    }
    return items;
  }, [statistics, mt, t, distanceUnit, speedUnit]);

  const attributeKeys = useMemo(
    () => (dataResult ? collectAttributeKeys(rows, positionAttributes) : EMPTY),
    [dataResult, rows, positionAttributes],
  );

  // Column selection. Without a saved choice, the usual vehicle sensors are
  // shown; when the unit reports none of them, its first parameters are.
  const columnSelection = useMemo(() => {
    if (storedColumns) {
      return storedColumns;
    }
    if (attributeKeys.length && !DEFAULT_SENSORS.some((key) => attributeKeys.includes(key))) {
      return attributeKeys.slice(0, 4);
    }
    return DEFAULT_SENSORS;
  }, [storedColumns, attributeKeys]);

  const shownProperties = useMemo(
    () => OPTIONAL_PROPERTIES.filter((key) => columnSelection.includes(key)),
    [columnSelection],
  );
  // The usual vehicle sensors come first, in a fixed order; the rest follow.
  const shownSensors = useMemo(() => {
    if (paramsMode !== 'sensors') {
      return EMPTY;
    }
    const selected = attributeKeys.filter((key) => columnSelection.includes(key));
    return [
      ...DEFAULT_SENSORS.filter((key) => selected.includes(key)),
      ...selected.filter((key) => !DEFAULT_SENSORS.includes(key)),
    ];
  }, [paramsMode, attributeKeys, columnSelection]);

  const columns = useMemo(() => {
    if (!result) {
      return EMPTY;
    }
    const coordinatesColumn = {
      id: 'coordinates',
      header: mt('messagesColCoordinates'),
      text: (row) => (row.position ? formatCoordinates(row.position) : ''),
    };
    const addressColumn = {
      id: 'address',
      header: mt('messagesColLocation'),
      truncate: true,
      text: (row) => {
        if (!row.position) {
          return '';
        }
        if (row.position.address) {
          return row.position.address;
        }
        return hasCoordinates(row.position) ? addresses.get(addressKey(row.position)) || '' : '';
      },
      render: (row, text) => {
        if (text || !geocoderEnabled || !hasCoordinates(row.position)) {
          return text;
        }
        return (
          <Link
            href="#"
            onClick={(event) => {
              event.preventDefault();
              // Only looks the address up; the row keeps its selection.
              event.stopPropagation();
              requestAddress(row.position);
            }}
          >
            {t('sharedShowAddress')}
          </Link>
        );
      },
    };

    if (result.type !== 'data') {
      return [
        {
          id: 'time',
          header: mt('messagesColTime'),
          sortable: true,
          text: (row) => row.timeText,
        },
        {
          id: 'event',
          header: mt('messagesColEvent'),
          text: (row) => formatEventType(row.event, t),
        },
        {
          id: 'details',
          header: mt('messagesColDetails'),
          text: (row) => formatEventDetails(row.event, context),
        },
        {
          id: 'geofence',
          header: mt('messagesColGeofence'),
          text: (row) => geofences[row.event.geofenceId]?.name || '',
        },
        coordinatesColumn,
        addressColumn,
      ];
    }

    const propertyColumn = (key) => ({
      id: `property:${key}`,
      header: getParameterName(key, context),
      text: (row) => formatSensorValue(row.position, key, context),
    });

    const list = [
      {
        id: 'time',
        header: mt('messagesColTime'),
        sortable: true,
        text: (row) => row.timeText,
      },
      {
        id: 'serverTime',
        header: mt('messagesColServerTime'),
        text: (row) => row.serverTimeText,
        render: (row, text) => {
          if (row.delay === null || row.delay < DELAY_THRESHOLD) {
            return text;
          }
          const label = mt('messagesDelayed', { delay: formatDelay(row.delay) });
          return (
            <span className={classes.delayed} title={label}>
              {text}
              <HistoryIcon className={classes.delayIcon} role="img" aria-label={label} />
            </span>
          );
        },
      },
    ];
    if (shownProperties.includes('fixTime')) {
      list.push(propertyColumn('fixTime'));
    }
    list.push(
      {
        id: 'speed',
        header: `${mt('messagesColSpeed')}, ${speedUnitString(speedUnit, t)}`,
        text: (row) =>
          Number.isFinite(row.position.speed)
            ? formatSpeedNumber(row.position.speed, speedUnit)
            : '',
        value: (row) =>
          Number.isFinite(row.position.speed)
            ? Number(speedFromKnots(row.position.speed, speedUnit).toFixed(1))
            : null,
      },
      coordinatesColumn,
      {
        id: 'altitude',
        header: `${mt('messagesColAltitude')}, ${altitudeUnitString(altitudeUnit, t)}`,
        text: (row) =>
          Number.isFinite(row.position.altitude)
            ? formatAltitudeNumber(row.position.altitude, altitudeUnit)
            : '',
        value: (row) =>
          Number.isFinite(row.position.altitude)
            ? Number(formatAltitudeNumber(row.position.altitude, altitudeUnit))
            : null,
      },
      addressColumn,
    );
    shownProperties
      .filter((key) => key !== 'fixTime')
      .forEach((key) => list.push(propertyColumn(key)));
    if (paramsMode === 'sensors') {
      shownSensors.forEach((key) =>
        list.push({
          id: `sensor:${key}`,
          header: getParameterName(key, context),
          text: (row) => formatSensorValue(row.position, key, context),
        }),
      );
    } else {
      list.push({
        id: 'parameters',
        header: mt('messagesColParameters'),
        text: (row) => row.raw,
      });
    }
    return list;
  }, [
    result,
    mt,
    t,
    context,
    geofences,
    classes,
    speedUnit,
    altitudeUnit,
    paramsMode,
    shownProperties,
    shownSensors,
    addresses,
    geocoderEnabled,
    requestAddress,
  ]);

  // Text of a row for the word search. It is built once per row and kept until
  // the columns change, so typing in the filter stays quick on large results.
  const getRowText = useMemo(() => {
    const cache = new Map();
    return (row) => {
      let text = cache.get(row.id);
      if (text === undefined) {
        text = `${columns.map((column) => column.text(row)).join(' ')} ${row.raw}`.toLowerCase();
        cache.set(row.id, text);
      }
      return text;
    };
  }, [columns]);

  const filter = useMemo(
    () => createFilter(filterText, context, getRowText),
    [filterText, context, getRowText],
  );

  const visibleRows = useMemo(() => {
    const filtered = filter ? rows.filter(filter) : rows;
    return sortDescending ? [...filtered].reverse() : filtered;
  }, [rows, filter, sortDescending]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * pageSize;
  const pageRows = useMemo(
    () => visibleRows.slice(pageStart, pageStart + pageSize),
    [visibleRows, pageStart, pageSize],
  );

  // The filter is applied a moment after typing stops.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilterText(filterInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [filterInput]);

  const submitFilter = (value) => {
    setFilterInput(value);
    setFilterText(value);
    setPage(0);
  };

  // --- Selection ------------------------------------------------------------

  const selectedRow = useMemo(
    () => (selectedId !== null ? rows.find((row) => row.id === selectedId) || null : null),
    [rows, selectedId],
  );

  // The address of the selected message is looked up without asking.
  useEffect(() => {
    const position = selectedRow?.position;
    if (!geocoderEnabled || !hasCoordinates(position) || position.address) {
      return undefined;
    }
    if (addresses.has(addressKey(position))) {
      return undefined;
    }
    const timeout = setTimeout(() => requestAddress(position, true), ADDRESS_DELAY);
    return () => clearTimeout(timeout);
  }, [selectedRow, geocoderEnabled, addresses, requestAddress]);

  // Stable callbacks: the table and its rows are memoized.
  const handleRowSelect = useCallback((row) => {
    setSelectionSource('table');
    setSelectedId((current) => (current === row.id ? null : row.id));
  }, []);

  const handleToggleSort = useCallback(() => {
    setSortDescending((value) => !value);
    setPage(0);
  }, [setSortDescending]);

  // Selecting from the map or the chart also turns to the page of the message.
  // The callback is stable because the map layers are rebuilt when it changes.
  const tableScrollRef = useRef(null);
  const keepScrollRef = useRef(false);
  const latestRef = useRef({ visibleRows, pageSize, currentPage });
  latestRef.current = { visibleRows, pageSize, currentPage };
  const selectExternally = useCallback((id) => {
    const index = latestRef.current.visibleRows.findIndex((row) => row.id === id);
    if (index >= 0) {
      const target = Math.floor(index / latestRef.current.pageSize);
      if (target !== latestRef.current.currentPage) {
        // The table scrolls to the selected row itself; do not send it to the top.
        keepScrollRef.current = true;
        setPage(target);
      }
    }
    setSelectionSource('external');
    setSelectedId(id);
  }, []);

  // A new page, order, filter or result starts at the top of the table. On
  // phones the table has no scroll of its own, so the page scrolls to it.
  // It follows what the user changed, not the list of rows: the list is also
  // rebuilt when an address arrives, and that must not move the table.
  const previousPageRef = useRef(currentPage);
  useEffect(() => {
    const pageChanged = previousPageRef.current !== currentPage;
    previousPageRef.current = currentPage;
    if (keepScrollRef.current) {
      keepScrollRef.current = false;
      return;
    }
    const element = tableScrollRef.current;
    if (!element) {
      return;
    }
    if (element.scrollHeight > element.clientHeight) {
      element.scrollTop = 0;
    } else if (pageChanged) {
      element.scrollIntoView({ block: 'start' });
    }
  }, [result, filterText, sortDescending, currentPage, pageSize]);

  // --- Map ------------------------------------------------------------------

  const track = useMemo(
    () => (dataResult ? rows.map((row) => row.position).filter(hasCoordinates) : EMPTY),
    [dataResult, rows],
  );
  const fitPositions = useMemo(() => {
    if (!result || dataResult) {
      return track;
    }
    return rows.map((row) => row.position).filter(hasCoordinates);
  }, [result, dataResult, rows, track]);
  const endPosition = track.length ? track[track.length - 1] : null;

  // Current position of the unit, shown while there is no message to point at.
  // It is read once per unit so the map does not follow every live update.
  const hasLivePosition = useSelector(
    (state) => deviceId !== null && Boolean(state.session.positions[deviceId]),
  );
  const [unitPosition, setUnitPosition] = useState(null);
  useEffect(() => {
    setUnitPosition(
      deviceId !== null && hasLivePosition ? store.getState().session.positions[deviceId] : null,
    );
  }, [deviceId, hasLivePosition, store]);

  // --- Columns and chart parameters ----------------------------------------

  const columnGroups = useMemo(() => {
    if (!dataResult) {
      return EMPTY;
    }
    const toOption = (key) => ({ key, label: getParameterName(key, context) });
    return [
      {
        id: 'extra',
        label: mt('messagesColumnsExtra'),
        options: OPTIONAL_PROPERTIES.map(toOption),
      },
      {
        id: 'sensors',
        label: mt('messagesColumnsSensors'),
        options: paramsMode === 'sensors' ? attributeKeys.map(toOption) : EMPTY,
      },
    ];
  }, [dataResult, context, mt, paramsMode, attributeKeys]);

  const handleColumnToggle = (key) => {
    setStoredColumns(
      columnSelection.includes(key)
        ? columnSelection.filter((item) => item !== key)
        : [...columnSelection, key],
    );
  };

  const handleColumnsAll = () => {
    setStoredColumns([
      ...columnSelection.filter((key) => OPTIONAL_PROPERTIES.includes(key)),
      ...attributeKeys,
    ]);
  };

  const chartKeys = useMemo(
    () => (dataResult ? collectChartKeys(rows, attributeKeys) : EMPTY),
    [dataResult, rows, attributeKeys],
  );
  const selectedChartKeys = useMemo(
    () =>
      (storedChartKeys || DEFAULT_CHART_KEYS)
        .filter((key) => chartKeys.includes(key))
        .slice(0, MAX_CHART_PARAMETERS),
    [storedChartKeys, chartKeys],
  );

  // --- Export ---------------------------------------------------------------

  const deviceName = result ? devices[result.deviceId]?.name || String(result.deviceId) : '';

  const exportFormats = useMemo(() => {
    const formats = [
      { id: 'xlsx', label: mt('messagesExportExcel') },
      { id: 'csv', label: mt('messagesExportCsv') },
    ];
    if (dataResult) {
      formats.push(
        { id: 'kml', label: mt('messagesExportKml') },
        { id: 'gpx', label: mt('messagesExportGpx') },
      );
    }
    return formats;
  }, [dataResult, mt]);

  const handleExport = async (format) => {
    if (!result) {
      return;
    }
    try {
      if (format === 'kml' || format === 'gpx') {
        const query = new URLSearchParams({
          deviceId: result.deviceId,
          from: result.from,
          to: result.to,
        });
        window.location.assign(`/api/positions/${format}?${query.toString()}`);
        return;
      }
      const headers = [mt('messagesColNumber'), ...columns.map((column) => column.header)];
      const lines = visibleRows.map((row, index) => [
        index + 1,
        ...columns.map((column) => (column.value ? column.value(row) : column.text(row))),
      ]);
      const fileName = buildFileName(
        mt('messagesExportFilePrefix'),
        deviceName,
        result.from,
        result.to,
        format,
      );
      if (format === 'csv') {
        exportCsv(fileName, headers, lines);
      } else {
        await exportExcel({
          title: `${mt('messagesTitle')}: ${deviceName}, ${formatTime(result.from, 'minutes')} – ${formatTime(result.to, 'minutes')}`,
          fileName,
          sheetName: deviceName,
          headers,
          lines,
          theme,
        });
      }
    } catch (error) {
      dispatch(errorsActions.push(error.message));
    }
  };

  // --- Rendering ------------------------------------------------------------

  if (disabled) {
    return null;
  }

  const panel = (
    <MessagesPanel
      mt={mt}
      devices={deviceList}
      deviceId={deviceId}
      onDeviceChange={setDeviceId}
      onDeviceSettings={deviceReadonly ? null : () => navigate(`/settings/device/${deviceId}`)}
      quick={quick}
      onQuick={handleQuick}
      interval={intervalType}
      onIntervalChange={handleIntervalChange}
      from={from}
      to={to}
      onFromChange={(value) => {
        setFrom(value);
        setQuick(null);
      }}
      onToChange={(value) => {
        setTo(value);
        setQuick(null);
      }}
      messageType={messageType}
      onMessageTypeChange={setMessageType}
      paramsMode={paramsMode}
      onParamsModeChange={setParamsMode}
      loading={loading}
      onClear={handleClear}
      onExecute={() => execute()}
      statistics={statisticsItems}
      exportFormats={exportFormats}
      onExport={handleExport}
      canExport={visibleRows.length > 0}
    />
  );

  let emptyMessage = null;
  if (!result) {
    emptyMessage = loading ? null : { title: mt('messagesEmptyStart') };
  } else if (!rows.length) {
    emptyMessage = { title: mt('messagesEmptyResult'), hint: mt('messagesEmptyResultHint') };
  } else if (!visibleRows.length) {
    emptyMessage = { title: mt('messagesEmptyFilter') };
  }

  return (
    <div className={classes.root}>
      {desktop ? (
        <Paper
          square
          elevation={3}
          className={cx(classes.panel, !panelOpen && classes.panelCollapsed)}
        >
          {panelOpen ? (
            <>
              <Toolbar className={classes.panelToolbar}>
                <IconButton
                  color="inherit"
                  edge="start"
                  aria-label={mt('messagesBack')}
                  onClick={() => navigate('/')}
                >
                  <BackIcon />
                </IconButton>
                <Typography variant="h6" component="h1" noWrap className={classes.title}>
                  {mt('messagesTitle')}
                </Typography>
                <Tooltip title={mt('messagesHidePanel')}>
                  <IconButton color="inherit" edge="end" onClick={() => setPanelOpen(false)}>
                    {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                  </IconButton>
                </Tooltip>
              </Toolbar>
              <Divider />
              <div className={classes.panelBody}>{panel}</div>
            </>
          ) : (
            <Toolbar className={cx(classes.panelToolbar, classes.panelToolbarCollapsed)}>
              <Tooltip title={mt('messagesShowPanel')} placement="right">
                <IconButton color="inherit" onClick={() => setPanelOpen(true)}>
                  {theme.direction === 'rtl' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={mt('messagesBack')} placement="right">
                <IconButton color="inherit" onClick={() => navigate('/')}>
                  <BackIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          )}
        </Paper>
      ) : (
        <>
          <AppBar className={classes.mobileBar} position="static" color="inherit">
            <Toolbar>
              <Typography variant="h6" component="h1" noWrap className={classes.title}>
                {mt('messagesTitle')}
              </Typography>
              <Tooltip title={mt('messagesFilters')}>
                <IconButton
                  color={panelOpen ? 'secondary' : 'inherit'}
                  edge="end"
                  aria-label={mt('messagesFilters')}
                  aria-expanded={panelOpen}
                  onClick={() => setPanelOpen(!panelOpen)}
                >
                  <TuneIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>
          <Collapse in={panelOpen}>
            <div className={classes.panelBody}>{panel}</div>
            <Divider />
          </Collapse>
        </>
      )}
      <div className={classes.content}>
        <div className={classes.map}>
          <MessagesMap
            track={track}
            fitPositions={fitPositions}
            selectedPosition={selectedRow?.position || null}
            endPosition={endPosition}
            unitPosition={unitPosition}
            onPointClick={selectExternally}
          />
        </div>
        {desktop && <ResizeHandle />}
        <Paper square elevation={0} className={classes.bottom}>
          {loading && <LinearProgress color="secondary" className={classes.progress} />}
          <div className={classes.tabsRow}>
            <Tabs
              className={classes.tabs}
              value={tab}
              onChange={(_, value) => setTab(value)}
              textColor="secondary"
              indicatorColor="secondary"
            >
              <Tab value="table" label={mt('messagesTable')} />
              <Tab
                value="chart"
                label={mt('messagesChart')}
                disabled={Boolean(result) && !dataResult}
              />
            </Tabs>
            {result && (
              <div className={classes.resultCaption}>
                <span className={classes.resultUnit}>{deviceName}</span>
                {`${formatTime(result.from, 'minutes')} – ${formatTime(result.to, 'minutes')}`}
              </div>
            )}
          </div>
          {tab === 'table' ? (
            <>
              <div
                ref={tableScrollRef}
                className={cx(classes.tableScroll, loading && classes.stale)}
              >
                {columns.length > 0 && pageRows.length > 0 && (
                  <MessagesTable
                    columns={columns}
                    rows={pageRows}
                    startIndex={pageStart}
                    selectedId={selectedId}
                    onSelect={handleRowSelect}
                    scrollToSelected={selectionSource === 'external'}
                    sortDescending={sortDescending}
                    onToggleSort={handleToggleSort}
                    sortLabel={mt(sortDescending ? 'messagesSortNewest' : 'messagesSortOldest')}
                    numberLabel={mt('messagesColNumber')}
                  />
                )}
                {emptyMessage && (
                  <div className={classes.message}>
                    <Typography variant="body2">{emptyMessage.title}</Typography>
                    {emptyMessage.hint && (
                      <Typography variant="caption" className={classes.messageHint}>
                        {emptyMessage.hint}
                      </Typography>
                    )}
                  </div>
                )}
              </div>
              <MessagesPager
                mt={mt}
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(0);
                }}
                shownFrom={visibleRows.length ? pageStart + 1 : 0}
                shownTo={pageStart + pageRows.length}
                total={visibleRows.length}
                allTotal={rows.length}
                filterValue={filterInput}
                onFilterChange={setFilterInput}
                onFilterSubmit={submitFilter}
                exportFormats={exportFormats}
                onExport={handleExport}
                columnGroups={columnGroups}
                selectedColumns={columnSelection}
                onColumnToggle={handleColumnToggle}
                onColumnsDefault={() => setStoredColumns(null)}
                onColumnsAll={paramsMode === 'sensors' ? handleColumnsAll : null}
                columnsNote={paramsMode === 'raw' ? mt('messagesColumnsRawNote') : null}
              />
            </>
          ) : (
            <div className={cx(classes.chartArea, loading && classes.stale)}>
              {dataResult && rows.length > 0 ? (
                <MessagesChart
                  key={result.key}
                  rows={rows}
                  context={context}
                  availableKeys={chartKeys}
                  selectedKeys={selectedChartKeys}
                  onSelectedKeysChange={setStoredChartKeys}
                  selectedTime={selectedRow ? selectedRow.time : null}
                  onSelect={selectExternally}
                />
              ) : (
                <div className={classes.message}>
                  <Typography variant="body2">
                    {result && rows.length === 0
                      ? mt('messagesEmptyResult')
                      : mt('messagesEmptyStart')}
                  </Typography>
                </div>
              )}
            </div>
          )}
        </Paper>
      </div>
    </div>
  );
};

export default MessagesPage;
