import { Command } from 'commander';

import { startWatch } from './watch';

const program = new Command();

program
  .command('watch <source> <dest>')
  .option('-i --initialize', 'run imagemin on all existing files')
  .description(`run imagemin when files change in <source> and output to <dest>`)
  .action(startWatch);

program.parse(process.argv);
