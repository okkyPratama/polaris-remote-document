package repository

import (
	"bitbucket.org/log-tech/helper-go/hdb"
	"bitbucket.org/log-tech/helper-go/hlogger"
)

type AllRepository interface {
	GetTemplateRepository() *TemplateRepository
	GetTemplateAssignmentRepository() *TemplateAssignmentRepository
}

type AllRepositoryImpl struct {
	templateRepo           *TemplateRepository
	templateAssignmentRepo *TemplateAssignmentRepository
}

func NewAllRepository(dbClient *hdb.Client) *AllRepositoryImpl {
	var err error
	result := &AllRepositoryImpl{}

	result.templateRepo, err = NewTemplateRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}

	result.templateAssignmentRepo, err = NewTemplateAssignmentRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}

	return result
}

func (all *AllRepositoryImpl) GetTemplateRepository() *TemplateRepository {
	return all.templateRepo
}

func (all *AllRepositoryImpl) GetTemplateAssignmentRepository() *TemplateAssignmentRepository {
	return all.templateAssignmentRepo
}
