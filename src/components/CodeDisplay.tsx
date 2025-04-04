import React from 'react';
import Loader from './Loader'; // Assuming Loader component exists

interface CodeDisplayProps {
  originalCode: string;
  processedCode: string;
  isLoading: boolean;
  action: 'obfuscate' | 'deobfuscate' | null;
}

function CodeDisplay({ originalCode, processedCode, isLoading, action }: CodeDisplayProps) {
  const hasOriginal = originalCode.length > 0;
  const hasProcessed = processedCode.length > 0;

  const getProcessedTitle = () => {
      if (isLoading && action) return `Processing (${action})...`; // Show during loading
      if (action === 'obfuscate') return 'Obfuscated Code';
      if (action === 'deobfuscate') return 'Deobfuscated Code';
      return 'Output'; // Default title
  }

  // Basic copy-to-clipboard functionality
  const copyToClipboard = (text: string, type: string) => {
    if (!navigator.clipboard) {
        alert('Clipboard API not available in this browser.');
        return;
    }
      navigator.clipboard.writeText(text)
        .then(() => alert(`${type} code copied to clipboard!`)) // Simple feedback - consider a toast notification
        .catch(err => {
            console.error(`Failed to copy ${type} code: `, err);
            alert(`Failed to copy ${type} code.`);
        });
  };

  const CodePanel = ({ title, code, hasContent, onCopy, typeLabel, isLoadingPanel = false, children }: {
    title: string;
    code?: string; // Make code optional for loading state
    hasContent?: boolean; // Explicit flag
    onCopy?: () => void;
    typeLabel: string;
    isLoadingPanel?: boolean;
    children?: React.ReactNode; // For placeholder text
  }) => (
     <div className="bg-slate-800/60 shadow-lg rounded-xl overflow-hidden border border-slate-700 flex flex-col min-h-[200px] sm:min-h-[300px] md:min-h-[400px]">
        {/* Panel Header */}
        <div className="flex justify-between items-center p-3 px-4 bg-slate-900/60 border-b border-slate-600/80">
            <h3 className="text-base sm:text-lg font-semibold text-gray-300 truncate" title={title}>{title}</h3>
             {/* Show copy button only if there's content and not loading */}
             {hasContent && !isLoadingPanel && onCopy && (
                 <button
                    onClick={onCopy}
                    className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 px-3 py-1 rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    title={`Copy ${typeLabel} Code`}
                >
                    Copy
                 </button>
            )}
        </div>
         {/* Panel Body - Code Area or Placeholder */}
         <div className="p-4 flex-grow overflow-auto relative bg-gray-900/30">
           {/* Loading overlay specific to this panel */}
           {isLoadingPanel && (
              <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-b-xl">
                <Loader text={`Processing...`} />
              </div>
           )}
           {/* Conditional rendering for code or placeholder */}
           {hasContent && code !== undefined ? (
             <pre className="text-xs sm:text-sm text-gray-200 whitespace-pre-wrap break-words font-mono">
               <code>{code}</code>
             </pre>
           ) : (
              !isLoadingPanel && children // Render placeholder if provided and not loading
           )}
        </div>
      </div>
  );

  return (
    // Grid layout for two panels, responsive columns
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      {/* Original Code Panel */}
      <CodePanel
        title="Original Code"
        code={originalCode}
        hasContent={hasOriginal}
        onCopy={() => copyToClipboard(originalCode, 'Original')}
        typeLabel="Original"
      >
         {/* Placeholder when no file is selected */}
         <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 italic text-center px-4">Select or drop a .bat/.cmd file above to see its content here.</p>
         </div>
      </CodePanel>

      {/* Processed Code Panel */}
      <CodePanel
        title={getProcessedTitle()}
        code={processedCode}
        hasContent={hasProcessed}
        onCopy={() => copyToClipboard(processedCode, 'Processed')}
        typeLabel="Processed"
        isLoadingPanel={isLoading} // Show loader overlay only on this panel
      >
         {/* Placeholder when no processing has happened */}
         <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 italic text-center px-4">Output will appear here after processing.</p>
         </div>
      </CodePanel>
    </div>
  );
}

export default CodeDisplay;