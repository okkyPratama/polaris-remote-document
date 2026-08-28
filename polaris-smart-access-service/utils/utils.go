package utils

import (
	"encoding/json"
	"errors"
	"time"
)

func SerializeStruct[T any](data T) []byte {
	jsonData, _ := json.Marshal(data)
	return jsonData
}
func DeserializeStruct(data interface{}, target interface{}) error {
	bytes, ok := data.([]byte)
	if !ok {
		return errors.New("DeserializeStruct: data is not []byte")
	}
	return json.Unmarshal(bytes, target)

}

func LongTimestampToTime(timestamp int64) time.Time {
	return time.Unix(timestamp/1000, 0)
}
