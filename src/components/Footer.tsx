import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-center py-4 mt-auto border-t border-slate-700">
      <p className="text-sm text-gray-500">
        © {currentYear} Your Name/Project. Built for Somalifuscator.
        Original Obfuscator by <a href="https://github.com/KingKDot/SomalifuscatorV2" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-400 underline">KingKDot</a>.
      </p>
    </footer>
  );
}

export default Footer;