import React from 'react';

export default function LegalTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto my-4">
      {/* Las tablas de 3 o más columnas tienen un ancho mínimo y en móvil se deslizan de lado */}
      <table className={`w-full text-sm text-left border border-gray-200 ${headers.length > 2 ? 'min-w-[36rem]' : ''}`}>
        <thead className="bg-gray-50 text-gray-800">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold border-b border-gray-200">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top border-b border-gray-100 last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
