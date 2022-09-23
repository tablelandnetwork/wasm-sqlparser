package main

import (
	"github.com/tablelandnetwork/sqlparser"

	"syscall/js"
)

const GLOBAL_NAME = "sqlparser"

var maxQuerySize = 35000

func main() {
	// Outer parse function, this is exported globally
	js.Global().Set(GLOBAL_NAME, js.ValueOf(map[string]interface{}{
		"normalize": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			if len(args) < 1 {
				errorConstructor := js.Global().Get("Error")
				error := errorConstructor.New("missing required argument 'statement'")
				return js.Global().Get("Promise").Call("reject", error)
			}

			statementString := args[0].String()

			handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
				resolve := args[0]
				reject := args[1]
				go func() {
					if len(statementString) > maxQuerySize {
						errorConstructor := js.Global().Get("Error")
						error := errorConstructor.New("statement size larger than specified max")
						reject.Invoke(error)
					}
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
		"maxQuerySize": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			if len(args) < 1 {
				return maxQuerySize
			}
			maxQuerySize = args[0].Int()
			return maxQuerySize
		}),
	}))

	<-make(chan bool)
}
