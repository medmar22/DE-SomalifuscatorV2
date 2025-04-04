import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    // Added top border, subtle background
    <footer className="bg-slate-900/50 text-center py-5 mt-12 border-t border-slate-700/50">
      <p className="text-xs sm:text-sm text-gray-500">
        © {currentYear} DE-SomalifuscatorV2 - FLYBI
        Built with React, Vite, Flask, Tailwind CSS.
        Original Obfuscator by <a href="https://github.com/KingKDot/SomalifuscatorV2" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-400 underline transition">KingKDot</a>.
      </p>
    </footer>
  );
}

export default Footer;