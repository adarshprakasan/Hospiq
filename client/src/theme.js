import { createTheme } from "@mui/material/styles";
export default createTheme({
  palette: { primary: { main: "#087f72", dark: "#065d54" }, secondary: { main: "#4265a4" }, info: { main: "#026da8" }, warning: { main: "#915700" }, background: { default: "#f4f7f8", paper: "#ffffff" }, text: { primary: "#183334", secondary: "#52686a" } },
  typography: { fontFamily: '"Segoe UI", system-ui, sans-serif', h4: { fontWeight: 750, letterSpacing: "-1px" }, h5: { fontWeight: 700 }, h6: { fontWeight: 650 }, button: { textTransform: "none", fontWeight: 650 } },
  shape: { borderRadius: 14 },
  components: { MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 40, borderRadius: 10 } } }, MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: "1px solid #e0e9e8" } } }, MuiCard: { styleOverrides: { root: { boxShadow: "0 6px 24px #163c3507" } } }, MuiContainer: { styleOverrides: { root: { paddingBottom: 32 } } }, MuiTextField: { defaultProps: { variant: "outlined" } } }
});
