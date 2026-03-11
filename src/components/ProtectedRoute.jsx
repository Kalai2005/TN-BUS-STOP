import React from 'react';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
  const isAuthenticated = true; // Mock authentication
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};
