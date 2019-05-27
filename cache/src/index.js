import Web3 from 'web3'
import dotenv from 'dotenv/config'

import Hashids from 'hashids'

import { pRateLimit } from 'p-ratelimit'
import Dett from './dett.js'
import fs from 'fs'
import { parseText } from './utils.js'

import keythereum from 'keythereum'
import keystore from '../keystore.json'
const keypassword = process.env.KEY_PASSWORD
const privateKey = keythereum.recover(keypassword, keystore)

// cache init
const cacheweb3 = new Web3(process.env.RPC_URL)
const account = cacheweb3.eth.accounts.privateKeyToAccount(`0x${privateKey.toString('hex')}`)
const contractOwner = account.address
cacheweb3.eth.accounts.wallet.add(account)

// dett init
const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://mainnet-rpc.dexon.org/ws'))
const dett = new Dett(web3)
dett.init(Web3)

const rpcRateLimiter = pRateLimit({
  interval: 2500,
  rate: 1,
  concurrency: 1,
})

async function shortArticleHash(tx) {
  const transaction = await mainnet.eth.getTransaction(tx)

  // check transaction to address is bbs contract
  if (!dett.isDettTx(transaction.to)) return null

  const hashids = new Hashids('DEXON_BBS', 6, 'abcdefghijklmnopqrstuvwxyz1234567890')
  const oriId = hashids.encode(cacheNet.utils.hexToNumberString(tx))
  const hex = cacheNet.utils.padLeft(cacheNet.utils.toHex(oriId), 64)
  // const mapId = cacheNet.utils.hexToUtf8(hex)
  // console.log([transaction.blockNumber, tx, oriId, mapId, hex])
  console.log(tx)
  // console.log(await shortURLandMilestone.methods.link(tx, hex, transaction.blockNumber))
  await Promise.resolve([
    shortURLandMilestone.methods.link(tx, hex, transaction.blockNumber).send({
      from: contractOwner,
      gas: 210000,
    }).on('confirmation', (confirmationNumber, receipt) => {
      if (confirmationNumber == 1)
        console.log(receipt)
    }).catch(err => {
      console.log(err)
    })
  ])
}

async function getArticles(block) {
  const events = await BBS.getPastEvents('Posted', {fromBlock : block})

  events.forEach(async (event) => {
    // console.log(await shortURLandMilestone.methods.links(event.transactionHash).call())
    if (await shortURLandMilestone.methods.links(event.transactionHash).call() == '0x0000000000000000000000000000000000000000000000000000000000000000') {
      await rpcRateLimiter(() => shortArticleHash(event.transactionHash))
    }
  })
}

async function addMilestone(block, time) {
  await Promise.resolve([
    shortURLandMilestone.methods.addMilestone(block, time).send({
      from: contractOwner,
      gas: 210000,
    }).on('confirmation', (confirmationNumber, receipt) => {
      if (confirmationNumber == 1)
        console.log(receipt)
    }).catch(err => {
      console.log(err)
    })
  ])
}

async function checkMilestones() {
  const time = await shortURLandMilestone.methods.time().call()
  const eventFrom = time.toString() ? time.toString() : '0'
  // console.log(eventFrom.toString())
  const events = await shortURLandMilestone.getPastEvents('Link', { fromBlock : eventFrom })
  // console.log(events)
  let eventBlocks = events.map((event) => {
      return event.returnValues['time'].toString()
  })
  // console.log(eventBlocks)

  let countPost = {}
  eventBlocks.forEach((x) => { countPost[x] = (countPost[x] || 0) + 1 })
  // console.log(countPost)

  let pageSize = 0
  Object.keys(countPost).forEach(async (block) => {
    pageSize += countPost[block]
    // console.log(pageSize)
    if (pageSize >= dett.perPageLength) {
      pageSize = 0

      const time = events.map((event) => {
          return event.returnValues['time'].toString() == block ? event.blockNumber : null
      }).slice().reverse().find(function(element) {
        return element != null
      })
      // console.log(time)

      await rpcRateLimiter(() => addMilestone(block, time))
      // console.log(block)
    }
  })

  /*
  // way to make 10 posts per page
  const articlesPerPage = 10
  for (let i = 0 ; i < events.length ; i++) {
    if ((i + 1) % articlesPerPage == 0) {
      await shortURLandMilestone.methods.addMilestone(events[i].returnValues['time']).send({
        from: contractOwner,
      }).catch(err => {
        console.log(err)
      })
    }
  }

  events.forEach(event => {
    console.log('long: ' + event.returnValues['long'] + ', short: ' + dexonTestnet.utils.hexToUtf8(event.returnValues['short']))
  })
  */
}


async function cache(block) {
  const events = await BBS.getPastEvents('Posted', {fromBlock : block})
  events.forEach(async (event) => {
    // console.log(await shortURLandMilestone.methods.links(event.transactionHash).call())
    const shortLinkHex = await shortURLandMilestone.methods.links(event.transactionHash).call()
    // console.log(shortLinkHex)
    if (shortLinkHex != '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const article = await dett.getArticle(event.transactionHash, false).catch(console.log)
      const shortLink = cacheNet.utils.hexToUtf8(shortLinkHex)
      const title = article.title
      const url = 'https://dett.cc/' + shortLink + '.html'
      const description = parseText(article.content, 160).replace(/\n|\r/g, ' ')
      const cacheMeta = { 'Cache - DEXON BBS': title, 'https://dett.cc/cache.html': url, 'Cache Cache Cache Cache Cache': description }
      const reg = new RegExp(Object.keys(cacheMeta).join("|"),"gi")
      const template = fs.readFileSync('build/cache.html', 'utf-8')
      const cacheFile = template.replace(reg, (matched) => {
        return cacheMeta[matched]
      });
      const fileName = 'build/' + shortLink + '.html'

      fs.writeFileSync(fileName, cacheFile, 'utf8')
    }
  })
}


const main = async () => {
  const milestones = await dett.BBSCache.methods.getMilestones().call()
  // console.log(milestones)

  const fromBlock = dett.fromBlock
  const events = await dett.BBS.getPastEvents('Posted', {fromBlock : fromBlock})
  const linkEvents = await dett.BBSCache.getPastEvents('Link', {fromBlock : fromBlock})
  // console.log(linkEvents)

  // first get milestone
  // get last milesotne to latest block events
  // generate new milestone

  events.forEach( async (event, i) => {
    let a =  await shortURLandMilestone.methods.links(event.transactionHash).call()
    console.log(a)
    // if (await shortURLandMilestone.methods.links(event.transactionHash).call() == '0x0000000000000000000000000000000000000000000000000000000000000000') {
      // await rpcRateLimiter(() => shortArticleHash(event.transactionHash))
    // }



  })



  // generate new short link




  // console.log(events)
  // const postFrom = milestones.length ? milestones[milestones.length-1] * 1 + 1 : '1170000'
  // await getArticles(postFrom)
  // await checkMilestones()
  // await cache(dett.fromBlock)


  /*
  await shortURLandMilestone.methods.clearMilestone().send({
    from: contractOwner,
    gasPrice: 6000000000,
    gas: 120000,
  })
  */
  return
}

main()