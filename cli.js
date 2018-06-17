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

if (cli.flags.name.length > 16) {
	console.log('name needs to be 16 char or less :)')
	process.exit()
}

if (cli.flags.host && cli.flags.name) {
	let port = 1234

	let index = cli.flags.host.indexOf(':')
	if (index !== -1) {
		port = cli.flags.host.slice(index + 1, cli.flags.host.length)
		cli.flags.host = cli.flags.host.slice(0, index)
	}

	multiplayer(cli.flags.host, port, cli.flags.name)
} else {
	singleplayer()
}
