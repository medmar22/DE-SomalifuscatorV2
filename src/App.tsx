import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUpload from './components/FileUpload';
import Controls from './components/Controls';
import CodeDisplay from './components/CodeDisplay';

// Define the example script here
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
        setOriginalCode(e.target?.result as string);
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

    const endpoint = action === 'obfuscate' ? '/api/obfuscate' : '/api/deobfuscate';

    try {
      // --- IMPORTANT ---
      // This fetch call assumes you have a backend running at the same origin
      // serving the API endpoints /api/obfuscate and /api/deobfuscate.
      // You MUST implement this backend separately.
      // The backend should accept a POST request with multipart/form-data
      // containing the file, run the appropriate Python script, and return
      // JSON like { processedCode: "...", success: true } or { error: "...", success: false }
      // -----------------
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        // Add headers if needed by your backend (e.g., Authorization)
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      setProcessedCode(result.processedCode || ''); // Adjust based on your backend response structure

    } catch (err: any) {
      console.error(`Error during ${action}:`, err);
      setError(`Failed to ${action} file. ${err.message || 'Check backend connection/logs.'}`);
      setProcessedCode(''); // Clear processed code on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExample = () => {
    const exampleFile = new File([EXAMPLE_SCRIPT_CONTENT], EXAMPLE_SCRIPT_FILENAME, { type: 'text/plain' });
    handleFileSelect(exampleFile);
  };


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-gray-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-gray-800 shadow-xl rounded-lg p-6 mb-8 border border-slate-700">
           <h2 className="text-2xl font-semibold mb-4 text-teal-400">Upload Your Batch Script</h2>
          <FileUpload onFileSelect={handleFileSelect} selectedFileName={originalFile?.name} />
          <div className="mt-4 text-center">
            <button
              onClick={handleUseExample}
              className="text-sm text-teal-400 hover:text-teal-300 transition duration-150 ease-in-out underline"
            >
              Or use the example script
            </button>
          </div>
        </div>

        {originalFile && (
          <div className="bg-gray-800 shadow-xl rounded-lg p-6 mb-8 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-4 text-teal-400">Actions</h2>
            <Controls
              onObfuscate={() => processFile('obfuscate')}
              onDeobfuscate={() => processFile('deobfuscate')}
              isLoading={isLoading}
              fileSelected={!!originalFile}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-lg relative mb-6 shadow-lg" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        <CodeDisplay
          originalCode={originalCode}
          processedCode={processedCode}
          isLoading={isLoading}
          action={currentAction}
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;