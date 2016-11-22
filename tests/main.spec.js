/* eslint-disable no-console */
'use strict'

let unshackle = require('../main')
const consoleFns = {}

beforeEach(() => {
  jest.resetModules()
  unshackle = require('../main')

  consoleFns.log = console.log
  consoleFns.error = console.error
  console.log = jest.fn()
  console.error = jest.fn()
})

afterEach(() => {
  console.log = consoleFns.log
  console.error = consoleFns.error
})

it('should print', () => {
  return unshackle.print('hello').promise.then(() => {
    expect(console.log.mock.calls[0][0]).toBe('hello')
  })
})

describe('run', () => {
  it('should allow a shell command as an argument', () => {
    return unshackle.run('echo "hello"').promise.then(() => {
      expect(console.log.mock.calls[0][0]).toBe('$ echo "hello"')
      expect(console.log.mock.calls[1][0]).toBe('hello')
    })
  })

  it('should allow a function as an argument', () => {
    let done = false
    return unshackle.run(() => {
      done = true
    }).promise.then(() => {
      expect(done).toBe(true)
    })
  })

  it('should pass the output of a function along', () => {
    return unshackle.run(() => 'output').promise.then(output => {
      expect(output).toBe('output')
    })
  })

  it('should block', () => {
    let start = new Date().getTime()

    return unshackle
      .run('sleep .05')
      .run(() => {
        expect(new Date().getTime() - start).toBeGreaterThan(50)
      }).promise
  })

  it('should allow a Promise for the return value', () => {
    return unshackle
      .run(() => Promise.resolve('output'))
      .run(output => {
        expect(output).toBe('output')
      }).promise
  })
})

describe('prompt', () => {
  // I'm not sure if this test is even possible
  it.skip('should expect the correct user input', () => {
    const promise = unshackle
      .prompt('Type y', ['y'])
      .run(() => {
        expect(console.log.mock.calls[0][0]).toBe('Please type y')
      })
      .promise

    process.stdin.write('n\r\n')

    return promise
  })
})

describe('start', () => {
  it('should should print a message', () => {
    return unshackle.start('hello').promise.then(() => {
      expect(console.log.mock.calls[0][0]).toBe('hello\n')
    })
  })

  it('should skip to the designated mark', () => {
    return unshackle
        .start('hello', 'two')
        .run('one', 'echo "skipped"')
        .run('two', 'echo "not skipped"')
        .promise.then(() => {
          expect(console.log.mock.calls[1][0]).toBe('[two]')
          expect(console.log.mock.calls[2][0]).toBe('$ echo "not skipped"')
        })
  })

  it('should skip over steps to the designated mark, except for forced steps', () => {
    return unshackle
        .start('hello', 'three')
        .run('one', 'echo "skipped"')
        .run('two', 'echo "not skipped"', true)
        .run('three', 'echo "also not skipped"')
        .promise.then(() => {
          expect(console.log.mock.calls[1][0]).toBe('[two]')
          expect(console.log.mock.calls[2][0]).toBe('$ echo "not skipped"')
        })
  })
})
