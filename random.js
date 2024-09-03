require('colors');
const { Wallet, JsonRpcProvider, ethers, parseUnits } = require('ethers');
const fs = require('fs');
const moment = require('moment');
const T3RN_ABI = require('./contracts/ABI');
const { displayHeader } = require('./utils/display');
const { transactionData, delay } = require('./utils/helper');
const { getAmount } = require('./utils/api');

const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));
const RPC_URL = T3RN_ABI.at(-1).RPC_ARBT;

const provider = new JsonRpcProvider(RPC_URL);
const CONTRACT_ADDRESS = T3RN_ABI.at(-1).CA_ARBT;

// Define possible destinations
const destinations = {
  '1': 'Base Sepolia',
  '2': 'Blast Sepolia',
  '3': 'Optimism Sepolia'
};

// Function to get a random network option
function getRandomDestination() {
  const keys = Object.keys(destinations);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return randomKey;
}

function getRandomNumberOfTransactions() {
  return Math.floor(Math.random() * (1000 - 400 + 1)) + 400; // Random number between 400 and 1000
}

function getRandomDelay() {
  // Random delay between 2 minutes (120000 ms) and 5 minutes (300000 ms)
  return Math.floor(Math.random() * (300000 - 120000 + 1)) + 120000;
}

function getRandomTransactionValue() {
  // Random value between 0.0003 ETH and 0.0010 ETH
  const min = 0.0003;
  const max = 0.0010;
  const randomValue = Math.random() * (max - min) + min;
  return {
    value: parseUnits(randomValue.toFixed(4), 'ether'),
    amountInEth: randomValue.toFixed(4)
  };
}

async function processTransactions(wallet, maxTxPerDay) {
  let totalSuccess = 0;

  while (totalSuccess < maxTxPerDay) {
    try {
      const balance = await provider.getBalance(wallet.address);
      const balanceInEth = ethers.formatUnits(balance, 'ether');

      console.log(
        `⚙️ [ ${moment().format('HH:mm:ss')} ] Starting transaction process for wallet: ${wallet.address}...`.yellow
      );

      if (balanceInEth < 0.001) {
        console.log(
          `❌ [ ${moment().format('HH:mm:ss')} ] Insufficient balance: ${balanceInEth} ETH. Please top up your account.`.red
        );
        return;
      }

      let counter = maxTxPerDay - totalSuccess;

      while (counter > 0) {
        try {
          const amount = await getAmount();
          if (!amount) {
            console.log(
              `❌ [ ${moment().format('HH:mm:ss')} ] Error fetching amount. Skipping this transaction.`.red
            );
            continue;
          }

          // Generate a random destination and transaction value
          const randomOption = getRandomDestination();
          const { value, amountInEth } = getRandomTransactionValue();
          const request = transactionData(
            wallet.address,
            amount.hex,
            randomOption
          );
          const gasPrice = parseUnits('0.1', 'gwei');

          const transaction = {
            data: request,
            to: CONTRACT_ADDRESS,
            gasLimit: 2000000,
            gasPrice,
            from: wallet.address,
            value, // Use the random transaction value
          };

          console.log(
            `💸 [ ${moment().format('HH:mm:ss')} ] Preparing transaction to ${destinations[randomOption]} with ${amountInEth} ETH.`.cyan
          );

          const result = await wallet.sendTransaction(transaction);
          console.log(
            `✅ [ ${moment().format('HH:mm:ss')} ] Transaction sent successfully! ${amountInEth} ETH transferred.`.green
          );
          console.log(
            `🔗 [ ${moment().format('HH:mm:ss')} ] Transaction hash: https://sepolia-explorer.arbitrum.io/tx/${result.hash}`.green
          );
          console.log('');

          totalSuccess++;
          counter--;

          if (counter > 0) {
            const randomDelay = getRandomDelay();
            console.log(`⏳ [ ${moment().format('HH:mm:ss')} ] Waiting ${randomDelay / 1000} seconds before next transaction...`.yellow);
            await delay(randomDelay);
          }
        } catch (error) {
          console.log(
            `❌ [ ${moment().format('HH:mm:ss')} ] Error processing transaction: ${error.message}`.red
          );
        }
      }
    } catch (error) {
      console.log(
        `❌ [ ${moment().format('HH:mm:ss')} ] Error while processing transactions: ${error.message}`.red
      );
    }
  }
}

(async () => {
  displayHeader();
  console.log('⏳ [ ' + moment().format('YYYY-MM-DD HH:mm:ss') + ' ] Initializing process...'.yellow);
  console.log('');

  while (true) {
    let totalTxForDay = 0;
    const dailyTxLimit = getRandomNumberOfTransactions(); // Random number between 400 and 1000

    console.log(
      `📅 [ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] Daily transaction limit set to ${dailyTxLimit}.`.yellow
    );

    for (const PRIVATE_KEY of PRIVATE_KEYS) {
      const wallet = new Wallet(PRIVATE_KEY, provider);
      const maxTxPerDay = Math.min(dailyTxLimit - totalTxForDay, getRandomNumberOfTransactions());

      if (totalTxForDay >= dailyTxLimit) break;

      console.log(
        `📅 [ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] Starting ${maxTxPerDay} transactions for address ${wallet.address}...`.yellow
      );

      await processTransactions(wallet, maxTxPerDay);

      totalTxForDay += maxTxPerDay;

      if (totalTxForDay >= dailyTxLimit) break;
    }

    console.log(
      `🎉 [ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] Completed all transactions for today! Total: ${totalTxForDay}`.green
    );

    console.log(
      `⏳ [ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] Pausing for 24 hours before next run...`.yellow
    );

    await delay(24 * 60 * 60 * 1000); // Wait for 24 hours
  }
})();

