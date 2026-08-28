package grpc

// ConfigResolveReq — request untuk resolve config dari master-data service
type ConfigResolveReq struct {
	ConfigKey   string `json:"configKey"`
	ProductID   string `json:"productId,omitempty"`
	ProductCode string `json:"productCode,omitempty"`
	WarehouseID string `json:"warehouseId,omitempty"`
}

// ConfigResolveResp — response dari resolve config
type ConfigResolveResp struct {
	ConfigKey     string `json:"configKey"`
	ResolvedValue string `json:"resolvedValue"`
	Source        string `json:"source,omitempty"`
	IsDefault     bool   `json:"isDefault,omitempty"`
}
