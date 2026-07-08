// GET /api/uraba/info — alias del índice de la API.
// Existe porque en el deploy estático Vercel normaliza las rutas terminadas en
// "/index" (busca index.html) y el archivo prerenderizado de /api/uraba nunca
// se sirve; "info" es un nombre servible como ranking/municipios.
export { default } from './index.get'
