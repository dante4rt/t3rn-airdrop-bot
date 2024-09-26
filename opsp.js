require('colors');
const { Wallet, JsonRpcProvider, ethers, parseUnits } = require('ethers');
const fs = require('fs');
const path = require('path');

const readlineSync = require('readline-sync');
const moment = require('moment');
const T3RN_ABI = require('./contracts/ABI');
const { displayHeader, createTable } = require('./utils/display');
const { transactionData, delay } = require('./chains/opsp/helper');
const { getAmount } = require('./chains/opsp/api');

const TOKEN_FILE_PATH = path.join(__dirname, 'OPSP_TX_HASH.txt');
const { writeLog } = require('./utils/log'); 

const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));
const RPC_URL = T3RN_ABI.at(-1).RPC_OPSP;

const provider = new JsonRpcProvider(RPC_URL);
const CONTRACT_ADDRESS = T3RN_ABI.at(-1).CA_OPSP;

(async () => {
  displayHeader();
  console.log('⏳ Please wait...'.yellow);
  console.log('');

  const options = readlineSync.question(
    'Choose the network that you want to use 👇\n\n1. Optimism Sepolia to Arbitrum Sepolia\n2. Optimism Sepolia to Base Sepolia\n3. Optimism Sepolia to Blast Sepolia\n4. Exit\n\nEnter 1, 2, 3, or 4: '
  );

  if (options === '4' || !options) {
    console.log('👋 Exiting the bot. See you next time!'.cyan);
    console.log('Subscribe: https://t.me/HappyCuanAirdrop.'.green);
    process.exit(0);
  }

  console.log(`\n`)
  console.log(`OP Sepolia balance & Possible transactions (if minimum amount 0.01 ETH) `.yellow)

  let wallets = [];
  for (const PRIVATE_KEY of PRIVATE_KEYS) {
    const wallet = new Wallet(PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatUnits(balance, 'ether');

    // calculate how much possible transactions
    const numberOfTx = Math.floor(balanceInEth / 0.01);

    wallets.push({
      address: wallet.address.slice(0, 8) + '...' + wallet.address.slice(-6),
      balance: parseFloat(balanceInEth).toFixed(3) + ' ETH',
      tx: numberOfTx
    });
  }
  const table = await createTable(wallets);
  console.log(table);
  console.log(`The number of possible transactions does not include gas fees`.yellow);

  console.log(`\n`)

  const numTx = readlineSync.questionInt(
    '🔄 How many times you want to swap or bridge? '
  );

  if (numTx <= 0) {
    console.log('❌ Number of transactions must be greater than 0!'.red);
    process.exit(1);
  }

  for (const PRIVATE_KEY of PRIVATE_KEYS) {
    const wallet = new Wallet(PRIVATE_KEY, provider);
    let totalSuccess = 0;

    while (totalSuccess < numTx) {
      try {
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers.formatUnits(balance, 'ether');

        console.log(
          `⚙️ [ ${moment().format(
            'HH:mm:ss'
          )} ] Doing transactions for address ${wallet.address}...`.yellow
        );

        if (balanceInEth < 0.01) {
          console.log(
            `❌ [ ${moment().format(
              'HH:mm:ss'
            )} ] Your balance is too low (💰 ${balanceInEth} ETH), please claim faucet first!`
              .red
          );
          process.exit(0);
        }

        let counter = numTx - totalSuccess;

        while (counter > 0) {
          try {
            const amount = await getAmount(options);
            if (!amount) {
              console.log(
                `❌ Failed to get the amount. Skipping transaction...`.red
              );
              continue;
            }

            const request = transactionData(
              wallet.address,
              amount.hex,
              options
            );

            const gasPrice = parseUnits('0.1', 'gwei');

            const gasLimit = await provider.estimateGas({
              to: CONTRACT_ADDRESS,
              data: request,
              value: parseUnits('0.01', 'ether'),
              gasPrice,
            });

            const transaction = {
              data: request,
              to: CONTRACT_ADDRESS,
              gasLimit,
              gasPrice,
              from: wallet.address,
              value: parseUnits('0.01', 'ether'), // adjustable
            };

            const result = await wallet.sendTransaction(transaction);
            console.log(
              `✅ [ ${moment().format(
                'HH:mm:ss'
              )} ] Transaction successful from Optimism Sepolia to ${
                options === '1'
                  ? 'Arbitrum'
                  : options === '2'
                  ? 'Base'
                  : 'Blast'
              } Sepolia!`.green
            );
            console.log(
              `🔗 [ ${moment().format(
                'HH:mm:ss'
              )} ] Transaction hash: https://optimism-sepolia.blockscout.com/tx/${
                result.hash
              }`.green
            );
            writeLog(TOKEN_FILE_PATH,`[${moment().format('HH:mm:ss')}] https://optimism-sepolia.blockscout.com/tx/${result.hash}`);
            console.log(
              '✅ Transaction hash url has been saved to OPSP_TX_HASH.txt.'
                .green
            );
            console.log('');

            totalSuccess++;
            counter--;

            if (counter > 0) {
              await delay(30000);
            }
          } catch (error) {
            console.log(
              `❌ [ ${moment().format(
                'HH:mm:ss'
              )} ] Error during transaction: ${error}`.red
            );
          }
        }
      } catch (error) {
        console.log(
          `❌ [ ${moment().format(
            'HH:mm:ss'
          )} ] Error in processing transactions: ${error}`.red
        );
      }
    }
  }

  console.log('');
  console.log(
    `🎉 [ ${moment().format(
      'HH:mm:ss'
    )} ] All ${numTx} transactions are complete!`.green
  );
  console.log(
    `📢 [ ${moment().format(
      'HH:mm:ss'
    )} ] Subscribe: https://t.me/HappyCuanAirdrop`.green
  );
})();
