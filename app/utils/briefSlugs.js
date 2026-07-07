// briefSlugs.js — mapeo slug de URL ↔ nombre canónico de municipio.
export const MUNICIPIO_SLUGS = {
  'apartado': 'Apartadó',
  'turbo': 'Turbo',
  'chigorodo': 'Chigorodó',
  'carepa': 'Carepa',
  'necocli': 'Necoclí',
  'arboletes': 'Arboletes',
  'san-pedro-de-uraba': 'San Pedro de Urabá',
  'san-juan-de-uraba': 'San Juan de Urabá',
}

export function slugFor(nombre) {
  return Object.keys(MUNICIPIO_SLUGS).find(s => MUNICIPIO_SLUGS[s] === nombre) ?? null
}
