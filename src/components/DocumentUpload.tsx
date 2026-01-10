import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentUploadProps {
  projectId: string;
  onUploadSuccess: () => void;
  onUploadError: (message: string) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ projectId, onUploadSuccess, onUploadError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Immediately stop any propagation
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files?.[0];
    if (!file || uploading) {
      console.log('[DocumentUpload] No file selected or already uploading');
      return;
    }

    console.log('[DocumentUpload] File selected:', file.name);
    setUploading(true);

    try {

      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${projectId}/${fileName}`;

      console.log('[DocumentUpload] Uploading to storage...');
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      console.log('[DocumentUpload] Inserting database record...');
      const { error: insertError } = await supabase
        .from('project_documents')
        .insert([{
          project_id: projectId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type
        }]);

      if (insertError) {
        console.log('[DocumentUpload] Insert failed, cleaning up...');
        await supabase.storage
          .from('project-documents')
          .remove([filePath]);
        throw insertError;
      }

      console.log('[DocumentUpload] Upload successful!');

      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent of success
      onUploadSuccess();
    } catch (error: any) {
      console.error('[DocumentUpload] Upload failed:', error);
      onUploadError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      console.log('[DocumentUpload] Upload process complete');
    }
  };

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    console.log('[DocumentUpload] Button clicked');

    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
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
