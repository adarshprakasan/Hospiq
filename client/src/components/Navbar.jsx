import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  IconButton,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [anchorEl, setAnchorEl] = useState(null);

  const handleAvatarEnter = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const goToProfile = () => {
    handleMenuClose();
    navigate("/profile");
  };

  return (
    <AppBar position="static">
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ color: "#fff", textDecoration: "none" }}
        >
          Hospiq
        </Typography>

        {!isMobile && user && (
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            {user.role === "patient" && (
              <Button color="inherit" component={Link} to="/">
                Book
              </Button>
            )}

            {(user.role === "doctor" || user.role === "staff") && (
              <Button color="inherit" component={Link} to="/dashboard">
                Dashboard
              </Button>
            )}

            <Box
              onMouseEnter={handleAvatarEnter}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
              }}
            >
              <IconButton size="small">
                <Avatar
                  sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}
                >
                  {user.name?.[0]?.toUpperCase()}
                </Avatar>
              </IconButton>
              <Typography variant="body2" sx={{ color: "#fff" }}>
                {user.name}
              </Typography>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onMouseLeave={handleMenuClose}
              MenuListProps={{ onMouseLeave: handleMenuClose }}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem onClick={goToProfile}>Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
