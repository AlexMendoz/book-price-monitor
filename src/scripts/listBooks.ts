import '../config/loadEnv';
import { getAllBooks } from '../services/reportService';

async function main() {
  const books = await getAllBooks();

  if (books.length === 0) {
    console.log('No hay libros guardados todavía.');
    return;
  }

  console.log('\nLibros disponibles:\n');

  for (const book of books) {
    console.log(`${book.id} | ${book.title} | ${book.author ?? 'Autor desconocido'}`);
  }
}

main().catch((error) => {
  console.error('Error al listar libros:', error);
  process.exit(1);
});