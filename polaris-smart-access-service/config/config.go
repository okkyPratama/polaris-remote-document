package config

import (
	"fmt"
	"sync"

	helpergo "bitbucket.org/log-tech/helper-go"
	"bitbucket.org/log-tech/helper-go/hcache"
	"bitbucket.org/log-tech/helper-go/hdb"
	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hredis"
	"bitbucket.org/log-tech/helper-go/hrest"
	"bitbucket.org/log-tech/helper-go/hrmq"
	"bitbucket.org/log-tech/helper-go/hutils"
)

type Config struct {
	AppName   string             `json:"appName" yaml:"appName" default:"unknown"`
	General   GeneralConfig      `json:"general" yaml:"general"`
	RmqClient hgrpc.ClientConfig `json:"rmqClient" yaml:"rmqClient"`
	Helper    helpergo.Config    `json:"helper" yaml:"helper"`
}

type GeneralConfig struct {
	RefreshIntervalMs   int    `json:"refreshIntervalMs" yaml:"refreshIntervalMs" default:"60000"`
	CacheType           string `json:"cacheType" yaml:"cacheType" default:"local"`
	PublishLogs         bool   `json:"publishLogs" yaml:"publishLogs" default:"true"`
	AutoCleanPeriodDays int    `json:"autoCleanPeriodDays" yaml:"autoCleanPeriodDays" default:"7"`
	AutoCleanSleepMs    int    `json:"autoCleanSleepMs" yaml:"autoCleanSleepMs" default:"1000"`
}

var (
	cfgInstance *Config
	cfgOnce     sync.Once
)

func GetConfigJson[T any](key string, addonKey string) (*T, error) {
	strCfg := hutils.GetEnv(key, "")
	if strCfg == "" {
		strCfg = hutils.GetEnv(addonKey, "")
		if strCfg == "" {
			hlogger.Log.Panic(fmt.Sprintf("%s or %s not found on Environment Variable", key, addonKey))
			return nil, fmt.Errorf("%s or %s not found on Environment Variable", key, addonKey)
		}
	}

	var cfg T
	err := hutils.BytesJsonToInterface([]byte(strCfg), &cfg)
	if err != nil {
		hlogger.Log.Panicf("%s error: %s\n", key, err)
		return nil, fmt.Errorf("%s error: %w", key, err)
	}
	return &cfg, nil
}

func GetConfigJsonOptional[T any](key string, addonKey string) *T {
	strCfg := hutils.GetEnv(key, "")
	if strCfg == "" {
		strCfg = hutils.GetEnv(addonKey, "")
		if strCfg == "" {
			return nil
		}
	}
	var cfg T
	err := hutils.BytesJsonToInterface([]byte(strCfg), &cfg)
	if err != nil {
		hlogger.Log.Warnf("%s parse error (skipped): %s", key, err)
		return nil
	}
	return &cfg
}

func GetConfigJsonWithFallback[T any](key string, addonKey string, fallback T) T {
	result := GetConfigJsonOptional[T](key, addonKey)
	if result != nil {
		return *result
	}
	return fallback
}

func getEnvRequired(key string, addonKey string) string {
	val := hutils.GetEnv(key, "")
	if val == "" {
		val = hutils.GetEnv(addonKey, "")
		if val == "" {
			hlogger.Log.Panic(fmt.Sprintf("%s or %s not found on Environment Variable", key, addonKey))
		}
	}
	return val
}

func GetConfig() *Config {
	cfgOnce.Do(func() {
		// DB credentials — separate env vars
		strDbUser := getEnvRequired("APP_DB_USER", "APP_PSAS_DB_USER")
		strDbPass := getEnvRequired("APP_DB_PASSWORD", "APP_PSAS_DB_PASSWORD")
		strDbName := getEnvRequired("APP_DB_NAME", "APP_PSAS_DB_NAME")

		// DB connection config (host, port, pool settings)
		var dbCfg hdb.Config
		if config, _ := GetConfigJson[hdb.Config]("APP_DB", "APP_PSAS_DB"); config != nil {
			dbCfg = *config
		}
		dbCfg.Username = strDbUser
		dbCfg.Password = strDbPass
		dbCfg.DatabaseName = strDbName

		var generalCfg GeneralConfig
		if config, _ := GetConfigJson[GeneralConfig]("APP_GENERAL", "APP_PSAS_GENERAL"); config != nil {
			generalCfg = *config
		}

		var localCacheCfg hcache.Config
		if config, _ := GetConfigJson[hcache.Config]("APP_LOCAL_CACHE", "APP_PSAS_LOCAL_CACHE"); config != nil {
			localCacheCfg = *config
		}

		var logCfg hlogger.Config
		if config, _ := GetConfigJson[hlogger.Config]("APP_LOG", "APP_PSAS_LOG"); config != nil {
			logCfg = *config
		}

		var restCfg hrest.Config
		if config, _ := GetConfigJson[hrest.Config]("APP_REST_SERVER", "APP_PSAS_REST_SERVER"); config != nil {
			restCfg = *config
		}

		cfgInstance = &Config{
			AppName: hutils.GetEnv("APP_NAME", "POLARIS_SMART_ACCESS_SERVICE"),
			General: generalCfg,
			Helper: helpergo.Config{
				Db:    dbCfg,
				Cache: localCacheCfg,
				Log:   logCfg,
				Rest:  restCfg,
			},
		}

		// Optional configs — nggak panic kalau nggak ada
		if config := GetConfigJsonOptional[hredis.Config]("APP_REDIS_SERVER", "APP_PSAS_REDIS_SERVER"); config != nil {
			cfgInstance.Helper.Redis = *config
		}

		if config := GetConfigJsonOptional[hrmq.Config]("APP_RMQ", "APP_PSAS_RMQ"); config != nil {
			cfgInstance.Helper.Rmq = *config
		}

		if config := GetConfigJsonOptional[hgrpc.ServerConfig]("APP_GRPC_SERVER", "APP_PSAS_GRPC_SERVER"); config != nil {
			cfgInstance.Helper.GrpcServer = *config
		}

		if config := GetConfigJsonOptional[hgrpc.ClientConfig]("APP_RMQ_CLIENT", "APP_PSAS_RMQ_CLIENT"); config != nil {
			cfgInstance.RmqClient = *config
		}
	})
	return cfgInstance
}
