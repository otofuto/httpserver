package account

import (
	"database/sql"
	"encoding/json"
	"errors"
	"httpserver/pkg/database"
	"httpserver/pkg/util"
	"log"
	"strconv"
)

type Account struct {
	Id          int      `json:"id"`
	DisplayName string   `json:"display_name"`
	Auth        string   `json:"auth"`
	AuthName    []string `json:"auth_name"`
	Memo        string   `json:"memo"`
	Pass        string
	CreatedAt   string `json:"created_at"`
	Deleted     int
}

func Make(dn, pass, auth, memo string, db *sql.DB) (Account, error) {
	q := "insert into account (display_name, pass, auth, memo) values (?, ?, ?, ?)"
	ins, err := db.Prepare(q)
	if err != nil {
		log.Println("account.go Make() db.Prepare()")
		return Account{}, err
	}
	result, err := ins.Exec(dn, util.PassHash(pass), auth, memo)
	if err != nil {
		log.Println("account.go Make() ins.Exec()")
		return Account{}, err
	}
	newid, err := result.LastInsertId()
	if err != nil {
		log.Println("account.go Make() result.LastInsertId()")
		return Account{}, err
	}
	ac, err := GetById(int(newid), db)
	if err != nil {
		log.Println("account.go Make() GetById()")
		return ac, err
	}
	return ac, nil
}

func Edit(targetid int, dn, pass, auth string, memo string, db *sql.DB) (Account, error) {
	pass_set := ""
	if pass != "" {
		pass_set = ", pass = '" + util.PassHash(pass) + "'"
	}
	q := "update account set display_name = '" + database.Escape(dn) + "', auth = '" + database.Escape(auth) + "', memo = '" + database.Escape(memo) + "'" + pass_set + " where id = " + strconv.Itoa(targetid)
	del, err := db.Query(q)
	if err != nil {
		log.Println("account.go Edit() db.Query()")
		return Account{}, err
	}
	del.Close()
	return Account{
		Id:          targetid,
		DisplayName: dn,
		Auth:        auth,
		Memo:        memo,
	}, nil
}

func Delete(id int, db *sql.DB) error {
	q := "update account set deleted = 1 where id = " + strconv.Itoa(id)
	del, err := db.Query(q)
	if err != nil {
		log.Println("account.go Dlete() db.Query()")
		return err
	}
	del.Close()
	return nil
}

func CheckToken(tkn string) Account {
	db := database.Connect()
	defer db.Close()

	ret := Account{}
	q := "select id, display_name, auth, account.created_at from login_token left outer join account on account_id = id where deleted = 0 and token = '" + database.Escape(tkn) + "'"
	rows, err := db.Query(q)
	if err != nil {
		log.Println("account.CheckToken() db.Query()")
		log.Println(err)
		return ret
	}
	defer rows.Close()
	if rows.Next() {
		err = rows.Scan(&ret.Id, &ret.DisplayName, &ret.Auth, &ret.CreatedAt)
		if err != nil {
			log.Println("account.CheckToken() rows.Scan()")
			log.Println(err)
			return ret
		}
	}
	json.Unmarshal([]byte(ret.Auth), &ret.AuthName)
	return ret
}

func Login(id, pass string, db *sql.DB) (Account, error) {
	ac := Account{}
	q := "select id, display_name, auth, pass, deleted from account where id = '" + database.Escape(id) + "'"
	rows, err := db.Query(q)
	if err != nil {
		log.Println("account.go Login() db.Query()")
		return ac, err
	}
	defer rows.Close()
	if !rows.Next() {
		return ac, errors.New(".アカウントが存在しません")
	}
	err = rows.Scan(&ac.Id, &ac.DisplayName, &ac.Auth, &ac.Pass, &ac.Deleted)
	if err != nil {
		log.Println("account.go Login() rows.Scan()")
		return ac, err
	}
	if util.CheckPass(ac.Pass, pass) {
		if ac.Deleted == 1 {
			return Account{}, errors.New(".このアカウントは削除されています")
		}
		json.Unmarshal([]byte(ac.Auth), &ac.AuthName)
		return ac, nil
	}
	return Account{}, errors.New(".パスワードが間違っています")
}

func Logout(tkn string) error {
	db := database.Connect()
	defer db.Close()
	q := "delete from login_token where token = '" + database.Escape(tkn) + "'"
	d, err := db.Query(q)
	if err != nil {
		log.Println("account.Logout() db.Query()")
		return err
	}
	defer d.Close()
	return nil
}

func (a *Account) Login(db *sql.DB, tkn string) error {
	q := "insert into login_token (account_id, token) values (?, ?)"
	ins, err := db.Prepare(q)
	if err != nil {
		log.Println("account.Login() db.Prepare()")
		return err
	}
	defer ins.Close()
	_, err = ins.Exec(a.Id, tkn)
	if err != nil {
		log.Println("account.Login() ins.Exec()")
		return err
	}

	r, err := db.Query("delete from `login_token` where `created_at` <= subtime(now(), '3:00:00')")
	if err != nil {
		log.Println("account.Login() db.Query()")
		log.Println(err)
		return nil
	}
	r.Close()
	return nil
}

func List(memo bool, db *sql.DB) ([]Account, error) {
	ret := make([]Account, 0)
	q := "select account.id, display_name, auth, memo, created_at from account where deleted = 0 order by account.id"
	rows, err := db.Query(q)
	if err != nil {
		log.Println("account.go List() db.Query()")
		return ret, err
	}
	defer rows.Close()
	for rows.Next() {
		var a Account
		err = rows.Scan(&a.Id, &a.DisplayName, &a.Auth, &a.Memo, &a.CreatedAt)
		if err != nil {
			log.Println("account.go List() rows.Scan()")
			return ret, err
		}
		json.Unmarshal([]byte(a.Auth), &a.AuthName)
		if !memo {
			a.Memo = ""
		}
		ret = append(ret, a)
	}
	return ret, nil
}

func GetById(id int, db *sql.DB) (Account, error) {
	q := "select account.id, display_name, auth, memo, created_at from account where account.id = " + strconv.Itoa(id)
	rows, err := db.Query(q)
	if err != nil {
		log.Println("account.go GetById() db.Query()")
		return Account{}, err
	}
	defer rows.Close()
	if rows.Next() {
		var ac Account
		err = rows.Scan(&ac.Id, &ac.DisplayName, &ac.Auth, &ac.Memo, &ac.CreatedAt)
		if err != nil {
			log.Println("account.go GetById() rows.Scan()")
			return Account{}, err
		}
		json.Unmarshal([]byte(ac.Auth), &ac.AuthName)
		return ac, nil
	}
	return Account{}, nil
}
