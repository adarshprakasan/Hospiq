import { t as translate, useLocale } from "../i18n";
import { LanguageSwitcher } from "../i18n";
import { Link } from 'react-router-dom';
import { Button, Container, Stack, Typography } from '@mui/material';
import CareDirectory from '../features/discovery/CareDirectory';
import { storedUser, roleHome } from '../utils';
export default function FindCarePage() {
  useLocale();
  const user = storedUser();
  return (
    <Container maxWidth="lg" sx={{
      py: 3
    }}><Stack
      direction="row"
      sx={{
        justifyContent: "space-between",
        mb: 4
      }}><Typography variant="h5" color="primary">✚ Hospiq</Typography><LanguageSwitcher /><Button component={Link} to={user ? roleHome(user) : '/login'}>{user ? translate("My workspace") : translate("Sign in")}</Button></Stack><CareDirectory /></Container>
  );
}
