const net = require('net')
const process = require('process')

const server = net.createServer(function (sock) {
  sock.end('pong')
})

server.listen(0, function () {
  const port = server.address().port
  const pid = process.pid
  if(process.send) process.send({ port, pid })
})

process.on('message', (message)=>{
  if(message === 'stop') process.exit()
})