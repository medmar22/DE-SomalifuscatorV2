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
      if (action === 'obfuscate') return 'Obfuscated Code';
      if (action === 'deobfuscate') return 'Deobfuscated Code';
      return 'Processed Code';
  }

  // Basic copy-to-clipboard functionality
  const copyToClipboard = (text: string, type: string) => {
      navigator.clipboard.writeText(text)
        .then(() => alert(`${type} code copied to clipboard!`)) // Simple feedback
        .catch(err => console.error(`Failed to copy ${type} code: `, err));
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Original Code Panel */}
      <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-slate-700 flex flex-col">
        <div className="flex justify-between items-center p-3 bg-gray-900/50 border-b border-slate-600">
            <h3 className="text-lg font-semibold text-gray-300">Original Code</h3>
            {hasOriginal && (
                 <button
                    onClick={() => copyToClipboard(originalCode, 'Original')}
                    className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 px-2 py-1 rounded transition duration-150"
                    title="Copy Original Code"
                >
                    Copy
                 </button>
            )}
        </div>
        <div className="p-4 flex-grow overflow-auto bg-gray-800/80 max-h-96">
          {hasOriginal ? (
            <pre className="text-sm text-gray-200 whitespace-pre-wrap break-words">
              <code>{originalCode}</code>
            </pre>
          ) : (
            <p className="text-gray-500 italic text-center mt-4">No file selected or content is empty.</p>
          )}
        </div>
      </div>

      {/* Processed Code Panel */}
      <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-slate-700 flex flex-col">
        <div className="flex justify-between items-center p-3 bg-gray-900/50 border-b border-slate-600">
            <h3 className="text-lg font-semibold text-gray-300">{getProcessedTitle()}</h3>
             {hasProcessed && !isLoading && (
                 <button
                    onClick={() => copyToClipboard(processedCode, 'Processed')}
                    className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 px-2 py-1 rounded transition duration-150"
                    title="Copy Processed Code"
                >
                    Copy
                 </button>
            )}
        </div>
        <div className="p-4 flex-grow overflow-auto bg-gray-800/80 relative min-h-[100px] max-h-96">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-800/70 flex items-center justify-center z-10 rounded-b-lg">
              <Loader text={`Processing (${action})...`} />
            </div>
          )}
          {hasProcessed ? (
            <pre className="text-sm text-gray-200 whitespace-pre-wrap break-words">
              <code>{processedCode}</code>
            </pre>
          ) : (
             !isLoading && <p className="text-gray-500 italic text-center mt-4">Processed code will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CodeDisplay;