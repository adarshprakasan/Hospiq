import { t as translate, useLocale } from "../i18n";
import { LanguageSwitcher } from "../i18n";
import { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Menu, MenuItem, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { roleHome } from '../utils';
export default function Navbar({
  user
}) {
  useLocale();
  const navigate = useNavigate(),
    location = useLocation();
  const [anchor, setAnchor] = useState(null);
  const patient = user?.role === 'patient';
  const links = patient ? [['/', translate("Home")], ['/my-tokens', translate("Appointments")], ['/medical-records', translate("Records")]] : user?.role === 'pharmacist' ? [['/pharmacy', translate("Pharmacy queue")], ['/medications', translate("Medications")], ['/inventory', translate("Stock & expiry")]] : user?.role === 'admin' ? [['/admin', 'Platform console']] : user?.role === 'hospital_admin' ? [['/hospital-admin', 'Hospital console'], ['/dashboard', translate("Queue")], ['/schedule', translate("Schedules")]] : [['/dashboard', user?.role === 'doctor' ? translate("Clinical workspace") : translate("Queue overview")], ...(user?.role === 'staff' ? [['/schedule', translate("Schedules")]] : [])];
  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('patientContext');
    navigate('/login', {
      replace: true
    });
  };
  return <><AppBar position="sticky" color="inherit" elevation={0} sx={{
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}><Toolbar sx={{
        maxWidth: 1440,
        width: '100%',
        mx: 'auto',
        gap: 2
      }}><Typography component={NavLink} to={roleHome(user)} variant="h5" sx={{
          textDecoration: 'none',
          color: 'primary.main'
        }}>✚ Hospiq</Typography><Box component="nav" aria-label="Main navigation" sx={{
          display: {
            xs: 'none',
            md: 'flex'
          },
          gap: 1
        }}>{user && links.map(([to, label]) => <Button key={to} component={NavLink} to={to} end sx={{
            '&.active': {
              bgcolor: 'action.selected'
            }
          }}>{translate(label)}</Button>)}</Box><LanguageSwitcher /><Button sx={{
          ml: 'auto'
        }} aria-controls={anchor ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(anchor)} onClick={e => setAnchor(e.currentTarget)}>More / {user?.name?.split(' ')[0] || 'Account'}</Button></Toolbar></AppBar>
    <Menu id="account-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>{links.map(([to, label]) => <MenuItem key={to} component={NavLink} to={to} onClick={() => setAnchor(null)}>{translate(label)}</MenuItem>)}{patient && [['/find-care', translate("Find care")], ['/pharmacy', translate("Pharmacy and receipts")], ['/lab-tests', translate("Lab tests")], ['/family', translate("Family access")], ['/health-summary', translate("Health summary")], ['/notifications', translate("Notifications")]].map(([to, label]) => <MenuItem key={to} component={NavLink} to={to} onClick={() => setAnchor(null)}>{translate(label)}</MenuItem>)}<MenuItem component={NavLink} to="/profile" onClick={() => setAnchor(null)}>{translate("Profile")}</MenuItem><MenuItem onClick={signOut}>{translate("Sign out")}</MenuItem></Menu>
    {patient && <Paper sx={{
      display: {
        xs: 'block',
        md: 'none'
      },
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1200,
      pb: 'env(safe-area-inset-bottom)'
    }} elevation={4}><BottomNavigation showLabels value={location.pathname}>{links.map(([to, label], i) => <BottomNavigationAction key={to} component={NavLink} to={to} value={to} label={translate(label)} icon={i === 0 ? <HomeOutlined /> : i === 1 ? <CalendarMonthOutlined /> : <FolderOutlined />} />)}<BottomNavigationAction label={translate("More")} icon={<MoreHoriz />} onClick={e => setAnchor(e.currentTarget)} /></BottomNavigation></Paper>}
  </>;
}
