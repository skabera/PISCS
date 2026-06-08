import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000';

/**
 * InsuranceUpload Component
 *
 * Allows pastors to upload insurance documents for preachers after invitation is approved.
 * Include in your invitation detail view when status='approved' and user role is 'pastor'.
 */
export default function InsuranceUpload({ invitationId, preacherId, preacherName, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('insurance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documents, setDocuments] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchInsuranceDocuments();
  }, [invitationId]);

  // Clean up object URL when file changes
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const fetchInsuranceDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/insurance/invitation/${invitationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) setDocuments(await response.json());
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');
    setPreviewUrl(null);

    if (!selectedFile) { setFile(null); return; }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      setFile(null);
      return;
    }

    const validTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Only PDF, images (JPG/PNG/GIF/WEBP), and Word documents are allowed');
      setFile(null);
      return;
    }

    setFile(selectedFile);

    // Generate a local preview for images
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('insurance_file', file);
      formData.append('invitation_id', invitationId);
      formData.append('document_type', documentType);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/insurance/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('✅ Insurance document uploaded successfully!');
        setFile(null);
        setPreviewUrl(null);
        setDocumentType('insurance');
        const input = document.getElementById('fileInput');
        if (input) input.value = '';
        fetchInsuranceDocuments();
        if (onUploadSuccess) onUploadSuccess(result);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/insurance/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSuccess('Document deleted successfully');
        fetchInsuranceDocuments();
      } else {
        setError('Failed to delete document');
      }
    } catch (err) {
      setError('Delete error: ' + err.message);
    }
  };

  const resolveUrl = (url) =>
    !url ? '#' : url.startsWith('http') ? url : `${API_BASE}${url}`;

  const isImageFile = (fileName) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName || '');

  const getDocLabel = (type) => {
    const map = { insurance: 'Insurance Certificate', health: 'Health Report', liability: 'Liability Coverage' };
    return map[type] || type;
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return '📄';
    if (isImageFile(fileName)) return '🖼️';
    if (/\.pdf$/i.test(fileName)) return '📋';
    if (/\.docx?$/i.test(fileName)) return '📝';
    return '📄';
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        📄 Insurance Documentation
        {preacherName && <span className="text-sm font-normal text-gray-500">— {preacherName}</span>}
      </h3>

      {/* ── Upload Form ── */}
      <form onSubmit={handleUpload} className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Document Type</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="insurance">Insurance Certificate</option>
            <option value="health">Health Report</option>
            <option value="liability">Liability Coverage</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Upload File <span className="font-normal text-gray-400">(PDF, JPG, PNG, DOC · max 10 MB)</span>
          </label>
          <input
            id="fileInput"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition"
          />
          {file && (
            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
              ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}

          {/* Local image preview before upload */}
          {previewUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-blue-100 bg-white max-h-48">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-100">{error}</div>}
        {success && <div className="text-green-700 text-sm p-3 bg-green-50 rounded-lg border border-green-100">{success}</div>}

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition"
        >
          {loading ? 'Uploading…' : 'Upload Document'}
        </button>
      </form>

      {/* ── Uploaded Documents List ── */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3">
          Uploaded Documents {documents.length > 0 && <span className="ml-1 text-blue-600">({documents.length})</span>}
        </h4>

        {documents.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No insurance documents uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const fileUrl = resolveUrl(doc.document_url);
              const isImg = isImageFile(doc.file_name);

              return (
                <div key={doc.id} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  {/* Image preview */}
                  {isImg && (
                    <div className="w-full max-h-52 overflow-hidden bg-white border-b border-gray-200">
                      <img
                        src={fileUrl}
                        alt={doc.file_name}
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{getFileIcon(doc.file_name)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{doc.file_name || 'Document'}</p>
                        <p className="text-xs text-gray-500">
                          {getDocLabel(doc.document_type)} · {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* View — opens in new tab */}
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition"
                      >
                        View
                      </a>

                      {/* Download — forces download */}
                      <a
                        href={fileUrl}
                        download={doc.file_name || 'document'}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Download
                      </a>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}