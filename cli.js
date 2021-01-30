#!/usr/bin/env node
const process = require('process')
const lib = require('./lib')
const [,, ...ports] = process.argv
lib(ports)