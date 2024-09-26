require('colors');
const Table = require('cli-table3');

function displayHeader() {
  process.stdout.write('\x1Bc');
  console.log('========================================'.cyan);
  console.log('=      🚀 T3rn Auto Bridge Bot 🚀      ='.cyan);
  console.log('=     Created by HappyCuanAirdrop      ='.cyan);
  console.log('=    https://t.me/HappyCuanAirdrop     ='.cyan);
  console.log('========================================'.cyan);
  console.log();
}

async function createTable(wallets) {
  const table = new Table({
    head: ['Wallet', 'Balance', 'Possible Tx'],
    style: {
      head: ['green'],
    },
    colWidths: [20, 15, 15],
  });

  for (const wallet of wallets) {
    table.push([
      wallet.address,
      wallet.balance,
      wallet.tx
    ]);
  }

  return table.toString();
}

module.exports = { displayHeader, createTable };

