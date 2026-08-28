package repository

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type FilterCondition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

func ApplyFilters(query *gorm.DB, conditions []FilterCondition, allowedColumns map[string]string) *gorm.DB {
	for _, cond := range conditions {
		column, ok := allowedColumns[cond.Field]
		if !ok {
			continue
		}

		switch strings.ToLower(cond.Operator) {
		case "=":
			query = query.Where(fmt.Sprintf("%s = ?", column), cond.Value)
		case "!=":
			query = query.Where(fmt.Sprintf("%s != ?", column), cond.Value)
		case ">":
			query = query.Where(fmt.Sprintf("%s > ?", column), cond.Value)
		case ">=":
			query = query.Where(fmt.Sprintf("%s >= ?", column), cond.Value)
		case "<":
			query = query.Where(fmt.Sprintf("%s < ?", column), cond.Value)
		case "<=":
			query = query.Where(fmt.Sprintf("%s <= ?", column), cond.Value)
		case "like":
			val := fmt.Sprintf("%v", cond.Value)
			if !strings.Contains(val, "%") {
				val = "%" + val + "%"
			}
			query = query.Where(fmt.Sprintf("%s LIKE ?", column), val)
		case "ilike":
			val := fmt.Sprintf("%v", cond.Value)
			if !strings.Contains(val, "%") {
				val = "%" + val + "%"
			}
			query = query.Where(fmt.Sprintf("LOWER(%s) LIKE LOWER(?)", column), val)
		case "in":
			query = query.Where(fmt.Sprintf("%s IN ?", column), cond.Value)
		case "notin":
			query = query.Where(fmt.Sprintf("%s NOT IN ?", column), cond.Value)
		case "isnull":
			query = query.Where(fmt.Sprintf("%s IS NULL", column))
		case "isnotnull":
			query = query.Where(fmt.Sprintf("%s IS NOT NULL", column))
		}
	}
	return query
}

func BuildOrderClause(sortBy, sortDir string, allowedColumns map[string]string) string {
	column := "created_at"
	if len(sortBy) > 0 {
		if col, ok := allowedColumns[sortBy]; ok {
			column = col
		}
	}

	direction := "DESC"
	if strings.ToUpper(sortDir) == "ASC" {
		direction = "ASC"
	}

	return fmt.Sprintf("%s %s", column, direction)
}
