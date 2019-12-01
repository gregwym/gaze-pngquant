import * as debugLogger from 'debug';
import * as NodeCache from 'node-cache';
import watch from 'node-watch';
import * as path from 'path';
import * as readdir from 'recursive-readdir';

import { compressToDest, isIgnoredPath, removeDestFile, safeFsStat } from '../common';
import { WatchCmdOptions } from '../types';

const debugIntegrity = debugLogger('integrity');
const debugWatcher = debugLogger('watcher');

// Debounce file update event for 5s
const FILE_EVENT_EXPIRE_TTL = 5;
const INTEGRITY_CHECK_EXPIRE = 30;

export function startWatch(source: string, dest: string, options: WatchCmdOptions = {}) {
  console.info(`Start to watch ${source} and will output to ${dest}.`);

  const fileEventBuffer = new NodeCache({
    stdTTL: FILE_EVENT_EXPIRE_TTL,
    checkperiod: 1,
  });

  fileEventBuffer.on('expired', async (filePath: string, fileEvent: string) => {
    try {
      if (fileEvent === 'update') {
        await compressToDest(source, dest, filePath);
      } else if (fileEvent === 'remove') {
        await removeDestFile(source, dest, filePath);
      }
    } catch (e) {
      console.error('Handler error: ', e);
    }
  });

  const integrityCheckBuffer = new NodeCache({
    stdTTL: INTEGRITY_CHECK_EXPIRE,
    checkperiod: 10,
  });

  integrityCheckBuffer.on('expired', async (dirPath: string, checkCount: number) => {
    const filePaths = await readdir(dirPath, [isIgnoredPath]);
    debugIntegrity(`checking ${filePaths.length} files in "${dirPath}" for ${checkCount} file events`, filePaths);

    for (const filePath of filePaths) {
      fileEventBuffer.set(filePath, 'update');
    }
  });

  const watcher = watch(source, { recursive: true }, async (fileEvent, filePath) => {
    // Step1: push file event to buffer
    debugWatcher(`event: ${fileEvent} "${filePath}"`);
    if (isIgnoredPath(filePath)) {
      debugWatcher(`ignored: "${filePath}"`);
      return;
    }
    fileEventBuffer.set(filePath, fileEvent);

    // Step2: setup directory integrity check
    const fileStats = await safeFsStat(filePath);
    if (!fileStats) {
      return;
    }

    const fileDirPath = fileStats.isDirectory() ? filePath : path.dirname(filePath);
    const relativeDirPath = path.relative(source, fileDirPath);
    const pathSegments = relativeDirPath.split(path.sep);

    let parentDirPath = source;
    for (const pathSeg of pathSegments) {
      parentDirPath = path.join(parentDirPath, pathSeg);
      const checkCount = integrityCheckBuffer.get<number>(parentDirPath);
      if (checkCount) {
        debugIntegrity(
          `setting "${filePath}" check on parent path "${parentDirPath}" with other ${checkCount} file events`,
        );
        integrityCheckBuffer.set(parentDirPath, checkCount + 1);
        return;
      }
    }

    debugIntegrity(`setting "${filePath}" check on dir path "${parentDirPath}"`);
    integrityCheckBuffer.set(parentDirPath, 1);
  });

  watcher.on('ready', () => {
    console.info(`Ready for changes in ${source} and will output to ${dest}.`);
  });

  watcher.on('error', error => console.error(`Watcher error: ${error}`));

  process.on('SIGINT', () => {
    console.info('Watch terminates');
    watcher.close();
    process.exit(0);
  });
}
