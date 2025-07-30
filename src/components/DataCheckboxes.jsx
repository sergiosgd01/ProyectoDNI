// src/components/DataCheckboxes.jsx
import React, { useState } from 'react';

function DataCheckboxes() {
  const [checkedItems, setCheckedItems] = useState({
    nombre: true,
    apellidos: true,
    dni: true,
    fechaNacimiento: true,
    lugarNacimiento: true,
    sexo: true,
    nacionalidad: true,
    fechaExpedicion: true,
    fechaCaducidad: true,
    equipo: true,
    numeroSoporte: true,
  });

  const handleCheckboxChange = (field) => {
    setCheckedItems(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const dataFields = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'dni', label: 'DNI' },
    { key: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
    { key: 'lugarNacimiento', label: 'Lugar de Nacimiento' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'nacionalidad', label: 'Nacionalidad' },
    { key: 'fechaExpedicion', label: 'Fecha de Expedición' },
    { key: 'fechaCaducidad', label: 'Fecha de Caducidad' },
    { key: 'equipo', label: 'Equipo' },
    { key: 'numeroSoporte', label: 'Número de Soporte' },
  ];

  return (
    <div className="w-full bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
      {/* Título mejorado */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Personaliza tu protección
        </h3>
        <p className="text-gray-600">
          Selecciona qué datos quieres mantener visibles en tu DNI
        </p>
      </div>
      
      {/* Grid de checkboxes modernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {dataFields.map((field) => (
          <label 
            key={field.key}
            className={`
              group flex items-center cursor-pointer p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02]
              ${checkedItems[field.key] 
                ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md' 
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
              }
            `}
          >
            {/* Checkbox personalizado */}
            <div className="relative">
              <input
                type="checkbox"
                checked={checkedItems[field.key]}
                onChange={() => handleCheckboxChange(field.key)}
                className="sr-only"
              />
              <div className={`
                w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                ${checkedItems[field.key] 
                  ? 'border-blue-500 bg-blue-500 shadow-lg' 
                  : 'border-gray-300 bg-white group-hover:border-blue-400'
                }
              `}>
                {checkedItems[field.key] && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            
            {/* Texto del campo */}
            <span className={`
              ml-4 font-medium transition-colors duration-300
              ${checkedItems[field.key] ? 'text-blue-800' : 'text-gray-700 group-hover:text-blue-600'}
            `}>
              {field.label}
            </span>
          </label>
        ))}
      </div>
      
      {/* Botones de acción mejorados */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={() => setCheckedItems(Object.fromEntries(dataFields.map(field => [field.key, true])))}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:from-blue-600 hover:to-indigo-700"
        >
          ✓ Marcar todos
        </button>
        <button
          onClick={() => setCheckedItems(Object.fromEntries(dataFields.map(field => [field.key, false])))}
          className="flex-1 px-6 py-3 bg-white text-gray-700 font-semibold border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]"
        >
          ✗ Desmarcar todos
        </button>
      </div>
    </div>
  );
}

export default DataCheckboxes;