package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/polaris-document-service/api/rest"
	"bitbucket.org/log-tech/polaris-document-service/usecases"
)

func main() {
	allUsesCases := usecases.NewAllUseCases()
	allUsesCases.Init(context.Background())
	helper := allUsesCases.Helper
	thread := helper.GetRoutine()

	// Membuat channel untuk menangkap sinyal shutdown
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	//thread.Start("GrpcServer", func(ctx context.Context) {
	//	startGrpcServer(allUsesCases)
	//})
	thread.Start("RestServer", func(ctx context.Context) {
		startRestServer(allUsesCases)
	})

	for {
		select {
		case <-stopChan:
			hlogger.Log.Infof("Shutdown signal received")
			cleanup(allUsesCases)
			// Hentikan semua goroutine setelah menerima sinyal
			thread.Shutdown()
			hlogger.Log.Infof("Gracefully shutting down")
			return
		}
	}
}

//func startGrpcServer(allUseCases *usecases.AllUseCasesImpl) {
//	srvGrpc := allUseCases.Helper.GetGrpcServer()
//	if srvGrpc != nil {
//		srvGrpc.RegisterService(grpc.NewGrpcHelloService())
//		srvGrpc.RegisterService(grpc.NewGrpcPublishService(allUseCases))
//		err := srvGrpc.Start()
//		if err != nil {
//			hlogger.Log.Panicf("Failed to start grpc server: %v", err)
//		}
//	}
//}

func startRestServer(allUseCases *usecases.AllUseCasesImpl) {
	srvRest := allUseCases.Helper.GetRestServer()
	if srvRest != nil {

		/**
		 *	here is add middleware for rest before start
		 *  svrRest.Engine.Use(middleware())
		 */
		hlogger.Log.Infof("Starting Rest Server")
		rest.RegisterRestController(srvRest, allUseCases)
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

	allUseCases.Helper.GetRedisClient().Close()
	allUseCases.Helper.GetCache().Close()
	allUseCases.Helper.GetGrpcServer().Stop()
	hlogger.Log.Info("Resources cleaned up.")
}
