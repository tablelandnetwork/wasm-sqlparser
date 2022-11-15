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
	createTableNameRegEx, _ := regexp.Compile("([A-Za-z]+[A-Za-z0-9_]*)*_[0-9]+$")
	Error := js.Global().Get("Error")
	// Outer parse function, this is exported globally
	js.Global().Set(GLOBAL_NAME, js.ValueOf(map[string]interface{}{
		"normalize": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
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
					if len(ast.Statements) == 0 {
						return reject.Invoke(Error.New("the statement is empty"))
					}
					response := make(map[string]interface{})
					statements := make([]interface{}, len(ast.Statements))
					// Since we support write queries with more than one statement,
					// check each of them, and for write queries, check
					// that all statements reference the same table.
					var targetKind, refKind, targetTable, refTable string
					for i, stmt := range ast.Statements {
						if ast.Errors[i] != nil {
							return reject.Invoke(Error.New("non sysntax error encountered: " + ast.Errors[i].Error()))
						}
						switch s := stmt.(type) {
						case sqlparser.CreateTableStatement:
							node := s.(*sqlparser.CreateTable)
							refTable = node.Table.String()
							refKind = "create"
						case sqlparser.ReadStatement:
							refKind = "read"
						case sqlparser.GrantOrRevokeStatement:
							refTable = s.GetTable().String()
							refKind = "acl"
						case sqlparser.WriteStatement:
							refTable = s.GetTable().String()
							refKind = "write"
						default:
							reject.Invoke(Error.New("unknown statement type"))
						}
						if targetKind == "" {
							targetKind = refKind
						} else if targetKind != refKind {
							targetKind = "write"
						}
						if targetTable == "" {
							targetTable = refTable
						} else if targetTable != refTable {
							err := Error.New("queries are referencing two distinct tables: " + targetTable + " " + refTable)
							reject.Invoke(err)
						}
						statements[i] = stmt.String()
					}
					if targetTable != "" {
						response["table"] = targetTable
					}
					response["statements"] = statements
					response["type"] = targetKind
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
			if len(args) < 1 {
				return js.Global().Get("Promise").Call("reject", Error.New("missing required argument 'statement'"))
			}
			statement := args[0].String()
			handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
				resolve := args[0]
				reject := args[1]
				go func() interface{} {
					ast, err := sqlparser.Parse(statement)
					if err != nil {
						return reject.Invoke(Error.New(err.Error()))
					}
					if len(ast.Statements) == 0 {
						return reject.Invoke(Error.New("the statement is empty"))
					}
					stmt := ast.Statements[0]
					if ast.Errors[0] != nil {
						return reject.Invoke(Error.New("non sysntax error encountered: " + ast.Errors[0].Error()))
					}
					if _, ok := stmt.(sqlparser.CreateTableStatement); !ok {
						return reject.Invoke(Error.New("the query isn't a CREATE"))
					}
					node := stmt.(*sqlparser.CreateTable)
					if !createTableNameRegEx.MatchString(node.Table.String()) {
						return reject.Invoke(Error.New("the query references a table name with the wrong format"))
					}
					parts := strings.Split(node.Table.String(), "_")
					if len(parts) < 2 {
						return reject.Invoke(Error.New("table name isn't referencing the chain id"))
					}
					_, err = strconv.ParseInt(parts[len(parts)-1], 10, 64)
					if err != nil {
						return reject.Invoke(Error.New("parsing chain id in table name: " + err.Error()))
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
