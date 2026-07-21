import { TableCell, TableRow, Typography } from '@mui/material';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { makeStyles } from 'tss-react/mui';

const DEFAULT_BEFORE = 'Escolha o veículo e o período e toque em MOSTRAR.';
const DEFAULT_AFTER = 'Nenhum resultado nesse período. Tente outro veículo ou outra data.';

const useStyles = makeStyles()((theme) => ({
  block: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(6, 2),
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
  cell: {
    textAlign: 'center',
    padding: theme.spacing(6, 2),
  },
}));

const emptyMessage = (searched, beforeMessage, afterMessage) =>
  searched ? afterMessage || DEFAULT_AFTER : beforeMessage || DEFAULT_BEFORE;

// Mensagem de "vazio" pra usar dentro de uma <TableBody> (linha ocupando
// todas as colunas), no lugar de uma tabela em branco.
export const ReportEmptyState = ({ columns, searched, beforeMessage, afterMessage }) => {
  const { classes } = useStyles();
  return (
    <TableRow>
      <TableCell colSpan={columns} className={classes.cell}>
        <TouchAppIcon fontSize="large" color="disabled" />
        <Typography variant="body2" color="textSecondary">
          {emptyMessage(searched, beforeMessage, afterMessage)}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

// Mesma mensagem, em bloco solto (pra relatorios que nao usam tabela, como
// o de Grafico).
export const ReportEmptyBlock = ({ searched, beforeMessage, afterMessage }) => {
  const { classes } = useStyles();
  return (
    <div className={classes.block}>
      <TouchAppIcon fontSize="large" color="disabled" />
      <Typography variant="body2" color="textSecondary">
        {emptyMessage(searched, beforeMessage, afterMessage)}
      </Typography>
    </div>
  );
};

export default ReportEmptyState;
