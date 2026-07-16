# 🚜 Solutecnic IoT - Plataforma de Telemetría para Maquinaria Pesada

Sistema integral de monitoreo remoto IoT para flotas de maquinaria amarilla y de construcción, desarrollado por **Solutecnic del Caribe**. Permite la supervisión en tiempo real de vibración, horómetro acumulado (operación real vs. ralentí), geolocalización y análisis de rendimiento.

---

## 🏗️ Arquitectura del Sistema

El proyecto está estructurado bajo una arquitectura cliente-servidor con integración de hardware embebido:

solutecnic-iot-flotas/
│
├── firmware/                  # Código C++ para microcontroladores
│   └── esp32_telemetria/     # MPU6050 + ESP32 para procesamiento de vibración
│
└── web/                       # Dashboard Multiusuario (Frontend)
├── css/                  # Estilos visuales Bootstrap 5 & Custom
├── js/                   # Lógica de telemetría, mapas (Leaflet) y Charts
└── index.html            # Interfaz gráfica de usuario


---

## 🚀 Tecnologías Utilizadas

* **Hardware & Firmware:** ESP32, Acelerómetro MPU-6050 (I2C), C++ / Arduino Framework.
* **Backend & Database:** Firebase Realtime Database, Firebase Authentication (Gestión Multi-tenant).
* **Frontend Web:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.
* **Visualización de Datos:** Leaflet.js (Mapas intermitentes/GPS), Chart.js (Rendimiento).

---

## 📊 Características Principales

1. **Horómetro Inteligente:** Clasificación de tiempo mediante vector de magnitud de vibración $|g|$:
   * **Modo Operación:** Detecta trabajo pesado y acumula horas efectivas.
   * **Modo Ralentí (Idle):** Mide consumo de combustible en baja actividad.
2. **Monitoreo Multiusuario (SaaS):** Cada cliente administra y visualiza únicamente sus activos vinculados a través de su UID de Firebase.
3. **Filtro de Ruido G-Force:** Procesamiento en borde (*Edge Computing*) para aislar la fuerza de gravedad constante.
4. **Resiliente a Desconexiones:** Reintento automático de paquetes HTTP e integración modular.

---

## 👨‍💻 Desarrollo y Soporte

Desarrollado por **Solutecnic del Caribe** — *Ingeniería en Infraestructura Eléctrica y Tecnológica*.