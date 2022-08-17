package main

import (
	"github.com/tablelandnetwork/sqlparser"

	"syscall/js"
)

func main() {
	// Outer parse function, this is exported globally
	js.Global().Set("sqlparser", js.ValueOf(map[string]interface{}{
		"parse": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			statementString := args[0].String()
			handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
				resolve := args[0]
				reject := args[1]
				go func() {
					ast, err := sqlparser.Parse(statementString)
					if err != nil {
						errorConstructor := js.Global().Get("Error")
						error := errorConstructor.New(err.Error())
						reject.Invoke(error)
					} else {
						var stmts []interface{}
						for _, stmt := range ast.Statements {
							stmts = append(stmts, stmt.String())
						}
						resolve.Invoke(js.ValueOf(stmts))
					}
				}()

				return nil
			})
			promiseConstructor := js.Global().Get("Promise")
			return promiseConstructor.New(handler)
		}),
	}))

	<-make(chan bool)
}
