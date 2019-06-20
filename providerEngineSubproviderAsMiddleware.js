const EventEmitter = require('events')
const SofQuery = require('sof-query')
const sofUtil = require('sophonjs-util')

// this is a really minimal shim
// not really tested, i hope it works
// sorry

module.exports = providerEngineSubproviderAsMiddle


function providerEngineSubproviderAsMiddle({ subprovider, provider, blockTracker }) {
  const sofQuery = new SofQuery(provider)
  // create a provider-engine interface
  const engine = new EventEmitter()
  // note: sofQuery fills in omitted params like id
  engine.sendAsync = sofQuery.sendAsync.bind(sofQuery)
  // forward events
  blockTracker.on('sync', engine.emit.bind(engine, 'sync'))
  blockTracker.on('latest', engine.emit.bind(engine, 'latest'))
  blockTracker.on('block', engine.emit.bind(engine, 'rawBlock'))
  blockTracker.on('block', (block) => engine.emit('block', toBufferBlock(block)))
  // set engine
  subprovider.setEngine(engine)

  // create middleware
  return (req, res, next, end) => {
    // send request to subprovider
    subprovider.handleRequest(req, subproviderNext, subproviderEnd)
    // adapter for next handler
    function subproviderNext(nextHandler) {
      if (!nextHandler) return next()
      next((done) => {
        nextHandler(res.error, res.result, done)
      })
    }
    // adapter for end handler
    function subproviderEnd(err, result) {
      if (err) return end(err)
      if (result)
      res.result = result
      end()
    }
  }
}

function toBufferBlock (jsonBlock) {
  return {
    number:           sofUtil.toBuffer(jsonBlock.number),
    hash:             sofUtil.toBuffer(jsonBlock.hash),
    parentHash:       sofUtil.toBuffer(jsonBlock.parentHash),
    nonce:            sofUtil.toBuffer(jsonBlock.nonce),
    sha3Uncles:       sofUtil.toBuffer(jsonBlock.sha3Uncles),
    logsBloom:        sofUtil.toBuffer(jsonBlock.logsBloom),
    transactionsRoot: sofUtil.toBuffer(jsonBlock.transactionsRoot),
    stateRoot:        sofUtil.toBuffer(jsonBlock.stateRoot),
    receiptsRoot:     sofUtil.toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
    miner:            sofUtil.toBuffer(jsonBlock.miner),
    difficulty:       sofUtil.toBuffer(jsonBlock.difficulty),
    totalDifficulty:  sofUtil.toBuffer(jsonBlock.totalDifficulty),
    size:             sofUtil.toBuffer(jsonBlock.size),
    extraData:        sofUtil.toBuffer(jsonBlock.extraData),
    gasLimit:         sofUtil.toBuffer(jsonBlock.gasLimit),
    gasUsed:          sofUtil.toBuffer(jsonBlock.gasUsed),
    timestamp:        sofUtil.toBuffer(jsonBlock.timestamp),
    transactions:     jsonBlock.transactions,
  }
}