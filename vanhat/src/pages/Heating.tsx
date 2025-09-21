import React from 'react';
import TemperaturePanel from '../components/TemperaturePanel';

const Heating: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Lämmitys</h1>
      
      {/* Temperature Control Section */}
      <div className="mb-8">
        <TemperaturePanel />
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Lämmitysjärjestelmän hallinta</h2>
        <p className="text-gray-600 mb-4">
          Täällä voit hallita kodin lämmitysjärjestelmää, ilmanvaihtoa ja lämpöpumppuja.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Järjestelmä kortit tulossa myöhemmin */}
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Bosch lämpöpumppu</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Nilan ilmanvaihto</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Lattialämmitys</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Lämpötila-anturit</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Heating;
