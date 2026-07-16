// Configuración de Firebase con tus credenciales reales
const firebaseConfig = {
    apiKey: "AIzaSyDYzGcSEWn29fGWsYHQI4ikjE8_YSbZMig",
    authDomain: "control--de--maquinaria.firebaseapp.com",
    databaseURL: "https://control--de--maquinaria-default-rtdb.firebaseio.com",
    projectId: "control--de--maquinaria",
    storageBucket: "control--de--maquinaria.firebasestorage.app",
    messagingSenderId: "1029379291298",
    appId: "1:1029379291298:web:30d872316571f1714cbffb",
    measurementId: "G-1B5C5GFN5B"
};

// Inicialización de servicios para compatibilidad CDN
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();