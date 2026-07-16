// Configuración de conexión al backend en la nube
const firebaseConfig = {
    databaseURL: "https://control--de--maquinaria-default-rtdb.firebaseio.com/"
};

// Inicialización de servicios de Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();