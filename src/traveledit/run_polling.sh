#!/bin/bash

GO111MODULE=off \
GOPATH=$(pwd)/../.. \
go build -o traveledit || exit 1

GO111MODULE=off \
GOPATH=$(pwd)/../.. \
SCREENSHARENOAUTH=1 \
POLLERPROXYSERVER=https://something
POLLERNAME=mypoller1
NOBASICAUTH=1 \
PUBLICPATH="../../../public" \
./traveledit \
-location=/ \



