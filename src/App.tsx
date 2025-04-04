import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUpload from './components/FileUpload';
import Controls from './components/Controls';
import CodeDisplay from './components/CodeDisplay';

// --- CONFIGURATION ---
const getBackendUrl = (): string => {
  const defaultUrl = 'http://localhost:5001';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isCodespaces = hostname.endsWith('.github.dev') || hostname.endsWith('.app.github.dev');
    if (isCodespaces) {
      const parts = hostname.split('-');
      if (parts.length >= 3) {
        const baseName = parts.slice(0, -1).join('-');
        const domainSuffix = hostname.split('.').slice(1).join('.');
        const backendUrl = `https://${baseName}-5001.${domainSuffix}`;
        console.log("Detected Codespaces environment, attempting dynamic backend URL:", backendUrl);
        return backendUrl;
      } else {
        console.warn("Running in potential Codespaces environment, but could not reliably determine backend URL structure from hostname:", hostname, ". Falling back to default.");
      }
    }
  }
  console.log("Using default backend URL:", defaultUrl);
  return defaultUrl;
};
const BACKEND_URL = getBackendUrl();
// --- END CONFIGURATION ---

const EXAMPLE_SCRIPT_FILENAME = 'example.bat';
const EXAMPLE_SCRIPT_CONTENT = `
@echo off
title Example Batch Script
color 0A
set MESSAGE=Hello from the Somalifuscator Example!
set USER=%USERNAME%
echo ====================================
echo  %MESSAGE%
echo ====================================
echo.
echo Running as user: %USER%
echo Current directory: %CD%
echo.
set /a RND_NUM=%random% %% 100 + 1
echo Generated random number (1-100): %RND_NUM%
echo.
if %RND_NUM% GTR 50 (
    echo Random number is greater than 50!
    call :Subroutine "Passed to subroutine"
) else (
    echo Random number is 50 or less.
)
echo.
echo Script finished. Press any key to exit.
pause > nul
goto :EOF
:Subroutine
echo --- Inside Subroutine ---
echo Parameter received: %~1
echo Returning...
goto :EOF
:EOF
exit /b 0
`.trim();


function App() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalCode, setOriginalCode] = useState<string>('');
  const [processedCode, setProcessedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<'obfuscate' | 'deobfuscate' | null>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    setOriginalFile(file);
    setProcessedCode('');
    setError(null);
    setCurrentAction(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalCode(e.target?.result as string ?? '');
      };
      reader.onerror = () => {
        setError(`Error reading file: ${file.name}`);
        setOriginalCode('');
        setOriginalFile(null);
      };
      reader.readAsText(file);
    } else {
      setOriginalCode('');
    }
  }, []);

  const processFile = async (action: 'obfuscate' | 'deobfuscate') => {
    if (!originalFile) {
      setError('Please select a file first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setProcessedCode('');
    setCurrentAction(action);
    const formData = new FormData();
    formData.append('file', originalFile);
    const apiPath = action === 'obfuscate' ? '/api/obfuscate' : '/api/deobfuscate';
    const endpoint = `${BACKEND_URL}${apiPath}`;
    console.log(`Sending POST request to: ${endpoint}`);
    try {
      const response = await fetch(endpoint, { method: 'POST', body: formData });
      if (!response.ok) {
          let errorDetails = `Request failed with status: ${response.status}`;
          try { const errorText = await response.text(); errorDetails = errorText || errorDetails; }
          catch (readError) { console.warn("Could not read error response body:", readError); }
          console.error(`API Error Response (${response.status}):`, errorDetails);
          throw new Error(errorDetails);
      }
      const result = await response.json();
      if (result.success === false) {
        console.error('API returned success: false, Error:', result.error);
        throw new Error(result.error || 'API processing failed.');
      }
      setProcessedCode(result.processedCode || '');
    } catch (err: any) {
      console.error(`Error during ${action}:`, err);
      setError(`Failed to ${action} file. ${err.message || 'An unknown error occurred. Check console or backend logs.'}`);
      setProcessedCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExample = () => {
    const exampleFile = new File([EXAMPLE_SCRIPT_CONTENT], EXAMPLE_SCRIPT_FILENAME, { type: 'text/plain' });
    handleFileSelect(exampleFile);
  };

  // Main application structure and styling
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-300">
      <Header />
      {/* Increased vertical padding, constrained width with container */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Added gap between sections */}
        <div className="space-y-10">

          {/* File Upload Card */}
          <section aria-labelledby="upload-heading" className="bg-slate-800/50 shadow-xl rounded-xl p-6 md:p-8 border border-slate-700 backdrop-blur-sm">
             <h2 id="upload-heading" className="text-2xl font-semibold mb-5 text-teal-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Script
             </h2>
            <FileUpload onFileSelect={handleFileSelect} selectedFileName={originalFile?.name} />
            <div className="mt-5 text-center">
              <button
                onClick={handleUseExample}
                className="text-sm text-teal-400 hover:text-teal-300 transition duration-150 ease-in-out underline focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
              >
                Or use the example script
              </button>
            </div>
          </section>

          {/* Actions Card (Conditional) */}
          {originalFile && (
            <section aria-labelledby="actions-heading" className="bg-slate-800/50 shadow-xl rounded-xl p-6 md:p-8 border border-slate-700 backdrop-blur-sm">
              <h2 id="actions-heading" className="text-2xl font-semibold mb-5 text-teal-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Actions
              </h2>
              <Controls
                onObfuscate={() => processFile('obfuscate')}
                onDeobfuscate={() => processFile('deobfuscate')}
                isLoading={isLoading}
                fileSelected={!!originalFile}
              />
            </section>
          )}

          {/* Error Display (Conditional) */}
          {error && (
            <div className="bg-red-900/80 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative shadow-lg flex items-start gap-3" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                  <strong className="font-bold block">Error!</strong>
                  <span className="block sm:inline">{error}</span>
              </div>
            </div>
          )}

          {/* Code Display Section */}
          {/* Conditionally render CodeDisplay only when there's code or loading state */}
          {(originalCode || processedCode || isLoading) && (
            <section aria-labelledby="code-heading">
               <h2 id="code-heading" className="sr-only">Code Comparison</h2>
               <CodeDisplay
                 originalCode={originalCode}
                 processedCode={processedCode}
                 isLoading={isLoading}
                 action={currentAction}
               />
            </section>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;