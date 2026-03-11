import React from 'react';
import { Loader2 } from 'lucide-react';
import '../styles/Loader.css';

export const Loader = () => (
  <div className="loader-container">
    <Loader2 className="loader-icon" />
  </div>
);
