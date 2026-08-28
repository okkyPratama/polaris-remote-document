# PowerShell dev starter for polaris-document-service
# Sets required environment variables then runs the server.

$env:APP_NAME = "POLARIS_DOCUMENT_SERVICE"
$env:APP_DB_USER = "root"
$env:APP_DB_PASSWORD = ""
$env:APP_DB_NAME = "polaris_document_revamp"
$env:APP_DB = '{"type":"mysql","host":"127.0.0.1","port":3306,"maxOpenConnection":10,"maxIdleConnection":5,"connectionMaxLifetimeSecond":60,"retryMax":5,"retryIntervalSecond":1,"logMode":1,"tlsOrSslMode":"false"}'
$env:APP_GENERAL = '{"refreshIntervalMs":60000,"cacheType":"local","publishLogs":true,"autoCleanPeriodDays":7,"autoCleanSleepMs":1000}'
$env:APP_LOG = '{"level":"debug","format":"custom-text","outputFile":"","timestampFormat":"2006-01-02 15:04:05.000"}'
$env:APP_REST_SERVER = '{"name":"POLARIS_DOCUMENT_SERVICE","port":8080,"contextPath":"/document","mode":"debug","securityCors":{"allowMethods":["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"],"allowHeaders":["Origin","Content-Length","Content-Type","Authorization","user-username","X-Warehouse-ID","X-Correlation-ID"],"allowCredentials":false,"allowAllOrigins":true}}'
$env:APP_LOCAL_CACHE = '{"shards":1,"lifeWindowMs":600000,"cleanWindowMs":60000,"maxEntrySizeMb":1,"hardMaxCacheSizeMb":64,"verbose":true,"refreshIntervalMs":60000}'

Write-Host "Environment variables set. Starting server on port 8080..."
Write-Host "Building..."
go build -o ./__build/dev/bin/srvdev.exe server.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!"
    exit 1
}
Write-Host "Running..."
& ./__build/dev/bin/srvdev.exe
