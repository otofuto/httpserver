# Android Termux setup

```
$ apt update
$ apt upgrade
$ termux-setup-storage
$ apt install -y golang git
$ cd storage/shared
$ git clone https://github.com/otofuto/httpserver
$ cd httpserver
$ go get github.com/gorilla/websocket
```

# Check local IP address

```
$ ip -4 a
```

# Run

```
$ go run main.go
```