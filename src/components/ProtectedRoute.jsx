import React from 'react';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
  const isAuthenticated = typeof window !== 'undefined' && Boolean(localStorage.getItem('authToken'));
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};
