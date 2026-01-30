import React from 'react';

function ChargerSelector({ chargers, selectedCharger, onSelect }) {
  return (
    <div className="charger-selector">
      <label htmlFor="charger-select">Select Charger:</label>
      <select 
        id="charger-select"
        value={selectedCharger || ''} 
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">-- Select a charger --</option>
        {chargers.map(charger => (
          <option key={charger.id} value={charger.id}>
            {charger.name} ({charger.id})
          </option>
        ))}
      </select>
    </div>
  );
}

export default ChargerSelector;
