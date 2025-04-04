import React from 'react';
import Loader from './Loader'; // Assuming Loader component exists

interface ControlsProps {
  onObfuscate: () => void;
  onDeobfuscate: () => void;
  isLoading: boolean;
  fileSelected: boolean;
}

function Controls({ onObfuscate, onDeobfuscate, isLoading, fileSelected }: ControlsProps) {
  const buttonBaseClass = "relative flex items-center justify-center px-6 py-3 text-base font-medium rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed";
  const obfuscateClass = "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500";
  const deobfuscateClass = "text-white bg-teal-600 hover:bg-teal-700 focus:ring-teal-500";

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4">
      <button
        onClick={onObfuscate}
        disabled={isLoading || !fileSelected}
        className={`${buttonBaseClass} ${obfuscateClass}`}
        title="Obfuscate using original SomalifuscatorV2 (Requires Backend)"
      >
        {isLoading && <Loader size="sm" className="absolute left-4" />}
        Obfuscate
      </button>
      <button
        onClick={onDeobfuscate}
        disabled={isLoading || !fileSelected}
        className={`${buttonBaseClass} ${deobfuscateClass}`}
        title="Deobfuscate using the Python deobfuscator script (Requires Backend)"
      >
        {isLoading && <Loader size="sm" className="absolute left-4" />}
        Deobfuscate
      </button>
    </div>
  );
}

export default Controls;