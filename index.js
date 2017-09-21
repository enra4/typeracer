const chalk = require('chalk')
const DraftLog = require('draftlog')
const fuzzy = require('fuzzy')
const inquirer = require('inquirer')
const keypress = require('keypress')
const quotes = require('./quotes').quotes

const stdin = process.stdin
DraftLog(console)
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

let longAssString = ''
let userString = []

let finished = false
let wpm = 0
let time = -2
let typeMistakes = 0

let updateString
let updateWpm
let updateTime
let updateAcc

let prevQuoteID

const quoteStrings = []
for (const obj of quotes) {
	quoteStrings.push(obj.quote)
}

main()

function main() {
	inquirer.prompt({
		type: 'list',
		name: 'whatdo',
		message: 'What do you want to do?',
		choices: [
			'Random quote',
			'Pick quote'
		]
	}).then(answer => {
		if (answer.whatdo === 'Random quote') {
			const quoteID = Math.ceil(Math.random() * quotes.length)
			play(quoteID)
			return
		}

		if (answer.whatdo === 'Pick quote') {
			pickQuote()
		}
	}).catch(e => {console.log(e)})
}

let test = ['aaa', 'abc', 'abb']

function pickQuote() {
	inquirer.prompt({
		type: 'autocomplete',
		name: 'whatQuote',
		message: 'Pick quote',
		source: (answersSoFar, input) => {
			input = input || ''
			return new Promise(resolve => {
				setTimeout(() => {
					const fuzzyResult = fuzzy.filter(input, quoteStrings)
					resolve(fuzzyResult.map(el => {return el.original}))
				}, 100)
			})
		}
	}).then(answers => {
		play(quoteStrings.indexOf(answers.whatQuote) + 1)
	})
}

function play(quoteID) {
	prevQuoteID = quoteID

	longAssString = quotes[quoteID - 1].quote
	userString = []

	finished = false
	wpm = 0
	time = -2
	typeMistakes = 0

	updateString = console.draft(longAssString)
	updateWpm = console.draft('wpm: ')
	updateTime = console.draft('time: ')
	updateAcc = console.draft('acc: ')

	stdin.on('keypress', onKeypress)
	stdin.setRawMode(true)
	stdin.resume()

	interval = setInterval(() => {
		if (!finished) {
			time += 0.1
			if (userString.length > 0) wpm = userString.join('').split(' ').length / (time / 60)

			let acc = 100
			if (typeMistakes !== 0) {
				acc = Math.round(((userString.length - typeMistakes) / userString.length) * 1000) / 10
			}

			let timeColour = 'white'
			if (time < -1) timeColour = 'red'
			else if (time < 0) timeColour = 'yellow'
			else if (time < 1) timeColour = 'green'

			updateWpm('wpm: ' + Math.round(wpm * 10) / 10)
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
		if (userString.length < longAssString.length) userString.push(ch)
	}

	let updatedString = longAssString.split('')
	for (let i = 0; i < userString.length; i++) {
		if (userString[i] === updatedString[i]) {
			updatedString[i] = chalk.blue(updatedString[i])
		} else {
			updatedString[i] = chalk.bgRed(updatedString[i])
			typeMistakes++
		}
	}

	updateString(updatedString.join(''))

	if (userString.join('') === longAssString) {
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
			if (answer.whatdo === 'Retry') {
				console.clear()
				play(prevQuoteID)
				return
			}

			if (answer.whatdo === 'Go back') {
				console.clear()
				main()
				return
			}
		})
	}
}
