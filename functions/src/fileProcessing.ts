/**
 * File Processing Cloud Functions
 *
 * Handles uploaded PDF/DOCX files:
 * 1. Validates file on upload
 * 2. Extracts text content
 * 3. Chunks text into manageable pieces
 * 4. Generates embeddings with Voyage AI
 * 5. Stores in knowledge base with deduplication
 */

import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, storage, COLLECTIONS, logError, serverTimestamp } from './config/firebase';
import { extractTextFromPDF } from './services/pdfExtractor';
import { extractTextFromDOCX } from './services/docxExtractor';
import { chunkText } from './services/textChunker';
import { generateEmbeddings } from './services/embeddingService';
import { detectDuplicates } from './services/deduplicationService';
import type { Document, DocumentStatus, FileProcessingResult } from './types';

/**
 * Validates uploaded file
 */
function validateFile(file: any): { valid: boolean; error?: string } {
  const metadata = file.metadata;

  // Check content type
  const validContentTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!metadata.contentType || !validContentTypes.includes(metadata.contentType)) {
    return {
      valid: false,
      error: `無効なファイル形式です。PDFまたはDOCXファイルのみアップロード可能です。`,
    };
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (metadata.size && parseInt(metadata.size) > maxSize) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。最大5MBまでアップロード可能です。`,
    };
  }

  return { valid: true };
}

/**
 * Updates document status in Firestore
 */
async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  additionalData?: Partial<Document>
): Promise<void> {
  await db.collection(COLLECTIONS.DOCUMENTS).doc(documentId).update({
    status,
    ...additionalData,
  });
}

/**
 * Main file processing function
 * Triggered when a file is uploaded to Storage
 */
export const processFileUpload = onObjectFinalized(
  {
    timeoutSeconds: 540, // 9 minutes
    memory: '2GiB',
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;

    // Only process files in the documents/ path
    if (!filePath || !filePath.startsWith('documents/')) {
      console.log(`Ignoring file: ${filePath}`);
      return null;
    }

    // Parse file path: documents/{projectId}/{documentId}
    const pathParts = filePath.split('/');
    if (pathParts.length !== 3) {
      console.error(`Invalid file path structure: ${filePath}`);
      return null;
    }

    const projectId = pathParts[1];
    const documentId = pathParts[2];

    console.log(`Processing file upload: ${filePath}`, {
      projectId,
      documentId,
      contentType,
    });

    try {
      // Get file from Storage
      const file = storage.bucket(object.bucket).file(filePath);

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        await updateDocumentStatus(documentId, 'failed', {
          errorMessage: validation.error,
        });
        return null;
      }

      // Update status to processing
      await updateDocumentStatus(documentId, 'processing');

      // Extract text based on content type
      let extractedText: string;

      if (contentType === 'application/pdf') {
        extractedText = await extractTextFromPDF(file);
      } else if (
        contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        extractedText = await extractTextFromDOCX(file);
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      console.log(`Text extracted: ${extractedText.length} characters`);

      // Save extracted text to Storage
      const processedTextPath = `processed/${projectId}/${documentId}/text.txt`;
      const processedTextFile = storage.bucket().file(processedTextPath);
      await processedTextFile.save(extractedText, {
        contentType: 'text/plain',
        metadata: {
          originalFile: filePath,
        },
      });

      // Chunk the text
      const chunks = await chunkText(extractedText, {
        maxChunkSize: 500, // tokens
        overlapSize: 50, // tokens
        minChunkSize: 100, // tokens
      });

      console.log(`Text chunked into ${chunks.length} pieces`);

      // Generate embeddings for chunks
      const chunkTexts = chunks.map((chunk) => chunk.content);
      const embeddings = await generateEmbeddings(chunkTexts, 'document');

      console.log(`Generated ${embeddings.length} embeddings`);

      // Store chunks as knowledge entries
      const knowledgeIds: string[] = [];
      const batch = db.batch();

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        const knowledgeRef = db.collection(COLLECTIONS.KNOWLEDGE).doc();
        batch.set(knowledgeRef, {
          projectId,
          content: chunk.content,
          source: 'document',
          sourceId: documentId,
          embedding,
          metadata: {
            documentName: object.name,
            chunkIndex: i,
            extractedAt: serverTimestamp(),
            tokenCount: chunk.tokenCount,
          },
          createdBy: 'system',
          createdAt: serverTimestamp(),
        });

        knowledgeIds.push(knowledgeRef.id);
      }

      await batch.commit();

      console.log(`Stored ${knowledgeIds.length} knowledge entries`);

      // Run deduplication
      const duplicatesFound = await detectDuplicates(projectId, knowledgeIds);

      console.log(`Deduplication complete: ${duplicatesFound} duplicates found`);

      // Update document status to completed
      await updateDocumentStatus(documentId, 'completed', {
        processedTextUrl: processedTextPath,
        extractedText: extractedText.substring(0, 1000), // Store first 1000 chars
        chunks: chunks.map((chunk) => ({
          chunkId: chunk.chunkId,
          content: chunk.content.substring(0, 200), // Store preview
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          tokenCount: chunk.tokenCount,
        })),
      });

      const result: FileProcessingResult = {
        success: true,
        documentId,
        extractedText: extractedText.substring(0, 200),
        chunkCount: chunks.length,
        embeddingCount: embeddings.length,
        knowledgeIds,
        duplicatesFound,
      };

      console.log('File processing completed successfully', result);

      return result;
    } catch (error) {
      console.error('File processing failed', error);

      // Update document status to failed
      await updateDocumentStatus(documentId, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Log error to Firestore
      await logError({
        projectId,
        errorType: 'api_error',
        errorMessage: `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stackTrace: error instanceof Error ? error.stack : undefined,
        context: {
          filePath,
          documentId,
          contentType,
        },
      });

      return null;
    }
  });

/**
 * HTTP endpoint for manual file processing trigger
 * Useful for reprocessing failed documents
 */
export const reprocessDocument = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証が必要です。');
    }

    const { documentId } = request.data;

    if (!documentId) {
      throw new HttpsError('invalid-argument', 'documentIdは必須です。');
    }

    try {
      // Get document from Firestore
      const docSnapshot = await db.collection(COLLECTIONS.DOCUMENTS).doc(documentId).get();

      if (!docSnapshot.exists) {
        throw new HttpsError('not-found', 'ドキュメントが見つかりません。');
      }

      // Trigger reprocessing by updating status
      await updateDocumentStatus(documentId, 'processing');

      console.log(`Manual reprocessing triggered for document: ${documentId}`);

      return {
        success: true,
        message: '再処理を開始しました。',
        documentId,
      };
    } catch (error) {
      console.error('Reprocessing trigger failed', error);

      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : '再処理の開始に失敗しました。'
      );
    }
  }
);
