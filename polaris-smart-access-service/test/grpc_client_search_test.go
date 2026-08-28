package test

import (
	"encoding/json"

	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
)

func getGrpcClientConfig(check bool) hgrpc.ClientConfig {
	return hgrpc.ClientConfig{
		Address: "localhost:28080",
		Check:   check,
	}
}

func getRequest() []byte {
	reqMap := hmodels.SearchRequest{
		Filters: make(map[string]interface{}),
		Paging: hmodels.PagingRequest{
			Page:     1,
			PageSize: 100,
		},
	}

	reqBytes, err := json.Marshal(reqMap)
	if err != nil {
		hlogger.Log.Fatalf("Failed create request: %v", err)
	}
	return reqBytes
}
