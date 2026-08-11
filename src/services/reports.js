import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, getCurrentUser } from './firebase'

export const REPORT_TARGET_TYPES = ['user', 'post', 'review', 'list', 'community', 'community_post']
export const REPORT_REASONS = ['spam', 'harassment', 'hate', 'sexual', 'violence', 'misinformation', 'privacy', 'spoiler', 'other']

function reportError(code, message) {
  const error = new Error(message)
  error.code = code
  error.status = 'error'
  return error
}

function mapReportError(error) {
  if (error?.code === 'reports/already-exists') return error
  if (error?.code === 'permission-denied') return reportError(error.code, 'Bu içerik şikâyet edilemiyor veya erişim iznin bulunmuyor.')
  if (error?.code === 'unavailable') return reportError(error.code, 'Şikâyet şu anda gönderilemiyor. İnternet bağlantını kontrol edip tekrar dene.')
  if (error?.code === 'unauthenticated') return reportError(error.code, 'Şikâyet göndermek için giriş yapmalısın.')
  return reportError(error?.code || 'reports/unknown', 'Şikâyet gönderilemedi. Lütfen daha sonra tekrar dene.')
}

export function normalizeReportDetails(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function getReportId(reporterUid, targetType, targetId, parentId = '') {
  const id = targetType === 'community_post' ? `${reporterUid}_communityPost_${String(parentId)}_${String(targetId)}` : `${reporterUid}_${targetType}_${String(targetId)}`
  if (!reporterUid || !REPORT_TARGET_TYPES.includes(targetType) || !targetId || id.includes('/') || id.length > 1500) {
    throw reportError('reports/invalid-target', 'Geçersiz şikâyet hedefi.')
  }
  return id
}

export async function createReport({ reporterUid, targetType, targetId, parentId = '', reason, details = '' }) {
  const currentUser = getCurrentUser()
  if (!currentUser || currentUser.uid !== reporterUid) throw reportError('unauthenticated', 'Şikâyet göndermek için giriş yapmalısın.')
  if (!REPORT_TARGET_TYPES.includes(targetType)) throw reportError('reports/invalid-target', 'Bu içerik türü şikâyet edilemiyor.')
  if (!REPORT_REASONS.includes(reason)) throw reportError('reports/invalid-reason', 'Geçerli bir şikâyet nedeni seçmelisin.')

  const normalizedDetails = normalizeReportDetails(details)
  if (normalizedDetails.length > 500) throw reportError('reports/details-too-long', 'Açıklama en fazla 500 karakter olabilir.')
  if (reason === 'other' && !normalizedDetails) throw reportError('reports/details-required', 'Diğer seçeneği için bir açıklama yazmalısın.')

  const normalizedTargetId = String(targetId)
  if (targetType === 'community_post' && !parentId) throw reportError('reports/invalid-target', 'Topluluk gönderisi için üst topluluk kimliği gerekli.')
  const reportId = getReportId(reporterUid, targetType, normalizedTargetId, parentId)
  const reference = doc(db, 'reports', reportId)
  try {
    const payload = {
      reporterUid,
      targetType,
      targetId: normalizedTargetId,
      reason,
      details: normalizedDetails,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (targetType === 'community_post') payload.parentId = String(parentId)
    await setDoc(reference, payload)
    return { status: 'created', id: reportId }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[report:create]', { code: error?.code, message: error?.message, reportId, targetType, targetId: normalizedTargetId })
    try {
      const existing = await getDoc(reference)
      if (existing.exists() && existing.data().reporterUid === reporterUid) {
        return { status: 'duplicate', id: reportId }
      }
    } catch (readError) {
      if (readError?.code === 'reports/already-exists') return { status: 'duplicate', id: reportId }
    }
    throw mapReportError(error)
  }
}
