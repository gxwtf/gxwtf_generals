import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff',
    },
    secondary: {
      main: '#394150',
    },
  },

  typography: {
    fontFamily: `"Nunito", "Noto Sans FC"`,
  },

  shape: {
    borderRadius: 24,
  },
});

theme = responsiveFontSizes(theme);

export default theme;
