import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBhabq47p9f-r-cSbk_SHiERqNd6qHlH-c',
  authDomain: 'dopamine-detox-app-7c462.firebaseapp.com',
  projectId: 'dopamine-detox-app-7c462',
  storageBucket: 'dopamine-detox-app-7c462.firebasestorage.app',
  messagingSenderId: '5820742120',
  appId: '1:5820742120:web:e551217aa0463cd9818c5d',
  measurementId: 'G-K6MK9WHC3Q',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)

export default app
