import { useState } from 'react';
import { Paper, IconButton, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from 'tss-react/mui';
import usePersistedState from '../../common/util/usePersistedState';

const useStyles = makeStyles()((theme) => ({
  wrapper: {
    margin: theme.spacing(1.5, 2, 0),
  },
  card: {
    padding: theme.spacing(1.5, 4, 1.5, 2),
    background: '#eef4fc',
    border: '1px solid #cfe0f5',
    borderRadius: 10,
    position: 'relative',
  },
  row: {
    display: 'flex',
    gap: 8,
    fontSize: 13,
    marginTop: theme.spacing(0.5),
    '&:first-of-type': {
      marginTop: 0,
    },
  },
  label: {
    fontWeight: 600,
    color: '#0d2a5c',
    minWidth: 118,
    flex: 'none',
  },
  closeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  helpBtn: {
    margin: theme.spacing(1.5, 0, 0, 2),
  },
}));

// Cartao "O que mostra / Serve pra / O que da pra fazer": abre sozinho na
// primeira vez que o usuario visita este relatorio (por navegador), depois
// fica recolhido atras de um botao "?". A escolha e salva por relatorio
// (reportKey), entao cada relatorio lembra separadamente se ja foi visto.
const ReportInfoCard = ({ reportKey, info }) => {
  const { classes } = useStyles();
  const [seen, setSeen] = usePersistedState(`lsReportInfoSeen_${reportKey}`, false);
  const [open, setOpen] = useState(!seen);

  const close = () => {
    setOpen(false);
    setSeen(true);
  };

  if (!open) {
    return (
      <Tooltip title="O que é este relatório">
        <IconButton size="small" className={classes.helpBtn} onClick={() => setOpen(true)}>
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <div className={classes.wrapper}>
      <Paper className={classes.card} elevation={0}>
        <IconButton size="small" className={classes.closeBtn} onClick={close}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <div className={classes.row}>
          <span className={classes.label}>O que mostra</span>
          <span>{info.whatShows}</span>
        </div>
        <div className={classes.row}>
          <span className={classes.label}>Serve pra</span>
          <span>{info.whatFor}</span>
        </div>
        <div className={classes.row}>
          <span className={classes.label}>O que dá pra fazer</span>
          <span>{info.whatCanDo}</span>
        </div>
      </Paper>
    </div>
  );
};

export default ReportInfoCard;
