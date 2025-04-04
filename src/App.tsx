import React, { useState, useCallback } from 'react'; // Ensure React and hooks are imported
import Header from './components/Header';
import Footer from './components/Footer';
import FileUpload from './components/FileUpload';
import Controls from './components/Controls';
import CodeDisplay from './components/CodeDisplay';

// --- CONFIGURATION ---
// Function to determine the backend URL dynamically, especially for Codespaces
const getBackendUrl = (): string => {
  const defaultUrl = 'http://localhost:5001'; // Default for local dev outside Codespaces

  // Check if running in a browser environment (window exists)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Common patterns for Codespaces URLs
    const isCodespaces = hostname.endsWith('.github.dev') || hostname.endsWith('.app.github.dev');

    if (isCodespaces) {
      // Attempt to construct the likely forwarded URL for the backend (port 5001)
      // Pattern: 'https://[codespacename]-[hash]-[port].*.github.dev'
      const parts = hostname.split('-');
      if (parts.length >= 3) {
        // Remove the port part (last element after splitting by '-')
        const baseName = parts.slice(0, -1).join('-');
        // Determine the correct domain suffix (e.g., github.dev, app.github.dev)
        const domainSuffix = hostname.split('.').slice(1).join('.'); // Get everything after the first dot

        // Use HTTPS as Codespaces forwarded ports are typically HTTPS
        const backendUrl = `https://${baseName}-5001.${domainSuffix}`;
        console.log("Detected Codespaces environment, attempting dynamic backend URL:", backendUrl);
        return backendUrl;
      } else {
        // Log a warning if the hostname structure doesn't match expectations
        console.warn("Running in potential Codespaces environment, but could not reliably determine backend URL structure from hostname:", hostname, ". Falling back to default.");
      }
    }
  } else {
    // If not in a browser environment (e.g., during server-side rendering tests, though unlikely here)
    console.log("Not running in browser environment, using default backend URL.");
  }

  // Return default if not in Codespaces or if detection fails
  console.log("Using default backend URL:", defaultUrl);
  return defaultUrl;
};

// Determine the backend URL when the script loads
const BACKEND_URL = getBackendUrl();
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
        // Ensure result is treated as a string, default to empty string if null/undefined
        setOriginalCode(e.target?.result as string ?? '');
      };
      reader.onerror = () => {
        setError(`Error reading file: ${file.name}`);
        setOriginalCode('');
        setOriginalFile(null);
      };
      reader.readAsText(file); // Read the file as text
    } else {
      setOriginalCode(''); // Clear code if no file is selected
    }
  }, []); // Empty dependency array means this function is created once

  const processFile = async (action: 'obfuscate' | 'deobfuscate') => {
    if (!originalFile) {
      setError('Please select a file first.');
      return; // Exit if no file is selected
    }

    // Reset UI state for processing
    setIsLoading(true);
    setError(null);
    setProcessedCode('');
    setCurrentAction(action);

    // Prepare form data for file upload
    const formData = new FormData();
    formData.append('file', originalFile);

    // Construct the full API endpoint using the determined backend URL
    const apiPath = action === 'obfuscate' ? '/api/obfuscate' : '/api/deobfuscate';
    const endpoint = `${BACKEND_URL}${apiPath}`; // Use the potentially dynamic BACKEND_URL

    console.log(`Sending POST request to: ${endpoint}`); // Log the request target

    try {
      // Make the API request using fetch
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        // No 'Content-Type' header needed for FormData; browser sets it with boundary.
      });

      // Check for network errors (status code outside 200-299 range)
      if (!response.ok) {
          // Try to get more detailed error message from the response body
          let errorDetails = `Request failed with status: ${response.status}`;
          try {
              const errorText = await response.text(); // Read body as text
              // Use the response text if available, otherwise stick to the status code message
              errorDetails = errorText || errorDetails;
          } catch (readError) {
              // Ignore error reading the body if response was already not ok
              console.warn("Could not read error response body:", readError);
          }
          console.error(`API Error Response (${response.status}):`, errorDetails);
          throw new Error(errorDetails); // Throw error to be caught below
      }

      // If response.ok, attempt to parse the JSON body
      const result = await response.json();

      // Check for application-level errors indicated in the JSON payload
      if (result.success === false) {
        console.error('API returned success: false, Error:', result.error);
        throw new Error(result.error || 'API processing failed.'); // Use backend's error message
      }

      // Success: update the state with the processed code
      setProcessedCode(result.processedCode || ''); // Use result, default to empty string

    } catch (err: any) {
      // Catch any error from fetch, response parsing, or explicitly thrown errors
      console.error(`Error during ${action}:`, err);
      // Display a user-friendly error message
      setError(`Failed to ${action} file. ${err.message || 'An unknown error occurred. Check console or backend logs.'}`);
      setProcessedCode(''); // Clear processed code on error
    } finally {
      // Always set loading state back to false
      setIsLoading(false);
    }
  };

  // Handler for the "Use Example" button
  const handleUseExample = () => {
    // Create a File object from the hardcoded example script content
    const exampleFile = new File([EXAMPLE_SCRIPT_CONTENT], EXAMPLE_SCRIPT_FILENAME, { type: 'text/plain' });
    // Use the existing file selection handler
    handleFileSelect(exampleFile);
  };


  // Render the UI
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-gray-100 font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* File Upload Section */}
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

        {/* Actions Section (only shown if a file is selected) */}
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

        {/* Error Display Section (only shown if an error exists) */}
        {error && (
          <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-lg relative mb-6 shadow-lg" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {/* Code Display Section */}
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