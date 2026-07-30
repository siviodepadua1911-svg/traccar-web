// Identidade visual do card do veiculo - "azul-noite espacial" no escuro, limpo no
// claro. Escopo: so o StatusCard por enquanto (nao mexe na paleta geral do app).
export const LS_CARD_COLORS = {
  dark: {
    bg: '#0A1220',
    surface: '#101c30',
    surfaceAlt: '#16233c',
    border: '#22314c',
    text: '#EAF1FB',
    textSecondary: '#8FA3C0',
    accent: '#85B7EB',
  },
  light: {
    bg: '#E9EDF3',
    surface: '#F7F9FC',
    surfaceAlt: '#E8EDF5',
    border: '#DBE2EC',
    text: '#16233A',
    textSecondary: '#5B6B82',
    accent: '#2F6FB0',
  },
};

export const lsCardColors = (dark) => (dark ? LS_CARD_COLORS.dark : LS_CARD_COLORS.light);

export default lsCardColors;
