import React from 'react';
import Loader from './Loader'; // Assuming Loader component exists

interface ControlsProps {
  onObfuscate: () => void;
  onDeobfuscate: () => void;
  isLoading: boolean;
  fileSelected: boolean;
}

function Controls({ onObfuscate, onDeobfuscate, isLoading, fileSelected }: ControlsProps) {
  // Base classes for consistent button appearance
  const buttonBaseClass = "relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 text-base font-medium rounded-lg shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden";

  // Specific styles for each button
  const obfuscateClass = "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 border border-transparent";
  const deobfuscateClass = "text-white bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 border border-transparent";

  return (
    // Centered buttons with gap, responsive layout
    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
      <button
        onClick={onObfuscate}
        disabled={isLoading || !fileSelected}
        className={`${buttonBaseClass} ${obfuscateClass}`}
        title={fileSelected ? "Obfuscate using original SomalifuscatorV2" : "Select a file first"}
      >
        {/* Loader positioned absolutely */}
        {isLoading && <Loader size="sm" className="absolute left-0 right-0 mx-auto" />}
        {/* Hide text when loading */}
        <span className={isLoading ? 'opacity-0' : 'opacity-100'}>Obfuscate</span>
      </button>
      <button
        onClick={onDeobfuscate}
        disabled={isLoading || !fileSelected}
        className={`${buttonBaseClass} ${deobfuscateClass}`}
        title={fileSelected ? "Deobfuscate using custom script" : "Select a file first"}
      >
        {isLoading && <Loader size="sm" className="absolute left-0 right-0 mx-auto" />}
        <span className={isLoading ? 'opacity-0' : 'opacity-100'}>Deobfuscate</span>
      </button>
    </div>
  );
}

export default Controls;