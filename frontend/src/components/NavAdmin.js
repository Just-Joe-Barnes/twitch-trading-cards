import React from 'react';
import {NavLink} from "react-router-dom";
import '../styles/NavAdmin.css';

const NavAdmin = () => {
  return (
      <div className="nav-admin">
          <NavLink to="/admin/actions">Actions Home</NavLink>
          <NavLink to="/admin/cardmanagement">Card Management</NavLink>
          <NavLink to="/admin/card-ownership">Card Ownership</NavLink>
          <NavLink to="/admin/trades">Trades</NavLink>
          <NavLink to="/admin/packs">Pack Management</NavLink>
          <NavLink to="/admin/events">Event Management</NavLink>
          <NavLink to="/admin/cardaudit">Card Audit</NavLink>
      </div>
  );
};

export default NavAdmin;
