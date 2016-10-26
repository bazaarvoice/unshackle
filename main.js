'use strict'
/* eslint-disable no-console */

const cp = require('child_process')

let blockingPromise = Promise.resolve()

let unblock = {
  resolve: blockingPromise.resolve
}

process.openStdin().addListener('data', input => {
  input = input.toString().trim()
  if (unblock.resolve && input === unblock.on ||
      Array.isArray(unblock.on) && unblock.on.indexOf(input) !== -1) {
    unblock.resolve(input)
    delete unblock.resolve
  }
  else if (unblock.resolve) {
    const choices = Array.isArray(unblock.on) ? unblock.on : [unblock.on]
    console.log(`Choose from [${choices.join(', ')}] to continue, or Ctrl+C to force-quit.`)
  }
})

let skipToMark

function wrap (mark, previous, body, skippable = true) {
  previous = previous || Promise.resolve()
  if (skipToMark && skipToMark === mark) {
    skipToMark = false
  }

  if (skippable && skipToMark && skipToMark !== mark) {
    return previous
  }

  return previous.then(result => {
    if (mark) {
      console.log(`[${mark}]`)
    }

    return result
  })
  .then(body)
  .then(output => {
    console.log('')
    return output
  })
}

function step () {
  // Some steps may not be skippable, like cd'ing into the right directory.
  let mark, command, required
  if (arguments.length === 1) {
    command = arguments[0]
  }
  else if (arguments.length === 2 && typeof arguments[1] === 'boolean') {
    [command, required] = arguments
  }
  else if (arguments.length === 2) {
    [mark, command] = arguments
  }
  else {
    [mark, command, required] = arguments
  }

  let body
  if (typeof command === 'function') {
    body = command
  }
  else {
    body = () => {
      console.log(`$ ${command}`)
      return new Promise(resolve => {
        const execution = cp.exec(command, (error, stdout) => {
          if (error) {
            console.error(error.stack)
            process.exit(1)
          }

          stdout = stdout.trim()

          if (!stdout) {
            console.log('no output')
          }

          resolve(stdout)
        })

        const log = (message, logFn) => {
          message = message.trim()
          if (message) {
            logFn(message)
          }
        }

        execution.stdout.on('data',  d => log(d, console.log))
        execution.stderr.on('data',  e => log(e, console.error))
      })
    }
  }

  return apiify(wrap(mark, this.promise, body, !required))
}

function prompt () {
  let message, mark, choices
  if (arguments.length === 1) {
    message = arguments[0]
  }
  else if (arguments.length === 2 && typeof arguments[1] === 'string') {
    [mark, message] = arguments
  }
  else if (arguments.length === 2) {
    [message, choices] = arguments
  }
  else {
    [mark, message, choices] = arguments
  }

  return apiify(wrap(mark, this.promise, () => {
    return new Promise(resolve => {
      choices = choices || ['y']
      console.log(`${message} [${choices.join(', ')}]`)
      unblock.on = choices
      unblock.resolve = resolve
    })
  // For now, prompt steps are always required.
  }, false))
}

function print () {
  let mark, message
  if (arguments.length > 1) {
    [mark, message] = arguments
  }
  else {
    message = arguments[0]
  }

  return apiify(wrap(mark, this.promise, () => {
    console.log(message)
  }))
}

function apiify (promise) {
  return {
    start: start,
    done: function (msg) {
      promise.then(() => halt(0, msg)).catch(this.fail)
    },
    run: step,
    promise: promise,
    prompt: prompt,
    print: print,
    fail: msg => halt(1, msg)
  }
}

function halt (code, message) {
  if (message) {
    const fn = (code === 0 ? 'log' : 'error')
    console[fn](message)
  }

  process.exit(code)
}

let started = false
function start (message, mark) {
  if (started) {
    this.fail('The start method should only be called once.')
  }
  started = true
  message = message || 'Starting a release.'
  skipToMark = mark

  console.log(`${message}\n`)

  return apiify(Promise.resolve())
}

module.exports = apiify(Promise.resolve())
