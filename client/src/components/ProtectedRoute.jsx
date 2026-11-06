import React from "react";
import { storedUser, roleHome } from "../utils";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const user = storedUser(); // user info must be stored after login
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome(user)} replace />;
  }
  if (user.mustChangePassword && location.pathname !== "/change-password") return <Navigate to="/change-password" replace />;

  return children;
};

export default ProtectedRoute;
