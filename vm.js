const SofQuery = require('sof-query')
const createVm = require('sophonjs-vm/lib/hooked').fromSusyWebProvider
const blockFromRpc = require('sophonjs-block/from-rpc')
const FakeTransaction = require('sophonjs-tx/fake')
const scaffold = require('./scaffold')

module.exports = createVmMiddleware

function createVmMiddleware ({ provider }) {
  const sofQuery = new SofQuery(provider)

  return scaffold({
    sof_call: (req, res, next, end) => {
      const blockRef = req.params[1]
      sofQuery.getBlockByNumber(blockRef, false, (err, blockParams) => {
        if (err) return end(err)
        // create block
        const block = blockFromRpc(blockParams)
        runVm(req, block, (err, results) => {
          if (err) return end(err)
          const returnValue = results.vm.return ? '0x' + results.vm.return.toString('hex') : '0x'
          res.result = returnValue
          end()
        })
      })
    }
  })

  function runVm (req, block, cb) {
    const txParams = Object.assign({}, req.params[0])
    const blockRef = req.params[1]
    // opting to use blockRef as specified
    // instead of hardening to resolved block's number
    // for compatiblity with sof-json-rpc-ipfs
    // const blockRef = block.number.toNumber()

    // create vm with state lookup intsrcepted
    const vm = createVm(provider, blockRef, {
      enableHomestead: true
    })

    // create tx
    txParams.from = txParams.from || '0x0000000000000000000000000000000000000000'
    txParams.gasLimit = txParams.gasLimit || ('0x' + block.header.gasLimit.toString('hex'))
    const tx = new FakeTransaction(txParams)

    vm.runTx({
      tx: tx,
      block: block,
      skipNonce: true,
      skipBalance: true
    }, function (err, results) {
      if (err) return cb(err)
      if (results.error) {
        return cb(new Error('VM error: ' + results.error))
      }
      if (results.vm && results.vm.exception !== 1 && results.vm.exceptionError !== 'invalid opcode') {
        return cb(new Error('VM Exception while executing ' + req.method + ': ' + results.vm.exceptionError))
      }

      cb(null, results)
    })
  }
}
