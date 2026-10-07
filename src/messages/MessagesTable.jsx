import { memo, useCallback, useEffect, useRef } from 'react';
import { alpha } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ErrorIcon from '@mui/icons-material/Error';

const useStyles = makeStyles()((theme) => ({
  table: {
    borderCollapse: 'separate',
    borderSpacing: 0,
    minWidth: '100%',
    fontSize: '0.8125rem',
    lineHeight: 1.35,
    fontVariantNumeric: 'tabular-nums',
    color: theme.palette.text.primary,
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    padding: theme.spacing(0.875, 1.25),
    textAlign: 'start',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderInlineEnd: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: {
      position: 'static',
    },
  },
  // Keeps the title of a very wide column (raw parameters) in view while the
  // table is scrolled sideways.
  headerLabel: {
    display: 'inline-block',
    position: 'sticky',
    insetInlineStart: theme.spacing(1.25),
  },
  sortButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    margin: 0,
    padding: 0,
    border: 0,
    background: 'none',
    font: 'inherit',
    color: 'inherit',
    cursor: 'pointer',
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.secondary.main}`,
      outlineOffset: 2,
      borderRadius: 2,
    },
  },
  sortIcon: {
    fontSize: '0.95rem',
    color: theme.palette.text.secondary,
  },
  row: {
    cursor: 'pointer',
    // Space for the sticky header when a row is scrolled into view.
    scrollMarginTop: theme.spacing(5),
    '&:nth-of-type(even)': {
      backgroundColor: theme.palette.action.hover,
    },
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.secondary.main}`,
      outlineOffset: -2,
    },
  },
  alarmRow: {
    '&&': {
      backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.2 : 0.09),
    },
    '&&:hover': {
      backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.28 : 0.15),
    },
  },
  selectedRow: {
    '&&, &&:hover': {
      backgroundColor: alpha(
        theme.palette.secondary.main,
        theme.palette.mode === 'dark' ? 0.32 : 0.18,
      ),
    },
    '& > td:first-of-type': {
      boxShadow: `inset 3px 0 0 ${theme.palette.secondary.main}`,
    },
  },
  cell: {
    padding: theme.spacing(0.625, 1.25),
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& a': {
      color: theme.palette.secondary.main,
    },
  },
  numberCell: {
    color: theme.palette.text.secondary,
    minWidth: theme.spacing(6),
  },
  numberContent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  alarmIcon: {
    fontSize: '0.95rem',
    color: theme.palette.error.main,
  },
  truncate: {
    maxWidth: 320,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

// Rows are memoized: with 1000 messages on a page, selecting one must repaint
// two rows, not all of them.
const MessageRow = memo(
  ({ row, number, columns, selected, classes, cx, onSelect, onKeyDown, ref }) => (
    <tr
      ref={ref}
      className={cx(classes.row, row.alarm && classes.alarmRow, selected && classes.selectedRow)}
      tabIndex={0}
      aria-selected={selected}
      onClick={() => onSelect(row)}
      onKeyDown={(event) => onKeyDown(event, row)}
    >
      <td className={cx(classes.cell, classes.numberCell)}>
        <span className={classes.numberContent}>
          {number}
          {row.alarm && (
            <span title={row.alarm} role="img" aria-label={row.alarm}>
              <ErrorIcon className={classes.alarmIcon} />
            </span>
          )}
        </span>
      </td>
      {columns.map((column) => {
        const text = column.text(row);
        return (
          <td
            key={column.id}
            className={cx(classes.cell, column.truncate && classes.truncate)}
            title={column.truncate && text ? text : undefined}
          >
            {column.render ? column.render(row, text) : text}
          </td>
        );
      })}
    </tr>
  ),
);

const MessagesTable = ({
  columns,
  rows,
  startIndex,
  selectedId,
  onSelect,
  scrollToSelected,
  sortDescending,
  onToggleSort,
  sortLabel,
  numberLabel,
}) => {
  const { classes, cx } = useStyles();

  const selectedRef = useRef(null);

  useEffect(() => {
    if (scrollToSelected && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [scrollToSelected, selectedId, rows]);

  const onKeyDown = useCallback(
    (event, row) => {
      const { key, currentTarget, target } = event;
      // Keys pressed on something inside the row, like a link, belong to it.
      if (target !== currentTarget) {
        return;
      }
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        onSelect(row);
      } else if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        const sibling =
          key === 'ArrowDown'
            ? currentTarget.nextElementSibling
            : currentTarget.previousElementSibling;
        sibling?.focus();
      }
    },
    [onSelect],
  );

  const sortState = sortDescending ? 'descending' : 'ascending';

  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th scope="col" className={classes.headerCell}>
            {numberLabel}
          </th>
          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              className={classes.headerCell}
              aria-sort={column.sortable ? sortState : undefined}
            >
              {column.sortable ? (
                <button
                  type="button"
                  className={classes.sortButton}
                  onClick={onToggleSort}
                  title={sortLabel}
                >
                  {column.header}
                  {sortDescending ? (
                    <ArrowDownwardIcon className={classes.sortIcon} />
                  ) : (
                    <ArrowUpwardIcon className={classes.sortIcon} />
                  )}
                </button>
              ) : (
                <span className={classes.headerLabel}>{column.header}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const selected = row.id === selectedId;
          return (
            <MessageRow
              key={row.id}
              ref={selected ? selectedRef : undefined}
              row={row}
              number={startIndex + index + 1}
              columns={columns}
              selected={selected}
              classes={classes}
              cx={cx}
              onSelect={onSelect}
              onKeyDown={onKeyDown}
            />
          );
        })}
      </tbody>
    </table>
  );
};

export default memo(MessagesTable);
