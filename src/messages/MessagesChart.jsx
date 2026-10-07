import { useMemo, useState } from 'react';
import { Autocomplete, Slider, TextField, Typography, useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatTime } from '../common/util/formatter';
import {
  downsample,
  timeTicks,
  getNumericValue,
  getParameterName,
  getUnitLabel,
  isBooleanParameter,
} from './messagesUtil';

export const MAX_CHART_PARAMETERS = 6;

const DAY = 86400000;

// Validated chart blue (slot 1 of the categorical palette), stepped per mode.
const SERIES_COLOR = { light: '#2a78d6', dark: '#3987e5' };

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(1, 3),
    padding: theme.spacing(1.5, 2, 1),
  },
  parameters: {
    flex: '1 1 320px',
    minWidth: 0,
  },
  zoom: {
    flex: '1 1 280px',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(0, 2),
    minWidth: 0,
    paddingInline: theme.spacing(1),
    '& .MuiSlider-root': {
      flex: '1 1 140px',
    },
  },
  zoomLabel: {
    whiteSpace: 'nowrap',
    color: theme.palette.text.secondary,
    fontVariantNumeric: 'tabular-nums',
  },
  charts: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: theme.spacing(0, 2, 2),
    [theme.breakpoints.down('md')]: {
      overflowY: 'visible',
    },
  },
  chart: {
    paddingTop: theme.spacing(1.5),
  },
  chartTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
  },
  chartUnit: {
    fontWeight: 400,
    color: theme.palette.text.secondary,
  },
  message: {
    padding: theme.spacing(4, 2),
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
  caption: {
    display: 'block',
    padding: theme.spacing(0, 2),
    color: theme.palette.text.secondary,
  },
  tooltip: {
    padding: theme.spacing(0.75, 1.25),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[2],
    fontVariantNumeric: 'tabular-nums',
  },
  tooltipValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  tooltipLabel: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
}));

// Same plain notation as the table ("13.07"), not the browser locale's.
const formatNumber = (value) => String(Number(value.toFixed(Math.abs(value) < 100 ? 2 : 1)));

const clockFormat = { hour: '2-digit', minute: '2-digit' };
const dayFormat = { day: '2-digit', month: '2-digit' };

const ChartTooltip = ({ active, payload, label, classes, formatValue, unit }) => {
  const value = payload?.[0]?.value;
  if (!active || value === null || value === undefined) {
    return null;
  }
  return (
    <div className={classes.tooltip}>
      <div className={classes.tooltipValue}>{`${formatValue(value)}${unit ? ` ${unit}` : ''}`}</div>
      <div className={classes.tooltipLabel}>{formatTime(label, 'seconds')}</div>
    </div>
  );
};

const MessagesChart = ({
  rows,
  context,
  availableKeys,
  selectedKeys,
  onSelectedKeysChange,
  selectedTime,
  onSelect,
}) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const { t, mt } = context;

  const options = useMemo(
    () => availableKeys.map((key) => ({ key, label: getParameterName(key, context) })),
    [availableKeys, context],
  );
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedKeys.includes(option.key)),
    [options, selectedKeys],
  );
  const keys = useMemo(() => selectedOptions.map((option) => option.key), [selectedOptions]);

  const data = useMemo(
    () =>
      rows
        .filter((row) => row.position)
        .map((row) => {
          const point = { id: row.id, time: row.time };
          keys.forEach((key) => {
            point[key] = getNumericValue(row.position, key, context);
          });
          return point;
        }),
    [rows, keys, context],
  );

  const firstTime = data.length ? data[0].time : 0;
  const lastTime = data.length ? data[data.length - 1].time : 0;

  // Zoom window, as a time range. null = the whole interval.
  const [zoom, setZoom] = useState(null);
  const windowStart = zoom ? Math.max(zoom[0], firstTime) : firstTime;
  const windowEnd = zoom ? Math.min(zoom[1], lastTime) : lastTime;

  const windowed = useMemo(
    () =>
      zoom ? data.filter((point) => point.time >= windowStart && point.time <= windowEnd) : data,
    [data, zoom, windowStart, windowEnd],
  );
  const plotted = useMemo(() => downsample(windowed, keys), [windowed, keys]);

  const booleanKeys = useMemo(
    () => new Set(keys.filter((key) => isBooleanParameter(rows, key))),
    [rows, keys],
  );

  const seriesColor = SERIES_COLOR[theme.palette.mode] || SERIES_COLOR.light;
  const axisColor = theme.palette.text.secondary;
  const tick = { fontSize: 11, fill: axisColor };
  const yAxisWidth = booleanKeys.size ? 92 : 64;

  const axis = useMemo(() => timeTicks(windowStart, windowEnd), [windowStart, windowEnd]);
  const formatTick = (value) => {
    const date = new Date(value);
    if (axis.daily) {
      return date.toLocaleDateString(undefined, dayFormat);
    }
    const clock = date.toLocaleTimeString(undefined, clockFormat);
    // Longer than a day: the hour alone would be ambiguous.
    return windowEnd - windowStart > DAY
      ? `${date.toLocaleDateString(undefined, dayFormat)} ${clock}`
      : clock;
  };

  const booleanLabel = (key, value) => {
    if (key === 'ignition') {
      return mt(value ? 'messagesOn' : 'messagesOff');
    }
    if (key === 'blocked') {
      return mt(value ? 'messagesBlocked' : 'messagesUnblocked');
    }
    return t(value ? 'sharedYes' : 'sharedNo');
  };

  const handleClick = (state) => {
    const index = Number(state?.activeTooltipIndex ?? state?.activeIndex);
    const point = Number.isInteger(index) ? plotted[index] : null;
    if (point) {
      onSelect(point.id);
    }
  };

  const showSelected =
    selectedTime !== null && selectedTime >= windowStart && selectedTime <= windowEnd;

  return (
    <div className={classes.root}>
      <div className={classes.controls}>
        <Autocomplete
          className={classes.parameters}
          multiple
          size="small"
          limitTags={4}
          options={options}
          value={selectedOptions}
          disableCloseOnSelect
          noOptionsText={mt('messagesNoOptions')}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.key === value.key}
          getOptionDisabled={(option) =>
            keys.length >= MAX_CHART_PARAMETERS && !keys.includes(option.key)
          }
          onChange={(_, value) => onSelectedKeysChange(value.map((option) => option.key))}
          renderInput={(params) => <TextField {...params} label={mt('messagesChartParameters')} />}
        />
        {data.length > 1 && lastTime > firstTime && (
          <div className={classes.zoom}>
            <Slider
              size="small"
              color="secondary"
              min={firstTime}
              max={lastTime}
              step={Math.max(1000, Math.round((lastTime - firstTime) / 1000))}
              value={[windowStart, windowEnd]}
              onChange={(_, value) =>
                setZoom(value[0] <= firstTime && value[1] >= lastTime ? null : value)
              }
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => formatTime(value, 'minutes')}
              getAriaLabel={(index) => mt(index === 0 ? 'messagesFrom' : 'messagesTo')}
              disableSwap
            />
            <Typography variant="caption" className={classes.zoomLabel}>
              {`${formatTime(windowStart, 'minutes')} – ${formatTime(windowEnd, 'minutes')}`}
            </Typography>
          </div>
        )}
      </div>
      {plotted.length < windowed.length && (
        <Typography variant="caption" className={classes.caption}>
          {mt('messagesChartSampled', { shown: plotted.length, total: windowed.length })}
        </Typography>
      )}
      {keys.length === 0 ? (
        <Typography variant="body2" className={classes.message}>
          {mt('messagesChartEmpty')}
        </Typography>
      ) : (
        <div className={classes.charts}>
          {selectedOptions.map(({ key, label }) => {
            const boolean = booleanKeys.has(key);
            const unit = boolean ? '' : getUnitLabel(key, context);
            const formatValue = boolean ? (value) => booleanLabel(key, value >= 0.5) : formatNumber;
            return (
              <div key={key} className={classes.chart}>
                <div className={classes.chartTitle}>
                  {label}
                  {unit && <span className={classes.chartUnit}>{`, ${unit}`}</span>}
                </div>
                <ResponsiveContainer width="100%" height={boolean ? 84 : 136}>
                  <LineChart
                    data={plotted}
                    syncId="messagesChart"
                    syncMethod="index"
                    margin={{ top: 6, right: 16, bottom: 0, left: 0 }}
                    onClick={handleClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid stroke={theme.palette.divider} vertical={false} />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={[windowStart, windowEnd]}
                      allowDataOverflow
                      ticks={axis.ticks}
                      tickFormatter={formatTick}
                      tick={tick}
                      tickLine={false}
                      stroke={theme.palette.divider}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      width={yAxisWidth}
                      tick={tick}
                      tickLine={false}
                      axisLine={false}
                      domain={boolean ? [0, 1] : ['auto', 'auto']}
                      ticks={boolean ? [0, 1] : undefined}
                      tickFormatter={
                        boolean ? (value) => booleanLabel(key, value >= 0.5) : formatNumber
                      }
                      allowDecimals
                    />
                    <Tooltip
                      isAnimationActive={false}
                      cursor={{ stroke: axisColor, strokeWidth: 1 }}
                      content={
                        <ChartTooltip classes={classes} formatValue={formatValue} unit={unit} />
                      }
                    />
                    {showSelected && (
                      <ReferenceLine
                        x={selectedTime}
                        stroke={theme.palette.text.primary}
                        strokeWidth={1}
                      />
                    )}
                    <Line
                      type={boolean ? 'stepAfter' : 'linear'}
                      dataKey={key}
                      stroke={seriesColor}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      dot={false}
                      activeDot={{ r: 4, stroke: theme.palette.background.paper, strokeWidth: 2 }}
                      isAnimationActive={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessagesChart;
