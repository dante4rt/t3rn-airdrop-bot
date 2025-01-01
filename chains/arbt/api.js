const axios = require('axios');
const moment = require('moment');

async function getAmount(chain) {
  try {
    const { data } = await axios({
      url: 'https://pricer.t1rn.io/estimate',
      method: 'POST',
      data: {
        fromAsset: 'eth',
        toAsset: 'eth',
        fromChain: 'arbt',
        toChain: chain === '1' ? 'bssp' : chain === '2' ? 'blss' : 'opsp',
        amountWei: '100000000000000000',
        executorTipUSD: 0,
        overpayOptionPercentage: 0,
        spreadOptionPercentage: 0,
      },
    });

    return data.estimatedReceivedAmountWei;
  } catch (error) {
    console.log(
      `❌ [ ${moment().format('HH:mm:ss')} ] Error in Get Amount: ${error}`.red
    );
    return null;
  }
}

module.exports = { getAmount };
