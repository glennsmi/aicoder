// Test script that simulates real user signup flow
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDcSjsGe0rebWJj73MyJSA_ysMOps0IV1g",
  authDomain: "cursorcosts.firebaseapp.com",
  projectId: "cursorcosts",
  storageBucket: "cursorcosts.firebasestorage.app",
  messagingSenderId: "547570015509",
  appId: "1:547570015509:web:1069528bae80d5e7bedd1c",
  measurementId: "G-0KQE66REG8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testRealSignup() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';
  const testName = 'Test User Real';

  console.log('🧪 Testing real signup flow...');
  console.log('📧 Email:', testEmail);
  console.log('👤 Name:', testName);

  try {
    // Step 1: Create Firebase Auth user
    console.log('\n1️⃣ Creating Firebase Auth user...');
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Auth user created:', userCredential.user.uid);

    // Step 2: Update display name
    if (testName && userCredential.user) {
      console.log('\n2️⃣ Updating display name...');
      await updateProfile(userCredential.user, {
        displayName: testName
      });
      console.log('✅ Display name updated');
    }

    // Step 3: Create Firestore document (this should trigger the function)
    console.log('\n3️⃣ Creating Firestore user document...');
    const userDoc = {
      email: userCredential.user.email,
      displayName: testName || userCredential.user.displayName || '',
      preferences: {
        primaryCurrency: 'GBP',
        lastUpdated: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
    console.log('✅ Firestore document created for:', userCredential.user.uid);
    console.log('📧 This should trigger the welcome email function!');

    // Step 4: Sign out
    console.log('\n4️⃣ Signing out...');
    await signOut(auth);
    console.log('✅ Signed out');

    console.log('\n🎯 Test completed! Check function logs for welcome email trigger.');
    console.log('📋 User ID to look for in logs:', userCredential.user.uid);

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Try to sign out even if there was an error
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('Failed to sign out:', signOutError);
    }
  }
}

testRealSignup(); 