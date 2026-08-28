package usecases

import (
	"context"

	helpergo "bitbucket.org/log-tech/helper-go"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-document-service/config"
	"bitbucket.org/log-tech/polaris-document-service/data-access/repository"
)

type AllUseCasesImpl struct {
	Helper                     *helpergo.Helper
	Repository                 *repository.AllRepositoryImpl
	TemplateUseCases           *TemplateUseCasesImpl
	TemplateAssignmentUseCases *TemplateAssignmentUseCasesImpl
	CropUseCases               *CropUseCasesImpl
}

var (
	GlobalConfig *config.Config
)

func NewAllUseCases() *AllUseCasesImpl {
	return &AllUseCasesImpl{}
}

func (a *AllUseCasesImpl) Init(ctx context.Context) {
	var err error
	GlobalConfig = config.GetConfig()
	helper := helpergo.New(GlobalConfig.Helper)
	_, err = helper.DbClient(GlobalConfig.Helper.Db)
	if err != nil {
		hlogger.Log.Panic(err.Error())
	}

	a.Helper = helper

	a.initRepository()
	a.initLog()
	a.initRedis()
	a.initCache()
	a.initGrpcServer()
	a.initRestServer()

	a.registerUseCases()
}

func (a *AllUseCasesImpl) initRepository() {
	a.Repository = repository.NewAllRepository(a.Helper.GetDbClient())
}

func (a *AllUseCasesImpl) initLog() {
	if isSet, _ := hutils.IsFieldSet(&GlobalConfig.Helper, "Log"); isSet {
		hlogger.Update(GlobalConfig.Helper.Log)
	}
}

func (a *AllUseCasesImpl) initRedis() {
	if isSet, _ := hutils.IsFieldSet(&GlobalConfig.Helper, "Redis"); isSet {
		_, err := a.Helper.RedisClient(GlobalConfig.Helper.Redis)
		if err != nil {
			hlogger.Log.Panic(err.Error())
		}
	}
}

func (a *AllUseCasesImpl) initCache() {
	if isSet, _ := hutils.IsFieldSet(&GlobalConfig.Helper, "Cache"); isSet {
		_, err := a.Helper.CacheClient(GlobalConfig.Helper.Cache)
		if err != nil {
			hlogger.Log.Panic(err.Error())
		}
	}
}

func (a *AllUseCasesImpl) initGrpcServer() {
	if isSet, _ := hutils.IsFieldSet(&GlobalConfig.Helper, "GrpcServer"); isSet {
		_, err := a.Helper.GrpcServer(GlobalConfig.Helper.GrpcServer)
		if err != nil {
			hlogger.Log.Panic(err.Error())
		}
	}
}

func (a *AllUseCasesImpl) initRestServer() {
	if isSet, _ := hutils.IsFieldSet(&GlobalConfig.Helper, "Rest"); isSet {
		_, err := a.Helper.ServerRest(GlobalConfig.Helper.Rest)
		if err != nil {
			hlogger.Log.Panic(err.Error())
		}
	}
}

func (a *AllUseCasesImpl) registerUseCases() {
	a.TemplateUseCases = NewTemplateUseCases(a)
	a.TemplateAssignmentUseCases = NewTemplateAssignmentUseCases(a)
	a.CropUseCases = NewCropUseCases()
}
