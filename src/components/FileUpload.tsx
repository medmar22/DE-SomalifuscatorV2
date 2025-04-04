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
    onFileSelect(file || null);
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.bat') || file.name.endsWith('.cmd'))) {
       onFileSelect(file);
       // Optionally clear the file input if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    } else {
        alert('Please drop a .bat or .cmd file.'); // Simple feedback
        onFileSelect(null);
    }
  }, [onFileSelect]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ease-in-out
                  ${isDragging ? 'border-teal-500 bg-gray-700' : 'border-gray-600 hover:border-teal-600 bg-gray-700/50 hover:bg-gray-700/80'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".bat,.cmd"
        className="hidden" // Hide the default input
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center justify-center">
           {/* Simple Upload Icon */}
           <svg className={`w-12 h-12 mb-3 ${isDragging ? 'text-teal-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
           <p className={`text-lg font-semibold ${isDragging ? 'text-teal-300' : 'text-gray-300'}`}>
             {selectedFileName ? `Selected: ${selectedFileName}` : 'Drag & drop a .bat/.cmd file here'}
           </p>
           <p className="text-sm text-gray-500">or click to select</p>
        </div>
      </label>
    </div>
  );
}

export default FileUpload;