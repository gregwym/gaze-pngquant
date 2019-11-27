import { Command } from 'commander';

import { startWatch } from './watch';

const program = new Command();

program
  .command('watch <source> <dest>')
  .option('-i --initialize', 'run imagemin on all existing files')
  .option('-s --since <datetime>', 'only process file that are modified since this datetime in ISO format')
  .description(`run imagemin when files change in <source> and output to <dest>`)
  .action(startWatch);

program.parse(process.argv);
