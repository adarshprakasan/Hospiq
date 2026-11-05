import { Component } from "react";
import { Alert, Button, Container, Typography } from "@mui/material";
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <Container maxWidth="sm" sx={{ mt: 8 }}><Typography variant="h5" gutterBottom>Let's get you back to care</Typography><Alert severity="error">This page could not be displayed. Reload to try again.</Alert><Button sx={{ mt: 2 }} variant="contained" onClick={() => window.location.reload()}>Reload page</Button></Container>;
    return this.props.children;
  }
}
