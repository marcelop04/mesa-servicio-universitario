import { describe, expect, it } from 'vitest';
import { crearRegistro, registroCsv } from '../public/sus/sus.js';

const contexto = { url: 'https://msu.example.org/sus/', fechaUtc: '2026-11-13T02:00:00Z', viewport: 390 };
const datos = { participante: 'P01', rol: 'Solicitante', tareas: 'on', ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, '3'])) };

describe('instrumento SUS', () => {
  it('exporta los diez valores y conserva el viewport observado sin inventar identidad', () => {
    const registro = crearRegistro(datos, contexto);
    expect(registro.q10).toBe(3);
    expect(registro.viewport_real).toBe(390);
    expect(registro.ancho).toBe(390);
    expect(registro.fecha).toBe('2026-11-12');
    expect(registro.fecha_utc).toBe(contexto.fechaUtc.replace('Z', '.000Z'));
    expect(registro.origen).toBe('RESPUESTA_USUARIO');
    expect(registroCsv(registro)).toContain('q1,q2,q3,q4,q5,q6,q7,q8,q9,q10');
  });
  it('rechaza respuestas incompletas, identificadores no válidos y URL no HTTPS', () => {
    expect(() => crearRegistro({ ...datos, q10: '' }, contexto)).toThrow(/diez/);
    expect(() => crearRegistro({ ...datos, participante: 'Nombre personal' }, contexto)).toThrow(/identificador/);
    expect(() => crearRegistro(datos, { ...contexto, url: 'http://example.org' })).toThrow(/HTTPS/);
    expect(() => crearRegistro({ ...datos, tareas: '' }, contexto)).toThrow(/Confirma/);
    expect(() => crearRegistro(datos, { ...contexto, viewport: 0 })).toThrow(/pantalla/);
  });
  it('escapa comillas y neutraliza fórmulas al exportar observaciones', () => {
    const registro = crearRegistro({ ...datos, observaciones: '=1+"2"' }, contexto);
    expect(registroCsv(registro)).toContain('"\'=1+""2"""');
  });
});
