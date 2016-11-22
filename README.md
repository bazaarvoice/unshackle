<p align="center">
  <!-- Borrowed under a CC0 Public Domain license from https://pixabay.com/en/animal-game-asset-call-invertebrate-1296937/ -->
  <img alt="unshackle" src="https://cloud.githubusercontent.com/assets/1095217/19737639/cf70c50c-9b79-11e6-8d46-8d469c7c3b76.png" width="480">
</p>

## About

Unshackle is a small release scripting [DSL](https://en.wikipedia.org/wiki/Domain-specific_language) for JavaScript projects. If releasing new versions of your JavaScript application involves running the same dozens of Git commands, intermixed with various CLI tools and manual by-a-human steps, it might be for you. In particular, unshackle aims to provide a simple language for combining a series of shell, human, and arbitrary JavaScript tasks.

## Installation

```bash
npm install unshackle
```

## Usage

Typical usage involves writing a script for your release that loads the unshackle
package and uses it to execute a series of steps.

You can execute your script and view its output in the console. Prompts will
pause and wait for your input.

For now, you must run your script from the working directory that any shell
commands should start in.

```javascript
#!/usr/bin/env node

const unshackle = require('unshackle')

// Create a bucket for remembering state throughout the run.
const state = {}

unshackle
.start('You are starting an example release. Good luck.')
// Print does what you expect.
.print('First on the agenda, listing files with ls.')

// Run executes string commands in a shell.
.run('ls')

// Prompts pause for user input.
.prompt('What is your favorite letter?', ['a', 'b', 'c'])

// JavaScript steps are functions that accept the output of preceding steps as
// input.
.run(letter => console.log(`Proceeding with a release for the letter ${letter}.`))

// JavaScript steps can return a promise to perform asynchronous tasks.
.run(() => {
  console.log('Crunching numbers, or something...')
  return new Promise (resolve => setTimeout(resolve, 3000))
})

// Use state to remember user input.
.prompt('What is your favorite letter now?', ['a', 'b', 'c'])

// Define a labeled mark in the process.
.run('trap-state', letter => state.letter = letter)

// Use the unshackle runner in a custom step, making sure to return the promise
// property, to block.
.run(() => unshackle.prompt(`Please manually confirm your appreciation for the letter ${state.letter}.`).promise)

// Use fail to abort and exit if something goes wrong.
.run(() => {
  if (Math.random() < .1) {
    unshackle.fail('Today is not a good day.')
  }
})

// Exit the entire process, with a message.
.done('Thanks! This release has been a success.')
```

### Relocating your release script

If you want to edit a release script that is in source control, you might want
to make a copy of it outside of your project. For example, if changes were to
make your Git working directory dirty, for example, it could interfere with
certain Git commands you might have in your release script.

### Marks

Steps have an optional first argument for defining a mark. Marks are useful in
that they create readable labels in the output of your release, and they give
you a way to restart failed or incomplete releases at a certain step.

You can start from a mark by passing it as a second argument to
`unshackle.start`. Starting from a mark skips all steps before that mark, with
some exceptions. There may be steps that occur before the mark that are
required to run, usually those that prompt the user for information, as no
information is saved between executions of your release script. You can
force such a step to always run, and prompts always run by default.

```javascript
const state = {}

unshackle
// An optional step to print a message. It can also be used to specify a mark.
.start('Starting a release', 'deploy')

// This step is skipped, because it is before the "deploy" mark.
.run('echo "You should not be reading this"')

// At this point in time, prompts are never skipped and will always run.
.prompt('What type of release is this?', ['major', 'minor', 'patch'])

// The true parameter forces this step to run, even when starting from the
// "deploy" mark
.run(type => state.type = type, true)

// This step has the "deploy" mark, so when used, all steps from here on will
// run.
.run('deploy', () => {
  deployVersion(state.type)
})

// This prints a message and exits the entire process.
.done('Deployment complete')
```
