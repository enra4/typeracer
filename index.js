const chalk = require('chalk')
const draftLog = require('draftlog')
const fuzzy = require('fuzzy')
const inquirer = require('inquirer')
const quotes = require('./quotes').quotes

const stdin = process.stdin
const stdout = process.stdout
draftLog(console)
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

// draftlog cant update if the string is more than one line,
// so we split the quotes into lines of 50 char per line.
// feel free to change this value.
const MAX_WORDS_PER_LINE = 12

let quoteStrings = []
let userString = []

let timeStarted
let finished = false
let onMistake = false
let wpm = 0
let time = -2
let typeMistakes = 0

let updateStrings = []
let updateWpm
let updateTime
let updateAcc

let prevQuoteID

const allQuotes = []
for (const obj of quotes) {
	allQuotes.push(obj.quote)
}

stdout.write('\u001B[2J\u001B[0;0f')
main()

function main() {
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
		}
	}).catch(err => {
		console.log(err)
	})
}

function pickQuote() {
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

function play(quoteID) {
	prevQuoteID = quoteID

	quoteStrings = []
	userString = []

	timeStarted = Date.now() + 2000
	finished = false
	onMistake = false
	wpm = 0
	time = -2
	typeMistakes = 0

	updateStrings = []

	let quoteString = quotes[quoteID - 1].quote.split(' ')
	for (let i = 0; i < quoteString.length; i += MAX_WORDS_PER_LINE) {
		let line = quoteString.slice(i, i + MAX_WORDS_PER_LINE).join(' ')
		// add space at end of line
		if (!(i + MAX_WORDS_PER_LINE > quoteString.length)) line += ' '
		quoteStrings.push(line)
		updateStrings.push(console.draft(line))
	}

	updateWpm = console.draft('wpm: ')
	updateTime = console.draft('time: ')
	updateAcc = console.draft('acc: ')

	stdin.on('keypress', onKeypress)
	stdin.setRawMode(true)
	stdin.resume()

	const interval = setInterval(() => {
		if (!finished) {
			time = (Date.now() - timeStarted) / 1000
			if (userString.length > 0) wpm = userString.join('').split(' ').length / (time / 60)

			let acc = 100
			if (typeMistakes !== 0) {
				acc = Math.round(((userString.length - typeMistakes) / userString.length) * 1000) / 10
			}

			let timeColour = 'white'
			if (time < -1) timeColour = 'red'
			else if (time < 0) timeColour = 'yellow'
			else if (time < 1) timeColour = 'green'

			updateWpm('wpm: ' + (Math.round(wpm * 10) / 10))
			updateTime('time: ' + chalk[timeColour](Math.round(time * 10) / 10) + 's')
			updateAcc('acc: ' + acc + '%')
		} else {
			clearInterval(interval)
		}
	}, 100)
}

function onKeypress(ch, key) {
	if (time < 0) return
	if (key && key.name === 'escape') process.exit()
	if (key && key.name === 'backspace') {
		if (userString.length === 0) return
		userString.pop()
	} else {
		if (userString.length < quoteStrings.join('').length) userString.push(ch)
	}

	let countedMistakes = 0

	let updatedString = quoteStrings.join('').split('')
	for (let i = 0; i < userString.length; i++) {
		if (userString[i] === updatedString[i]) {
			if (countedMistakes > 0) updatedString[i] = chalk.bgRed(updatedString[i])
			else updatedString[i] = chalk.blue(updatedString[i])
		} else {
			updatedString[i] = chalk.bgRed(updatedString[i])
			countedMistakes++
			if (!onMistake) {
				onMistake = true
				typeMistakes++
			}
		}
	}

	if (countedMistakes === 0) onMistake = false

	updatedString = updatedString.join('').split(' ')
	for (let i = 0; i < updatedString.length; i += MAX_WORDS_PER_LINE) {
		let line = updatedString.slice(i, i + MAX_WORDS_PER_LINE).join(' ')
		// add space at end of line
		if (!(i + MAX_WORDS_PER_LINE > updatedString.length)) line += ' '
		updateStrings[i / MAX_WORDS_PER_LINE](line)
	}

	if (userString.join('') === quoteStrings.join('')) {
		finished = true
		stdin.removeListener('keypress', onKeypress)
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
			}
		})
	}
}
