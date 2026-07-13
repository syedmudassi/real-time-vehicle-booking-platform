import React from "react";
import { navbarStyles as styles } from "../assets/dummyStyles";
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/logocar.png";
import { useState } from "react";
import { CalendarCheck, Car, Menu, MessageCircle, PlusCircle, Shield, X, BarChart3 } from "lucide-react";
import { useRef } from "react";
import { useEffect } from "react";
import { api, clearAdminAuth, getAdminToken } from "../api";
import { io } from "socket.io-client";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const socketRef = useRef(null);

  const hasChatUnread = chatUnreadCount > 0;

  const navLinks = [
    { path: "/", icon: PlusCircle, label: "Add Car" },
    { path: "/manage-cars", icon: Car, label: "Manage Cars" },
    { path: "/bookings", icon: CalendarCheck, label: "Bookings" },
    { path: "/reports", icon: BarChart3, label: "Reports" },
    // GPS system disabled
    // { path: "/live-tracking", icon: MapPinned, label: "Live Tracking" },
    { path: "/security", icon: Shield, label: "Security" },
    {
      path: "/chats",
      icon: MessageCircle,
      label: (
        <span className="inline-flex items-center gap-2">
          Chats
          {hasChatUnread && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_0_2px_rgba(249,115,22,0.25)]"
              aria-label="New unread chat messages"
              title="New unread chat messages"
            >
              <span className="sr-only">Unread chat messages</span>
            </span>
          )}
        </span>
      ),
    },
  ];

  const loadAdminSummary = async () => {
    try {
      const res = await api.get("/api/chats/admin/summary");
      const unread = Number(res?.data?.summary?.unreadForAdmin || 0);
      setChatUnreadCount(unread);
    } catch {
      setChatUnreadCount(0);
    }
  };

 useEffect(() => {
  let timeout;
  const onScroll = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => setScrolled(window.scrollY > 10), 50);
  };
  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll);
}, []);

   useEffect(() => {
    const onDocClick = (e) => {
      if (
        isOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen]);

  useEffect(() => {
    loadAdminSummary();

    const socket = io(api.defaults.baseURL || "http://localhost:5000", {
      transports: ["websocket"],
      auth: { role: "admin", token: getAdminToken() },
    });
    socketRef.current = socket;

    socket.on("chat:thread-updated", (payload) => {
      const unread = Number(payload?.summary?.unreadForAdmin || 0);
      if (!Number.isNaN(unread)) {
        loadAdminSummary();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <div className={styles.navbar(scrolled)}>
      <div className={styles.navbarInner}>
        <div className={styles.navbarCenter}>
          <div className={styles.navbarBackground(scrolled)}>
            <div className={styles.contentContainer}>
              <Link to="/" className={styles.logoLink}>
                <div className={styles.logoContainer}>
                  <img
                    src={logo}
                    alt="Logo"
                    className={styles.logoImage}
                    style={{ objectFit: "contain" }}
                  />
                  <span className={styles.logoText}>ADMIN</span>
                </div>
              </Link>

              <div className={styles.desktopNav}>
                <div className={styles.navLinksContainer}>
                  {navLinks.map((link, i) => {
                    const Icon = link.icon;

                    return (
                      <React.Fragment key={link.path}>
                        <NavLink
                          to={link.path}
                          end={link.path === "/"}
                          className={({ isActive }) =>
                            isActive ? styles.navLinkActive : styles.navLinkInactive
                          }
                        >
                          <Icon className=" w-4 h-4" />
                          <span>{link.label}</span>
                        </NavLink>

                        {i < navLinks.length - 1 && (
                          <div className={styles.navDivider} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearAdminAuth();
                    window.location.replace("/login");
                  }}
                  className="ml-4 rounded-xl bg-linear-to-r from-orange-600 to-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition hover:from-orange-500 hover:to-amber-400"
                >
                  Logout
                </button>
              </div>

              <div className={styles.mobileMenuButton}>
                <button
                  ref={buttonRef}
                  onClick={() => setIsOpen((v) => !v)}
                  className={styles.menuButton}
                  aria-label="Toggle Menu"
                  aria-expanded={isOpen}
                >
                    {isOpen ? (
                        <X className=" h-5 w-5" />
                    ) : (
                        <Menu className="h-5 w-5" />
                    )
                    }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div ref={menuRef} className={styles.mobileMenu}>
            <div className={styles.mobileMenuContainer}>
                {navLinks.map((link) => {
                    const Icon = link.icon;

                    return (

                        <NavLink
                          key={link.path}
                          to={link.path}
                          end={link.path === "/"}
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) =>
                            isActive ? styles.mobileNavLinkActive : styles.mobileNavLink
                          }
                        >
                            <Icon className="w-5 h-5" />
                            <span>{link.label}</span>
                        </NavLink>
                    )
                })}
                <button
                  type="button"
                  onClick={() => {
                    clearAdminAuth();
                    window.location.replace("/login");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-500 hover:to-amber-400"
                >
                  Logout
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
