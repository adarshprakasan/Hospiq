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
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, []);

  return (
    <>
      <Navbar user={user} />
      <main>{children}</main>
    </>
  );
};

export default Layout;
