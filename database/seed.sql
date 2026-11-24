-- Desarrollado por: Benjamín Anabalón

SET client_encoding = 'UTF8';

CREATE EXTENSION IF NOT EXISTS pgcrypto;

TRUNCATE
    auditoria, detalle_presupuesto, presupuesto, consumo_material,
    evidencia, respuesta_checklist, hoja_servicio, asignacion,
    orden_trabajo, item_checklist, checklist, material, equipo,
    obra, cliente, usuario
RESTART IDENTITY CASCADE;

INSERT INTO usuario (rut, nombre, correo, password_hash, rol, zona) VALUES
('11.111.111-1', 'Carlos Mendoza', 'carlos.mendoza@fyag.test', crypt('Gamma2026!', gen_salt('bf', 10)), 'tecnico', 'Zona Sur'),
('22.222.222-2', 'Roberto Gómez', 'roberto.gomez@fyag.test', crypt('Gamma2026!', gen_salt('bf', 10)), 'tecnico', 'Zona Norte'),
('33.333.333-3', 'Marcela Soto', 'marcela.soto@fyag.test', crypt('Gamma2026!', gen_salt('bf', 10)), 'administrador', 'Oficina Chillán'),
('SERVICIO-ERP', 'Cuenta de servicio ERP', 'erp@fyag.test', crypt('Gamma2026!', gen_salt('bf', 10)), 'erp', NULL);

INSERT INTO cliente (rut, razon_social, nombre_contacto, telefono, correo) VALUES
('76.100.100-1', 'Frigorífico Ñuble SpA', 'Pedro Campos', '+56 9 1111 1111', 'contacto@frigorifico-nuble.test'),
('76.200.200-2', 'Lácteos del Sur Ltda.', 'Ana Rivas', '+56 9 2222 2222', 'contacto@lacteos-sur.test'),
('76.300.300-3', 'Pesquera Bío-Bío S.A.', 'Luis Vera', '+56 9 3333 3333', 'contacto@pesquera-biobio.test');

INSERT INTO obra (id_cliente, nombre, direccion, descripcion) VALUES
(1, 'Planta Chillán - Cámaras de frío', 'Ruta 5 Sur km 400, Chillán', 'Cámaras de conservación y sala de máquinas'),
(2, 'Planta Los Ángeles - Línea de lácteos', 'Camino a Antuco 1200, Los Ángeles', 'Túnel de congelado y condensadores'),
(3, 'Planta Coronel - Proceso pesquero', 'Av. Costanera 850, Coronel', 'Cámaras y unidades condensadoras');

INSERT INTO equipo (id_cliente, codigo_qr, numero_ficha, tipo_equipo, nombre, marca, modelo, numero_serie, ubicacion, horometro_actual, ultima_mantencion, estado_general) VALUES
(1, 'QR-EQ-001', '#4412', 'Cámara frigorífica', 'Cámara de conservación CF-01', 'Danfoss', 'CF-2000', 'CF-2023-0001', 'Planta Chillán - Sector A', 3450.5, CURRENT_DATE - 35, 'Operativo'),
(1, 'QR-EQ-002', '#4413', 'Compresor', 'Compresor de tornillo CT-02', 'Bitzer', 'CSH-8573', 'CT-2022-0345', 'Planta Chillán - Sala de máquinas', 12870.0, CURRENT_DATE - 90, 'Mantención requerida'),
(2, 'QR-EQ-003', '#5120', 'Túnel de congelado', 'Túnel de congelado TC-01', 'Frascold', 'TC-450', 'TC-2021-0112', 'Planta Los Ángeles - Línea 2', 8120.5, CURRENT_DATE - 60, 'Operativo'),
(2, 'QR-EQ-004', '#5121', 'Condensador', 'Condensador evaporativo CE-01', 'Evapco', 'LRC-120', 'CE-2020-0077', 'Planta Los Ángeles - Azotea', 15240.0, CURRENT_DATE - 120, 'Mantención requerida'),
(3, 'QR-EQ-005', '#6033', 'Unidad condensadora', 'Unidad condensadora UC-03', 'Copeland', 'ZB-45', 'UC-2023-0210', 'Planta Coronel - Patio técnico', 2310.0, CURRENT_DATE - 20, 'Operativo'),
(3, 'QR-EQ-006', '#6034', 'Evaporador', 'Evaporador EV-04', 'Güntner', 'GHN-040', 'EV-2022-0098', 'Planta Coronel - Cámara 2', 5675.0, CURRENT_DATE - 75, 'Operativo');

INSERT INTO orden_trabajo (id_cliente, id_obra, id_equipo, codigo_orden_erp, titulo, descripcion, tipo_servicio, prioridad, fecha_programada, estado) VALUES
(1, 1, 1, 'OT-8842', 'Mantención preventiva cámara CF-01', 'Revisión general y cambio de filtros', 'Mantención', 'ALTA', date_trunc('day', now()) + interval '9 hours 30 minutes', 'PENDIENTE'),
(1, 1, 2, 'OT-8843', 'Inspección compresor de tornillo CT-02', 'Revisión de aceite, presiones y temperaturas', 'Mantención', 'NORMAL', date_trunc('day', now()) + interval '11 hours 30 minutes', 'PENDIENTE'),
(2, 2, 4, 'OT-8844', 'Revisión de condensador evaporativo CE-01', 'Revisión de ventiladores y bomba de agua', 'Climatización', 'NORMAL', date_trunc('day', now()) + interval '15 hours', 'PENDIENTE'),
(2, 2, 3, 'OT-8845', 'Mantención túnel de congelado TC-01', 'Mantención preventiva programada', 'Mantención', 'ALTA', date_trunc('day', now()) + interval '10 hours', 'PENDIENTE'),
(3, 3, 5, 'OT-8846', 'Revisión de unidad condensadora UC-03', 'Revisión de conexiones eléctricas y presiones', 'Climatización', 'NORMAL', date_trunc('day', now()) + interval '14 hours', 'PENDIENTE'),
(3, 3, 6, 'OT-8847', 'Inspección de evaporador EV-04', 'Orden sin técnico asignado (para pruebas)', 'Mantención', 'BAJA', date_trunc('day', now()) + interval '1 day 9 hours', 'PENDIENTE');

INSERT INTO asignacion (id_orden, id_tecnico) VALUES
(1, 1), (2, 1), (3, 1),
(4, 2), (5, 2);

INSERT INTO checklist (nombre, tipo_servicio) VALUES
('Mantención preventiva de equipo de frío', 'Mantención'),
('Revisión de climatización', 'Climatización');

INSERT INTO item_checklist (id_checklist, pregunta, obligatorio, orden) VALUES
(1, '¿El nivel de aceite del compresor es correcto?', TRUE, 1),
(1, '¿Las conexiones eléctricas están en buen estado?', TRUE, 2),
(1, '¿La temperatura de operación es la correcta?', TRUE, 3),
(1, '¿Se revisó el estado de las mangueras y se descartaron fugas?', TRUE, 4),
(1, '¿Los filtros están limpios o se reemplazaron?', FALSE, 5),
(1, '¿El equipo quedó limpio y sin residuos?', FALSE, 6),
(2, '¿Los ventiladores giran sin ruidos anormales?', TRUE, 1),
(2, '¿Las presiones de trabajo están dentro del rango?', TRUE, 2),
(2, '¿Se revisó el drenaje y la bandeja de condensado?', TRUE, 3),
(2, '¿Los filtros están limpios o se reemplazaron?', FALSE, 4),
(2, '¿Se probó el funcionamiento del termostato?', FALSE, 5);

INSERT INTO material (codigo_material_erp, nombre, unidad_medida, stock_referencial, stock_minimo) VALUES
('MAT-001', 'Filtro secador', 'un', 12, 4),
('MAT-002', 'Aceite para compresor', 'lt', 80, 20),
('MAT-003', 'Refrigerante R-404A', 'kg', 45, 10),
('MAT-004', 'Correa de transmisión', 'un', 20, 5),
('MAT-005', 'Contactor 3 polos', 'un', 8, 2),
('MAT-006', 'Termostato digital', 'un', 6, 2);

INSERT INTO presupuesto (id_presupuesto, id_cliente, id_orden, id_tecnico, lugar_trabajo, descripcion, estado) VALUES
('00000000-0000-4000-8000-000000000001', 1, 1, 1, 'Planta Chillán - Cámaras de frío', 'Revisión de filtros y ajuste de presiones', 'ENVIADO');

INSERT INTO detalle_presupuesto (id_detalle, id_presupuesto, id_material, descripcion, cantidad, unidad_medida) VALUES
('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 1, 'Filtro secador', 2, 'un'),
('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 2, 'Aceite para compresor', 3, 'lt');
