import React from 'react';
import { Upload, Download, File, X } from 'lucide-react';

interface UploadedFile {
  fileName: string;
  path: string;
  fileSize: number;
  mimeType: string;
}

interface FileUploadProps {
  uploadedFiles: UploadedFile[];
  uploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (filePath: string) => void;
  downloadBaseUrl?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  uploadedFiles,
  uploading,
  onFileUpload,
  onRemoveFile,
  const downloadBaseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/download/change-request-attachment`;
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={onFileUpload}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip"
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            PDF, DOC, XLS, PPT, Images, ZIP (Max 10MB per file)
          </span>
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center space-x-3">
                <File className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {(file.fileSize / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={`${downloadBaseUrl}/${file.path}`}
                  download
                  className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.path)}
                  className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
