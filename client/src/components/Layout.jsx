import React, { useEffect, useState } from "react";
import PatientContextSelector from "./PatientContextSelector";
import Navbar from "./Navbar";
import axios from "../api/axios";
import { signOut } from "../utils/session";
import { useNavigate } from "react-router-dom";

const Layout = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("/auth/me");
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        if (res.data.mustChangePassword) navigate("/change-password", { replace: true });
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, [navigate]);

  useEffect(() => {
    const syncSignOut = event => {
      if (event.key === "token" && !event.newValue && !localStorage.getItem("token")) signOut();
    };
    window.addEventListener("storage", syncSignOut);
    return () => window.removeEventListener("storage", syncSignOut);
  }, []);

  return (
    <>
      <a href="#main-content" style={{ position: "absolute", left: -10000 }} onFocus={e => e.currentTarget.style.left = "12px"} onBlur={e => e.currentTarget.style.left = "-10000px"}>Skip to content</a>
      <Navbar user={user} />
      {user?.role === "patient" && <PatientContextSelector user={user} />}
      <main id="main-content" className="app-main">{children}</main>
      <footer className="app-footer">Hospiq · Better care. Less waiting.</footer>
    </>
  );
};

export default Layout;
