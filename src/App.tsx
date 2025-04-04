import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUpload from './components/FileUpload';
import Controls from './components/Controls';
import CodeDisplay from './components/CodeDisplay';

// --- CONFIGURATION ---
// Define the base URL for your backend API server
const BACKEND_URL = 'http://localhost:5001'; // Default Flask port
// --- END CONFIGURATION ---

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
        setOriginalCode(e.target?.result as string ?? ''); // Ensure string type
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

    // --- MODIFIED PART ---
    // Construct the full API endpoint URL using the backend base URL
    const apiPath = action === 'obfuscate' ? '/api/obfuscate' : '/api/deobfuscate';
    const endpoint = `${BACKEND_URL}${apiPath}`;
    // ---------------------

    console.log(`Sending POST request to: ${endpoint}`); // Log the target endpoint

    try {
      const response = await fetch(endpoint, { // Use the full absolute URL
        method: 'POST',
        body: formData,
        // No 'Content-Type' header needed for FormData; the browser sets it correctly with the boundary.
      });

      // --- ADDED CHECK ---
      // Check if the response status indicates a network or server error (like 404, 500)
      // BEFORE trying to parse the body as JSON.
      if (!response.ok) {
          // Attempt to read the response body as text, as it might contain an error message (HTML or plain text)
          const errorText = await response.text();
          console.error(`API Error Response (${response.status}):`, errorText);
          // Throw an error with the text content or a generic HTTP status message
          throw new Error(errorText || `Request failed with status: ${response.status}`);
      }
      // --- END ADDED CHECK ---

      // If response.ok is true, proceed to parse the JSON body
      const result = await response.json();

      // Check for application-level errors reported within the JSON structure
      if (result.success === false) {
        console.error('API returned success: false, Error:', result.error);
        // Use the error message provided by the backend API
        throw new Error(result.error || 'API request failed.');
      }

      // If successful, update the processed code state
      setProcessedCode(result.processedCode || ''); // Use the processed code from the JSON response

    } catch (err: any) {
      // Log the full error caught (could be network error, JSON parsing error, or thrown error)
      console.error(`Error during ${action}:`, err);
      // Set a user-friendly error message for the UI
      setError(`Failed to ${action} file. ${err.message || 'Check console or backend logs for details.'}`);
      setProcessedCode(''); // Clear any previous processed code on error
    } finally {
      // Ensure loading state is turned off regardless of success or failure
      setIsLoading(false);
    }
  };

  const handleUseExample = () => {
    const exampleFile = new File([EXAMPLE_SCRIPT_CONTENT], EXAMPLE_SCRIPT_FILENAME, { type: 'text/plain' });
    handleFileSelect(exampleFile);
  };


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-gray-100 font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-gray-800 shadow-xl rounded-lg p-6 mb-8 border border-slate-700">
           <h2 className="text-2xl font-semibold mb-4 text-teal-400">Upload Your Batch Script</h2>
          <FileUpload onFileSelect={handleFileSelect} selectedFileName={originalFile?.name} />
          <div className="mt-4 text-center">
            <button
              onClick={handleUseExample}
              className="text-sm text-teal-400 hover:text-teal-300 transition duration-150 ease-in-out underline focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
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

        {/* Ensure CodeDisplay component exists and is imported correctly */}
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