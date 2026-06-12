export function mapFirebaseAuthError(code, fallback) {
  const m = {
    'auth/email-already-in-use': 'That email is already registered. Try signing in.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Use a stronger password (at least 6 characters).',
    'auth/invalid-credential': 'Incorrect email or password.',
    // Unified message for user-not-found and wrong-password to prevent email enumeration
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'permission-denied':
      'Permission denied. Confirm Firestore rules are published and your account has access.',
    'failed-precondition': 'This action is not available right now. Try again later.',
  }
  // Never expose raw Firebase error messages — always use the generic fallback
  return m[code] || 'Something went wrong. Please try again.'
}
