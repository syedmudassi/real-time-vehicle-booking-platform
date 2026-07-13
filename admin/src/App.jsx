import React from "react";
import Navbar from "./components/Navbar";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AddCar from "./components/AddCar";
import ManageCar from "./components/ManageCar";
import Booking from "./components/Booking";
import Chats from "./components/Chats";
import AdminSecurity from "./components/AdminSecurity";
import AdminLogin from "./components/AdminLogin";
import Reports from "./components/Reports";
// GPS system disabled
// import LiveTracking from "./pages/LiveTracking";
import { getAdminToken } from "./api";

const AdminProtectedRoute = ({ children }) => {
  const token = getAdminToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RedirectIfAdminAuthenticated = ({ children }) => {
  if (getAdminToken()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {!isLoginPage && getAdminToken() && <Navbar />}

      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAdminAuthenticated>
              <AdminLogin />
            </RedirectIfAdminAuthenticated>
          }
        />
        <Route
          path="/"
          element={
            <AdminProtectedRoute>
              <AddCar />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/manage-cars"
          element={
            <AdminProtectedRoute>
              <ManageCar />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <AdminProtectedRoute>
              <Booking />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/chats"
          element={
            <AdminProtectedRoute>
              <Chats />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <AdminProtectedRoute>
              <Reports />
            </AdminProtectedRoute>
          }
        />
        {/* GPS system disabled
        <Route
          path="/live-tracking"
          element={
            <AdminProtectedRoute>
              <LiveTracking />
            </AdminProtectedRoute>
          }
        />
        */}
        <Route
          path="/security"
          element={
            <AdminProtectedRoute>
              <AdminSecurity />
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
