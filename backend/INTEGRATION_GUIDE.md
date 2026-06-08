# Integration Guide: Insurance Upload Feature

## Backend Implementation ✅
- [x] Database table created: `insurance_documents`
- [x] 4 API endpoints added to server.js (lines 1551-1707)
- [x] File upload handling via multer (reuses existing uploads directory)
- [x] Audit logging integrated
- [x] Push notifications to preacher after upload

## Frontend Implementation Required

### 1. Import the Component
In your InvitationFlow.jsx or invitation detail page:

```jsx
import InsuranceUpload from '../components/InsuranceUpload';
```

### 2. Display Component Conditionally
Show the InsuranceUpload component only when:
- Invitation status is 'approved'
- Current user is the pastor who created the invitation
- The preacher has been assigned

```jsx
{invitation.status === 'approved' && 
 userRole === 'pastor' && 
 invitation.requesting_pastor_id === userId &&
 <InsuranceUpload 
   invitationId={invitation.id}
   preacherId={invitation.target_user_id}
   preacherName={invitation.target_name}
   onUploadSuccess={handleUploadSuccess}
 />
}
```

### 3. Add to Invitation Detail View
Recommended location: After the approval status is shown, add a new section:

```jsx
<div className="mt-6">
  <h3 className="text-lg font-bold mb-4">Next Steps</h3>
  
  {invitation.status === 'approved' ? (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800 font-medium">✅ Invitation Approved!</p>
        <p className="text-green-700 text-sm mt-1">
          The invitation is now confirmed. You can upload the preacher's insurance 
          documentation using the form below.
        </p>
      </div>
      
      <InsuranceUpload 
        invitationId={invitation.id}
        preacherId={invitation.target_user_id}
        preacherName={invitation.target_name}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  ) : (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-blue-800 text-sm">
        Insurance upload will be available after the invitation is approved 
        by the district pastor.
      </p>
      <p className="text-blue-700 text-sm font-medium mt-2">
        Current Status: {getStatusLabel(invitation.status)}
      </p>
    </div>
  )}
</div>
```

### 4. Expected User Workflow

Pastor's Perspective:
```
1. Create invitation → 2. Both secretaries approve → 
3. Preacher accepts → 4. District pastor approves →
5. [INSURANCE UPLOAD SECTION APPEARS] → 
6. Upload insurance document
7. Preacher receives notification
```

Preacher's Perspective:
```
1. Accepts invitation → 2. District pastor approves →
3. Receives notification: "Insurance Document Uploaded"
4. Can view insurance documents in their profile
```

### 5. Optional Enhancements

Add to the preacher's profile page:
```jsx
// View all insurance documents
<section className="mt-6">
  <h3 className="text-lg font-bold mb-4">📄 My Insurance Documents</h3>
  <div className="grid gap-4">
    {preacherInsurances.map(doc => (
      <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border">
        <h4>{doc.file_name}</h4>
        <p className="text-sm text-gray-600">Type: {doc.document_type}</p>
        <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
          View Document
        </a>
      </div>
    ))}
  </div>
</section>
```

## API Reference

### POST /api/insurance/upload
Uploads insurance document for an approved invitation

**Request:**
```
Headers: Authorization: Bearer {token}
Body: FormData
  - insurance_file: File (required)
  - invitation_id: number (required)
  - document_type: string (optional) - 'insurance' | 'health' | 'liability'
```

**Response:**
```json
{
  "id": 5,
  "message": "Insurance document uploaded successfully",
  "document_url": "/uploads/insurance_file-1234567890.pdf"
}
```

### GET /api/insurance/invitation/:id
Retrieves all insurance documents for an invitation

**Request:**
```
Headers: Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 5,
    "invitation_id": 42,
    "preacher_id": 10,
    "document_url": "/uploads/insurance_file-1234567890.pdf",
    "document_type": "insurance",
    "file_name": "insurance_cert.pdf",
    "uploaded_at": "2026-05-04T10:30:00Z"
  }
]
```

### GET /api/insurance/preacher/:id
Retrieves all insurance documents for a preacher

**Response:** Same as above but for all invitations of that preacher

### DELETE /api/insurance/:id
Deletes an insurance document

**Request:**
```
Headers: Authorization: Bearer {token}
```

## Testing the Feature

1. Start backend: `npm start` (in backend folder)
2. Create and approve an invitation
3. As pastor, navigate to approved invitation
4. Upload an insurance file (PDF/JPG/PNG/DOC)
5. Verify notification is sent to preacher
6. Check `/uploads` folder for file
7. Verify database entry in `insurance_documents` table

## Troubleshooting

**Issue: "Invitation not found or not yet approved"**
- Solution: Make sure invitation status is exactly 'approved' (check database)

**Issue: File upload fails**
- Check uploads folder has write permissions
- Check file size < 10MB
- Check file type is allowed (PDF, JPG, PNG, DOC)

**Issue: Component not showing**
- Verify user role is 'pastor'
- Verify they are the requesting_pastor_id of the invitation
- Verify invitation.status === 'approved'
