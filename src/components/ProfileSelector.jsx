import React from 'react';
import { DNI_PROFILES } from '../constants/dniProfiles';
import { useColors } from '../theme/useColors';

export default function ProfileSelector({ selectedProfile, onProfileSelect, selectedFrontFields, selectedBackFields }) {
  const profiles = DNI_PROFILES.getProfilesList();
  const colors = useColors();

  const isCustomProfile = () => {
    return !profiles.some(profile => {
      const frontMatch = JSON.stringify(profile.frontFields) === JSON.stringify(selectedFrontFields);
      const backMatch = JSON.stringify(profile.backFields) === JSON.stringify(selectedBackFields);
      return frontMatch && backMatch;
    });
  };

  const renderFieldsIndicator = (profile) => {
    const frontFields = profile.frontFields || {};
    const backFields = profile.backFields || {};

    const totalFrontFields = Object.keys(frontFields).length;
    const totalBackFields = Object.keys(backFields).length;
    const totalFields = totalFrontFields + totalBackFields;

    const selectedCount = DNI_PROFILES.getFieldsCount(frontFields, backFields);

    return (
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">
          {selectedCount} de {totalFields} campos
        </span>
        <div className="flex items-center">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(selectedCount / totalFields) * 100}%`,
                backgroundColor: colors.primary
              }}
            />
          </div>
          <span className="ml-2 text-xs font-medium text-gray-500">
            {Math.round((selectedCount / totalFields) * 100)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
        <i className="bi bi-person-gear mr-2"></i>
        Perfiles predefinidos
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {profiles.map((profile) => {
          const isSelected = selectedProfile === profile.id;

          return (
            <button
              key={profile.id}
              onClick={() => onProfileSelect(profile.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${isSelected
                  ? 'shadow-md'
                  : 'bg-gray-50 border-gray-200 hover:border-yellow-400 hover:shadow-sm'
                }`}
              style={{
                backgroundColor: isSelected ? colors.getLight('primary') : undefined,
                borderColor: isSelected ? colors.primary : undefined,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-xl mr-3">{profile.icon}</span>
                  <span className="font-medium text-base text-gray-800">{profile.name}</span>
                </div>
                {isSelected && (
                  <i className="bi bi-check-circle-fill text-lg" style={{ color: colors.primary }}></i>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {profile.description}
              </p>

              {renderFieldsIndicator(profile)}
            </button>
          );
        })}
      </div>

      {isCustomProfile() && (
        <div
          className="rounded-lg p-4 border-2"
          style={{
            backgroundColor: colors.getLight('primary'),
            borderColor: colors.primary
          }}
        >
          <div className="flex items-center mb-2" style={{ color: colors.getDark('primary') }}>
            <i className="bi bi-gear-fill mr-2"></i>
            <span className="font-medium">Configuración personalizada</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Has modificado la selección de campos. Elige un perfil para aplicar una configuración predefinida.
          </p>
        </div>
      )}
    </div>
  );
}