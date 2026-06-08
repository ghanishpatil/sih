/**
 * ChatFileUpload — WhatsApp-style file attachment for chat.
 * Supports: images, PDFs, PPTs, DOCs, Excel, plain text
 * Max: 35 MB per file
 * NOT allowed: videos
 *
 * Usage:
 *   <ChatFileUpload teamId={teamId} storagePath="chatFiles" onUploaded={handleFileUrl} />
 */

import { useRef, useState } from 'react'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { storage } from '@/firebase/client.js'

const MAX_FILE_BYTES = 35 * 1024 * 1024 // 35 MB

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

const ACCEPT_STRING = [
  'image/*',
  '.pdf',
  '.ppt,.pptx',
  '.doc,.docx',
  '.xls,.xlsx',
  '.txt',
].join(',')

function isAllowedType(file) {
  if (!file) return false
  // Check against allowlist
  if (ALLOWED_TYPES.includes(file.type)) return true
  // Also allow any image/* type
  if (file.type.startsWith('image/')) return true
  return false
}

function isVideo(file) {
  return file?.type?.startsWith('video/')
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type) {
  if (type?.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />
  return <FileText className="h-4 w-4 text-red-500" />
}

/**
 * @param {Object} props
 * @param {string} props.teamId - Team ID for storage path
 * @param {string} props.storagePath - 'chatFiles' or 'mentorChatFiles'
 * @param {(file: {url: string, name: string, type: string, size: number}) => void} props.onUploaded
 * @param {boolean} [props.disabled]
 */
export function ChatFileUpload({ teamId, storagePath = 'chatFiles', onUploaded, disabled = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null) // { file, objectUrl }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting same file
    if (!file) return

    setError('')

    if (isVideo(file)) {
      setError('Videos are not allowed in chat. Share a link instead.')
      return
    }

    if (!isAllowedType(file)) {
      setError('File type not supported. Allowed: images, PDF, PPT, DOC, Excel, text.')
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setError(`File too large (${humanSize(file.size)}). Maximum is 35 MB.`)
      return
    }

    // Show preview for images, just filename for others
    const objectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setPreview({ file, objectUrl })
  }

  function cancelPreview() {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl)
    setPreview(null)
    setError('')
  }

  async function upload() {
    if (!preview?.file || !storage || !teamId) return
    setUploading(true)
    setProgress(0)
    setError('')

    const file = preview.file
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
    const path = `${storagePath}/${teamId}/${timestamp}_${safeName}`
    const storageRef = ref(storage, path)

    const task = uploadBytesResumable(storageRef, file)
    task.on(
      'state_changed',
      (snap) => setProgress(Math.round((100 * snap.bytesTransferred) / snap.totalBytes)),
      (err) => {
        setError(err.message || 'Upload failed.')
        setUploading(false)
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          onUploaded({ url, name: file.name, type: file.type, size: file.size })
          cancelPreview()
        } catch (err) {
          setError(err.message || 'Could not get download URL.')
        } finally {
          setUploading(false)
          setProgress(0)
        }
      },
    )
  }

  return (
    <div className="relative">
      {/* Attachment button */}
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-[rgb(var(--surface-muted))] hover:text-ink-700 disabled:opacity-50"
        title="Attach file (photos, PDFs, PPTs — max 35 MB)"
      >
        {uploading
          ? <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          : <Paperclip className="h-5 w-5" />
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload progress bar */}
      {uploading && progress > 0 && (
        <div className="absolute -top-2 left-0 right-0 h-1 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full bg-brand-500 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="absolute bottom-12 left-0 z-50 w-64 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-xl">
          {/* Image preview */}
          {preview.objectUrl ? (
            <img
              src={preview.objectUrl}
              alt="Preview"
              className="mb-2 max-h-32 w-full rounded-lg object-contain"
            />
          ) : (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-[rgb(var(--surface-muted))] p-3">
              {fileIcon(preview.file.type)}
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-800">
                {preview.file.name}
              </span>
            </div>
          )}
          <p className="text-[11px] text-ink-500">
            {humanSize(preview.file.size)} · {preview.file.type.split('/').pop()}
          </p>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={cancelPreview}
              disabled={uploading}
              className="flex-1 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-[rgb(var(--surface-muted))]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={upload}
              disabled={uploading}
              className="flex-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? `${progress}%` : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Error without preview */}
      {error && !preview && (
        <div className="absolute bottom-12 left-0 z-50 w-56 rounded-xl border border-red-500/30 bg-red-50 p-2.5 shadow-lg">
          <p className="text-xs text-red-700">{error}</p>
          <button type="button" onClick={() => setError('')} className="absolute right-1.5 top-1.5">
            <X className="h-3 w-3 text-red-400" />
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * FileMessageBubble — renders a file attachment inside a message bubble.
 * Used when msg.type === 'file'.
 */
export function FileMessageBubble({ file, isOwn }) {
  if (!file?.url) return null
  const isImage = file.type?.startsWith('image/')
  const name = file.name || 'Attachment'
  const size = file.size ? humanSize(file.size) : ''

  if (isImage) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={file.url}
          alt={name}
          className="max-h-48 max-w-full rounded-lg object-contain"
          loading="lazy"
        />
        {size && <p className={`mt-1 text-[10px] ${isOwn ? 'text-white/60' : 'text-ink-400'}`}>{name} · {size}</p>}
      </a>
    )
  }

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${
        isOwn ? 'bg-white/15 hover:bg-white/25' : 'bg-[rgb(var(--surface-muted))] hover:bg-[rgb(var(--surface-muted))]/80'
      }`}
    >
      {fileIcon(file.type)}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-medium ${isOwn ? 'text-white' : 'text-ink-800'}`}>{name}</p>
        {size && <p className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-ink-400'}`}>{size}</p>}
      </div>
    </a>
  )
}
