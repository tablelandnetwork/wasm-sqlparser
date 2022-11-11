package main

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/tablelandnetwork/sqlparser"

	"syscall/js"
)

const GLOBAL_NAME = "sqlparser"

var maxQuerySize = 35000

func main() {
	// Outer parse function, this is exported globally
	js.Global().Set(GLOBAL_NAME, js.ValueOf(map[string]interface{}{
		"normalize": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			Error := js.Global().Get("Error")
			if len(args) < 1 {
				return js.Global().Get("Promise").Call("reject", Error.New("missing required argument 'statement'"))
			}

			statement := args[0].String()

			handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
				resolve := args[0]
				reject := args[1]
				go func() interface{} {
					if len(statement) > maxQuerySize {
						return reject.Invoke(Error.New("statement size larger than specified max"))
					}
					ast, err := sqlparser.Parse(statement)
					if err != nil {
						return reject.Invoke(Error.New(err.Error()))
					}
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
							case sqlparser.GrantOrRevokeStatement:
								typ = "acl"
							case sqlparser.WriteStatement:
								typ = "write"
							default:
								reject.Invoke(Error.New("unknown statement type"))
							}
						}
						statements[i] = stmt.String()
					}
					response["statements"] = statements
					response["type"] = typ
					return resolve.Invoke(js.ValueOf(response))
				}()
				return nil
			})
			return js.Global().Get("Promise").New(handler)
		}),
		"maxQuerySize": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			if len(args) < 1 {
				return maxQuerySize
			}
			maxQuerySize = args[0].Int()
			return maxQuerySize
		}),
		"structureHash": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			Error := js.Global().Get("Error")
			if len(args) < 1 {
				return js.Global().Get("Promise").Call("reject", Error.New("missing required argument 'statement'"))
			}

			statement := args[0].String()
			createTableNameRegEx, _ := regexp.Compile("([A-Za-z]+[A-Za-z0-9_]*)*_[0-9]+$")

			handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
				resolve := args[0]
				reject := args[1]
				go func() interface{} {
					ast, err := sqlparser.Parse(statement)
					if err != nil {
						error := Error.New(err.Error())
						return reject.Invoke(error)
					}
					stmt := ast.Statements[0]
					if _, ok := stmt.(sqlparser.CreateTableStatement); !ok {
						return reject.Invoke(Error.New("the query isn't a CREATE"))
					}
					node := stmt.(*sqlparser.CreateTable)
					if !createTableNameRegEx.MatchString(node.Table.String()) {
						error := Error.New("the query references a table name with the wrong format")
						return reject.Invoke(error)
					}
					parts := strings.Split(node.Table.String(), "_")
					if len(parts) < 2 {
						error := Error.New("table name isn't referencing the chain id")
						return reject.Invoke(error)
					}

					strChainID := parts[len(parts)-1]
					_, err = strconv.ParseInt(strChainID, 10, 64)
					if err != nil {
						error := Error.New("parsing chain id in table name: " + err.Error())
						return reject.Invoke(error)
					}
					return resolve.Invoke(js.ValueOf(node.StructureHash()))
				}()
				return nil
			})
			return js.Global().Get("Promise").New(handler)
		}),
	}))

	<-make(chan bool)
}
