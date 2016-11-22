'use strict'
/* eslint-disable no-console */

/** @fileOverview
 * This exports the unshackle API. Unshackle assumes that it is used in such a
 * way that it may assume full control over the process and the user's shell.
 *
 * Calling unshackle.start always returns the unshackle singleton. You
 * should never start more than one release in a single process (if you somehow
 * have that use case).
 */

const cp = require('child_process')

let blockingPromise = Promise.resolve()
let unblock = {
  resolve: blockingPromise.resolve
}
let skipToMark
let started = false

/**
 * Proceeds to the next step, passing the given input along. If the input is
 * not allowed, this prints a message for the user to try again.
 *
 * @param {string} input - command line input from the user
 * @return {void}
 */
function handleInput (input) {
  input = input.toString().trim()
  let inputAllowed

  // unblock.on is a list of allowed input values
  if (Array.isArray(unblock.on)) {
    inputAllowed = unblock.on.indexOf(input) !== -1
  }
  else  {
    inputAllowed = input === unblock.on
  }

  if (unblock.resolve && inputAllowed) {
    unblock.resolve(input)
    delete unblock.resolve
  }
  else if (unblock.resolve) {
    const choices = Array.isArray(unblock.on) ? unblock.on : [unblock.on]
    console.log(`Choose from [${choices.join(', ')}] to continue, or Ctrl+C to force-quit.`)
  }
}

/**
 * Schedules a function to run after prerequisite. Decorates a step with
 * marking capabilities and logging.
 *
 * @param {string} mark - a mark, or undefined, to skip steps until reached
 * @param {Promise} previous - a prequisite promise to block until is resolved
 * @param {function} body - the function body to wrap
 * @param {boolean} [skippable=true] - if false, body will run even if mark has
 * not been reached
 * @returns {Promise} - resolves with the output of body
 */
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

/*
 * Exits the process with the given exit code, first printing a message to the
 * appropriate stdio stream.
 *
 * @param {number} code - 0, or a non-zero integer
 * @param {string} message - a message to print to the user's console
 */
function halt (code, message) {
  if (message) {
    const fn = (code === 0 ? 'log' : 'error')
    console[fn](message)
  }

  process.exit(code)
}

/**
 * The heart of the DSL. This enables the sequential chaining pattern, by
 * wrapping the promise returned by any given step in the entire package's API.
 * The promise is used by the various API methods to block correctly.
 *
 * @param {Promise} promise - a promise that one step of of unshackle returns,
 * which the next should block on.
 * @return {Object} - the full API of the unshackle package, most of which is
 * blocked on the resolution of promise.
 */
function apiify (promise) {
  return {
    promise: promise,
    /**
     * An optional entry point for releases. It prints a message and can only
     * be called once.
     *
     * @param {string} [message="Starting a release."] - a custom message for
     * users of your release script
     * @param {string} [mark] - really only useful as a label
     * @return {Object} - the unshackle API
     */
    start: function (message, mark) {
      if (started) {
        this.fail('The start method should only be called once.')
      }
      started = true
      message = message || 'Starting a release.'
      skipToMark = mark

      console.log(`${message}\n`)

      return apiify(Promise.resolve())
    },
    /**
     * Prints a message to the shell.
     *
     * @param {string} [mark] - labels and marks this step as an entry point
     * @param {string} message - a message to print for users
     * @return {Object} - the unshackle API
     */
    print: function print () {
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
    },
    /**
     * Run a string as either a command in the shell, or a function. The syntax
     * is as follows, with optional arguments in brackets.
     *
     * .run([mark], command, [required])
     *
     * String commands are executed in a newly spawned child process.
     * Standard output is streamed to the user's shell.
     *
     * Function commands look something like this:
     *
     * .run(lastResult => 'new result')
     *
     * or, for async:
     *
     * .run(lastResult => new Promise(resolve => resolve('new result')))
     *
     * @param {string} [mark] - labels and marks this step as an entry point
     * @param {string | function} command - a string to run as a shell command,
     * *or* a function. The function form accepts the output of the previous
     * step as a parameter, and its return value will be passed to the next
     * step. A function can also return a Promise, and the next step will block
     * until it is resolved.
     * @param {boolean} [required=false] - if true, this step will always run,
     * even if the release entry point is a mark after this step.
     * @return {Object} - the unshackle API
     */
    run: function run () {
      // Some run steps may not be skippable, like cd'ing into the right directory.
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
    },
    /**
     * Prompts the user for input before continuing. The syntax is as follows,
     * with optional arguments in brackets.
     *
     * .prompt([mark], message, [choices])
     *
     * The choices parameter is a list of acceptable inputs. At this time,
     * arbitrary user input is not supported. By default, choices includes only
     * 'y'. If the user provides invalid input, they are asked to try again.
     *
     * At this time, prompts run even with an entry point mark that is further
     * down the chain.
     *
     * @param {string} [mark] - labels and marks this step as an entry point
     * @param {string} message - a message to prompt the user with
     * @param {string[]} [choices=["y"]] - a list of allowed inputs
     * @return {Object} - the unshackle API
     */
    prompt: function () {
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

      process.stdin.addListener('data', handleInput)
      process.stdin.resume()

      return apiify(wrap(mark, this.promise, () => {
        return new Promise(resolve => {
          choices = choices || ['y']
          console.log(`${message} [${choices.join(', ')}]`)
          unblock.on = choices
          unblock.resolve = resolve

          resolve.then(() => {
            process.stdin.pause()
            process.stdin.removeListener('data', handleInput)
          })
        })
      // For now, prompt steps are always required.
      }, false))
    },
    done: function (msg) {
      promise.then(() => halt(0, msg)).catch(this.fail)
    },
    fail: msg => halt(1, msg)
  }
}

module.exports = apiify(Promise.resolve())
