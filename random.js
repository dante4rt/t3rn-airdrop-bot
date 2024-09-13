require('colors');
const { Wallet, JsonRpcProvider, ethers, parseUnits } = require('ethers');
const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');
const moment = require('moment');
const T3RN_ABI = require('./contracts/ABI');
const { displayHeader } = require('./utils/display');
const { transactionData: arbtTransactionData, delay: arbtDelay } = require('./chains/arbt/helper');
const { getAmount: arbtGetAmount } = require('./chains/arbt/api');
const { transactionData: opspTransactionData, delay: opspDelay } = require('./chains/opsp/helper');
const { getAmount: opspGetAmount } = require('./chains/opsp/api');

const TOKEN_FILE_PATH = path.join(__dirname, 'RANDOM_TX_HASH.txt');
const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));


const ARBT_CONFIG = {
  provider: new JsonRpcProvider(T3RN_ABI.at(-1).RPC_ARBT),
  contractAddress: T3RN_ABI.at(-1).CA_ARBT,
  getAmount: arbtGetAmount,
  transactionData: arbtTransactionData,
  explorerUrl: 'https://sepolia-explorer.arbitrum.io/tx/'
};

const OPSP_CONFIG = {
  provider: new JsonRpcProvider(T3RN_ABI.at(-1).RPC_OPSP),
  contractAddress: T3RN_ABI.at(-1).CA_OPSP,
  getAmount: opspGetAmount,
  transactionData: opspTransactionData,
  explorerUrl: 'https://optimism-sepolia.blockscout.com/tx/'
};

const DESTINATIONS = {
  Arbitrum: ['Base', 'Blast', 'Optimism'],
  Optimism: ['Base', 'Blast', 'Arbitrum']
};


const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

(async () => {
  displayHeader();
  console.log('⏳ Please wait...'.yellow);
  console.log('');

  const numTx = readlineSync.questionInt('🔄 How many times you want to swap or bridge? ');
  if (isNaN(numTx) || numTx <= 0) {
    console.log('❌ Number of transactions must be a positive number!'.red);
    process.exit(1);
  }

  let totalSuccess = 0;

  while (totalSuccess < numTx) {
    try {
      
      const isArbtSource = Math.random() < 0.5;
      const sourceConfig = isArbtSource ? ARBT_CONFIG : OPSP_CONFIG;
      const destinationChain = getRandomElement(DESTINATIONS[isArbtSource ? 'Arbitrum' : 'Optimism'].filter(d => d !== (isArbtSource ? 'Arbitrum' : 'Optimism')));

      const wallet = new Wallet(PRIVATE_KEYS[totalSuccess % PRIVATE_KEYS.length], sourceConfig.provider);

      console.log(`⚙️ [ ${moment().format('HH:mm:ss')} ] Doing transactions for ${isArbtSource ? 'Arbitrum' : 'Optimism'} to ${destinationChain}...`.yellow);

      const balance = await sourceConfig.provider.getBalance(wallet.address);
      const balanceInEth = ethers.formatUnits(balance, 'ether');

      if (balanceInEth < 0.01) {
        console.log(`❌ [ ${moment().format('HH:mm:ss')} ] Your balance is too low (💰 ${balanceInEth} ETH), please claim faucet first!`.red);
        process.exit(0);
      }

      const amount = await sourceConfig.getAmount(destinationChain);
      if (!amount) {
        console.log(`❌ Failed to get the amount. Skipping transaction...`.red);
        continue;
      }

      const request = sourceConfig.transactionData(wallet.address, amount.hex, destinationChain);
      const gasPrice = parseUnits('0.1', 'gwei');
      const gasLimit = await sourceConfig.provider.estimateGas({
        to: sourceConfig.contractAddress,
        data: request,
        value: parseUnits('0.01', 'ether'),
        gasPrice,
      });

      const transaction = {
        data: request,
        to: sourceConfig.contractAddress,
        gasLimit,
        gasPrice,
        from: wallet.address,
        value: parseUnits('0.01', 'ether'),
      };

      const result = await wallet.sendTransaction(transaction);
      console.log(`✅ [ ${moment().format('HH:mm:ss')} ] Transaction successful from ${isArbtSource ? 'Arbitrum' : 'Optimism'} to ${destinationChain}!`.green);
      console.log(`🔗 [ ${moment().format('HH:mm:ss')} ] Transaction hash: ${sourceConfig.explorerUrl}${result.hash}`.green);

      fs.appendFileSync(TOKEN_FILE_PATH, `${sourceConfig.explorerUrl}${result.hash}\n`);
      console.log('✅ Transaction hash URL has been saved to RANDOM_TX_HASH.txt.'.green);
      console.log('');

      totalSuccess++;

      
      const delayDuration = getRandomDelay(10000, 20000);
      console.log(`⏳ Waiting for ${delayDuration / 1000} seconds before the next transaction...`.yellow);
      await new Promise(resolve => setTimeout(resolve, delayDuration));
    } catch (error) {
      console.log(`❌ [ ${moment().format('HH:mm:ss')} ] Error during transaction: ${error}`.red);
    }
  }

  console.log('');
  console.log(`🎉 [ ${moment().format('HH:mm:ss')} ] All ${numTx} transactions are complete!`.green);
  console.log(`📢 [ ${moment().format('HH:mm:ss')} ] Subscribe: https://t.me/HappyCuanAirdrop`.green);
})();
