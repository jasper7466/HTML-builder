const fs = require('fs');
const path = require('path');
const { stdout, stdin } = require('node:process');
const readline = require('readline').createInterface(stdin, stdout);
const { EOL } = require('node:os');

const TEXT_GREET = 'Hi! Please, type something and I will save it for you!';
const TEXT_FAREWELL = 'Done! See you soon, bye!';
const SAFE_WORD = 'exit';

const targetPath = path.join(__dirname, 'text.txt');
const writableStream = fs.createWriteStream(targetPath);

message(TEXT_GREET);

writableStream.on('error', (error) =>
  console.error(`Something went wrong: ${error}`),
);

readline
  .on('line', (line) => {
    if (line === SAFE_WORD) {
      readline.close();
    }

    writableStream.write(line + EOL);
  })
  .on('close', () => {
    log();
    message(TEXT_FAREWELL);
    process.exit(0);
  });

function message(message) {
  let border = '-'.repeat(message.length);

  log();
  log(border);
  log(message);
  log(border);
  log();
}

function log(message = '', newLine = true) {
  const postfix = newLine ? EOL : '';
  stdout.write(message + postfix);
}
