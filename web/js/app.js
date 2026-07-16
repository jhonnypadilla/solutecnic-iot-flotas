let usuarioActual = null;
let mapa, marker, miGrafica;
let datosFlota = {};
let maquinaSeleccionada = "";
let modalInstancia = null;

// ==========================================
// 1. CONTROL DE SESIÓN Y AUTENTICACIÓN
// ==========================================
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

function procesarAuth(e) {
    e.preventDefault();
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value.trim();

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => mostrarErrorAuth(interpretarErrorFirebase(error.code)));
}

function registrarUsuario() {
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value.trim();

    if(!email || !password) {
        mostrarErrorAuth("Por favor ingrese correo y contraseña.");
        return;
    }

    if (password.length < 6) {
        mostrarErrorAuth("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const uid = userCredential.user.uid;
            // Registrar perfil base en la base de datos
            db.ref("usuarios/" + uid + "/perfil").set({
                correo: email,
                fecha_registro: new Date().toISOString()
            });
            alert("¡Usuario registrado con éxito! Bienvenido a Solutecnic IoT.");
        })
        .catch(error => mostrarErrorAuth(interpretarErrorFirebase(error.code)));
}

function cerrarSesion() {
    auth.signOut();
}

function mostrarErrorAuth(msg) {
    const errDiv = document.getElementById("auth-error");
    errDiv.innerText = msg;
    errDiv.classList.remove("d-none");
}

function interpretarErrorFirebase(code) {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'El correo ya se encuentra registrado.';
        case 'auth/invalid-email':
            return 'El correo ingresado no es válido.';
        case 'auth/weak-password':
            return 'La contraseña debe tener mínimo 6 caracteres.';
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Correo o contraseña incorrectos.';
        default:
            return 'Error en la autenticación: ' + code;
    }
}

// ==========================================
// 2. LECTURA EN TIEMPO REAL
// ==========================================
function escucharMaquinasEnTiempoReal() {
    const refUsuario = db.ref("usuarios/" + usuarioActual.uid + "/equipos");
    
    refUsuario.on("value", snapshot => {
        datosFlota = snapshot.val() || {};
        actualizarResumenGlobal();
        actualizarSelector();
        actualizarTablaReporte();
        
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

// ==========================================
// 3. REGISTRO DE NUEVA MAQUINARIA
// ==========================================
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
        alert(`¡Máquina ${id} registrada correctamente!\n\nRuta para tu ESP32:\n/usuarios/${usuarioActual.uid}/equipos/${id}.json`);
    });
}

// ==========================================
// 4. RENDIMIENTO Y VISUALIZACIÓN
// ==========================================
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

// ==========================================
// 5. MÓDULO DE REPORTES Y EXPORTACIÓN
// ==========================================
function actualizarTablaReporte() {
    const tbody = document.getElementById("tabla-reportes-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    const llaves = Object.keys(datosFlota);

    if (llaves.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay registros de maquinaria.</td></tr>`;
        return;
    }

    llaves.forEach(id => {
        const eq = datosFlota[id];
        const hrsTrabajo = parseFloat(eq.horas_trabajo || 0);
        const hrsRalenti = parseFloat(eq.horas_ralenti || 0);
        const totalHrs = hrsTrabajo + hrsRalenti;
        const eficiencia = totalHrs > 0 ? ((hrsTrabajo / totalHrs) * 100).toFixed(1) : "0.0";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="fw-bold">${id}</td>
            <td>${eq.nombre || 'Sin Nombre'}</td>
            <td><span class="badge bg-light text-dark border">${eq.tipo || 'N/A'}</span></td>
            <td class="text-success fw-bold">${hrsTrabajo.toFixed(2)} hrs</td>
            <td class="text-warning fw-bold">${hrsRalenti.toFixed(2)} hrs</td>
            <td><span class="badge bg-info text-dark">${eficiencia}%</span></td>
            <td><span class="badge ${String(eq.estado).includes('TRABAJANDO') ? 'bg-warning text-dark' : 'bg-success'}">${eq.estado || 'IDLE'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function exportarExcel() {
    const llaves = Object.keys(datosFlota);
    
    // Si hay datos en memoria, exportamos desde la estructura de Firebase
    if (llaves.length > 0) {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF fuerza formato UTF-8 en Excel
        csvContent += "ID Dispositivo,Nombre Equipo,Tipo,Horas Trabajo (Efectivas),Horas Ralenti,Eficiencia (%),Estado Actual\n";

        llaves.forEach(id => {
            const eq = datosFlota[id];
            const hrsTrabajo = parseFloat(eq.horas_trabajo || 0).toFixed(2);
            const hrsRalenti = parseFloat(eq.horas_ralenti || 0).toFixed(2);
            const totalHrs = parseFloat(hrsTrabajo) + parseFloat(hrsRalenti);
            const eficiencia = totalHrs > 0 ? ((hrsTrabajo / totalHrs) * 100).toFixed(1) : "0.0";

            csvContent += `"${id}","${eq.nombre || ''}","${eq.tipo || ''}","${hrsTrabajo}","${hrsRalenti}","${eficiencia}%","${eq.estado || 'IDLE'}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Reporte_Flotas_Solutecnic_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert("Aún no tienes maquinaria registrada en tu cuenta. Agrega un equipo primero con el botón '+ Nueva Maquinaria'.");
    }


    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Flotas_Solutecnic_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}