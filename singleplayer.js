#!/usr/bin/env node

const fs = require('fs')
const os = require('os')

const chalk = require('chalk')
const fuzzy = require('fuzzy')
const inquirer = require('inquirer')
const logUpdate = require('log-update')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const stringLength = require('string-length')

const quotes = require('./quotes').quotes
const allQuotes = []
for (const obj of quotes) {
	allQuotes.push(obj.quote)
}

const stdin = process.stdin
const stdout = process.stdout
stdin.setRawMode(true)
stdin.resume()
require('readline').emitKeypressEvents(stdin)
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

// if old file exist move to new one
// new file must also not exist, or else something fishy is going on
const oldFileExists = fs.existsSync(`${os.homedir()}/typeracer-records.json`)
const newFileExists = fs.existsSync(`${os.homedir()}/.typeracer-records.json`)
if (oldFileExists && !newFileExists) {
	const content = fs.readFileSync(`${os.homedir()}/typeracer-records.json`)
	fs.writeFileSync(`${os.homedir()}/.typeracer-records.json`, content, 'utf8')
	fs.unlinkSync(`${os.homedir()}/typeracer-records.json`)
}

const adapter = new FileSync(`${os.homedir()}/.typeracer-records.json`)
const db = low(adapter)

db.defaults({records: []})
	.write()

let prevQuoteID
let quote = 'hey man this is some typetesting'
let typedString = ''
let typeMistakes = 0
let finished = true
let onMistake = false
let timeStarted = 0

let wpm = 0
let acc = 100
let time = 0

// if terminal is resized to smaller
// clear terminal and update
stdout.on('resize', () => {
	// only if playing
	if (!finished) {
		// clear terminal
		stdout.write('\u001B[2J\u001B[0;0f')
		update()
	}
})

const colourify = (quote, typedString) => {
	let colouredString = ''
	let redNext = false

	const quoteLetters = quote.split('')
	const typedLetters = typedString.split('')
	for (let i = 0; i < typedLetters.length; i++) {
		// if a single mistake,
		// the rest of the coloured string will appear red
		if (redNext) {
			colouredString += chalk.bgRed(quoteLetters[i])
			continue
		}

		if (typedLetters[i] === quoteLetters[i]) {
			redNext = false
			colouredString += chalk.blue(quoteLetters[i])
			if (quote === typedString) {
				finished = true
			}
		} else {
			redNext = true
			colouredString += chalk.bgRed(quoteLetters[i])
		}
	}

	return colouredString
}

// checks if a space is needed
const spaceOrNot = (words, index) => {
	let string = ''
	if (index === words.length - 1) {
		string = `${words[index]}`
	} else {
		string = `${words[index]} `
	}

	return string
}

// makes sure quote fits to terminal size
const fitify = string => {
	const words = string.split(' ')
	const formattedLines = ['']
	// default maxwidth is 80
	const maxWidth = (stdout.columns < 80) ? stdout.columns - 1 : 80

	for (let i = 0; i < words.length; i++) {
		const j = formattedLines.length - 1
		if (stringLength(formattedLines[j] + words[i] + ' ') > maxWidth) {
			// new line
			formattedLines.push(spaceOrNot(words, i))
		} else {
			formattedLines[j] += spaceOrNot(words, i)
		}
	}

	// join array together for string
	const formatted = formattedLines.join('\n')
	return formatted
}

const updateAcc = () => {
	let countedMistakes = 0
	for (let i = 0; i < typedString.length; i++) {
		if (typedString[i] !== quote[i]) {
			countedMistakes++
			if (!onMistake) {
				onMistake = true
				typeMistakes++
			}
		}
	}

	if (countedMistakes === 0) {
		onMistake = false
	}

	// dont remember how this works but im just gonna leave it
	if (typeMistakes === 0) {
		acc = 100
	} else {
		acc = Math.round(((typedString.length - typeMistakes) / typedString.length) * 1000) / 10
	}
}

const updateWpm = () => {
	if (typedString.length > 0) {
		wpm = typedString.split(' ').length / (time / 60)
	}
}

const updateTime = () => {
	time = (Date.now() - timeStarted) / 1000
}

const update = () => {
	// colour the typed part
	let updatedString = colourify(quote, typedString)
	// and add the untyped part, uncoloured
	updatedString += quote.slice(typedString.length, quote.length)

	let timeColour = 'white'
	if (time < -1) timeColour = 'red'
	else if (time < 0) timeColour = 'yellow'
	else if (time < 1) timeColour = 'green'

	updatedString = fitify(updatedString)
	logUpdate(
`${updatedString}

wpm: ${Math.round(wpm * 10) / 10}
acc: ${acc}
time: ${chalk[timeColour](Math.round(time * 10) / 10)}s`
	)
}

// done with race
const donezo = () => {
	stdin.removeListener('keypress', onKeypress)
	wpm = Math.round(wpm * 100) / 100 // 2 decimals
	// handle records
	const prevRecord = db.get('records')
		.find({id: prevQuoteID})
		.value()

	// also log description of quote
	console.log('\n' + chalk.inverse(quotes[prevQuoteID - 1].about + '\n'))

	if (!prevRecord) {
		// no record has been previously set
		console.log(chalk.yellow('Set first time record of ') + wpm + 'wpm\n')

		db.get('records')
			.push({id: prevQuoteID, wpm})
			.write()
	} else if (wpm > prevRecord.wpm) {
		// new record
		const difference = Math.round((wpm - prevRecord.wpm) * 100) / 100
		console.log(chalk.magenta('New record! ') + wpm + 'wpm' + chalk.green('+' + difference) + '\n')

		db.get('records')
			.find({id: prevQuoteID})
			.assign({wpm})
			.write()
	}

	inquirer.prompt({
		type: 'list',
		name: 'whatdo',
		message: 'What do you want to do?',
		choices: [
			'Retry',
			'Go back'
		]
	}).then(answer => {
		stdout.write('\u001B[2J\u001B[0;0f')
		switch (answer.whatdo) {
			case 'Retry':
				play(prevQuoteID)
				break
			case 'Go back':
				main()
				break
			default:
				process.exit()
		}
	})
}

const onKeypress = (ch, key) => {
	if (key.ctrl && key.name === 'c') {
		process.exit()
	}

	if (time < 0) return
	if (key && key.name === 'backspace') {
		if (typedString.length === 0) return
		typedString = typedString.slice(0, -1)
	} else if (typedString.length < quote.length) {
		typedString += ch
	}

	// termWidth = wcwidth(typedString)
	update()
}

const play = quoteID => {
	prevQuoteID = quoteID
	// reset stuff
	quote = quotes[quoteID - 1].quote
	typedString = ''
	typeMistakes = 0
	finished = false
	onMistake = false
	timeStarted = Date.now() + 2000

	wpm = 0
	time = -2

	stdin.on('keypress', onKeypress)
	stdin.setRawMode(true)
	stdin.resume()

	const interval = setInterval(() => {
		if (finished) {
			donezo()
			clearInterval(interval)
		} else {
			updateWpm()
			updateTime()
			updateAcc()
			update()
		}
	}, 100)
}

const pickQuote = () => {
	inquirer.prompt({
		type: 'autocomplete',
		name: 'whatQuote',
		message: 'Pick quote',
		source: (answersSoFar, input) => {
			input = input || ''
			return new Promise(resolve => {
				setTimeout(() => {
					const fuzzyResult = fuzzy.filter(input, allQuotes)
					resolve(fuzzyResult.map(el => {
						return el.original
					}))
				}, 100)
			})
		}
	}).then(answers => {
		stdout.write('\u001B[2J\u001B[0;0f')
		play(allQuotes.indexOf(answers.whatQuote) + 1)
	})
}

const main = () => {
	inquirer.prompt({
		type: 'list',
		name: 'whatdo',
		message: 'What do you want to do?',
		choices: [
			'Random quote',
			'Pick quote',
			'Exit'
		]
	}).then(answer => {
		// clear terminal
		stdout.write('\u001B[2J\u001B[0;0f')
		switch (answer.whatdo) {
			case 'Random quote':
				play(Math.ceil(Math.random() * quotes.length))
				break
			case 'Pick quote':
				pickQuote()
				break
			case 'Exit':
				process.exit()
				break
			default:
				process.exit()
		}
	}).catch(err => {
		console.log(err)
	})
}

module.exports = main
