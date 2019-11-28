import { Options as MozjpegOptions } from 'imagemin-mozjpeg';
import { Options as PngquantOptions } from 'imagemin-pngquant';

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
export const IGNORED_PATHS = [
  '**/.*', // Hidden file
  '**/.*/**', // Hidden dir
  '**/@*', // Synology hidden file
  '**/@*/**', // Synology hidden dir
  '**/#recycle', // Synology #recycle
  '**/#recycle/**', // Synology #recycle
];

export const PNGQUANT_OPTIONS: PngquantOptions = {
  speed: 1,
};

export const MOZJPEG_OPTIONS: MozjpegOptions = {
  progressive: false,
  quality: 85,
};
