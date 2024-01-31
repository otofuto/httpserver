package main

import (
	"encoding/json"
	"fmt"
	"httpserver/pkg/account"
	"httpserver/pkg/util"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"text/template"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/acme/autocert"
)

var clients = make(map[*websocket.Conn]string)
var broadcast = make(chan SocketMessage)
var upgrader = websocket.Upgrader{}

type SocketMessage struct {
	Message string `json:"message"`
	RoomId  string `json:"room_id"`
}

type TempContext struct {
	Page       int
	PageLength int
	ReturnPath string
	UserAgent  string
	Json       string
	Login      account.Account
	Accounts   []account.Account
	Msg        string
	Hash       string
}

func main() {
	godotenv.Load()
	port := os.Getenv("PORT")
	if len(os.Args) > 1 {
		port = os.Args[1]
		if port == "ssl" {
			port = "443"
		}
	}
	if port == "" {
		port = "5000"
	}

	mux := http.NewServeMux()
	mux.Handle("/st/", http.StripPrefix("/st/", http.FileServer(http.Dir("./static"))))
	mux.HandleFunc("/", IndexHandle)
	mux.HandleFunc("/r/", ApiHandle)
	mux.HandleFunc("/nohup.out", OutHandle)
	mux.HandleFunc("/favicon.ico", util.FaviconHandle)
	mux.HandleFunc("/hook/", util.WebHookHandle)
	mux.HandleFunc("/upload/", UploadHandle)
	mux.HandleFunc("/ws/", SocketHandle)
	go handleMessages()
	log.Println("Listening on port: " + port)
	if port == "443" {
		log.Println("SSL")
		go func() {
			mux2 := http.NewServeMux()
			mux2.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "https://"+os.Getenv("DOMAIN")+r.URL.Path, 301)
			})
			if err := http.ListenAndServe(":80", mux2); err != nil {
				panic(err)
			}
		}()
		if err := http.Serve(autocert.NewListener(os.Getenv("DOMAIN")), mux); err != nil {
			panic(err)
		}
	} else if err := http.ListenAndServe(":"+port, mux); err != nil {
		panic(err)
	}
}

func IndexHandle(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Content-Type", "text/html; charset=utf-8")

	if r.Method == http.MethodGet {
		context := TempContext{
			UserAgent: r.UserAgent(),
			Login:     CheckLogin(r),
		}
		mode := ""
		hash := ""
		if len(r.URL.Path) > 1 {
			mode = r.URL.Path[1:]
			if strings.Index(mode, "/") > 0 {
				hash = mode[strings.LastIndex(mode, "/")+1:]
				mode = mode[:strings.LastIndex(mode, "/")]
			}
		}
		context.Hash = hash
		filename := ""
		if mode == "login" {
			filename = "login"
		} else if context.Login.Id == 0 {
			http.Redirect(w, r, "/login", 303)
			return
		} else if mode == "logout" {
			cookie, err := r.Cookie("test_token")
			if err != nil {
				http.Redirect(w, r, "/login", 303)
				return
			}
			err = account.Logout(cookie.Value)
			cookie.MaxAge = 0
			http.SetCookie(w, cookie)
			http.SetCookie(w, &http.Cookie{
				Name:     "test_redpath",
				Value:    "/",
				Path:     "/",
				HttpOnly: false,
				MaxAge:   0,
			})
			http.Redirect(w, r, "/", 303)
			return
		} else if mode == "" {
			filename = "index"
		} else {
			util.Page404(w)
			return
		}
		if err := template.Must(template.ParseFiles("template/"+filename+".html")).Execute(w, context); err != nil {
			log.Println(err)
			http.Error(w, "500", 500)
			return
		}
	} else {
		http.Error(w, "method not allowed", 405)
	}
}

func UploadHandle(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		r.ParseMultipartForm(32 << 20)
		savedFiles := make([]string, 0)
		fileHeaders := r.MultipartForm.File["file"]
		for _, fileHeader := range fileHeaders {
			file, err := fileHeader.Open()
			if err != nil {
				log.Println("ファイル見つからない")
				log.Println(err)
				http.Error(w, "upload failed", 500)
				return
			}

			save, err := os.Create("./static/uploaded/" + fileHeader.Filename)
			if err != nil {
				fmt.Println("ファイル確保失敗")
				log.Println(err)
				http.Error(w, "upload failed", 500)
				return
			}

			defer save.Close()
			defer file.Close()
			_, err = io.Copy(save, file)
			if err != nil {
				log.Println("ファイル保存失敗")
				log.Println(err)
				http.Error(w, "upload failed", 500)
				return
			}
			savedFiles = append(savedFiles, fileHeader.Filename)
		}
		bytes, _ := json.Marshal(savedFiles)
		fmt.Fprintf(w, string(bytes))
	} else if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		files, err := ioutil.ReadDir("./static/uploaded")
		if err != nil {
			log.Println(err)
			http.Error(w, "ファイル一覧の取得に失敗しました。", 500)
			return
		}
		paths := make([]string, 0)
		for _, file := range files {
			if !file.IsDir() && file.Name() != ".gitkeep" {
				paths = append(paths, file.Name())
			}
		}
		bytes, _ := json.Marshal(paths)
		fmt.Fprintf(w, string(bytes))
	} else {
		w.Header().Set("Content-Type", "text/html")
		http.Error(w, "このURLではPOSTメソッド、GETメソッドのみに対応しています。", 405)
	}
}

func SocketHandle(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r2 *http.Request) bool { return true }
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}

	defer ws.Close()

	clients[ws] = r.URL.Path[len("/ws/"):]

	for {
		var msg SocketMessage
		err := ws.ReadJSON(&msg)
		if err != nil {
			//log.Printf("error: %v", err)
			delete(clients, ws)
			break
		}
		msg.RoomId = r.URL.Path[len("/ws/"):]
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		for client, id := range clients {
			if id == msg.RoomId {
				err := client.WriteJSON(msg)
				if err != nil {
					log.Printf("error: %v", err)
					client.Close()
					delete(clients, client)
				}
			}
		}
	}
}

func CheckLogin(r *http.Request) account.Account {
	var a account.Account
	if os.Getenv("LOGIN") == "0" {
		a.Id = 1
		return a
	}
	cookie, err := r.Cookie("test_token")
	if err != nil {
		return a
	}
	a = account.CheckToken(cookie.Value)
	return a
}

func ApiHandle(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Content-Type", "application/json; charset=utf-8")

	mode := ""
	hash := ""
	if len(r.URL.Path) > len("/r/") {
		mode = r.URL.Path[len("/r/"):]
		if strings.Index(mode, "/") > 0 {
			hash = mode[strings.LastIndex(mode, "/")+1:]
			mode = mode[:strings.LastIndex(mode, "/")]
		}
	}
	log.Println(hash)

	if r.Method == http.MethodGet {
		fmt.Fprintf(w, mode)
	} else if r.Method == http.MethodPost {
		r.ParseMultipartForm(32 << 20)
		fmt.Fprintf(w, mode)
	} else if r.Method == http.MethodPut {
		r.ParseMultipartForm(32 << 20)
		fmt.Fprintf(w, mode)
	} else if r.Method == http.MethodDelete {
		r.ParseMultipartForm(32 << 20)
		fmt.Fprintf(w, mode)
	} else {
		http.Error(w, "Method not allowed.", 405)
	}
}

func ApiResponse(w http.ResponseWriter, statuscode int, msg string) {
	bytes, err := json.Marshal(struct {
		Result  bool   `json:"result"`
		Message string `json:"message"`
	}{
		Result:  statuscode == 200,
		Message: msg,
	})
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), statuscode)
		return
	}
	fmt.Fprintln(w, string(bytes))
}

func OutHandle(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Content-Type", "text/plain; charset=utf8")
	b, err := ioutil.ReadFile("nohup.out")
	if err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf8")
		util.Page404(w)
		return
	}
	fmt.Fprintf(w, string(b))
}
