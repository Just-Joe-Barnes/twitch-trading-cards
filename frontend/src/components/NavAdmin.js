import React from 'react';
import {NavLink} from "react-router-dom";
import '../styles/NavAdmin.css';

const NavAdmin = () => {
  return (
      <div className="nav-admin">
          <NavLink to="/admin/actions">Actions Home</NavLink>
          <NavLink to="/admin/cardaudit">Card Audit</NavLink>
          <NavLink to="/admin/packs">Pack Management</NavLink>
          <NavLink to="/admin/card-ownership">Card Ownership</NavLink>
      </div>
  );
};

export default NavAdmin;
