// LS Autotruck Rastreios — Login split screen com rotação de imagens
import { useState, useEffect } from 'react';
import { useMediaQuery, Paper, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme, lighten } from '@mui/material/styles';
import LogoImage from './LogoImage';
import hero1 from '../resources/images/login-hero.jpg';
import hero2 from '../resources/images/login-hero2.jpg';
import hero3 from '../resources/images/login-hero3.jpg';

const heroImages = [hero1, hero2, hero3];

const useStyles = makeStyles()((theme) => ({
  root: {
    position: 'relative',
    height: '100%',
  },
  paper: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: theme.spacing(62),
    height: '100%',
    flexShrink: 0,
    background: `linear-gradient(160deg, #ffffff 0%, ${lighten(theme.palette.primary.main, 0.88)} 100%)`,
    borderRadius: '0 160px 160px 0 / 0 50% 50% 0',
    overflow: 'hidden',
    boxShadow: '6px 0 24px rgba(13, 42, 92, 0.15)',
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(4),
    '& img, & svg': {
      width: theme.spacing(40),
      height: theme.spacing(40),
      maxWidth: theme.spacing(40),
      maxHeight: theme.spacing(40),
      objectFit: 'contain',
      background: '#ffffff',
      borderRadius: theme.spacing(3),
      border: '4px solid #000000',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      padding: theme.spacing(2),
      margin: 0,
    },
  },
  form: {
    maxWidth: theme.spacing(52),
    padding: theme.spacing(5),
    width: '100%',
  },
  hero: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
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
    paddingLeft: theme.spacing(72),
    paddingRight: theme.spacing(8),
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(10),
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
  mobileRoot: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    background: theme.palette.background.paper,
  },
  mobileBand: {
    height: theme.spacing(24),
    flexShrink: 0,
    position: 'relative',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  mobileBandOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(3, 14, 38, 0.55) 0%, rgba(13, 42, 92, 0.25) 100%)',
  },
  mobileLogoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(-13),
    zIndex: 2,
    '& img, & svg': {
      width: theme.spacing(26),
      height: theme.spacing(26),
      maxWidth: theme.spacing(26),
      maxHeight: theme.spacing(26),
      objectFit: 'contain',
      background: theme.palette.background.paper,
      borderRadius: theme.spacing(3),
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      padding: theme.spacing(2),
      margin: 0,
    },
  },
  mobilePaper: {
    flex: 1,
    boxShadow: 'none',
  },
  mobileForm: {
    maxWidth: theme.spacing(52),
    margin: '0 auto',
    padding: theme.spacing(3),
    paddingTop: theme.spacing(3),
    width: '100%',
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

  if (!desktop) {
    return (
      <main className={classes.mobileRoot}>
        <div className={classes.mobileBand} style={{ backgroundImage: `url(${heroImages[0]})` }}>
          <div className={classes.mobileBandOverlay} />
        </div>
        <div className={classes.mobileLogoWrap}>
          <LogoImage color={theme.palette.primary.main} />
        </div>
        <Paper className={classes.mobilePaper} square>
          <form className={classes.mobileForm}>{children}</form>
        </Paper>
      </main>
    );
  }

  return (
    <main className={classes.root}>
      <Paper className={classes.paper} square>
        <div className={classes.logo}>
          <LogoImage color={theme.palette.primary.main} />
        </div>
        <form className={classes.form}>{children}</form>
      </Paper>
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
    </main>
  );
};

export default LoginLayout;
