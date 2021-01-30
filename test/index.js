const expect = require('chai').expect
const lib = require('../lib')
const net = require('net')
const process = require('process')
const { fork } = require('child_process')

describe('Kill Ports Tests', function () {
  this.timeout(500000)

  describe('Single Port', function () {
    before((done) => {
      global.pid = process.pid
      global.server = fork(__dirname + '/mockServer')
      global.server.on('message', ({ port, pid }) => {
        global.serverPort = port
        global.serverPid = pid
        done()
      })
    })

    it('Server forked', function (done) {
      expect(global.pid).to.not.equal(global.serverPid, 'the server pid is not different from the current process.')
      done()
    })

    it('Server responding', function (done) {
      const client = new net.Socket()
      client.connect(global.serverPort, '127.0.0.1', function () {
        client.write('ping')
      })
      client.on('data', function (data) {
        const response = data.toString()
        expect(response).to.equal('pong', 'the server response is wrong.')
        client.destroy()
      })
      client.on('close', function () {
        done()
      })
    })

    it('Free server port', function (done) {
      lib(global.serverPort).then((result) => {
        expect(result).to.equal(0, 'the command failed.')
        done()
      })
    })
  })

  describe('Multiple Ports', function () {
    const portsAmount = 10

    before((done) => {
      global.pid = process.pid
      global.servers = []
      global.serverPorts = []
      global.serverPids = []

      Promise.all([...Array(portsAmount).keys()].map((i) => {
        return new Promise((resolve) => {
          global.servers.push(fork(__dirname + '/mockServer'))
          global.servers[i].on('message', ({ port, pid }) => {
            global.serverPorts.push(port)
            global.serverPids.push(pid)
            resolve()
          })
        })
      })).then(() => {
        done()
      })
    })

    it('Servers forked', function (done) {
      const isPidEqual =  global.serverPids.some(pid => global.pid === pid)
      expect(isPidEqual).to.equal(false, 'one server pid is not different from the current process.')
      done()
    })

    it('Servers responding', function (done) {
      Promise.all(global.serverPorts.map((port) => {
        return new Promise((resolve, reject) => {
          let client = new net.Socket()
          client.connect(port, '127.0.0.1', function () {
            client.write('ping')
          })
          client.on('data', function (data) {
            let response = data.toString()
            expect(response).to.equal('pong', 'the server response is wrong.')
            client.destroy()
          })
          client.on('close', function () {
            resolve()
          })
        })
      })).then(() => {
        done()
      })
    })

    it('Free the servers ports', function (done) {
      lib(global.serverPorts).then((result) => {
        expect(result).to.equal(0, 'the command failed.')
        done()
      })
    })
  })
})