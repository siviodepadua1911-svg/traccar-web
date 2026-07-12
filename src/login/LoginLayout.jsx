// LS Autotruck Rastreios — Login split screen com rotação de imagens
import { useState, useEffect } from 'react';
import { useMediaQuery, Paper, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import LogoImage from './LogoImage';
import hero1 from '../resources/images/login-hero.jpg';
import hero2 from '../resources/images/login-hero2.jpg';
import hero3 from '../resources/images/login-hero3.jpg';

const heroImages = [hero1, hero2, hero3];

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    height: '100%',
  },
  paper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: theme.spacing(62),
    flexShrink: 0,
    zIndex: 2,
    boxShadow: '4px 0px 24px rgba(0, 0, 0, 0.35)',
    [theme.breakpoints.down('md')]: {
      width: '100%',
      boxShadow: 'none',
    },
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(4),
    '& img': {
      borderRadius: '50%',
      maxWidth: theme.spacing(22),
      maxHeight: theme.spacing(22),
    },
  },
  form: {
    maxWidth: theme.spacing(52),
    padding: theme.spacing(5),
    width: '100%',
  },
  hero: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  slide: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 2s ease-in-out',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(3, 14, 38, 0.8) 0%, rgba(13, 42, 92, 0.45) 100%)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    padding: theme.spacing(8),
  },
  heroTitle: {
    color: '#ffffff',
    fontWeight: 700,
    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: theme.spacing(1),
    maxWidth: theme.spacing(70),
    textShadow: '0 1px 8px rgba(0,0,0,0.6)',
  },
}));

const LoginLayout = ({ children }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % heroImages.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className={classes.root}>
      <Paper className={classes.paper} square>
        <div className={classes.logo}>
          <LogoImage color={theme.palette.primary.main} />
        </div>
        <form className={classes.form}>{children}</form>
      </Paper>
      {desktop && (
        <div className={classes.hero}>
          {heroImages.map((img, i) => (
            <div
              key={img}
              className={classes.slide}
              style={{ backgroundImage: `url(${img})`, opacity: i === index ? 1 : 0 }}
            />
          ))}
          <div className={classes.overlay} />
          <div className={classes.heroContent}>
            <Typography variant="h4" className={classes.heroTitle}>
              LS Autotruck Rastreios
            </Typography>
            <Typography variant="body1" className={classes.heroSubtitle}>
              Rastreamento veicular 24 horas — monitoramento em tempo real da sua frota,
              com alertas, relatórios e suporte especializado.
            </Typography>
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginLayout;
