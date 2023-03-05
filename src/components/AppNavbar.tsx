import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import GarageIcon from "../assets/garage_icon-icons.png"

const activeNavbarItem = ({ isActive }: {isActive: boolean}) =>
  isActive ? "navbar-item has-background-white" : "navbar-item";

function AppNavbar() {
  const [isActive, setIsActive] = useState<boolean>(false);

  return (
    <nav
      className="navbar block has-background-primary"
      role="navigation"
      aria-label="main navigation"
    >
      <div className="navbar-brand">
        <Link className="navbar-item" to={"/"}>
          <figure className="image">
            <img src={GarageIcon} width="128" height="128" />
          </figure>
        </Link>
        <a
          role="button"
          className={isActive ? "navbar-burger is-active" : "navbar-burger"}
          aria-label="menu"
          aria-expanded="false"
          data-target="appNavbarItems"
          onClick={() => setIsActive(!isActive)}
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
      <div className={isActive ? "navbar-menu is-active" : "navbar-menu"} id="appNavbarItems">
        <div className="navbar-start">
          <NavLink className={activeNavbarItem} to={"/search/notion"} onClick={() => setIsActive(false)}>
            Search
          </NavLink>
          <NavLink className={activeNavbarItem} to={"/docs"} onClick={() => setIsActive(false)}>
            Documentation
          </NavLink>
          <div className="navbar-item has-dropdown is-hoverable">
            <a className="navbar-link">
              Test Data
            </a>
            <div className="navbar-dropdown">
              <NavLink className={"navbar-item"} to={"/test/mercury"} onClick={() => setIsActive(false)}>
                Mercury
              </NavLink>
              <NavLink className={"navbar-item"} to={"/test/netherwarden"} onClick={() => setIsActive(false)}>
                Netherwarden
              </NavLink>
              <NavLink className={"navbar-item"} to={"/test/challengerPark"} onClick={() => setIsActive(false)}>
                Challenger Park
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;
