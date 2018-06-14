#!/usr/bin/env node
'use strict'

const meow = require('meow')

const multiplayer = require('./multiplayer.js')
const singleplayer = require('./singleplayer.js')

const cli = meow(`
	Usage
	  $ typeracer

	Options
	  --host, -h  Host name or address of typeracer server
	  --name, -n  Your player name

	Examples
	  $ typeracer
	  $ typeracer -h enra.me -n enra
`, {
	flags: {
		host: {
			type: 'string',
			alias: 'h'
		},
		name: {
			type: 'string',
			alias: 'n'
		}
	}
})

if (cli.flags.host && cli.flags.name === undefined) {
	console.log('please specify your name with -n <name>')
	process.exit()
}

if (cli.flags.name && cli.flags.host === undefined) {
	console.log('please specify your host with -h <name/address>')
	process.exit()
}

if (cli.flags.host && cli.flags.name) {
	multiplayer(cli.flags.host, cli.flags.name)
} else {
	singleplayer()
}
