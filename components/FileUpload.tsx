/**
 * File Upload Component
 *
 * Provides drag & drop file upload with:
 * - PDF/DOCX file validation
 * - Upload progress tracking
 * - Real-time status updates
 * - Error handling
 * - Apple HIG design compliance
 */

import React, { useState, useCallback, useRef } from 'react';
import { getStorage, ref, uploadBytesResumable, UploadTaskSnapshot } from 'firebase/storage';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  uploadedAt?: Date;
}

interface FileUploadProps {
  projectId: string;
  userId: string;
  onUploadComplete?: (documentId: string) => void;
  onUploadError?: (error: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const FileUpload: React.FC<FileUploadProps> = ({
  projectId,
  userId,
  onUploadComplete,
  onUploadError,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storage = getStorage();
  const db = getFirestore();

  /**
   * Validates file before upload
   */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'PDFまたはDOCXファイルのみアップロード可能です。',
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'ファイルサイズは5MB以下である必要があります。',
      };
    }

    return { valid: true };
  }, []);

  /**
   * Uploads file to Firebase Storage and creates Firestore document
   */
  const uploadFile = useCallback(
    async (file: File) => {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        onUploadError?.(validation.error!);
        return;
      }

      try {
        // Create document metadata in Firestore
        const documentRef = await addDoc(collection(db, 'documents'), {
          projectId,
          filename: file.name,
          originalName: file.name,
          contentType: file.type,
          size: file.size,
          uploadedBy: userId,
          uploadedAt: serverTimestamp(),
          status: 'uploading',
        });

        const documentId = documentRef.id;

        // Add to local state
        const uploadedFile: UploadedFile = {
          id: documentId,
          name: file.name,
          size: file.size,
          status: 'uploading',
          progress: 0,
        };

        setFiles((prev) => [...prev, uploadedFile]);

        // Upload to Storage
        const storageRef = ref(storage, `documents/${projectId}/${documentId}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Track upload progress
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

            setFiles((prev) =>
              prev.map((f) =>
                f.id === documentId ? { ...f, progress: Math.round(progress) } : f
              )
            );
          },
          (error) => {
            // Upload error
            console.error('Upload error:', error);

            setFiles((prev) =>
              prev.map((f) =>
                f.id === documentId
                  ? { ...f, status: 'failed', error: 'アップロードに失敗しました。' }
                  : f
              )
            );

            onUploadError?.('アップロードに失敗しました。');
          },
          () => {
            // Upload complete - now monitor Firestore for processing status
            const unsubscribe = onSnapshot(documentRef, (doc) => {
              const data = doc.data();

              if (data) {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === documentId
                      ? {
                          ...f,
                          status: data.status,
                          error: data.errorMessage,
                          uploadedAt: data.uploadedAt?.toDate(),
                        }
                      : f
                  )
                );

                if (data.status === 'completed') {
                  onUploadComplete?.(documentId);
                  unsubscribe();
                } else if (data.status === 'failed') {
                  onUploadError?.(data.errorMessage || '処理に失敗しました。');
                  unsubscribe();
                }
              }
            });
          }
        );
      } catch (error) {
        console.error('File upload error:', error);
        onUploadError?.('ファイルのアップロードに失敗しました。');
      }
    },
    [projectId, userId, storage, db, validateFile, onUploadComplete, onUploadError]
  );

  /**
   * Handle drag & drop events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach((file) => uploadFile(file));
    },
    [uploadFile]
  );

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      selectedFiles.forEach((file) => uploadFile(file));

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadFile]
  );

  /**
   * Trigger file input click
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Get status badge color
   */
  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get status label
   */
  const getStatusLabel = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'アップロード中';
      case 'processing':
        return '処理中';
      case 'completed':
        return '完了';
      case 'failed':
        return '失敗';
      default:
        return '不明';
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`
          relative rounded-2xl border-2 border-dashed p-12 text-center transition-all
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          {/* Upload Icon */}
          <div className="rounded-full bg-gray-100 p-4">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Instructions */}
          <div>
            <p className="text-lg font-medium text-gray-900">
              ファイルをドラッグ&ドロップ
            </p>
            <p className="text-sm text-gray-500">または、クリックしてファイルを選択</p>
          </div>

          {/* File Type Info */}
          <div className="text-xs text-gray-500">
            <p>対応形式: PDF, DOCX</p>
            <p>最大サイズ: 5MB</p>
          </div>
        </div>
      </div>

      {/* Upload List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">アップロードファイル</h3>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  {/* File Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                          file.status
                        )}`}
                      >
                        {getStatusLabel(file.status)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>

                    {/* Progress Bar */}
                    {(file.status === 'uploading' || file.status === 'processing') && (
                      <div className="w-full">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{
                              width: `${file.status === 'uploading' ? file.progress : 100}%`,
                            }}
                          />
                        </div>
                        {file.status === 'uploading' && (
                          <p className="mt-1 text-xs text-gray-500">{file.progress}%</p>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {file.status === 'failed' && file.error && (
                      <p className="text-sm text-red-600">{file.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
