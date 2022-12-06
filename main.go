package main

import (
	"github.com/tablelandnetwork/sqlparser"

	"syscall/js"
)

const GLOBAL_NAME = "sqlparser"

var maxQuerySize = 35000

type StatementType string

const (
	Create StatementType = "create"
	Read   StatementType = "read"
	Write  StatementType = "write"
	Acl    StatementType = "acl"
)

// UpdateTableNames mutates a Node in place, mapping a set of input table names to output table names.
func UpdateTableNames(node sqlparser.Node, nameMapper func(string) (string, bool)) sqlparser.Node {
	if node == nil {
		return node
	}
	_ = sqlparser.Walk(func(node sqlparser.Node) (bool, error) {
		if table, ok := node.(*sqlparser.Table); ok && table != nil {
			if tableName, ok := nameMapper(table.Name.String()); ok {
				table.Name = sqlparser.Identifier(tableName)
			}
		}
		return false, nil
	}, node)
	return node
}

func updateTableNames(this js.Value, args []js.Value) interface{} {
	Error := js.Global().Get("Error")
	Promise := js.Global().Get("Promise")
	if len(args) < 1 {
		return Promise.Call("reject", Error.New("missing required argument: statement"))
	}
	statement := args[0].String()
	var nameMap js.Value
	if len(args) == 2 && args[1].Type() == js.TypeObject {
		nameMap = args[1]
	}
	handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		resolve := args[0]
		reject := args[1]
		go func() interface{} {
			ast, err := sqlparser.Parse(statement)
			if err != nil {
				return reject.Invoke(Error.New("error parsing statement: " + err.Error()))
			}
			if !nameMap.IsUndefined() {
				_ = UpdateTableNames(ast, func(name string) (string, bool) {
					value := nameMap.Get(name)
					if value.IsUndefined() {
						return "", false
					}
					return value.String(), true
				})
			}
			updated := ast.String()
			// Re-parse the statement in case we invalidated the names
			if _, err = sqlparser.Parse(updated); err != nil {
				return reject.Invoke(Error.New("error parsing updated statement: " + err.Error()))
			}
			return resolve.Invoke(js.ValueOf(updated))
		}()
		return nil
	})
	return Promise.New(handler)
}

func validateTableName(this js.Value, args []js.Value) interface{} {
	Error := js.Global().Get("Error")
	Promise := js.Global().Get("Promise")
	if len(args) < 1 {
		return Promise.Call("reject", Error.New("missing required argument: tableName"))
	}
	tableName := args[0].String()
	var isCreate bool
	if len(args) == 2 && args[1].Type() == js.TypeBoolean {
		isCreate = args[1].Bool()
	}
	handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		resolve := args[0]
		reject := args[1]
		go func() interface{} {
			table := &sqlparser.Table{Name: sqlparser.Identifier(tableName), IsTarget: true}
			response := make(map[string]interface{})
			if isCreate {
				validTable, err := sqlparser.ValidateCreateTargetTable(table)
				if err != nil {
					return reject.Invoke(Error.New("error validating name: " + err.Error()))
				}
				response["prefix"] = validTable.Prefix()
				response["chainId"] = validTable.ChainID()
				response["name"] = validTable.Name()
			} else {
				validTable, err := sqlparser.ValidateTargetTable(table)
				if err != nil {
					return reject.Invoke(Error.New("error validating name: " + err.Error()))
				}
				response["prefix"] = validTable.Prefix()
				response["chainId"] = validTable.ChainID()
				response["tableId"] = validTable.TokenID()
				response["name"] = validTable.Name()
			}
			return resolve.Invoke(js.ValueOf(response))
		}()
		return nil
	})
	return Promise.New(handler)
}

func getUniqueTableNames(this js.Value, args []js.Value) interface{} {
	Error := js.Global().Get("Error")
	Promise := js.Global().Get("Promise")
	if len(args) < 1 {
		return Promise.Call("reject", Error.New("missing required argument: statement"))
	}
	statement := args[0].String()
	handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		resolve := args[0]
		reject := args[1]
		go func() interface{} {
			ast, err := sqlparser.Parse(statement)
			if err != nil {
				return reject.Invoke(Error.New("error parsing statement: " + err.Error()))
			}
			tableReferences := sqlparser.GetUniqueTableReferences(ast)
			response := make([]interface{}, len(tableReferences))
			for i := range tableReferences {
				response[i] = tableReferences[i]
			}
			return resolve.Invoke(js.ValueOf(response))
		}()
		return nil
	})
	return Promise.New(handler)
}

func normalize(this js.Value, args []js.Value) interface{} {
	Error := js.Global().Get("Error")
	Promise := js.Global().Get("Promise")
	if len(args) < 1 {
		return Promise.Call("reject", Error.New("missing required argument: statement"))
	}
	statement := args[0].String()
	handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		resolve := args[0]
		reject := args[1]
		go func() interface{} {
			ast, err := sqlparser.Parse(statement)
			// We always reject here on error, which means if the query has multiple statements
			// with errors, only the first encountered error is thrown.
			if err != nil {
				return reject.Invoke(Error.New("error parsing statement: " + err.Error()))
			}
			if len(ast.Statements) == 0 {
				return reject.Invoke(Error.New("error parsing statement: empty string"))
			}
			statements := make([]interface{}, len(ast.Statements))
			var statementType StatementType
			for i, stmt := range ast.Statements {
				switch stmt.(type) {
				case sqlparser.CreateTableStatement:
					statementType = Create
				case sqlparser.ReadStatement:
					statementType = Read
				case sqlparser.GrantOrRevokeStatement:
					if statementType == "" {
						statementType = Acl
					}
				case sqlparser.WriteStatement:
					statementType = Write
				}
				statements[i] = stmt.String()
			}
			response := map[string]interface{}{
				"type":       string(statementType),
				"statements": statements,
			}
			return resolve.Invoke(js.ValueOf(response))
		}()
		return nil
	})
	return Promise.New(handler)
}

func validateStatement(this js.Value, args []js.Value) interface{} {
	Error := js.Global().Get("Error")
	Promise := js.Global().Get("Promise")
	if len(args) < 1 {
		return Promise.Call("reject", Error.New("missing required argument: statement"))
	}
	statement := args[0].String()
	handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		resolve := args[0]
		reject := args[1]
		go func() interface{} {
			if len(statement) > maxQuerySize {
				return reject.Invoke(Error.New("statement size error: larger than specified max"))
			}
			ast, err := sqlparser.Parse(statement)
			if err != nil {
				return reject.Invoke(Error.New("error parsing statement: " + err.Error()))
			}
			if len(ast.Statements) == 0 {
				return reject.Invoke(Error.New("error parsing statement: empty string"))
			}
			stmt := ast.Statements[0]
			if node, ok := stmt.(sqlparser.CreateTableStatement); ok {
				n := node.(*sqlparser.CreateTable)
				if _, err = sqlparser.ValidateCreateTargetTable(n.Table); err != nil {
					return reject.Invoke(Error.New("error validating name: " + err.Error()))
				}
			} else {
				if _, err = sqlparser.ValidateTargetTables(ast); err != nil {
					return reject.Invoke(Error.New("error validating name: " + err.Error()))
				}
			}
			return resolve.Invoke(js.ValueOf(ast.String()))
		}()
		return nil
	})
	return Promise.New(handler)
}

func main() {
	// Outer object is exported globally and contains these keys
	js.Global().Set(GLOBAL_NAME, js.ValueOf(map[string]interface{}{
		"normalize":           js.FuncOf(normalize),
		"validateStatement":   js.FuncOf(validateStatement),
		"updateTableNames":    js.FuncOf(updateTableNames),
		"validateTableName":   js.FuncOf(validateTableName),
		"getUniqueTableNames": js.FuncOf(getUniqueTableNames),
	}))

	<-make(chan bool)
}
