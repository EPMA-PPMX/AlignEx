import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

interface DocumentUploadProps {
  projectId: string;
  onUploadSuccess: () => void;
  onUploadError: (message: string) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ projectId, onUploadSuccess, onUploadError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files?.[0];
    if (!file || uploading) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/projects/${projectId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess();
    } catch (error: unknown) {
      onUploadError((error as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!uploading && fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        onClick={(e) => e.stopPropagation()}
        disabled={uploading}
        accept="*/*"
      />
      <button
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleButtonClick}
        disabled={uploading}
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading...' : 'Upload Document'}
      </button>
    </div>
  );
};

export default DocumentUpload;
