package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/polaris-smart-access-service/api/grpc"
	"bitbucket.org/log-tech/polaris-smart-access-service/api/middleware"
	"bitbucket.org/log-tech/polaris-smart-access-service/api/rest"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
)

func main() {
	allUsesCases := usecases.NewAllUseCases()
	allUsesCases.Init(context.Background())
	helper := allUsesCases.Helper
	thread := helper.GetRoutine()

	// Membuat channel untuk menangkap sinyal shutdown
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	thread.Start("GrpcServer", func(ctx context.Context) {
		startGrpcServer(allUsesCases)
	})
	thread.Start("RestServer", func(ctx context.Context) {
		startRestServer(allUsesCases)
	})

	for range stopChan {
		hlogger.Log.Infof("Shutdown signal received")
		cleanup(allUsesCases)
		// Hentikan semua goroutine setelah menerima sinyal
		thread.Shutdown()
		hlogger.Log.Infof("Gracefully shutting down")
		return
	}
}

func startGrpcServer(allUseCases *usecases.AllUseCasesImpl) {
	srvGrpc := allUseCases.Helper.GetGrpcServer()
	if srvGrpc != nil {
		srvGrpc.RegisterService(grpc.NewGrpcSearchService(allUseCases))
		srvGrpc.RegisterService(grpc.NewGrpcPermissionService(allUseCases)) // REQ-011 section 5.11 & 5.12
		srvGrpc.RegisterService(grpc.NewGrpcRoleCacheService(allUseCases))  // REQ-011 Redis role cache
		err := srvGrpc.Start()
		if err != nil {
			hlogger.Log.Panicf("Failed to start grpc server: %v", err)
		}
	}
}

func startRestServer(allUseCases *usecases.AllUseCasesImpl) {
	srvRest := allUseCases.Helper.GetRestServer()
	if srvRest != nil {
		// Register middleware SEBELUM controllers
		srvRest.Engine.Use(middleware.SessionTimeoutMiddleware(allUseCases))

		// Get Redis client for RBAC middleware
		redisClient := allUseCases.Helper.GetRedisClient()

		rest.RegisterRestController(srvRest, allUseCases, redisClient)

		hlogger.Log.Infof("Starting Rest Server")
		srvRest.Start()
	}
}

// Fungsi cleanup resources
func cleanup(allUseCases *usecases.AllUseCasesImpl) {
	hlogger.Log.Info("Cleaning up resources...")
	db, err := allUseCases.Helper.GetDbClient().Db.DB()
	if err != nil {
		hlogger.Log.Infof("Failed to get db connection for close: %v", err)
	} else {
		err = db.Close()
		if err != nil {
			hlogger.Log.Infof("Failed to close connection db: %v", err)
		} else {
			hlogger.Log.Infof("Successfully closed connection db")
		}
	}

	if allUseCases.Helper != nil {
		if allUseCases.Helper.GetRedisClient() != nil {
			allUseCases.Helper.GetRedisClient().Close()
		}
		if allUseCases.Helper.GetCache() != nil {
			_ = allUseCases.Helper.GetCache().Close()
		}
		if allUseCases.Helper.GetGrpcServer() != nil {
			allUseCases.Helper.GetGrpcServer().Stop()
		}
	}

	if allUseCases.RmqClient != nil {
		if allUseCases.RmqClient.Consumer() != nil {
			allUseCases.RmqClient.Consumer().Close()
		}
	}

	hlogger.Log.Info("Resources cleaned up.")
}
