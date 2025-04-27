package infrastructure

import (
	"github.com/yuorei/attendance/src/driver/db"
)

type Infrastructure struct {
	db *db.DB
}

func NewInfrastructure() *Infrastructure {
	return &Infrastructure{
		db: db.NewDBClient(),
		// redis:     r.ConnectRedis(),
		// yuovision: client.NewClientYuoVision(),
		// bigquery:  googlecloud.NewBigQuery(),
	}
}
