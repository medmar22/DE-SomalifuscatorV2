import React, { useCallback, useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFileName?: string;
}

function FileUpload({ onFileSelect, selectedFileName }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
    // Reset input value to allow re-uploading the same file name
     if (event.target) {
      event.target.value = '';
    }
  };

  const handleFile = (file: File | undefined) => {
     if (file && (file.name.endsWith('.bat') || file.name.endsWith('.cmd'))) {
       onFileSelect(file);
     } else if (file) { // Only show alert if a file was actually selected/dropped but was wrong type
       alert('Invalid file type. Please select or drop a .bat or .cmd file.');
       onFileSelect(null);
     } else {
       onFileSelect(null); // Clear selection if no file
     }
   };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set dragging to false if leaving the target area itself, not children
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
        return;
    }
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
     // Optionally clear the file input if needed
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  }, [onFileSelect]); // Include onFileSelect dependency

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    // Enhanced styling for drop zone
    <div
      className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ease-in-out group relative focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-800
                  ${isDragging
                    ? 'border-teal-500 bg-teal-900/30 scale-105 shadow-inner'
                    : 'border-slate-600 hover:border-teal-600 bg-slate-700/30 hover:bg-slate-700/50'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput} // Trigger file input on click
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerFileInput(); }} // Accessibility
      tabIndex={0} // Make it focusable
      role="button"
      aria-label="File Upload Area"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".bat,.cmd" // Specify accepted file types
        className="sr-only" // Use sr-only for accessibility instead of hidden
        id="file-upload-input" // Connect label explicitly if needed elsewhere
        aria-labelledby="file-upload-label"
      />
      {/* Label content */}
       <div id="file-upload-label" className="flex flex-col items-center justify-center space-y-3 pointer-events-none"> {/* Prevent label intercepting clicks needed for div */}
         {/* Upload Icon */}
         <svg className={`w-12 h-12 sm:w-14 sm:h-14 mb-3 transition-colors ${isDragging ? 'text-teal-400 animate-pulse' : 'text-gray-500 group-hover:text-teal-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>

         {selectedFileName ? (
            <>
                <p className={`text-base sm:text-lg font-medium ${isDragging ? 'text-teal-300' : 'text-gray-200'}`}>
                    Selected: <span className="font-semibold text-teal-400">{selectedFileName}</span>
                </p>
                 <p className="text-xs sm:text-sm text-gray-400">(Click or drop again to change)</p>
            </>
         ) : (
            <>
                <p className={`text-base sm:text-lg font-medium ${isDragging ? 'text-teal-300' : 'text-gray-300 group-hover:text-gray-100'}`}>
                    {isDragging ? 'Drop the file here!' : 'Drag & drop script (.bat/.cmd)'}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 group-hover:text-gray-400">or click to browse</p>
            </>
         )}
      </div>
    </div>
  );
}

export default FileUpload;