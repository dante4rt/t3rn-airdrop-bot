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


const CHAIN_CODES = {
  'Base': '1',
  'Blast': '2',
  'Optimism': 'opsp',
  'Arbitrum': 'arbt'
};

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const checkBalance = async (provider, address) => {
  const balance = await provider.getBalance(address);
  const balanceInEth = ethers.formatUnits(balance, 'ether');
  console.log(`🔍 [ ${moment().format('HH:mm:ss')} ] Current balance of ${address}: ${balanceInEth} ETH`.cyan);
  return balanceInEth;
};

const createTransaction = async (wallet, sourceConfig, request) => {
  const gasPrice = parseUnits('0.1', 'gwei');
  const gasLimit = await sourceConfig.provider.estimateGas({
    to: sourceConfig.contractAddress,
    data: request,
    value: parseUnits('0.01', 'ether'),
    gasPrice
  });

  return {
    data: request,
    to: sourceConfig.contractAddress,
    gasLimit,
    gasPrice,
    from: wallet.address,
    value: parseUnits('0.01', 'ether') 
  };
};

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
      const sourceChainCode = isArbtSource ? 'Arbitrum' : 'Optimism';
      
      let destinationChainCode = getRandomElement(Object.keys(CHAIN_CODES).filter(d => d !== sourceChainCode));
      const destinationChain = CHAIN_CODES[destinationChainCode];

      const wallet = new Wallet(PRIVATE_KEYS[totalSuccess % PRIVATE_KEYS.length], sourceConfig.provider);

      console.log(`⚙️ [ ${moment().format('HH:mm:ss')} ] Preparing to perform transaction from ${sourceChainCode} to ${destinationChainCode}...`.yellow);

      const balanceInEth = await checkBalance(sourceConfig.provider, wallet.address);
      if (balanceInEth < 0.01) {
        console.log(`❌ [ ${moment().format('HH:mm:ss')} ] Insufficient balance (💰 ${balanceInEth} ETH). Please claim faucet first!`.red);
        process.exit(0);
      }

      const amount = await sourceConfig.getAmount(destinationChain);
      if (!amount) {
        console.log(`❌ Failed to get the amount. Skipping transaction...`.red);
        continue;
      }

      const request = sourceConfig.transactionData(wallet.address, amount.hex, destinationChain);
      const transaction = await createTransaction(wallet, sourceConfig, request);

      const result = await wallet.sendTransaction(transaction);
      console.log(`✅ [ ${moment().format('HH:mm:ss')} ] Transaction successful from ${sourceChainCode} to ${destinationChainCode}!`.green);
      console.log(`🔗 [ ${moment().format('HH:mm:ss')} ] Transaction hash: ${sourceConfig.explorerUrl}${result.hash}`.green);

      fs.appendFileSync(TOKEN_FILE_PATH, `${sourceConfig.explorerUrl}${result.hash}\n`);
      console.log('✅ Transaction hash URL has been saved to RANDOM_TX_HASH.txt.'.green);
      console.log('');

      totalSuccess++;

      const delayDuration = getRandomDelay(15000, 30000); 
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
