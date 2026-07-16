let usuarioActual = null;
let mapa, marker, miGrafica;
let datosFlota = {};
let maquinaSeleccionada = "";
let modalInstancia = null;

// 1. DETECTOR DE SESIÓN
auth.onAuthStateChanged(user => {
    if (user) {
        usuarioActual = user;
        document.getElementById("user-email-display").innerText = user.email;
        document.getElementById("seccion-auth").classList.add("d-none");
        document.getElementById("seccion-dashboard").classList.remove("d-none");
        
        inicializarMapa();
        inicializarGrafica();
        escucharMaquinasEnTiempoReal();
    } else {
        usuarioActual = null;
        document.getElementById("seccion-auth").classList.remove("d-none");
        document.getElementById("seccion-dashboard").classList.add("d-none");
    }
});

// 2. FUNCIONES DE AUTENTICACIÓN
function procesarAuth(e) {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => mostrarErrorAuth(error.message));
}

function registrarUsuario() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    if(!email || !password) {
        mostrarErrorAuth("Ingrese correo y contraseña para crear la cuenta.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => alert("¡Cuenta creada exitosamente para " + email + "!"))
        .catch(error => mostrarErrorAuth(error.message));
}

function cerrarSesion() {
    auth.signOut();
}

function mostrarErrorAuth(msg) {
    const errDiv = document.getElementById("auth-error");
    errDiv.innerText = msg;
    errDiv.classList.remove("d-none");
}

// 3. BASE DE DATOS EN TIEMPO REAL
function escucharMaquinasEnTiempoReal() {
    const refUsuario = db.ref("usuarios/" + usuarioActual.uid + "/equipos");
    
    refUsuario.on("value", snapshot => {
        datosFlota = snapshot.val() || {};
        actualizarResumenGlobal();
        actualizarSelector();
        
        if (maquinaSeleccionada && datosFlota[maquinaSeleccionada]) {
            mostrarDetalleMaquina(datosFlota[maquinaSeleccionada]);
        } else {
            const llaves = Object.keys(datosFlota);
            if (llaves.length > 0) {
                maquinaSeleccionada = llaves[0];
                document.getElementById("select-maquina").value = maquinaSeleccionada;
                mostrarDetalleMaquina(datosFlota[maquinaSeleccionada]);
            } else {
                limpiarPantallaSinDatos();
            }
        }
    });
}

// 4. GESTIÓN DE MÁQUINAS
function abrirModalNuevaMaquina() {
    if(!modalInstancia) modalInstancia = new bootstrap.Modal(document.getElementById('modalMaquina'));
    modalInstancia.show();
}

function guardarNuevaMaquina(e) {
    e.preventDefault();
    const id = document.getElementById("new-id-maquina").value.trim().toUpperCase();
    const nombre = document.getElementById("new-nombre-maquina").value.trim();
    const tipo = document.getElementById("new-tipo-maquina").value;

    if(!id || !nombre) return;

    db.ref("usuarios/" + usuarioActual.uid + "/equipos/" + id).set({
        nombre: nombre,
        tipo: tipo,
        estado: "IDLE",
        vibracion_promedio: 0.0,
        vibracion_pico: 0.0,
        horas_trabajo: 0.0,
        horas_ralenti: 0.0,
        latitud: 10.9685,
        longitud: -74.7813
    }).then(() => {
        modalInstancia.hide();
        document.getElementById("form-nueva-maquina").reset();
        alert(`¡Máquina ${id} creada con éxito!\n\nConfigura esta ruta en tu ESP32:\n/usuarios/${usuarioActual.uid}/equipos/${id}.json`);
    });
}

// 5. RENDERIZADO VISUAL
function inicializarMapa() {
    if(!mapa) {
        mapa = L.map('mapa').setView([10.9685, -74.7813], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    }
}

function inicializarGrafica() {
    if(!miGrafica) {
        const ctx = document.getElementById('graficaHoras').getContext('2d');
        miGrafica = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Trabajo Efectivo', 'Ralentí / Idle'],
                datasets: [{
                    label: 'Horas Acumuladas',
                    data: [0, 0],
                    backgroundColor: ['#198754', '#ffc107'],
                    borderRadius: 8
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
}

function actualizarResumenGlobal() {
    const llaves = Object.keys(datosFlota);
    let operando = 0, ralenti = 0;

    llaves.forEach(key => {
        const eq = datosFlota[key];
        const estado = String(eq.estado || "").toUpperCase();
        if (estado.includes("TRABAJANDO") || estado.includes("OPERACION")) operando++;
        else ralenti++;
    });

    document.getElementById("total-maquinas").innerText = llaves.length;
    document.getElementById("total-operando").innerText = operando;
    document.getElementById("total-ralenti").innerText = ralenti;
}

function actualizarSelector() {
    const select = document.getElementById("select-maquina");
    const valorActual = select.value;
    select.innerHTML = "";

    Object.keys(datosFlota).forEach(key => {
        const eq = datosFlota[key];
        const option = document.createElement("option");
        option.value = key;
        option.innerText = (eq.nombre ? eq.nombre : key) + ` (${key})`;
        select.appendChild(option);
    });

    if (valorActual && datosFlota[valorActual]) select.value = valorActual;
}

function cambiarMaquina(id) {
    maquinaSeleccionada = id;
    if (datosFlota[id]) mostrarDetalleMaquina(datosFlota[id]);
}

function mostrarDetalleMaquina(eq) {
    document.getElementById("nombre-maquina").innerText = eq.nombre || "Sin Nombre";
    document.getElementById("tipo-maquina").innerText = "Tipo: " + (eq.tipo || "Maquinaria Pesada");
    
    document.getElementById("val-promedio").innerText = parseFloat(eq.vibracion_promedio || 0).toFixed(3);
    document.getElementById("val-pico").innerText = parseFloat(eq.vibracion_pico || 0).toFixed(3);
    
    document.getElementById("val-hrs-trabajo").innerText = (eq.horas_trabajo || 0).toFixed(1) + " hrs";
    document.getElementById("val-hrs-ralenti").innerText = (eq.horas_ralenti || 0).toFixed(1) + " hrs";

    const lblEstado = document.getElementById("lbl-estado");
    const estadoStr = String(eq.estado || "IDLE").toUpperCase();
    if (estadoStr.includes("TRABAJANDO")) {
        lblEstado.className = "badge badge-status bg-working";
        lblEstado.innerText = "TRABAJANDO (OPERACIÓN)";
    } else {
        lblEstado.className = "badge badge-status bg-normal";
        lblEstado.innerText = "NORMAL (IDLE)";
    }

    miGrafica.data.datasets[0].data = [eq.horas_trabajo || 0, eq.horas_ralenti || 0];
    miGrafica.update();

    const lat = parseFloat(eq.latitud || 10.9685);
    const lon = parseFloat(eq.longitud || -74.7813);
    document.getElementById("coordenadas-texto").innerText = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;

    if (marker) mapa.removeLayer(marker);
    mapa.setView([lat, lon], 14);
    marker = L.marker([lat, lon]).addTo(mapa)
        .bindPopup(`<b>${eq.nombre || 'Equipo'}</b><br>Estado: ${eq.estado || 'IDLE'}`)
        .openPopup();
}

function limpiarPantallaSinDatos() {
    document.getElementById("nombre-maquina").innerText = "Sin máquinas creadas";
    document.getElementById("tipo-maquina").innerText = "Tipo: --";
    document.getElementById("val-promedio").innerText = "0.000";
    document.getElementById("val-pico").innerText = "0.000";
    document.getElementById("val-hrs-trabajo").innerText = "0.0 hrs";
    document.getElementById("val-hrs-ralenti").innerText = "0.0 hrs";
    document.getElementById("lbl-estado").className = "badge badge-status bg-secondary";
    document.getElementById("lbl-estado").innerText = "SIN MÁQUINAS";
    if(miGrafica) { miGrafica.data.datasets[0].data = [0, 0]; miGrafica.update(); }
}