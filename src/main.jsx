// src/main.jsx (o main.js)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; 
import './theme/colors.css';  // 🎨 Sistema de colores simplificado 
import 'bootstrap-icons/font/bootstrap-icons.css';  // Bootstrap Icons

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);