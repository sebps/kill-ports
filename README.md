killports
==========

A lightweight library to kill processes listening to a list of ports using cli or nodejs module 

<!-- TOC -->
- [Module usage](#module-usage)
- [CLI usage](#cli-usage)
- [License](#license)
<!-- /TOC -->

## Module usage

```sh
$ npm install killports
```

```js
const killports = require('killports')
const ports = [3000, 3001, 3002]
killports(ports)
```

## CLI Usage

```sh
$ npm install -g killports
```
```sh
$ killports 3000 3001 3002
```

## License

ISC

[npm-url]: https://www.npmjs.com/package/killports
