import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  IconButton,
  InputAdornment,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  MenuList,
  OutlinedInput,
  Popover,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export const PAGE_SIZES = [25, 50, 100, 500, 1000];

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5, 1),
    padding: theme.spacing(0.5, 1),
    borderTop: `1px solid ${theme.palette.divider}`,
    fontSize: '0.8125rem',
    '@media print': {
      display: 'none',
    },
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  text: {
    fontSize: 'inherit',
    whiteSpace: 'nowrap',
  },
  pageSize: {
    fontSize: 'inherit',
    '& .MuiSelect-select': {
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
    },
  },
  pageInput: {
    width: theme.spacing(8),
    fontSize: 'inherit',
    '& input': {
      padding: theme.spacing(0.5, 1),
      textAlign: 'center',
    },
  },
  info: {
    fontSize: 'inherit',
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
    marginInlineStart: theme.spacing(1),
  },
  spacer: {
    flexGrow: 1,
  },
  filter: {
    width: 300,
    maxWidth: '100%',
    fontSize: 'inherit',
    paddingInlineEnd: theme.spacing(0.5),
    '& input': {
      padding: theme.spacing(0.625, 1),
    },
    [theme.breakpoints.down('sm')]: {
      width: '100%',
      flex: '1 1 160px',
    },
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.25),
    [theme.breakpoints.down('sm')]: {
      flex: '1 1 100%',
    },
  },
  columnsPaper: {
    width: 300,
    maxHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
  },
  columnsList: {
    overflowY: 'auto',
    paddingBottom: theme.spacing(1),
  },
  columnsActions: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(0.5, 1),
    '& .MuiButton-root': {
      textTransform: 'none',
    },
  },
  columnsNote: {
    padding: theme.spacing(1, 2, 2),
    color: theme.palette.text.secondary,
  },
  columnItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  columnKey: {
    color: theme.palette.text.secondary,
  },
}));

const MessagesPager = ({
  mt,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  shownFrom,
  shownTo,
  total,
  allTotal,
  filterValue,
  onFilterChange,
  onFilterSubmit,
  exportFormats,
  onExport,
  columnGroups,
  selectedColumns,
  onColumnToggle,
  onColumnsDefault,
  onColumnsAll,
  columnsNote,
}) => {
  const { classes } = useStyles();

  const [pageText, setPageText] = useState(String(page + 1));
  const [exportAnchor, setExportAnchor] = useState(null);
  const [columnsAnchor, setColumnsAnchor] = useState(null);

  useEffect(() => {
    setPageText(String(page + 1));
  }, [page]);

  const commitPage = () => {
    const parsed = parseInt(pageText, 10);
    if (Number.isFinite(parsed)) {
      const next = Math.min(Math.max(parsed, 1), pageCount) - 1;
      setPageText(String(next + 1));
      if (next !== page) {
        onPageChange(next);
      }
    } else {
      setPageText(String(page + 1));
    }
  };

  let info;
  if (!total) {
    info = mt('messagesShowingNone');
  } else if (total !== allTotal) {
    info = mt('messagesShowingFiltered', {
      from: shownFrom,
      to: shownTo,
      total,
      all: allTotal,
    });
  } else {
    info = mt('messagesShowing', { from: shownFrom, to: shownTo, total });
  }

  const hasColumns = columnGroups.some((group) => group.options.length > 0);

  return (
    <div className={classes.root}>
      <div className={classes.group}>
        <Tooltip title={mt('messagesExport')}>
          <span>
            <IconButton
              size="small"
              aria-label={mt('messagesExport')}
              disabled={!total}
              onClick={(event) => setExportAnchor(event.currentTarget)}
            >
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Menu
          anchorEl={exportAnchor}
          open={Boolean(exportAnchor)}
          onClose={() => setExportAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {exportFormats.map((format) => (
            <MenuItem
              key={format.id}
              dense
              onClick={() => {
                setExportAnchor(null);
                onExport(format.id);
              }}
            >
              {format.label}
            </MenuItem>
          ))}
        </Menu>
        <Tooltip title={mt('messagesRowsPerPage')} placement="top">
          <Select
            className={classes.pageSize}
            size="small"
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
            inputProps={{ 'aria-label': mt('messagesRowsPerPage') }}
          >
            {PAGE_SIZES.map((size) => (
              <MenuItem key={size} value={size} dense>
                {size}
              </MenuItem>
            ))}
          </Select>
        </Tooltip>
      </div>
      <div className={classes.group}>
        <IconButton
          size="small"
          aria-label={mt('messagesFirstPage')}
          disabled={page <= 0}
          onClick={() => onPageChange(0)}
        >
          <FirstPageIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={mt('messagesPreviousPage')}
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography className={classes.text} component="label" htmlFor="messages-page">
          {mt('messagesPage')}
        </Typography>
        <OutlinedInput
          id="messages-page"
          className={classes.pageInput}
          size="small"
          value={pageText}
          onChange={(event) => setPageText(event.target.value.replace(/\D/g, ''))}
          onBlur={commitPage}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitPage();
            }
          }}
          inputProps={{ inputMode: 'numeric' }}
        />
        <Typography className={classes.text}>{`${mt('messagesOf')} ${pageCount}`}</Typography>
        <IconButton
          size="small"
          aria-label={mt('messagesNextPage')}
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={mt('messagesLastPage')}
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(pageCount - 1)}
        >
          <LastPageIcon fontSize="small" />
        </IconButton>
      </div>
      <Typography className={classes.info} aria-live="polite">
        {info}
      </Typography>
      <div className={classes.spacer} />
      <div className={classes.filterGroup}>
        <OutlinedInput
          className={classes.filter}
          size="small"
          value={filterValue}
          placeholder={mt('messagesFilterPlaceholder')}
          onChange={(event) => onFilterChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onFilterSubmit(filterValue);
            }
          }}
          inputProps={{ 'aria-label': mt('messagesFilter') }}
          endAdornment={
            filterValue ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  aria-label={mt('messagesFilterClear')}
                  onClick={() => onFilterSubmit('')}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }
        />
        <Tooltip title={mt('messagesFilterHelp')} placement="top-end" enterDelay={200}>
          <IconButton
            size="small"
            aria-label={mt('messagesFilter')}
            color={filterValue ? 'secondary' : 'default'}
            onClick={() => onFilterSubmit(filterValue)}
          >
            <FilterAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={mt('messagesColumns')} placement="top-end">
          <span>
            <IconButton
              size="small"
              aria-label={mt('messagesColumns')}
              disabled={!hasColumns}
              onClick={(event) => setColumnsAnchor(event.currentTarget)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Popover
          anchorEl={columnsAnchor}
          open={Boolean(columnsAnchor)}
          onClose={() => setColumnsAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          slotProps={{ paper: { className: classes.columnsPaper } }}
        >
          <div className={classes.columnsActions}>
            <Button size="small" color="secondary" onClick={onColumnsDefault}>
              {mt('messagesColumnsDefault')}
            </Button>
            {onColumnsAll && (
              <Button size="small" color="secondary" onClick={onColumnsAll}>
                {mt('messagesColumnsAll')}
              </Button>
            )}
          </div>
          <Divider />
          <div className={classes.columnsList}>
            {columnGroups
              .filter((group) => group.options.length > 0)
              .map((group) => (
                <MenuList
                  key={group.id}
                  dense
                  disablePadding
                  aria-label={group.label}
                  subheader={<ListSubheader disableSticky>{group.label}</ListSubheader>}
                >
                  {group.options.map((option) => {
                    const checked = selectedColumns.includes(option.key);
                    return (
                      <MenuItem
                        key={option.key}
                        className={classes.columnItem}
                        role="menuitemcheckbox"
                        aria-checked={checked}
                        onClick={() => onColumnToggle(option.key)}
                      >
                        <Checkbox
                          size="small"
                          edge="start"
                          tabIndex={-1}
                          disableRipple
                          checked={checked}
                          slotProps={{ input: { 'aria-hidden': true } }}
                        />
                        <ListItemText
                          primary={option.label}
                          secondary={option.label !== option.key ? option.key : null}
                          slotProps={{
                            primary: { variant: 'body2', noWrap: true },
                            secondary: {
                              variant: 'caption',
                              className: classes.columnKey,
                              noWrap: true,
                            },
                          }}
                        />
                      </MenuItem>
                    );
                  })}
                </MenuList>
              ))}
            {columnsNote && (
              <Typography variant="caption" component="p" className={classes.columnsNote}>
                {columnsNote}
              </Typography>
            )}
          </div>
        </Popover>
      </div>
    </div>
  );
};

export default MessagesPager;
