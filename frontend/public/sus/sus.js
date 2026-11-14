const preguntas = [
  'Creo que me gustaría utilizar este sistema con frecuencia.',
  'Encontré el sistema innecesariamente complejo.',
  'Pensé que el sistema era fácil de usar.',
  'Creo que necesitaría ayuda de una persona con conocimientos técnicos para utilizarlo.',
  'Encontré que las distintas funciones del sistema estaban bien integradas.',
  'Pensé que había demasiadas inconsistencias en el sistema.',
  'Imagino que la mayoría de las personas aprenderían a utilizarlo rápidamente.',
  'Encontré el sistema muy complicado de utilizar.',
  'Me sentí muy seguro/a utilizando el sistema.',
  'Necesité aprender muchas cosas antes de poder utilizar el sistema.',
];
export const columnas = ['participante', 'fecha', 'rol', 'ancho', 'url', ...Array.from({ length: 10 }, (_, i) => `q${i + 1}`), 'observaciones', 'origen', 'viewport_real', 'fecha_utc'];

export function crearRegistro(datos, contexto) {
  if (!/^P\d{2,3}$/.test(datos.participante ?? '')) throw new Error('Usa el identificador P01, P02… asignado por el facilitador.');
  if (!['Solicitante', 'Supervisor', 'Técnico', 'Administrador'].includes(datos.rol)) throw new Error('Selecciona el rol probado.');
  if (datos.tareas !== 'on') throw new Error('Confirma que probaste la aplicación antes de responder.');
  if (!Number.isInteger(contexto.viewport) || contexto.viewport <= 0) throw new Error('No se pudo registrar el tamaño de la pantalla.');
  const url = new URL(contexto.url);
  if (url.protocol !== 'https:') throw new Error('La evaluación debe hacerse sobre la aplicación HTTPS.');
  const fecha = new Date(contexto.fechaUtc);
  const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
  const registro = { participante: datos.participante, fecha: fechaLocal, rol: datos.rol, ancho: contexto.viewport, url: url.origin };
  for (let i = 1; i <= 10; i++) {
    if (!/^[1-5]$/.test(String(datos[`q${i}`] ?? ''))) throw new Error('Responde los diez ítems con valores del 1 al 5.');
    registro[`q${i}`] = Number(datos[`q${i}`]);
  }
  return { ...registro, observaciones: String(datos.observaciones ?? '').trim().slice(0, 1000), origen: 'RESPUESTA_USUARIO', viewport_real: contexto.viewport, fecha_utc: fecha.toISOString() };
}

export function registroCsv(registro) {
  const celda = (valor) => {
    let texto = String(valor ?? '');
    if (/^[=+@\-\t\r]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replaceAll('"', '""')}"`;
  };
  return `${columnas.join(',')}\r\n${columnas.map((c) => celda(registro[c])).join(',')}\r\n`;
}

const formulario = typeof document === 'undefined' ? null : document.querySelector('#sus-form');
if (formulario) {
  const contenedor = document.querySelector('#preguntas');
  const escala = ['Totalmente en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Totalmente de acuerdo'];
  preguntas.forEach((pregunta, i) => {
    const grupo = document.createElement('fieldset');
    const leyenda = document.createElement('legend');
    leyenda.textContent = `${i + 1}. ${pregunta}`;
    grupo.append(leyenda);
    const opciones = document.createElement('div');
    opciones.className = 'opciones';
    for (let valor = 1; valor <= 5; valor++) {
      const etiqueta = document.createElement('label');
      const radio = document.createElement('input');
      Object.assign(radio, { type: 'radio', name: `q${i + 1}`, value: String(valor), required: true });
      radio.setAttribute('aria-label', `${valor}: ${escala[valor - 1]}`);
      etiqueta.append(radio, document.createTextNode(String(valor)));
      opciones.append(etiqueta);
    }
    grupo.append(opciones);
    contenedor.append(grupo);
  });
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const error = document.querySelector('#error');
    error.textContent = '';
    try {
      const registro = crearRegistro(Object.fromEntries(new FormData(formulario)), { url: location.origin, fechaUtc: new Date().toISOString(), viewport: innerWidth });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(new Blob(['\uFEFF', registroCsv(registro)], { type: 'text/csv;charset=utf-8' }));
      enlace.download = `SUS-${registro.participante}.csv`;
      enlace.hidden = true;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
      document.querySelector('#resultado').textContent = 'Respuesta descargada. Envíala al facilitador de la prueba. Gracias.';
    } catch (err) {
      error.textContent = err.message;
    }
  });
}
