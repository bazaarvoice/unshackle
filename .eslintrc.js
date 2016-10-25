module.exports = {
  // Recommended rules are documented at http://eslint.org/docs/rules.
  "extends": "eslint:recommended",
  "env": {
    // Note that not all ES6 features are implemented by the current Node runtime.
    "es6": true,
    "node": true,
  },
  "rules": {
    // Disable these rules from eslint:recommended.
    "consistent-return": 0,
    "no-underscore-dangle": 0,

    // Additional rules that we want.
    "prefer-arrow-callback": 2,
    "brace-style": [2, "stroustrup", { "allowSingleLine": true }],
    "curly": 2,
    "eol-last": 2,
    "eqeqeq": 2,
    "indent": [2, 2, {"SwitchCase": 1}],
    "keyword-spacing": 2,
    "key-spacing": [2, {
      "beforeColon": false,
      "afterColon": true
    }],
    "no-multiple-empty-lines": 2,
    "no-trailing-spaces": 2,
    "no-use-before-define": [2, "nofunc"],
    "object-curly-spacing": [2, "always"],
    "quote-props": [2, "as-needed"],
    "quotes": [2, "single"],
    "radix": 2,
    "semi": [2, "never"],
    "space-before-blocks": [2, "always"],
    "space-in-parens": [2, "never"],
    "space-unary-ops": [2, {
      "words": true,
      "nonwords": false
    }],
    "strict": [2, "safe"],
    "valid-jsdoc": 2,
    "wrap-iife": [2, "inside"]
  }
}
