import React, { useState, useCallback, useRef } from 'react';
// FIX: ReportType was not exported from types.ts. Added it there to resolve this.
import { Project, DocumentFile, ReportType, ChatContext, Channel } from '../types';
import { generateReport } from '../services/geminiService';
import { UploadIcon, DocumentIcon, DeleteIcon, SpinnerIcon, QuoteIcon, XIcon, ExclamationIcon } from './Icons';
import { marked } from 'marked';
import { useAppContext } from '../context/AppContext';
import { useToast } from './ui/Toast';

// Helper function to format file size
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const DocumentUpload: React.FC<{ projectId: string; }> = ({ projectId }) => {
  const { uploadFilesToProject } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        await uploadFilesToProject(projectId, Array.from(event.target.files));
    }
  }, [projectId, uploadFilesToProject]);

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(dragging);
  };
  
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e, false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await uploadFilesToProject(projectId, Array.from(e.dataTransfer.files));
          e.dataTransfer.clearData();
      }
  }, [projectId, uploadFilesToProject]);

  return (
    <div className={`relative border-2 border-dashed rounded-apple-button-lg p-apple-base text-center transition-colors duration-300 ${isDragging ? 'border-apple-blue-light dark:border-apple-blue-dark bg-apple-blue-light/10 dark:bg-apple-blue-dark/10' : 'border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark hover:border-apple-blue-light dark:hover:border-apple-blue-dark'}`}
        onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDragOver={(e) => handleDragEvents(e, true)} onDrop={handleDrop}>
      <UploadIcon className="mx-auto h-10 w-10 text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark" />
      <p className="mt-apple-sm text-apple-body text-apple-label-secondary-light dark:text-apple-label-secondary-dark"><span className="font-sf-semibold text-apple-blue-light dark:text-apple-blue-dark">ファイルをアップロード</span>するか、ドラッグ＆ドロップ</p>
      <p className="text-apple-footnote text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark">TXT, PDF, DOCX, XLSX, PPTX (最大10MB)</p>
      <input type="file" id="file-upload" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".txt,.pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation" />
    </div>
  );
};

const DocumentList: React.FC<{ projectId: string; documents: DocumentFile[], onSelect: (doc: DocumentFile | null) => void, selectedDocId: string | null }> = ({ projectId, documents, onSelect, selectedDocId }) => {
    const { dispatch } = useAppContext();
    const handleDelete = (docId: string) => {
        dispatch({ type: 'DELETE_DOCUMENT', payload: { projectId, documentId: docId } });
    };
    return (
    <div className="mt-apple-base"><h3 className="text-apple-headline font-sf-semibold text-apple-label-light dark:text-apple-label-dark">アップロード済ドキュメント</h3>
        <div className="mt-apple-base space-y-apple-sm max-h-60 overflow-y-auto pr-2">
            {documents.length === 0 ? <p className="text-apple-body text-apple-label-secondary-light dark:text-apple-label-secondary-dark">ドキュメントがありません。</p> : documents.map(doc => (
                <div key={doc.id} className={`flex items-center justify-between rounded-apple-button transition-colors duration-200 motion-reduce:transition-none ${selectedDocId === doc.id ? 'bg-apple-blue-light dark:bg-apple-blue-dark text-white' : 'bg-white/50 dark:bg-black/50'}`}>
                     <button type="button" disabled={doc.status !== 'ready'} className={`flex items-center min-w-0 p-apple-md w-full text-left ${doc.status === 'ready' ? 'cursor-pointer hover:bg-white/70 dark:hover:bg-black/70' : 'cursor-wait'}`}
                     onClick={() => onSelect(doc)}>
                        <DocumentIcon className="h-6 w-6 text-apple-blue-light dark:text-apple-blue-dark flex-shrink-0" />
                        <div className="ml-apple-md min-w-0">
                            <p className={`text-apple-body font-sf-medium ${selectedDocId === doc.id ? 'text-white' : 'text-apple-label-light dark:text-apple-label-dark'}`}>{doc.name}</p>
                            <div className={`flex items-center gap-x-2 ${selectedDocId === doc.id ? 'text-white/80' : 'text-apple-label-secondary-light dark:text-apple-label-secondary-dark'} text-apple-footnote`}>
                                <span>{formatBytes(doc.size)}</span>
                                <span>-</span>
                                <span>{doc.status === 'scanning' ? 'スキャン中...' : doc.uploadDate.toLocaleDateString()}</span>
                                {doc.exceedsTokenLimit && <div title={`ファイルが長すぎます (${doc.estimatedTokens?.toLocaleString()} トークン)。AIのコンテキスト制限を超える可能性があります。`}><ExclamationIcon className="w-4 h-4 text-apple-orange-light dark:text-apple-orange-dark"/></div>}
                            </div>
                        </div>
                    </button>
                    <div className="flex items-center pr-apple-md">
                        {doc.status === 'scanning' && <SpinnerIcon className="h-5 w-5 text-apple-blue-light dark:text-apple-blue-dark" />}
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); onSelect(null); }} className={`p-1 ml-apple-sm transition-colors duration-200 motion-reduce:transition-none ${selectedDocId === doc.id ? 'text-white/70 hover:text-white' : 'text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark hover:text-apple-red-light dark:hover:text-apple-red-dark'}`} aria-label={`${doc.name}を削除`}>
                          <DeleteIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
)};

const ReportGenerator: React.FC<{ selectedDocument: DocumentFile | null }> = ({ selectedDocument }) => {
    const [reportType, setReportType] = useState<ReportType>(ReportType.CorporateSummary);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<{ report: string; fromCache: boolean } | null>(null);

    // Check if the document has processable content.
    const hasContent = selectedDocument?.content !== null && selectedDocument?.content !== undefined;

    const handleGenerateReport = async () => {
        if (!selectedDocument || !selectedDocument.content) return;
        setIsLoading(true);
        setGeneratedReport(null);
        // FIX: The `generateReport` function expects only one argument (the document content).
        const result = await generateReport(selectedDocument.content);
        // FIX: The state `generatedReport` expects an object, not a string. Wrap the result.
        setGeneratedReport({ report: result, fromCache: false });
        setIsLoading(false);
    };

    if (!selectedDocument) {
        return <div className="text-center text-apple-label-secondary-light dark:text-apple-label-secondary-dark p-apple-xl">ドキュメントを選択してレポートを生成してください。</div>;
    }

    return (
        <div className="space-y-apple-base">
            <div>
                <label htmlFor="reportType" className="block text-apple-body font-sf-medium text-apple-label-light dark:text-apple-label-dark mb-apple-sm">レポートタイプを選択</label>
                <select id="reportType" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="w-full bg-white/50 dark:bg-black/50 border border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark rounded-apple-field p-apple-sm text-apple-label-light dark:text-apple-label-dark focus:ring-2 focus:ring-apple-blue-light dark:focus:ring-apple-blue-dark focus:border-apple-blue-light dark:focus:border-apple-blue-dark transition-colors motion-reduce:transition-none">
                    {/* FIX: This was causing errors because ReportType was not defined. It is now defined in types.ts. */}
                    {Object.values(ReportType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            <button onClick={handleGenerateReport} disabled={isLoading || !hasContent}
                className="w-full flex justify-center items-center px-apple-base py-apple-sm text-apple-body font-sf-medium rounded-apple-button min-h-touch text-white bg-apple-blue-light dark:bg-apple-blue-dark hover:brightness-110 disabled:bg-apple-gray5 disabled:text-apple-label-tertiary-light dark:disabled:text-apple-label-tertiary-dark disabled:cursor-not-allowed transition-all duration-200 transform active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none">
                {isLoading ? <><SpinnerIcon className="w-5 h-5 mr-apple-sm" /> 生成中...</> : 'レポートを生成'}
            </button>
            {!hasContent && (
                <p className="text-apple-footnote text-center text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark mt-apple-sm">
                    レポート生成はテキストベースのファイル（.txtなど）でのみ利用可能です。
                </p>
            )}
            {generatedReport && (
                <div className="mt-apple-base p-apple-base bg-white/50 dark:bg-black/50 rounded-apple-button-lg border border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark">
                    <h4 className="text-apple-headline font-sf-semibold text-apple-label-light dark:text-apple-label-dark flex items-center">
                        生成されたレポート 
                        {generatedReport.fromCache && <span className="ml-apple-sm text-apple-caption-1 font-sf-regular bg-apple-green-light/50 dark:bg-apple-green-dark/50 text-apple-label-light dark:text-apple-label-dark px-2 py-0.5 rounded-apple-capsule">(キャッシュ済み)</span>}
                    </h4>
                    <div className="prose prose-sm max-w-none mt-apple-sm max-h-80 overflow-y-auto dark:prose-invert" dangerouslySetInnerHTML={{ __html: marked(generatedReport.report) }}></div>
                </div>
            )}
        </div>
    );
};

const DocumentViewer: React.FC<{ document: DocumentFile; onSetContext: (context: ChatContext) => void }> = ({ document, onSetContext }) => {
    const [selectedText, setSelectedText] = useState('');
    const preRef = useRef<HTMLPreElement>(null);

    const handleSelection = () => {
        const text = window.getSelection()?.toString() || '';
        if (text.trim().length > 0) {
            setSelectedText(text);
        } else {
            setSelectedText('');
        }
    };

    if (document.content === null) {
        return (
            <div className="space-y-apple-base h-full flex flex-col">
                <div className="flex-grow flex flex-col items-center justify-center text-center text-apple-label-light dark:text-apple-label-dark bg-white/60 dark:bg-black/50 p-apple-md rounded-apple-button-lg border border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark">
                    <DocumentIcon className="w-16 h-16 text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark mb-apple-base" />
                    <h4 className="font-sf-semibold text-apple-headline">{document.name}</h4>
                    <p className="text-apple-body text-apple-label-secondary-light dark:text-apple-label-secondary-dark mt-apple-xs">このファイル形式のプレビューはサポートされていません。</p>
                </div>
                <div className="flex-shrink-0">
                    <button onClick={() => onSetContext({ document })}
                        className="w-full min-h-touch flex items-center justify-center px-apple-md py-apple-sm text-apple-body font-sf-medium text-apple-label-light dark:text-apple-label-dark bg-transparent border border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark rounded-apple-button hover:bg-white/50 dark:hover:bg-black/50 transition-colors duration-200 motion-reduce:transition-none">
                        <DocumentIcon className="w-5 h-5 mr-apple-sm" />
                        ドキュメント全体をコンテキストとして設定
                    </button>
                </div>
            </div>
        )
    }
    
    return (
        <div className="space-y-apple-base h-full flex flex-col">
            <pre ref={preRef} onMouseUp={handleSelection} onDoubleClick={handleSelection}
                 className="flex-grow text-apple-body text-apple-label-light dark:text-apple-label-dark bg-white/60 dark:bg-black/50 p-apple-md rounded-apple-button-lg max-h-[calc(100%-8rem)] overflow-y-auto whitespace-pre-wrap break-words selection:bg-apple-blue-light dark:selection:bg-apple-blue-dark selection:text-white border border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark">
                {document.content || "コンテンツがありません。"}
            </pre>
            <div className="flex-shrink-0 space-y-apple-sm">
                {selectedText && (
                    <button onClick={() => onSetContext({ document, snippet: selectedText })}
                        className="w-full min-h-touch flex items-center justify-center px-apple-md py-apple-sm text-apple-body font-sf-medium text-white bg-apple-blue-light dark:bg-apple-blue-dark rounded-apple-button hover:brightness-110 transition-all duration-200 transform active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none">
                        <QuoteIcon className="w-5 h-5 mr-apple-sm" />
                        選択範囲をコンテキストに設定
                    </button>
                )}
                <button onClick={() => onSetContext({ document })}
                    className="w-full min-h-touch flex items-center justify-center px-apple-md py-apple-sm text-apple-body font-sf-medium text-apple-label-light dark:text-apple-label-dark bg-transparent border border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark rounded-apple-button hover:bg-white/50 dark:hover:bg-black/50 transition-colors duration-200 motion-reduce:transition-none">
                    <DocumentIcon className="w-5 h-5 mr-apple-sm" />
                    ドキュメント全体をコンテキストとして設定
                </button>
            </div>
        </div>
    );
};

interface DocumentManagerProps {
    project: Project;
    // FIX: Renamed activeChatId to activeChannelId for clarity and consistency.
    activeChannelId: string | null;
    onClose: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ project, activeChannelId, onClose }) => {
    const { dispatch } = useAppContext();
    const { showToast } = useToast();
    const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
    const [activeTab, setActiveTab] = useState<'report' | 'viewer'>('report');

    const setChatContext = (context: ChatContext | null) => {
        if (!activeChannelId) {
            showToast('warning', 'コンテキストを設定するチャットが選択されていません');
            return;
        }
        dispatch({
            type: 'SET_CHAT_CONTEXT',
            // FIX: Use channelId to align with the new state structure.
            payload: { projectId: project.id, channelId: activeChannelId, context }
        });
        showToast('success', `コンテキストを設定しました: ${context?.snippet ? '抜粋' : 'ドキュメント全体'}`);
    };
    
    return (
        <div role="dialog" aria-modal="true" aria-labelledby="doc-manager-title" className="fixed inset-0 bg-black/30 dark:bg-apple-bg-tertiary-dark/70 backdrop-blur-md z-50 flex items-center justify-center p-apple-base">
            <div className="bg-white/92 dark:bg-black/85 backdrop-blur-2xl w-full max-w-4xl h-[90vh] rounded-apple-card border-2 border-white/30 dark:border-white/20 flex flex-col shadow-2xl">
                <header className="flex-shrink-0 flex justify-between items-center p-apple-base border-b border-white/20 dark:border-white/10">
                    {/* FIX: Project type uses 'companyName', not 'name'. */}
                    <h2 id="doc-manager-title" className="text-apple-title-3 font-sf-bold text-apple-label-light dark:text-apple-label-dark">引用ファイル: {project.companyName}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark hover:bg-white/50 dark:hover:bg-black/50 hover:text-apple-label-light dark:hover:text-apple-label-dark transition-colors motion-reduce:transition-none" aria-label="閉じる">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-1 p-apple-lg grid grid-cols-1 md:grid-cols-2 gap-apple-lg overflow-hidden">
                    <div className="flex flex-col gap-apple-lg overflow-y-auto pr-2">
                         <div className="p-apple-base bg-white/70 dark:bg-black/60 backdrop-blur-md rounded-apple-card border-2 border-white/40 dark:border-white/30 shadow-md"><h3 className="text-apple-title-3 font-sf-semibold mb-apple-base text-apple-label-light dark:text-apple-label-dark">ドキュメント管理</h3><DocumentUpload projectId={project.id} /><DocumentList projectId={project.id} documents={project.documents} onSelect={setSelectedDocument} selectedDocId={selectedDocument?.id || null} /></div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                       <div className="flex-grow p-apple-base bg-white/70 dark:bg-black/60 backdrop-blur-md rounded-apple-card border-2 border-white/40 dark:border-white/30 shadow-md flex flex-col min-h-0">
                            <div role="tablist" aria-label="ドキュメント機能" className="border-b border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark mb-apple-base flex-shrink-0">
                                <nav className="-mb-px flex space-x-apple-lg">
                                  <button role="tab" id="tab-report" aria-controls="tabpanel-report" aria-selected={activeTab === 'report'} onClick={() => setActiveTab('report')} className={`whitespace-nowrap py-apple-md px-1 border-b-2 font-sf-medium text-apple-body transition-colors motion-reduce:transition-none ${activeTab==='report' ? 'border-apple-blue-light dark:border-apple-blue-dark text-apple-blue-light dark:text-apple-blue-dark' : 'border-transparent text-apple-label-secondary-light dark:text-apple-label-secondary-dark hover:text-apple-label-light dark:hover:text-apple-label-dark hover:border-apple-label-tertiary-light dark:hover:border-apple-label-tertiary-dark'}`}>レポート生成</button>
                                  <button role="tab" id="tab-viewer" aria-controls="tabpanel-viewer" aria-selected={activeTab === 'viewer'} onClick={() => setActiveTab('viewer')} disabled={!selectedDocument} className={`whitespace-nowrap py-apple-md px-1 border-b-2 font-sf-medium text-apple-body transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:text-apple-label-quaternary-light dark:disabled:text-apple-label-quaternary-dark ${activeTab==='viewer' ? 'border-apple-blue-light dark:border-apple-blue-dark text-apple-blue-light dark:text-apple-blue-dark' : 'border-transparent text-apple-label-secondary-light dark:text-apple-label-secondary-dark hover:text-apple-label-light dark:hover:text-apple-label-dark hover:border-apple-label-tertiary-light dark:hover:border-apple-label-tertiary-dark'}`}>ドキュメントビューア</button>
                                </nav>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                                <div role="tabpanel" id="tabpanel-report" aria-labelledby="tab-report" hidden={activeTab !== 'report'}>
                                    <h3 className="text-apple-title-3 font-sf-semibold mb-apple-base text-apple-label-light dark:text-apple-label-dark">レポート生成</h3>
                                    <ReportGenerator selectedDocument={selectedDocument} />
                                </div>
                                <div role="tabpanel" id="tabpanel-viewer" aria-labelledby="tab-viewer" hidden={activeTab !== 'viewer'}>
                                    {selectedDocument && (<><h3 className="text-apple-title-3 font-sf-semibold mb-apple-base text-apple-label-light dark:text-apple-label-dark truncate">表示中: {selectedDocument.name}</h3><DocumentViewer document={selectedDocument} onSetContext={setChatContext} /></>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};