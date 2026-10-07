import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import {
  formatAltitude,
  formatBoolean,
  formatConsumption,
  formatCoordinate,
  formatCourse,
  formatDistance,
  formatNumericHours,
  formatPercentage,
  formatSpeed,
  formatTemperature,
  formatVoltage,
  formatVolume,
} from '../common/util/formatter';
import {
  altitudeFromMeters,
  altitudeUnitString,
  distanceFromMeters,
  distanceUnitString,
  speedFromKnots,
  speedToKnots,
  speedUnitString,
  volumeFromLiters,
  volumeUnitString,
} from '../common/util/converter';
import { prefixString } from '../common/util/stringUtils';

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

const INPUT_FORMAT = 'YYYY-MM-DDTHH:mm';

export const toInputValue = (date) => dayjs(date).locale('en').format(INPUT_FORMAT);

export const quickRange = (key) => {
  const now = dayjs();
  switch (key) {
    case 'yesterday': {
      const day = now.subtract(1, 'day');
      return [day.startOf('day'), day.endOf('day')];
    }
    case 'week':
      return [now.subtract(6, 'day').startOf('day'), now.endOf('day')];
    case 'month':
      return [now.subtract(29, 'day').startOf('day'), now.endOf('day')];
    case 'today':
    default:
      return [now.startOf('day'), now.endOf('day')];
  }
};

export const rollingRange = (key) => {
  const now = dayjs();
  switch (key) {
    case 'lastHour':
      return [now.subtract(1, 'hour'), now];
    case 'last6h':
      return [now.subtract(6, 'hour'), now];
    case 'last24h':
      return [now.subtract(24, 'hour'), now];
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

const EARTH_RADIUS = 6371000;
const KNOTS_PER_METER_PER_SECOND = 3.6 / 1.852;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const haversine = (latitude1, longitude1, latitude2, longitude2) => {
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const hasCoordinates = (position) =>
  Boolean(position) &&
  Number.isFinite(position.latitude) &&
  Number.isFinite(position.longitude) &&
  !(position.latitude === 0 && position.longitude === 0);

const POSITION_PROPERTIES = new Set([
  'id',
  'deviceId',
  'protocol',
  'serverTime',
  'deviceTime',
  'fixTime',
  'outdated',
  'valid',
  'latitude',
  'longitude',
  'altitude',
  'speed',
  'course',
  'address',
  'accuracy',
  'geofenceIds',
]);

export const isPositionProperty = (key) => POSITION_PROPERTIES.has(key);

export const getPositionValue = (position, key) =>
  isPositionProperty(key) ? position[key] : position.attributes?.[key];

// Time of a message: the moment the tracker generated it. Falls back to the
// GPS time for protocols that do not report a device time.
export const messageTime = (position) => position.deviceTime || position.fixTime;

// Rows must be sorted by time, oldest first. As in Wialon, the total time and
// the average speed only consider the messages that carry coordinates.
export const computeStatistics = (rows) => {
  let distance = 0;
  let maxSpeed = null;
  let previous = null;
  let firstTime = null;
  let lastTime = null;
  rows.forEach(({ position, time }) => {
    if (!position) {
      return;
    }
    if (Number.isFinite(position.speed)) {
      maxSpeed = maxSpeed === null ? position.speed : Math.max(maxSpeed, position.speed);
    }
    if (hasCoordinates(position)) {
      if (previous) {
        distance += haversine(
          previous.latitude,
          previous.longitude,
          position.latitude,
          position.longitude,
        );
      }
      previous = position;
      if (firstTime === null) {
        firstTime = time;
      }
      lastTime = time;
    }
  });
  const duration = firstTime !== null ? lastTime - firstTime : 0;
  return {
    total: rows.length,
    duration,
    distance,
    averageSpeed: duration > 0 ? (distance / (duration / 1000)) * KNOTS_PER_METER_PER_SECOND : null,
    maxSpeed,
  };
};

// Events have no track, so the statistics are just the count and the span.
export const computeEventStatistics = (rows) => ({
  total: rows.length,
  duration: rows.length ? rows[rows.length - 1].time - rows[0].time : 0,
  distance: null,
  averageSpeed: null,
  maxSpeed: null,
});

const pad = (value) => String(value).padStart(2, '0');

export const formatDuration = (milliseconds, mt) => {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  if (days > 0) {
    return `${days} ${mt(days === 1 ? 'messagesDay' : 'messagesDays')} ${clock}`;
  }
  return clock;
};

// Short delay between the device time and the registration time.
export const formatDelay = (milliseconds) => {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds} s`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
};

// ---------------------------------------------------------------------------
// Formatting values
// ---------------------------------------------------------------------------

// Same text as the platform's formatTime(value, 'seconds'), from one reused
// formatter: searching or exporting a month of messages formats tens of
// thousands of dates, and building a formatter per call is what makes it slow.
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export const formatDateTime = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const time = typeof value === 'number' ? value : Date.parse(value);
  return Number.isNaN(time) ? '' : dateTimeFormatter.format(time);
};

export const formatRawValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

export const formatRawParameters = (attributes) =>
  Object.entries(attributes || {})
    .map(([key, value]) => `${key}=${formatRawValue(value)}`)
    .join(', ');

export const formatAlarms = (value, t) =>
  String(value)
    .split(',')
    .map((alarm) => alarm.trim())
    .filter((alarm) => alarm)
    .map((alarm) => t(prefixString('alarm', alarm)) || alarm)
    .join(', ');

const trimNumber = (value, precision = 2) => String(Number(value.toFixed(precision)));

export const formatSpeedNumber = (knots, unit) => trimNumber(speedFromKnots(knots, unit), 1);

export const formatAltitudeNumber = (meters, unit) =>
  trimNumber(altitudeFromMeters(meters, unit), 0);

export const formatCoordinates = (position) => {
  if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) {
    return '';
  }
  const satellites = position.attributes?.sat;
  const suffix = satellites !== undefined && satellites !== null ? ` (${satellites})` : '';
  return `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}${suffix}`;
};

// Text shown in a sensor column. Mirrors PositionValue, but always returns a
// plain string so the same value can be searched and exported.
export const formatSensorValue = (position, key, context) => {
  const value = getPositionValue(position, key);
  if (value === null || value === undefined) {
    return '';
  }
  const { t, mt, positionAttributes } = context;
  const numeric = typeof value === 'number' && Number.isFinite(value);
  switch (key) {
    case 'fixTime':
    case 'deviceTime':
    case 'serverTime':
      return formatDateTime(value);
    case 'latitude':
    case 'longitude':
      return numeric ? formatCoordinate(key, value, context.coordinateFormat) : String(value);
    case 'course':
      return numeric ? `${formatCourse(value)} ${Math.round(value)}°` : String(value);
    case 'accuracy':
      return numeric ? `${trimNumber(value, 0)} ${t('sharedMeters')}` : String(value);
    case 'altitude':
      return numeric ? formatAltitude(value, context.altitudeUnit, t) : String(value);
    case 'obdSpeed':
      return numeric
        ? formatSpeed(speedToKnots(value, 'kmh'), context.speedUnit, t)
        : String(value);
    case 'fuelConsumption':
      return numeric ? formatConsumption(value, t) : String(value);
    case 'coolantTemp':
    case 'engineTemp':
    case 'deviceTemp':
    case 'temp1':
    case 'temp2':
    case 'temp3':
    case 'temp4':
      return numeric ? formatTemperature(value) : String(value);
    case 'alarm':
      return formatAlarms(value, t);
    case 'ignition':
      if (typeof value === 'boolean') {
        return mt(value ? 'messagesOn' : 'messagesOff');
      }
      break;
    case 'blocked':
      if (typeof value === 'boolean') {
        return mt(value ? 'messagesBlocked' : 'messagesUnblocked');
      }
      break;
    case 'geofenceIds':
      return Array.isArray(value)
        ? value.map((id) => context.geofences?.[id]?.name || id).join(', ')
        : formatRawValue(value);
    default:
      break;
  }
  if (numeric) {
    switch (positionAttributes[key]?.dataType) {
      case 'speed':
        return formatSpeed(value, context.speedUnit, t);
      case 'distance':
        return formatDistance(value, context.distanceUnit, t);
      case 'voltage':
        return formatVoltage(value, t);
      case 'percentage':
        return formatPercentage(value);
      case 'volume':
        return formatVolume(value, context.volumeUnit, t);
      case 'hours':
        return formatNumericHours(value, t);
      default:
        return trimNumber(value);
    }
  }
  if (typeof value === 'boolean') {
    return formatBoolean(value, t);
  }
  return formatRawValue(value);
};

// Numeric value in display units, for the chart. Booleans become 0 / 1.
export const getNumericValue = (position, key, context) => {
  const value = getPositionValue(position, key);
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  if (key === 'altitude') {
    return altitudeFromMeters(value, context.altitudeUnit);
  }
  if (key === 'obdSpeed') {
    return speedFromKnots(speedToKnots(value, 'kmh'), context.speedUnit);
  }
  if (key === 'accuracy') {
    return value;
  }
  switch (context.positionAttributes[key]?.dataType) {
    case 'speed':
      return speedFromKnots(value, context.speedUnit);
    case 'distance':
      return distanceFromMeters(value, context.distanceUnit);
    case 'volume':
      return volumeFromLiters(value, context.volumeUnit);
    case 'hours':
      return value / 3600000;
    default:
      return value;
  }
};

export const getUnitLabel = (key, context) => {
  const { t, positionAttributes } = context;
  if (key === 'altitude') {
    return altitudeUnitString(context.altitudeUnit, t);
  }
  if (key === 'course') {
    return '°';
  }
  if (key === 'accuracy') {
    return t('sharedMeters');
  }
  if (/^(coolantTemp|engineTemp|deviceTemp|temp\d+)$/.test(key)) {
    return '°C';
  }
  switch (positionAttributes[key]?.dataType) {
    case 'speed':
      return speedUnitString(context.speedUnit, t);
    case 'distance':
      return distanceUnitString(context.distanceUnit, t);
    case 'voltage':
      return t('sharedVoltAbbreviation');
    case 'percentage':
      return '%';
    case 'volume':
      return volumeUnitString(context.volumeUnit, t);
    case 'hours':
      return t('sharedHourAbbreviation');
    default:
      return '';
  }
};

export const getParameterName = (key, context) => {
  switch (key) {
    case 'fixTime':
      return context.mt('messagesColFixTime');
    case 'course':
      return context.mt('messagesColCourse');
    case 'outdated':
      return context.mt('messagesColOutdated');
    default:
      return context.positionAttributes[key]?.name || key;
  }
};

// Attribute keys found in the result, known attributes first (in the
// platform's own order), then the device-specific ones alphabetically.
export const collectAttributeKeys = (rows, positionAttributes) => {
  const found = new Set();
  rows.forEach(({ position }) => {
    if (position?.attributes) {
      Object.keys(position.attributes).forEach((key) => found.add(key));
    }
  });
  const known = Object.keys(positionAttributes).filter(
    (key) => found.has(key) && !isPositionProperty(key),
  );
  known.forEach((key) => found.delete(key));
  return [...known, ...[...found].sort((a, b) => a.localeCompare(b))];
};

// Parameters that can be plotted: numbers and booleans.
export const collectChartKeys = (rows, attributeKeys) => {
  const plottable = new Set();
  rows.forEach(({ position }) => {
    if (!position) {
      return;
    }
    attributeKeys.forEach((key) => {
      if (!plottable.has(key)) {
        const value = position.attributes?.[key];
        if ((typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean') {
          plottable.add(key);
        }
      }
    });
  });
  return ['speed', 'altitude', 'course', ...attributeKeys.filter((key) => plottable.has(key))];
};

export const isBooleanParameter = (rows, key) => {
  for (let index = 0; index < rows.length; index += 1) {
    const { position } = rows[index];
    if (position) {
      const value = getPositionValue(position, key);
      if (value !== null && value !== undefined) {
        return typeof value === 'boolean';
      }
    }
  }
  return false;
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const formatEventType = (event, t) => t(prefixString('event', event.type)) || event.type;

export const formatEventDetails = (event, context) => {
  const { t } = context;
  const attributes = event.attributes || {};
  switch (event.type) {
    case 'alarm':
      return attributes.alarm ? formatAlarms(attributes.alarm, t) : '';
    case 'deviceOverspeed':
      return Number.isFinite(attributes.speed)
        ? formatSpeed(attributes.speed, context.speedUnit, t)
        : '';
    case 'driverChanged':
      return formatRawValue(attributes.driverUniqueId);
    case 'media':
      return formatRawValue(attributes.file);
    case 'commandResult':
      return formatRawValue(attributes.result);
    default:
      return formatRawParameters(attributes);
  }
};

// ---------------------------------------------------------------------------
// Table filter
// ---------------------------------------------------------------------------

const TRUE_WORDS = new Set(['true', '1', 'sim', 'yes', 'si', 'sí', 'on', 'ligado', 'ligada']);
const FALSE_WORDS = new Set(['false', '0', 'nao', 'não', 'no', 'off', 'desligado', 'desligada']);

const KEY = '[A-Za-z_][\\w.]*';
const NUMBER = '-?\\d+(?:\\.\\d+)?';
const COMPARISON = new RegExp(`^(${KEY})\\s*(>=|<=|<>|!=|=|>|<)\\s*(.*)$`);
const RANGE = new RegExp(`^(${NUMBER})\\s*(<=|<)\\s*(${KEY})\\s*(<=|<)\\s*(${NUMBER})$`);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wildcardToRegExp = (pattern) =>
  new RegExp(
    `^${pattern
      .split(/([*?])/)
      .map((part) => {
        if (part === '*') {
          return '.*';
        }
        if (part === '?') {
          return '.';
        }
        return escapeRegExp(part);
      })
      .join('')}$`,
    'i',
  );

const resolveValue = (row, key, context) => {
  const { position, event } = row;
  if (event) {
    if (key === 'type') {
      return event.type;
    }
    if (event.attributes && key in event.attributes) {
      return event.attributes[key];
    }
  }
  if (!position) {
    return undefined;
  }
  if (key === 'speed') {
    return Number.isFinite(position.speed)
      ? speedFromKnots(position.speed, context.speedUnit)
      : undefined;
  }
  if (key === 'altitude') {
    return Number.isFinite(position.altitude)
      ? altitudeFromMeters(position.altitude, context.altitudeUnit)
      : undefined;
  }
  if (isPositionProperty(key)) {
    return position[key];
  }
  const attributes = position.attributes || {};
  if (key in attributes) {
    return attributes[key];
  }
  const lowerKey = key.toLowerCase();
  const match = Object.keys(attributes).find((it) => it.toLowerCase() === lowerKey);
  return match ? attributes[match] : undefined;
};

const toNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }
  return NaN;
};

const compare = (actual, operator, expected) => {
  if (actual === undefined || actual === null) {
    return operator === '!=';
  }
  if (typeof actual === 'boolean') {
    const word = expected.toLowerCase();
    let expectedBoolean = null;
    if (TRUE_WORDS.has(word)) {
      expectedBoolean = true;
    } else if (FALSE_WORDS.has(word)) {
      expectedBoolean = false;
    }
    if (expectedBoolean === null) {
      return false;
    }
    if (operator === '=') {
      return actual === expectedBoolean;
    }
    return operator === '!=' ? actual !== expectedBoolean : false;
  }
  const actualNumber = toNumber(actual);
  const expectedNumber = toNumber(expected);
  if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
    switch (operator) {
      case '=':
        return actualNumber === expectedNumber;
      case '!=':
        return actualNumber !== expectedNumber;
      case '>':
        return actualNumber > expectedNumber;
      case '<':
        return actualNumber < expectedNumber;
      case '>=':
        return actualNumber >= expectedNumber;
      default:
        return actualNumber <= expectedNumber;
    }
  }
  const matches = wildcardToRegExp(expected).test(formatRawValue(actual));
  if (operator === '=') {
    return matches;
  }
  return operator === '!=' ? !matches : false;
};

const parseTerm = (term) => {
  const range = RANGE.exec(term);
  if (range) {
    const [, low, lowOperator, key, highOperator, high] = range;
    return [
      { key, operator: lowOperator === '<' ? '>' : '>=', expected: low },
      { key, operator: highOperator, expected: high },
    ];
  }
  const comparison = COMPARISON.exec(term);
  if (comparison) {
    const [, key, operator, expected] = comparison;
    return [{ key, operator: operator === '<>' ? '!=' : operator, expected: expected.trim() }];
  }
  return null;
};

// Wialon-style filter. Terms are separated by commas or spaces. A term is
// either a comparison (ignition=true, speed>80, 11<power<13, alarm<>sos,
// versionFw=AOVX*) or a word searched in the whole row; every term must match.
// getRowText must return the lower-cased text of a row.
// Returns null when there is nothing to filter.
export const createFilter = (text, context, getRowText) => {
  const conditions = [];
  const words = [];
  text
    // "speed > 80" and "speed>80" are the same term
    .replace(/\s*(>=|<=|<>|!=|=|>|<)\s*/g, '$1')
    .split(/[\s,;]+/)
    .filter((term) => term)
    .forEach((term) => {
      const parsed = parseTerm(term);
      if (parsed) {
        conditions.push(...parsed);
      } else {
        words.push(term.toLowerCase());
      }
    });
  if (!conditions.length && !words.length) {
    return null;
  }
  return (row) => {
    for (let index = 0; index < conditions.length; index += 1) {
      const { key, operator, expected } = conditions[index];
      if (!compare(resolveValue(row, key, context), operator, expected)) {
        return false;
      }
    }
    if (words.length) {
      const rowText = getRowText(row);
      for (let index = 0; index < words.length; index += 1) {
        if (!rowText.includes(words[index])) {
          return false;
        }
      }
    }
    return true;
  };
};

// ---------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------

// Reduces the number of points while keeping, for every plotted parameter,
// the lowest and the highest value of each bucket, so spikes are never lost.
export const downsample = (data, keys, maxPoints = 2000) => {
  if (data.length <= maxPoints || !keys.length) {
    return data;
  }
  const bucketCount = Math.max(1, Math.floor(maxPoints / (2 * keys.length + 1)));
  const bucketSize = Math.ceil(data.length / bucketCount);
  const result = [];
  for (let start = 0; start < data.length; start += bucketSize) {
    const end = Math.min(data.length, start + bucketSize);
    const picked = new Set([start]);
    keys.forEach((key) => {
      let minIndex = -1;
      let maxIndex = -1;
      for (let index = start; index < end; index += 1) {
        const value = data[index][key];
        if (value !== null && value !== undefined) {
          if (minIndex < 0 || value < data[minIndex][key]) {
            minIndex = index;
          }
          if (maxIndex < 0 || value > data[maxIndex][key]) {
            maxIndex = index;
          }
        }
      }
      if (minIndex >= 0) {
        picked.add(minIndex);
        picked.add(maxIndex);
      }
    });
    [...picked].sort((a, b) => a - b).forEach((index) => result.push(data[index]));
  }
  const last = data[data.length - 1];
  if (result[result.length - 1] !== last) {
    result.push(last);
  }
  return result;
};

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const TIME_STEPS = [
  MINUTE,
  2 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
];

// Axis ticks on round local times (every 2 hours, every day...) instead of
// arbitrary instants. Returns the ticks and whether they fall on whole days.
export const timeTicks = (start, end, maxTicks = 8) => {
  const range = end - start;
  if (!(range > 0)) {
    return { ticks: [start], daily: false };
  }
  const step = TIME_STEPS.find((candidate) => range / candidate <= maxTicks);
  const ticks = [];
  if (step) {
    const dayStart = dayjs(start).startOf('day').valueOf();
    let tick = dayStart + Math.ceil((start - dayStart) / step) * step;
    for (; tick <= end; tick += step) {
      ticks.push(tick);
    }
    return { ticks, daily: false };
  }
  const days = Math.max(1, Math.ceil(range / (24 * HOUR) / maxTicks));
  let day = dayjs(start).startOf('day');
  if (day.valueOf() < start) {
    day = day.add(1, 'day');
  }
  for (; day.valueOf() <= end; day = day.add(days, 'day')) {
    ticks.push(day.valueOf());
  }
  return { ticks, daily: true };
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const buildFileName = (prefix, deviceName, from, to, extension) => {
  const name =
    `${prefix}_${deviceName}_${dayjs(from).format('YYYYMMDD-HHmm')}_${dayjs(to).format('YYYYMMDD-HHmm')}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-');
  return `${name}.${extension}`;
};

// Excel in comma-decimal locales (pt-BR, es...) expects ";" between columns and
// "," inside numbers; elsewhere it expects "," and ".".
const decimalComma = () => (1.5).toLocaleString().includes(',');

export const exportCsv = (fileName, headers, lines) => {
  const comma = decimalComma();
  const separator = comma ? ';' : ',';
  const escape = (value) => {
    let text;
    if (value === null || value === undefined) {
      text = '';
    } else if (typeof value === 'number') {
      text = comma ? String(value).replace('.', ',') : String(value);
    } else {
      text = String(value);
    }
    return /["\r\n;,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = [headers, ...lines].map((line) => line.map(escape).join(separator)).join('\r\n');
  saveAs(new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' }), fileName);
};

const toArgb = (color, fallback) => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || '');
  if (!match) {
    return fallback;
  }
  const hex =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((character) => character + character)
          .join('')
      : match[1];
  return `FF${hex.toUpperCase()}`;
};

export const exportExcel = async ({ title, fileName, sheetName, headers, lines, theme }) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    (sheetName || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').slice(0, 31),
    { views: [{ state: 'frozen', ySplit: 2 }] },
  );

  const titleRow = worksheet.addRow([title]);
  titleRow.font = { bold: true };

  const fill = toArgb(theme.palette.primary.main, 'FF1A237E');
  const darkFill = theme.palette.getContrastText(theme.palette.primary.main) === '#fff';
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: darkFill ? 'FFFFFFFF' : 'FF000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  });

  lines.forEach((line) => worksheet.addRow(line));

  headers.forEach((header, index) => {
    let width = String(header).length;
    for (let line = 0; line < lines.length && line < 500; line += 1) {
      const value = lines[line][index];
      if (value !== null && value !== undefined) {
        width = Math.max(width, String(value).length);
      }
    }
    worksheet.getColumn(index + 1).width = Math.min(Math.max(width + 2, 8), 80);
  });
  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: headers.length },
  };

  const blob = new Blob([await workbook.xlsx.writeBuffer()], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, fileName);
};
