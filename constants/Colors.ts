// Paleta de marca GymTrack, compartida con la plataforma web (repo GTWeb).
// --brand / --brand-dark / --brand-light en src/main/resources/static/css/styles.css de GTWeb
const brand = '#FF5722';
const brandDark = '#D84315';
const brandLight = '#FF8A65';
const glow = '#2B5CE6';

const success = '#198754';
const danger = '#DC3545';
const warning = '#B8860B';
const info = '#0AA2C0';

export default {
  light: {
    text: '#23262E',
    textSecondary: '#6C757D',
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F6F8',
    border: 'rgba(20, 20, 25, 0.08)',
    tint: brand,
    tabIconDefault: '#9CA0AC',
    tabIconSelected: brand,
    tabBarBackground: '#FFFFFF',
    tabBarBorder: 'rgba(20, 20, 25, 0.08)',
    headerBackground: '#171717',
    headerText: '#FFFFFF',
  },
  dark: {
    text: '#F2F3F5',
    textSecondary: '#A9ADB8',
    background: '#121214',
    surface: '#1C1C1F',
    surfaceMuted: '#1C1C1F',
    border: 'rgba(255, 255, 255, 0.08)',
    tint: brandLight,
    tabIconDefault: '#6B6E76',
    tabIconSelected: brandLight,
    tabBarBackground: '#18181B',
    tabBarBorder: 'rgba(255, 255, 255, 0.08)',
    headerBackground: '#0E0E0E',
    headerText: '#FFFFFF',
  },
  brand: {
    primary: brand,
    primaryDark: brandDark,
    primaryLight: brandLight,
    glow,
    success,
    danger,
    warning,
    info,
  },
};
