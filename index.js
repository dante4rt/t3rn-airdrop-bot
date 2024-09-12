require('colors');
const readlineSync = require('readline-sync');
const { displayHeader } = require('./utils/display');

const scriptCommands = {
  0: 'npm run arbt',
  1: 'npm run opsp',
};

const scriptNames = {
  0: 'Auto Bridge From Arbitrum Sepolia',
  1: 'Auto Bridge From Optimism Sepolia',
};

displayHeader();
console.log(
  'Welcome to the T3rn Auto Bridge Bot by Happy Cuan Airdrop!'.bold.green
);
console.log('');
console.log('Please choose a script to run:'.underline);

Object.keys(scriptNames).forEach((key) => {
  console.log(`${key}: ${scriptNames[key].yellow}`);
});

const userChoice = parseInt(
  readlineSync.question('\nChoose a script number: \n'.cyan),
  10
);

if (scriptCommands.hasOwnProperty(userChoice)) {
  console.log(`\nPlease run: \n${scriptCommands[userChoice]}`.blue);
  console.log('');
} else {
  console.log(
    'Invalid choice! Please run the script again and choose a valid number.'.red
  );
}
