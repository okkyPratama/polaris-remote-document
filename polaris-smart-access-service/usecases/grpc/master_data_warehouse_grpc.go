package grpc

import (
	"encoding/json"
	"time"

	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/polaris-smart-access-service/models/grpc"
)

type MasterDataWarehouseGrpcImpl struct {
	config *hgrpc.ClientConfig
	client *hgrpc.Client
}

type GetWarehousesByIdsRequest struct {
	WarehouseIDs []string `json:"warehouseIds"`
}

var (
	serviceNameWarehouse = "polaris.masterdata.WarehouseService"
)

func NewMasterDataWarehouseGrpc(grpcClientConfig hgrpc.ClientConfig) *MasterDataWarehouseGrpcImpl {
	client := hgrpc.NewClient(grpcClientConfig)
	return &MasterDataWarehouseGrpcImpl{
		config: &grpcClientConfig,
		client: client,
	}
}

// GetWarehousesByIds calls master-data gRPC service
func (c *MasterDataWarehouseGrpcImpl) GetWarehousesByIds(warehouseIds []string) (map[string]*grpc.WarehouseResp, error) {
	if c.client == nil || len(warehouseIds) == 0 {
		return make(map[string]*grpc.WarehouseResp), nil
	}

	req := GetWarehousesByIdsRequest{
		WarehouseIDs: warehouseIds,
	}
	paramBytes, err := json.Marshal(req)
	if err != nil {
		hlogger.Log.Errorf("GetWarehousesByIds marshal request failed: %v", err)
		return nil, err
	}

	resp, err := c.client.Call(
		serviceNameWarehouse,
		"GetWarehousesByIds",
		paramBytes,
		time.Duration(c.config.MaxTimeoutMs)*time.Millisecond,
	)
	if err != nil {
		hlogger.Log.Errorf("GetWarehousesByIds gRPC call failed: %v", err)
		return nil, err
	}

	if resp == nil {
		hlogger.Log.Warnf("GetWarehousesByIds returned nil response")
		return make(map[string]*grpc.WarehouseResp), nil
	}

	// resp is *hgrpc.Response (helper-go auto-parsed from proto)
	// Check for error response
	if resp.HttpCode != 200 {
		hlogger.Log.Warnf("GetWarehousesByIds gRPC returned error: code=%d, desc=%s", resp.HttpCode, resp.ExternalDesc)
		return make(map[string]*grpc.WarehouseResp), nil
	}

	if resp.Data == nil || resp.Data.Data == nil || len(resp.Data.Data) == 0 {
		hlogger.Log.Debugf("GetWarehousesByIds returned empty data")
		return make(map[string]*grpc.WarehouseResp), nil
	}

	// Parse warehouse array from response
	var warehousesFromMaster []map[string]interface{}
	dataBytes, _ := json.Marshal(resp.Data.Data)
	if unmarshalErr := json.Unmarshal(dataBytes, &warehousesFromMaster); unmarshalErr != nil {
		hlogger.Log.Errorf("GetWarehousesByIds unmarshal warehouses failed: %v", unmarshalErr)
		return nil, unmarshalErr
	}

	// Map warehouses to response
	warehouseMap := make(map[string]*grpc.WarehouseResp)
	for _, whData := range warehousesFromMaster {
		id, _ := whData["id"].(string)
		code, _ := whData["code"].(string)
		name, _ := whData["name"].(string)
		status, _ := whData["status"].(string)

		if id != "" {
			warehouse := &grpc.WarehouseResp{
				Id:            id,
				WarehouseCode: code,
				WarehouseName: name,
				Status:        status,
			}
			warehouseMap[id] = warehouse
		}
	}

	hlogger.Log.Debugf("GetWarehousesByIds success: %d warehouses", len(warehouseMap))
	return warehouseMap, nil
}
