import React from 'react';

function Header() {
  return (
    // Slightly increased vertical padding, sticky header effect
    <header className="bg-gray-900/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-slate-700/50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Adjusted font size and weight */}
        <h1 className="text-xl sm:text-2xl font-semibold text-teal-400 tracking-tight">
          Somalifuscator <span className="text-gray-400 font-normal">Toolbox</span>
        </h1>
        <a
            href="https://github.com/YourGitHubUsername/YourRepoName" // CHANGE THIS TO YOUR REPO LINK
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-teal-400 transition duration-150 ease-in-out"
            title="View Source on GitHub"
        >
             {/* GitHub Icon SVG */}
             <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 16 16">
               <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
             </svg>
             <span className="sr-only">View Source on GitHub</span>
        </a>
      </nav>
    </header>
  );
}

export default Header;