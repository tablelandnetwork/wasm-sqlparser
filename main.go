package main

import (
	"syscall/js"

	"github.com/tablelandnetwork/sqlparser"
)

func main() {
	// Outer parse function, this is exported globally
	js.Global().Set("parse", js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// The first arg to this function should be our SQL string
		statementString := args[0].String()
		// Our handler is going to take a promise's resolve and reject methods
		handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			resolve := args[0]
			reject := args[1]

			// Wrap in a go func for async behavior
			go func() {
				ast, err := sqlparser.Parse(statementString)
				if err != nil {
					// We'll create and reject with a JS error object
					errorConstructor := js.Global().Get("Error")
					errorObject := errorConstructor.New(err.Error())
					reject.Invoke(errorObject)
				} else {
					// We'll resolve with a valid string
					// TODO: Maybe we could marshal the whole AST to JSON
					resolve.Invoke(js.ValueOf(ast.String()))
				}
			}()

			return nil
		})
		// Create the actual promise and construct it with our handler
		promiseConstructor := js.Global().Get("Promise")
		return promiseConstructor.New(handler)
	}))

	<-make(chan bool)
}
