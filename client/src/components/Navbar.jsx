import { AppBar, Toolbar, Typography, Button, Box, Avatar } from "@mui/material";
import { NavLink, useNavigate } from "react-router-dom";
export default function Navbar({ user }) {
  const navigate = useNavigate();
  const patient = user?.role === "patient";
  const links = patient ? [["/", "Find care"], ["/my-tokens", "My appointments"]] : [["/dashboard", "Queue overview"], ["/manage-doctors", "Doctors"], ["/schedule", "Schedules"]];
  return <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid #e0e9e8" }}>
    <Toolbar sx={{ maxWidth: 1440, width: "100%", mx: "auto", gap: 2, flexWrap: "wrap", py: 1 }}>
      <Typography component={NavLink} to={patient ? "/" : "/dashboard"} variant="h5" sx={{ textDecoration: "none", color: "primary.main", mr: { sm: 3 } }}>✚ Hospiq</Typography>
      <Box component="nav" aria-label="Main navigation" sx={{ display: "flex", gap: .5, flexWrap: "wrap", order: { xs: 3, md: 0 }, width: { xs: "100%", md: "auto" } }}>
        {user && links.map(([to, label]) => <Button key={to} component={NavLink} to={to} end sx={{ color: "text.secondary", "&.active": { color: "primary.main", bgcolor: "#e5f3ef" } }}>{label}</Button>)}
      </Box>
      <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
        {user && <Button component={NavLink} to="/profile" startIcon={<Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: 14 }}>{user.name?.[0]}</Avatar>}>{user.name?.split(" ")[0]}</Button>}
        <Button color="inherit" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/login", { replace: true }); }}>Sign out</Button>
      </Box>
    </Toolbar>
  </AppBar>;
}
