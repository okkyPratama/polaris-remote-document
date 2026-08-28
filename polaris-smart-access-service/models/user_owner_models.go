package models

import "time"

type UserOwnerReq struct {
	Id        string `json:"id"`
	UserId    string `json:"userId"`
	OwnerId   string `json:"ownerId"`
	OwnerCode string `json:"ownerCode"`
	OwnerName string `json:"ownerName"`
	CreatedBy string `json:"createdBy"`
	DeletedBy string `json:"deletedBy"`
}

type UserOwnerResp struct {
	Id        string    `json:"id"`
	UserId    string    `json:"userId"`
	OwnerId   string    `json:"ownerId"`
	OwnerCode string    `json:"ownerCode"`
	OwnerName string    `json:"ownerName"`
	CreatedBy string    `json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedBy string    `json:"updatedBy"`
	UpdatedAt time.Time `json:"updatedAt"`
}
