import React from "react";
import { storedUser } from "../utils";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const user = storedUser(); // user info must be stored after login

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "patient" ? "/" : ["staff", "doctor"].includes(user.role) ? "/dashboard" : "/unauthorized"} replace />;
  }

  return children;
};

export default ProtectedRoute;
