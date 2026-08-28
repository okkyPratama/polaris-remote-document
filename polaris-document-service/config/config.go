package config

import (
	"sync"

	helpergo "bitbucket.org/log-tech/helper-go"
	"bitbucket.org/log-tech/helper-go/hcache"
	"bitbucket.org/log-tech/helper-go/hdb"
	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hredis"
	"bitbucket.org/log-tech/helper-go/hrest"
	"bitbucket.org/log-tech/helper-go/hutils"
)

type Config struct {
	AppName string          `json:"appName" yaml:"appName" default:"unknown"`
	General GeneralConfig   `json:"general" yaml:"general"`
	Helper  helpergo.Config `json:"helper" yaml:"helper"`
}

type GeneralConfig struct {
	RefreshIntervalMs   int    `json:"refreshIntervalMs" yaml:"refreshIntervalMs" default:"60000"`
	CacheType           string `json:"cacheType" yaml:"cacheType" default:"local"`
	PublishLogs         bool   `json:"publishLogs" yaml:"publishLogs" default:"true"`
	AutoCleanPeriodDays int    `json:"autoCleanPeriodDays" yaml:"autoCleanPeriodDays" default:"7"`
	AutoCleanSleepMs    int    `json:"autoCleanSleepMs" yaml:"autoCleanSleepMs" default:"1000"`
	SendAuditTrail      bool   `json:"sendAuditTrail" yaml:"sendAuditTrail" default:"false"`
}

var (
	cfgInstance *Config
	cfgOnce     sync.Once
)

func GetConfig() *Config {
	cfgOnce.Do(func() {
		strAppName := hutils.GetEnv("APP_NAME", "")
		if strAppName == "" {
			strAppName = hutils.GetEnv("APP_DOC_NAME", "POLARIS_DOCUMENT_SERVICE")
		}

		strDbUser := hutils.GetEnv("APP_DB_USER", "")
		if strDbUser == "" {
			strDbUser = hutils.GetEnv("APP_DOC_DB_USER", "")
			if strDbUser == "" {
				hlogger.Log.Panic("APP_DB_USER or APP_DOC_DB_USER not found on environment variable")
				return
			}
		}
		strDbPass := hutils.GetEnv("APP_DB_PASSWORD", "")
		if strDbPass == "" {
			strDbPass = hutils.GetEnv("APP_DOC_DB_PASSWORD", "")
		}
		strDbName := hutils.GetEnv("APP_DB_NAME", "")
		if strDbName == "" {
			strDbName = hutils.GetEnv("APP_DOC_DB_NAME", "")
			if strDbName == "" {
				hlogger.Log.Panic("APP_DB_NAME or APP_DOC_DB_NAME not found on Environment Variable")
				return
			}
		}
		strDbCfg := hutils.GetEnv("APP_DB", "")
		if strDbCfg == "" {
			strDbCfg = hutils.GetEnv("APP_DOC_DB", "")
			if strDbCfg == "" {
				hlogger.Log.Panic("APP_DB or APP_DOC_DB not found on Environment Variable")
				return
			}
		}
		var dbCfg hdb.Config
		err := hutils.BytesJsonToInterface([]byte(strDbCfg), &dbCfg)
		if err != nil {
			hlogger.Log.Panicf("DB config error: %s\n", err)
			return
		}
		dbCfg.Username = strDbUser
		dbCfg.Password = strDbPass
		dbCfg.DatabaseName = strDbName

		strGeneralCfg := hutils.GetEnv("APP_GENERAL", "")
		if strGeneralCfg == "" {
			strGeneralCfg = hutils.GetEnv("APP_DOC_GENERAL", "")
			if strGeneralCfg == "" {
				hlogger.Log.Panic("APP_GENERAL or APP_DOC_GENERAL not found on Environment Variable")
				return
			}
		}
		var generalCfg GeneralConfig
		err = hutils.BytesJsonToInterface([]byte(strGeneralCfg), &generalCfg)
		if err != nil {
			hlogger.Log.Panicf("GeneralConfig error: %s\n", err)
			return
		}

		strLocalCache := hutils.GetEnv("APP_LOCAL_CACHE", "")
		if strLocalCache == "" {
			strLocalCache = hutils.GetEnv("APP_DOC_LOCAL_CACHE", "")
			if strLocalCache == "" {
				hlogger.Log.Panic("APP_LOCAL_CACHE or APP_DOC_LOCAL_CACHE not found on Environment Variable")
				return
			}
		}
		var localCacheCfg hcache.Config
		err = hutils.BytesJsonToInterface([]byte(strLocalCache), &localCacheCfg)
		if err != nil {
			hlogger.Log.Panicf("LocalCacheConfig error: %s\n", err)
			return
		}

		strLogCfg := hutils.GetEnv("APP_LOG", "")
		if strLogCfg == "" {
			strLogCfg = hutils.GetEnv("APP_DOC_LOG", "")
			if strLogCfg == "" {
				hlogger.Log.Panic("APP_LOG or APP_DOC_LOG not found on Environment Variable")
				return
			}
		}
		var logCfg hlogger.Config
		err = hutils.BytesJsonToInterface([]byte(strLogCfg), &logCfg)
		if err != nil {
			hlogger.Log.Panicf("LogConfig error: %s\n", err)
			return
		}

		strRedisCfg := hutils.GetEnv("APP_REDIS_SERVER", "")
		if strRedisCfg == "" {
			strRedisCfg = hutils.GetEnv("APP_DOC_REDIS_SERVER", "")
		}
		var redisCfg hredis.Config
		if strRedisCfg != "" {
			err = hutils.BytesJsonToInterface([]byte(strRedisCfg), &redisCfg)
			if err != nil {
				hlogger.Log.Panicf("RedisConfig error: %s\n", err)
				return
			}
		}

		strRestCfg := hutils.GetEnv("APP_REST_SERVER", "")
		if strRestCfg == "" {
			strRestCfg = hutils.GetEnv("APP_DOC_REST_SERVER", "")
			if strRestCfg == "" {
				hlogger.Log.Panic("APP_REST_SERVER or APP_DOC_REST_SERVER not found on Environment Variable")
				return
			}
		}
		var restCfg hrest.Config
		err = hutils.BytesJsonToInterface([]byte(strRestCfg), &restCfg)
		if err != nil {
			hlogger.Log.Panicf("RestConfig error: %s\n", err)
			return
		}
		if restCfg.Registry {
			strRedisRegistryCfg := hutils.GetEnv("APP_REDIS_REGISTRY", "")
			if strRedisRegistryCfg == "" {
				strRedisRegistryCfg = hutils.GetEnv("APP_DOC_REDIS_REGISTRY", "")
				if strRedisRegistryCfg == "" {
					hlogger.Log.Panic("APP_REDIS_REGISTRY or APP_DOC_REDIS_REGISTRY not found on Environment Variable")
					return
				}
			}
			var redisRegistryCfg hredis.Config
			err = hutils.BytesJsonToInterface([]byte(strRedisRegistryCfg), &redisRegistryCfg)
			if err != nil {
				hlogger.Log.Panicf("RedisRegistryConfig error: %s\n", err)
				return
			}
			restCfg.RegistryConfig = redisRegistryCfg
		}

		strGrpcCfg := hutils.GetEnv("APP_GRPC_SERVER", "")
		if strGrpcCfg == "" {
			strGrpcCfg = hutils.GetEnv("APP_DOC_GRPC_SERVER", "")
		}
		var grpcCfg hgrpc.ServerConfig
		if strGrpcCfg != "" {
			err = hutils.BytesJsonToInterface([]byte(strGrpcCfg), &grpcCfg)
			if err != nil {
				hlogger.Log.Panicf("GrpcServerConfig error: %s\n", err)
				return
			}
		}

		cfgInstance = &Config{
			AppName: strAppName,
			General: generalCfg,
			Helper: helpergo.Config{
				Db:         dbCfg,
				Cache:      localCacheCfg,
				Redis:      redisCfg,
				Log:        logCfg,
				Rest:       restCfg,
				GrpcServer: grpcCfg,
			},
		}
	})
	return cfgInstance
}
