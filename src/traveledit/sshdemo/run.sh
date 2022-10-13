#!/bin/bash

# GO111MODULE=off \
# GOPATH=$(pwd)/../.. \
# go get "golang.org/x/crypto/ssh"

# GO111MODULE=off \
# GOPATH=$(pwd)/../.. \
# go get -v "github.com/bramvdbogaerde/go-scp"

# GO111MODULE=off \
# GOPATH=$(pwd)/../.. \
# go get "golang.org/x/term"


# scp "github.com/bramvdbogaerde/go-scp"

rm -f sshdemo
GO111MODULE=off \
GOPATH=$(pwd)/../.. \
go build -o sshdemo || exit 1

./sshdemo