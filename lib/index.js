'use strict'

const os = require('os')
const pkg = require('../package')
const { exec } = require('child_process')
const process = require('process')

const commands = {
  unix: 'lsof -i:',
  win: 'netstat -ano | findstr '
}

const callbacks = {
  unix: (stdout) => {
    if(!stdout) return {}

    const pidsByPorts = {}
    const lines = stdout.toString().split(/\n/g)
    const headers = lines.shift().split(/\s+/g)
    const nameIndex = headers.indexOf('NAME')
    const pidIndex = headers.indexOf('PID')
 
    if (nameIndex === -1) {
      throw new Error('NAME not found in headers.')
    }
    if (pidIndex === -1) {
      throw new Error('PID not found in headers.')
    }

    // connexion state has to be manually appended
    headers.push('STATE')

    for (let i = 0; i < lines.length; i++) {
      let fields = lines[i].split(/\s+/g)

      if (fields.length === headers.length) {
        let connexionEdges = fields[nameIndex].split('->')
        let originName = connexionEdges[0]

        if (originName.indexOf(':') !== -1) {
          let originPort = originName.split(':').pop()
          
          if (!pidsByPorts[originPort]) pidsByPorts[originPort] = []
          if (pidsByPorts[originPort].indexOf(fields[pidIndex]) === -1) pidsByPorts[originPort].push(fields[pidIndex])
        }
      }
    }
  
    return pidsByPorts
  },
  win: (stdout) => {
    if(!stdout) return {}

    const pidsByPorts = {}
    const lines = stdout.toString().split(/\n/g)
    const headers = ['Proto', 'Local Address', 'Foreign Address', 'State', 'PID']
    const localIndex = headers.indexOf('Local Address')
    const pidIndex = headers.indexOf('PID')
 
    if (localIndex === -1) {
      throw new Error('Local Address index not found in headers.')
    }
    if (pidIndex === -1) {
      throw new Error('PID not found in headers.')
    }

    for (let i = 0; i < lines.length; i++) {
      let fields = lines[i].trim().split(/\s+/g)

      // don't consider idle process ( PID == 0 )
      if (fields.length === headers.length && fields[pidIndex] !== '0') {
        let port = fields[localIndex].split(':').pop()        
        if (!pidsByPorts[port]) pidsByPorts[port] = []
        if (pidsByPorts[port].indexOf(fields[pidIndex]) === -1) pidsByPorts[port].push(fields[pidIndex])
      }
    }

    return pidsByPorts
  }
}

const getCommand = (options) => {
  options = options || {}
  const platform = options.platform || os.platform()
  switch(platform) {
    case 'win32':
      return commands['win']
    case 'darwin':
    case 'linux':
    default:
      return commands['unix']
  }
}

const getCallback = (options) => {
  options = options || {}
  const platform = options.platform || os.platform()
  switch(platform) {
    case 'win32':
      return callbacks['win']
    case 'darwin':
    case 'linux':
    default:
      return callbacks['unix']
  }
}

const execCommand = (command, callback) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error && error.code === 1) {
        if(error.code === 1) return resolve(callback(''))   
        console.error(error)
        return reject(error)
      }
      if (stderr) {
        console.error(stderr)
        return resolve(callback(stdout))
      }

      return resolve(callback(stdout))
    })
  })
}

const getPidsByPorts = async (ports, options) => {
  options = options || {}

  if(!Array.isArray(ports)) ports = [ports]

  const command = getCommand(options)
  if (!command) {
    throw new Error('platform is not supported.')
  }

  const pids = await Promise.all(ports.map(async (port) => {
    const pidsByPort = await execCommand(command + port, getCallback())
    const flattenedPids = Object.values(pidsByPort).flat()
    return flattenedPids.filter((pid, i) => flattenedPids.indexOf(pid) === i)
  }))

  return pids.flat()
}

const killports = async function (ports, options) {
  if (Array.isArray(ports)) {
    const pids = await getPidsByPorts(ports, options)
    const killed = pids.reduce((allKilled, pid) => { return process.kill(pid) && allKilled }, true)
    return killed ? 0 : 1
  } else {
    const pids = await getPidsByPorts(ports, options)
    return process.kill(pids[0]) ? 0 : 1
  }
}

module.exports = killports
module.exports.getPidsByPorts = getPidsByPorts
module.exports.commands = commands
module.exports.version = pkg.version