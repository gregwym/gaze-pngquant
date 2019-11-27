import { Options as MozjpegOptions } from 'imagemin-mozjpeg';
import { Options as PngquantOptions } from 'imagemin-pngquant';

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
export const IGNORED_PATH = [
  '*/.*', // Hidden file
  '*/.*/**', // Hidden dir
  '*/@*', // Synology hidden file
  '*/@*/**', // Synology hidden dir
];

export const PNGQUANT_OPTIONS: PngquantOptions = {
  speed: 1,
};

export const MOZJPEG_OPTIONS: MozjpegOptions = {
  progressive: false,
  quality: 85,
};
