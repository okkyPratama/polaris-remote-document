package grpc

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hgrpc/proto"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
)

// SearchService — gRPC search endpoints (REQ-011 compliant)
const (
	RoleSearchMethod           = "searchRole"
	PermissionSearchMethod     = "searchPermission"
	UserRoleSearchMethod       = "searchUserRole"
	RolePermissionSearchMethod = "searchRolePermission"
)

func NewGrpcSearchService(allUseCases *usecases.AllUseCasesImpl) *hgrpc.DynamicService {
	svcSearch := hgrpc.NewService("bitbucket.org.log_tech.polaris_smart_access_service.SearchService")

	svcSearch.RegisterMethod(RoleSearchMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return searchHandler(RoleSearchMethod, allUseCases, param)
	})
	svcSearch.RegisterMethod(PermissionSearchMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return searchHandler(PermissionSearchMethod, allUseCases, param)
	})
	svcSearch.RegisterMethod(UserRoleSearchMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return searchHandler(UserRoleSearchMethod, allUseCases, param)
	})
	svcSearch.RegisterMethod(RolePermissionSearchMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return searchHandler(RolePermissionSearchMethod, allUseCases, param)
	})

	return svcSearch
}

func searchHandler(svcMethodName string, allUseCases *usecases.AllUseCasesImpl, param *proto.ParamRequest) (*proto.ParamResponse, error) {
	hlogger.Log.Debugf("%s Req proto.ParamRequest: %+v", svcMethodName, param)

	reqInterface, errMsg := isValidPayloadMessage(param)
	if errMsg != nil && len(errMsg) > 0 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", errMsg)
	}

	var req hmodels.SearchRequest
	if err := hutils.MapToInterface(reqInterface, &req); err != nil {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{err.Error()})
	}

	var respContent *hmodels.ResponseContent
	var errUc *hmodels.UseCasesError

	switch svcMethodName {
	case RoleSearchMethod:
		respContent, errUc = allUseCases.Role.Search(req)
	case PermissionSearchMethod:
		respContent, errUc = allUseCases.Permission.Search(req)
	case UserRoleSearchMethod:
		respContent, errUc = allUseCases.UserRole.Search(req)
	case RolePermissionSearchMethod:
		respContent, errUc = allUseCases.RolePermission.Search(req)
	default:
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{fmt.Sprintf("No Method %s", svcMethodName)})
	}

	if errUc != nil {
		return hutils.BuildGrpcResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage)
	}

	return hutils.BuildGrpcResponseSuccess(respContent)
}

func isValidPayloadMessage(param *proto.ParamRequest) (map[string]interface{}, []string) {
	var errMsg []string
	if param == nil || param.GetPayload() == nil {
		return nil, append(errMsg, "Parameter is required")
	}

	var req map[string]interface{}
	if err := json.Unmarshal(param.GetPayload(), &req); err != nil {
		return nil, append(errMsg, "ParamRequest.Payload must be a valid JSON")
	}

	var reqMsg hmodels.SearchRequest
	if err := hutils.MapToInterface(req, &reqMsg); err != nil {
		return nil, append(errMsg, err.Error())
	}

	if reqMsg.Filters == nil {
		errMsg = append(errMsg, "body.filters is required.")
	}
	if reqMsg.Paging.Page <= 0 {
		errMsg = append(errMsg, "body.paging.page is required and must be greater than zero.")
	}
	if reqMsg.Paging.PageSize <= 0 {
		errMsg = append(errMsg, "body.paging.pageSize is required and must be greater than zero.")
	}

	if len(errMsg) > 0 {
		return nil, errMsg
	}
	return req, nil
}
