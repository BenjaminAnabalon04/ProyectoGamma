// Desarrollado por: Robert Ramírez

const ESTADOS = {
  PENDIENTE: { texto: 'Pendiente', clase: 'pildora pildora-pendiente' },
  EN_EJECUCION: { texto: 'En proceso', clase: 'pildora pildora-proceso' },
  EN_COSTEO: { texto: 'En costeo', clase: 'pildora pildora-proceso' },
  EN_REVISION: { texto: 'En revisión', clase: 'pildora pildora-proceso' },
  FINALIZADA: { texto: 'Finalizada', clase: 'pildora pildora-ok' },
  FINALIZADO: { texto: 'Finalizado', clase: 'pildora pildora-ok' },
  COMPLETADO: { texto: 'Completado', clase: 'pildora pildora-ok' },
  ENVIADO: { texto: 'Enviado', clase: 'pildora pildora-ok' },
  SINCRONIZADO: { texto: 'Sincronizado', clase: 'pildora pildora-ok' },
  ERROR: { texto: 'Con error', clase: 'pildora pildora-error' },
  CANCELADA: { texto: 'Cancelada', clase: 'pildora pildora-pendiente' },
  APROBADO: { texto: 'Aprobado', clase: 'pildora pildora-ok' },
  RECHAZADO: { texto: 'Rechazado', clase: 'pildora pildora-error' },
};

export default function ChipEstado({ estado, etiqueta }) {
  const configuracion = ESTADOS[estado] || {
    texto: estado ? String(estado).replaceAll('_', ' ').toLowerCase() : 'Sin estado',
    clase: 'pildora pildora-pendiente',
  };

  return <span className={configuracion.clase}>{etiqueta || configuracion.texto}</span>;
}
