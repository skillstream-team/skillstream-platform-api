"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebase = initializeFirebase;
exports.getFirebaseApp = getFirebaseApp;
exports.getFirestore = getFirestore;
exports.getAuth = getAuth;
// src/utils/firebase.ts
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let firebaseApp = null;
function initializeFirebase() {
    if (firebaseApp) {
        return firebaseApp;
    }
    try {
        // Option 1: Use service account JSON (recommended for production)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            firebaseApp = firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL,
            });
        }
        // Option 2: Use individual environment variables
        else if (process.env.FIREBASE_PROJECT_ID) {
            firebaseApp = firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
                databaseURL: process.env.FIREBASE_DATABASE_URL,
            });
        }
        // Option 3: Use default credentials (for Google Cloud environments)
        else {
            firebaseApp = firebase_admin_1.default.initializeApp({
                databaseURL: process.env.FIREBASE_DATABASE_URL,
            });
        }
        console.log('✅ Firebase Admin initialized successfully');
        return firebaseApp;
    }
    catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        throw error;
    }
}
function getFirebaseApp() {
    if (!firebaseApp) {
        return initializeFirebase();
    }
    return firebaseApp;
}
function getFirestore() {
    return getFirebaseApp().firestore();
}
function getAuth() {
    return getFirebaseApp().auth();
}
