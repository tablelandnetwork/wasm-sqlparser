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
						response := make(map[string]interface{})
						statements := make([]interface{}, len(ast.Statements))
						var typ string
						for i, stmt := range ast.Statements {
							if typ == "" {
								switch stmt.(type) {
								case sqlparser.CreateTableStatement:
									typ = "create"
								case sqlparser.ReadStatement:
									typ = "read"
								default:
									typ = "write"
								}
							}
							statements[i] = stmt.String()
						}
						response["statements"] = statements
						response["type"] = typ
						resolve.Invoke(js.ValueOf(response))
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
