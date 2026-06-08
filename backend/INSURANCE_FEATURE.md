# Insurance Upload Feature - Implementation Summary

## What's Been Added

### 1. Database Table: `insurance_documents`
Stores insurance documents uploaded by pastors after invitation approval.

Columns:
- `id`: Primary key
- `invitation_id`: Reference to the approved invitation
- `preacher_id`: The preacher the insurance is for
- `uploaded_by_pastor_id`: Pastor who uploaded the insurance
- `document_url`: Path to uploaded file
- `document_type`: Type (insurance, health, liability)
- `file_name`: Original filename
- `uploaded_at`: Upload timestamp

### 2. API Endpoints

#### POST /api/insurance/upload
**Upload insurance document after invitation approved**
- Requirements: Must be a pastor role, invitation must be in 'approved' status
- Body: FormData with file (`insurance_file`) and `invitation_id`, optional `document_type`
- Response: Document ID and URL

#### GET /api/insurance/invitation/:id
**Get all insurance documents for an invitation**
- Accessible by: Pastor who invited, preacher, relevant secretaries, admins
- Returns: Array of insurance documents with details

#### GET /api/insurance/preacher/:id
**Get all insurance documents for a specific preacher**
- Accessible by: The preacher, relevant secretaries, admins
- Returns: Array of all insurance documents across invitations

#### DELETE /api/insurance/:id
**Delete an insurance document**
- Requirements: Must be the pastor who uploaded or admin
- Response: Confirmation message

### 3. Features
- ✅ Only pastors can upload insurance documents
- ✅ Can only upload AFTER invitation is approved (status = 'approved')
- ✅ Audit logging of all uploads and deletions
- ✅ Notification sent to preacher when insurance is uploaded
- ✅ Role-based access control for viewing documents
- ✅ File storage in `/uploads` directory via multer

### 4. Workflow
1. Pastor invites preacher
2. Both secretaries approve
3. Preacher accepts
4. District pastor approves → Status becomes 'approved'
5. Pastor can now upload insurance document via POST /api/insurance/upload
6. Preacher receives notification
7. All parties can view/access insurance documentation

## Frontend Integration Needed

The frontend should:
1. Show an "Upload Insurance" button on invitation detail page when status = 'approved'
2. Have a file input (PDF, image, or document files)
3. POST to /api/insurance/upload with FormData
4. Display uploaded insurance documents in a list
5. Allow deletion if user has permission

See InsuranceUpload.jsx example component for implementation.

## Database Schema Verification
Table successfully created in piscs.db
