GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip -r bootstrap.zip bootstrap
cp bootstrap.zip ../terraform/environment/dev/
cp bootstrap.zip ../terraform/environment/prod/

rm bootstrap.zip bootstrap
