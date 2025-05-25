import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

function PrivateRoute({ children }) {
  const { user } = useUser();

  if (!user) {
    // 🚫 Not logged in → Redirect to login
    return <Navigate to="/" replace />;
  }

  // ✅ Logged in → Render the protected component
  return children;
}

export default PrivateRoute;
