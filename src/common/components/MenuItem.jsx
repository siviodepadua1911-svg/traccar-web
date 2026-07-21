import { makeStyles } from 'tss-react/mui';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';

const useStyles = makeStyles()(() => ({
  menuItemText: {
    whiteSpace: 'nowrap',
  },
  menuItemSubtitle: {
    whiteSpace: 'normal',
    fontSize: 11,
    lineHeight: 1.3,
  },
}));

const MenuItem = ({ title, subtitle, link, icon, selected }) => {
  const { classes } = useStyles();
  return (
    <ListItemButton key={link} component={Link} to={link} selected={selected}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText
        primary={title}
        primaryTypographyProps={{ className: classes.menuItemText }}
        secondary={subtitle}
        secondaryTypographyProps={{ className: classes.menuItemSubtitle }}
      />
    </ListItemButton>
  );
};

export default MenuItem;
