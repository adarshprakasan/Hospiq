import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import axios from "../api/axios";

const Layout = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("/auth/me");
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, []);

  return (
    <>
      <a href="#main-content" style={{ position: "absolute", left: -10000 }} onFocus={e => e.currentTarget.style.left = "12px"} onBlur={e => e.currentTarget.style.left = "-10000px"}>Skip to content</a>
      <Navbar user={user} />
      <main id="main-content" className="app-main">{children}</main>
      <footer className="app-footer">Hospiq · Better care. Less waiting.</footer>
    </>
  );
};

export default Layout;
