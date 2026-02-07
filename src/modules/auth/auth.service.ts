import admin from 'firebase-admin';

export interface NewUserPayload {
  email: string;
  password: string;
  role: string;
  displayName?: string;
  phoneNumber?: string;
}

export const createUser = async (payload: NewUserPayload) => {
  const { email, password, displayName, phoneNumber, role } = payload;
  const userRecord = await admin.auth().createUser({ email, password, displayName, phoneNumber });
  // Set custom claims for role
  await admin.auth().setCustomUserClaims(userRecord.uid, { role });
  return { uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName, phoneNumber, role };
};

export default { createUser };
