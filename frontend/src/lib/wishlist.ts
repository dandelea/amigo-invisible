import type { Wishlist } from '@/api/types';
import { formatFileSize } from './format';

// Descripción de un archivo: «lista-deseos.pdf · 1,2 MB».
export const fileLabel = (w: Wishlist) =>
  `${w.fileName} · ${formatFileSize(w.fileSize ?? 0)}`;
