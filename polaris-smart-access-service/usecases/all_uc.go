package usecases

import (
	"context"
	"time"

	helpergo "bitbucket.org/log-tech/helper-go"
	hgrpc "bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/config"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases/grpc"
	rmqclient "bitbucket.org/log-tech/rmq-client"
	"bitbucket.org/log-tech/rmq-client/models"
)

type AllUseCasesImpl struct {
	Helper                  *helpergo.Helper
	RmqClient               *rmqclient.RmqClientImpl
	Repository              *repository.AllRepositoryImpl
	MasterdataWarehouseGrpc *grpc.MasterDataWarehouseGrpcImpl
	MasterdataConfigGrpc    *grpc.MasterDataConfigGrpcImpl
	UserRole                *UserRoleUseCasesImpl
	Role                    *RoleUseCasesImpl
	RolePermission          *RolePermissionUseCasesImpl
	RoleApi                 *RoleApiUseCasesImpl
	Permission              *PermissionUseCasesImpl
	UserWarehouse           *UserWarehouseUseCasesImpl
	UserOwner               *UserOwnerUseCasesImpl
	UserProvisioning        *UserProvisioningUseCasesImpl
	Resolve                 *ResolveUseCasesImpl
	Auth                    *AuthUseCasesImpl
}

var (
	GlobalConfig = config.GetConfig()
)

func NewAllUseCases() *AllUseCasesImpl {
	return &AllUseCasesImpl{}
}

func (a *AllUseCasesImpl) Init(ctx context.Context) {
	var err error
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
	a.initRmqClient()
	a.initMasterdataGrpc()
	a.initGrpcServer()
	a.initRestServer()

	a.registerUseCases()
}

func (a *AllUseCasesImpl) initMasterdataGrpc() {
	// Read gRPC address dari env variable, default ke localhost:28080 (master-data gRPC server port)
	grpcAddress := hutils.GetEnv("MASTER_DATA_SERVICE_GRPC_ADDRESS", "localhost:28080")

	grpcCfg := hgrpc.ClientConfig{
		Address:      grpcAddress,
		Check:        true,
		MaxTimeoutMs: 5000,
	}

	a.MasterdataWarehouseGrpc = grpc.NewMasterDataWarehouseGrpc(grpcCfg)
	a.MasterdataConfigGrpc = grpc.NewMasterDataConfigGrpc(grpcCfg)

	hlogger.Log.Infof("Masterdata gRPC clients initialized with address: %s", grpcCfg.Address)
}

func (a *AllUseCasesImpl) SendAuditTrail(userId string, eventTm time.Time, action string, moduleName string, oldData interface{}, newData interface{}) {
	go func() {
		var oldDataMap map[string]interface{}
		var newDataMap map[string]interface{}
		var err error
		if action == constants.KeyCreate {
			newDataMap, err = hutils.InterfaceToMap(newData)
			if err != nil {
				hlogger.Log.Errorf("Send audit trail error converting newData to map: %s", err.Error())
				return
			}
		} else if action == constants.KeyUpdate || action == constants.KeyDelete {
			if oldData != nil {
				oldDataMap, err = hutils.InterfaceToMap(oldData)
				if err != nil {
					hlogger.Log.Errorf("Send audit trail error converting oldData to map: %s", err.Error())
					return
				}
			}
			if newData != nil {
				newDataMap, err = hutils.InterfaceToMap(newData)
				if err != nil {
					hlogger.Log.Errorf("Send audit trail error converting newData to map: %s", err.Error())
					return
				}
			}
			// Validator requires both oldData and newData present for UPDATE/DELETE.
			// Ensure non-nil maps so the audit event is accepted.
			if oldDataMap == nil {
				oldDataMap = map[string]interface{}{}
			}
			if newDataMap == nil {
				newDataMap = map[string]interface{}{}
			}
		}
		data := models.AuditTrailReq{
			UserId:     userId,
			EventTm:    eventTm,
			Action:     action,
			SourceName: constants.KeySourceName,
			SystemName: hutils.GetAppName(),
			ModuleName: moduleName,
			OldData:    oldDataMap,
			NewData:    newDataMap,
		}

		if a.RmqClient == nil {
			hlogger.Log.Errorf("Error sending audit-trail: RmqClient is nil")
			return
		}

		_, err = a.RmqClient.Publisher().PublishAuditTrail(data)
		if err != nil {
			hlogger.Log.Errorf("Error sending audit-trail: %s", err.Error())
		}
	}()
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
func (a *AllUseCasesImpl) initRmqClient() {
	if isSet, _ := hutils.IsFieldSet(GlobalConfig, "RmqClient"); !isSet {
		hlogger.Log.Warn("RmqClient config not set, skipping init")
		return
	}
	hlogger.Log.Infof("initRmqClient connecting to: %s", GlobalConfig.RmqClient.Address)

	// Smart-access only needs publisher (gRPC to rmq-publisher), not consumer
	pubClient, err := rmqclient.NewPublisherOnly(&GlobalConfig.RmqClient)
	if err != nil {
		hlogger.Log.Warnf("initRmqClient error (audit trail disabled): %+v", err.Error())
		return
	}
	a.RmqClient = pubClient
	hlogger.Log.Info("initRmqClient connected successfully")
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
	a.Role = NewRoleUseCases(a)
	a.Permission = NewPermissionUseCases(a)
	a.RolePermission = NewRolePermissionUseCases(a)
	a.UserRole = NewUserRoleUseCases(a)
	a.RoleApi = NewRoleApiUseCases(a)
	a.UserWarehouse = NewUserWarehouseUseCases(a)
	a.UserOwner = NewUserOwnerUseCases(a)
	a.UserProvisioning = NewUserProvisioningUseCases(a)
	a.Resolve = NewResolveUseCases(a)
	a.Auth = NewAuthUseCases(a)
}
