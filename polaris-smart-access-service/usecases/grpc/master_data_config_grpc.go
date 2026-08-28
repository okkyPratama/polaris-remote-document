package grpc

import (
	"encoding/json"
	"time"

	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/polaris-smart-access-service/models/grpc"
)

// MasterDataConfigGrpc — interface untuk config gRPC service
type MasterDataConfigGrpc interface {
	ResolveConfig(configKey string) (*grpc.ConfigResolveResp, error)
}

type MasterDataConfigGrpcImpl struct {
	config *hgrpc.ClientConfig
	client *hgrpc.Client
}

type ConfigResolveReqGrpc struct {
	ConfigKey   string `json:"configKey"`
	ProductID   string `json:"productId,omitempty"`
	ProductCode string `json:"productCode,omitempty"`
	WarehouseID string `json:"warehouseId,omitempty"`
}

var (
	serviceNameConfig = "polaris.masterdata.ConfigService"
)

func NewMasterDataConfigGrpc(grpcClientConfig hgrpc.ClientConfig) *MasterDataConfigGrpcImpl {
	client := hgrpc.NewClient(grpcClientConfig)
	return &MasterDataConfigGrpcImpl{
		config: &grpcClientConfig,
		client: client,
	}
}

// ResolveConfig calls master-data gRPC service to resolve config by key
func (c *MasterDataConfigGrpcImpl) ResolveConfig(configKey string) (*grpc.ConfigResolveResp, error) {
	if c.client == nil || configKey == "" {
		return nil, nil
	}

	req := ConfigResolveReqGrpc{
		ConfigKey: configKey,
	}
	paramBytes, err := json.Marshal(req)
	if err != nil {
		hlogger.Log.Errorf("ResolveConfig marshal request failed: %v", err)
		return nil, err
	}

	resp, err := c.client.Call(
		serviceNameConfig,
		"ResolveConfig",
		paramBytes,
		time.Duration(c.config.MaxTimeoutMs)*time.Millisecond,
	)
	if err != nil {
		hlogger.Log.Errorf("ResolveConfig gRPC call failed: %v", err)
		return nil, err
	}

	if resp == nil {
		hlogger.Log.Warnf("ResolveConfig returned nil response")
		return nil, nil
	}

	// resp is *hgrpc.Response (helper-go auto-parsed from proto)
	// Check for error response
	if resp.HttpCode != 200 {
		hlogger.Log.Warnf("ResolveConfig gRPC returned error: code=%d, desc=%s", resp.HttpCode, resp.ExternalDesc)
		return nil, nil
	}

	if resp.Data == nil || resp.Data.Data == nil || len(resp.Data.Data) == 0 {
		hlogger.Log.Debugf("ResolveConfig returned empty data for key=%s", configKey)
		return nil, nil
	}

	// Parse config response from first data element
	var configResp grpc.ConfigResolveResp
	dataBytes, _ := json.Marshal(resp.Data.Data[0])
	if unmarshalErr := json.Unmarshal(dataBytes, &configResp); unmarshalErr != nil {
		hlogger.Log.Errorf("ResolveConfig unmarshal failed: %v", unmarshalErr)
		return nil, unmarshalErr
	}

	hlogger.Log.Debugf("ResolveConfig success: key=%s, value=%s", configKey, configResp.ResolvedValue)
	return &configResp, nil
}
