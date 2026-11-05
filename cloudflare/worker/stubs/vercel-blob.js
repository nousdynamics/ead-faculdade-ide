// O Worker usa D1 e R2. O código legado de Blob continua importado por lib/, mas nunca roda aqui.
function unavailable() {
  throw new Error("Vercel Blob não está disponível no Worker.");
}

export const put = unavailable;
export const get = unavailable;
export const list = unavailable;
export const del = unavailable;
