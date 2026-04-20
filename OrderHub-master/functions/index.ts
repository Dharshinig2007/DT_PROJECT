import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

admin.initializeApp()

const db = admin.firestore()
const auth = admin.auth()

async function assertAdmin(context: any) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.')
  }
  const userDoc = await db.doc(`users/${context.auth.uid}`).get()
  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.')
  }
}

export const adminCreateShop = functions.https.onCall(async (data, context) => {
  await assertAdmin(context)
  const { name, description, category, shopkeeperEmail } = data as any
  if (!name || !shopkeeperEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'name and shopkeeperEmail are required.')
  }
  const shopRef = db.collection('shops').doc()
  await shopRef.set({ name, description: description ?? '', category: category ?? 'Canteen', isQueueActive: false, shopkeeperEmail, createdAt: admin.firestore.FieldValue.serverTimestamp() })
  let shopkeeperUid: string
  const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!'
  try {
    const existing = await auth.getUserByEmail(shopkeeperEmail)
    shopkeeperUid = existing.uid
  } catch {
    const newUser = await auth.createUser({ email: shopkeeperEmail, password: tempPassword, displayName: `Shopkeeper - ${name}` })
    shopkeeperUid = newUser.uid
  }
  await db.doc(`users/${shopkeeperUid}`).set({ email: shopkeeperEmail, role: 'shopkeeper', shopId: shopRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
  await shopRef.update({ shopkeeperId: shopkeeperUid })
  return { shopId: shopRef.id, shopkeeperUid, tempPassword }
})

export const adminDeleteShop = functions.https.onCall(async (data, context) => {
  await assertAdmin(context)
  const { shopId } = data as any
  if (!shopId) throw new functions.https.HttpsError('invalid-argument', 'shopId required.')
  const shopSnap = await db.doc(`shops/${shopId}`).get()
  const shopData = shopSnap.data()
  if (shopData?.shopkeeperId) {
    try {
      await auth.updateUser(shopData.shopkeeperId, { disabled: true })
      await db.doc(`users/${shopData.shopkeeperId}`).update({ disabled: true, shopId: admin.firestore.FieldValue.delete() })
    } catch (err) { console.warn('Could not disable shopkeeper:', err) }
  }
  await db.doc(`shops/${shopId}`).delete()
  return { success: true }
})

export const adminToggleUser = functions.https.onCall(async (data, context) => {
  await assertAdmin(context)
  const { uid, disabled } = data as any
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid required.')
  await auth.updateUser(uid, { disabled })
  await db.doc(`users/${uid}`).update({ disabled })
  return { success: true, uid, disabled }
})

export const adminSetUserRole = functions.https.onCall(async (data, context) => {
  await assertAdmin(context)
  const { uid, role } = data as any
  if (!uid || !role) throw new functions.https.HttpsError('invalid-argument', 'uid and role required.')
  await db.doc(`users/${uid}`).update({ role })
  return { success: true, uid, role }
})

export const adminClearCompletedOrders = functions.https.onCall(async (data, context) => {
  await assertAdmin(context)
  const snap = await db.collection('orders').where('status', '==', 'completed').get()
  if (snap.empty) return { deleted: 0 }
  let current = db.batch()
  let count = 0
  let totalDeleted = 0
  const batches: admin.firestore.WriteBatch[] = []
  snap.docs.forEach((d) => {
    current.delete(d.ref)
    count++
    totalDeleted++
    if (count === 499) { batches.push(current); current = db.batch(); count = 0 }
  })
  if (count > 0) batches.push(current)
  await Promise.all(batches.map((b) => b.commit()))
  return { deleted: totalDeleted }
})

export const adminResetAllQueues = functions.https.onCall(async (data, context) => {
  await assertAdmin(context)
  const snap = await db.collection('orders').where('status', 'in', ['waiting', 'ready']).get()
  if (snap.empty) return { cancelled: 0 }
  let current = db.batch()
  let count = 0
  let totalCancelled = 0
  const batches: admin.firestore.WriteBatch[] = []
  snap.docs.forEach((d) => {
    current.update(d.ref, { status: 'cancelled', cancelledAt: admin.firestore.FieldValue.serverTimestamp(), cancelledBy: 'admin' })
    count++
    totalCancelled++
    if (count === 499) { batches.push(current); current = db.batch(); count = 0 }
  })
  if (count > 0) batches.push(current)
  await Promise.all(batches.map((b) => b.commit()))
  const shopsSnap = await db.collection('shops').where('isQueueActive', '==', true).get()
  if (!shopsSnap.empty) {
    const shopBatch = db.batch()
    shopsSnap.docs.forEach((d) => { shopBatch.update(d.ref, { isQueueActive: false }) })
    await shopBatch.commit()
  }
  return { cancelled: totalCancelled }
})
