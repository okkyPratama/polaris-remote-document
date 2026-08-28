package repository

import (
	"bitbucket.org/log-tech/helper-go/hdb"
	"bitbucket.org/log-tech/helper-go/hlogger"
)

type AllRepository interface {
	GetUserRoleRepository() *UserRoleRepository
	GetRoleRepository() *RoleRepository
	GetRoleApiRepository() *RoleApiRepository
	GetRolePermissionRepository() *RolePermissionRepository
	GetPermissionRepository() *PermissionRepository
	GetAuthUserRepository() *AuthUserRepository
	GetSessionRepository() *SessionRepository
	GetLoginEventRepository() *LoginEventRepository
	GetLoginAttemptRepository() *LoginAttemptRepository
	GetUserWarehouseRepository() *UserWarehouseRepository
	GetUserOwnerRepository() *UserOwnerRepository
}

type AllRepositoryImpl struct {
	userRoleRepo       *UserRoleRepository
	roleRepo           *RoleRepository
	roleApiRepo        *RoleApiRepository
	rolePermissionRepo *RolePermissionRepository
	permissionRepo     *PermissionRepository
	authUserRepo       *AuthUserRepository
	sessionRepo        *SessionRepository
	loginEventRepo     *LoginEventRepository
	loginAttemptRepo   *LoginAttemptRepository
	userWarehouseRepo  *UserWarehouseRepository
	userOwnerRepo      *UserOwnerRepository
}

func NewAllRepository(dbClient *hdb.Client) *AllRepositoryImpl {
	var err error

	result := &AllRepositoryImpl{}
	result.roleRepo, err = NewRoleRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.userRoleRepo, err = NewUserRoleRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.rolePermissionRepo, err = NewRolePermissionRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.permissionRepo, err = NewPermissionRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.authUserRepo, err = NewAuthUserRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.sessionRepo, err = NewSessionRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.loginEventRepo, err = NewLoginEventRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.loginAttemptRepo, err = NewLoginAttemptRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.roleApiRepo, err = NewRoleApiRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.userWarehouseRepo, err = NewUserWarehouseRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	result.userOwnerRepo, err = NewUserOwnerRepository(dbClient.Db)
	if err != nil {
		hlogger.Log.Error(err)
	}
	return result
}

func (a AllRepositoryImpl) GetRoleRepository() *RoleRepository {
	return a.roleRepo
}
func (a AllRepositoryImpl) GetUserRoleRepository() *UserRoleRepository {
	return a.userRoleRepo
}

func (a AllRepositoryImpl) GetRolePermissionRepository() *RolePermissionRepository {
	return a.rolePermissionRepo
}

func (a AllRepositoryImpl) GetPermissionRepository() *PermissionRepository {
	return a.permissionRepo
}

func (a AllRepositoryImpl) GetAuthUserRepository() *AuthUserRepository {
	return a.authUserRepo
}
func (a AllRepositoryImpl) GetSessionRepository() *SessionRepository {
	return a.sessionRepo
}
func (a AllRepositoryImpl) GetLoginEventRepository() *LoginEventRepository {
	return a.loginEventRepo
}
func (a AllRepositoryImpl) GetLoginAttemptRepository() *LoginAttemptRepository {
	return a.loginAttemptRepo
}
func (a AllRepositoryImpl) GetUserWarehouseRepository() *UserWarehouseRepository {
	return a.userWarehouseRepo
}

func (a AllRepositoryImpl) GetUserOwnerRepository() *UserOwnerRepository {
	return a.userOwnerRepo
}

func (a AllRepositoryImpl) RoleApiRepository() *RoleApiRepository {
	return a.roleApiRepo
}
