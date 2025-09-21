import React from 'react';

const Electric: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Sähkö</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Sähkönkulutuksen seuranta</h2>
        <p className="text-gray-600 mb-4">
          Täällä voit seurata kodin sähkönkulutusta ja hallita sähkölaitteita.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sähkö kortit tulossa myöhemmin */}
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Kokonaiskulutus</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Pistorasiat</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">UPS-järjestelmä</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Aurinkopaneelit</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Sähköauto</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Energiavarastointi</h3>
            <p className="text-gray-500">Tulossa pian...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Electric;
