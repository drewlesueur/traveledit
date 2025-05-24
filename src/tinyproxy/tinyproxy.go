

// make a go program that runs 2 http severs
// one that is a "config" server on 50123 (http)
// 
// the other that is like the "main" https server
// 
// the certs for the main server
// are configured

package main

import (
    "crypto/tls"
    "fmt"
    "log"
    "net/http"
    "strings"
    "os"
    "path/filepath"
    "sync"
    "crypto/subtle"
    "net/url"
    _ "embed"
    "encoding/base64"
)

type CertificateReloader struct {
	mu    sync.RWMutex
	certs map[string]*tls.Certificate
}

func formatWildcardDomain(domain string) string {
    parts := strings.Split(domain, ".")
    if len(parts) < 2 {
        return ""
    }
    return strings.Join(parts[len(parts)-2:], ".")
}


func (r *CertificateReloader) getWildcardCertificate(clientHello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	// Ensure the "certs" directory exists.
	wildcardDomain := formatWildcardDomain(clientHello.ServerName)
	if wildcardDomain == "" {
		return nil, fmt.Errorf("invalid server name: %s", clientHello.ServerName)
	}

	r.mu.RLock()
	cert, ok := r.certs[wildcardDomain]
	r.mu.RUnlock()
	if ok {
		return cert, nil
	}

	certFile := filepath.Join("/etc/letsencrypt/live/", wildcardDomain, "fullchain.pem")
	keyFile := filepath.Join("/etc/letsencrypt/live/", wildcardDomain, "privkey.pem")

	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("no certificate found for host: %s or wildcard domain: %s", clientHello.ServerName, wildcardDomain)
	}

	err := r.LoadCertificate(wildcardDomain, certFile, keyFile)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.certs[wildcardDomain], nil
}

func (r *CertificateReloader) GetCertificate(clientHello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	r.mu.RLock()
	cert, ok := r.certs[clientHello.ServerName]
	if !ok {
		wildcardDomain := formatWildcardDomain(clientHello.ServerName)
		if wildcardDomain != "" {
			cert, ok = r.certs[wildcardDomain]
		}
	}
	r.mu.RUnlock()
	if ok {
		return cert, nil
	}
    fmt.Println("the server name: ", clientHello.ServerName)
	certFile := filepath.Join("/etc/letsencrypt/live/", clientHello.ServerName, "fullchain.pem")
	keyFile := filepath.Join("/etc/letsencrypt/live/", clientHello.ServerName, "privkey.pem")

	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return r.getWildcardCertificate(clientHello)
	}

	err := r.LoadCertificate(clientHello.ServerName, certFile, keyFile)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.certs[clientHello.ServerName], nil
}


func BasicAuth(handler http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := os.Getenv("BASICUSER")
		pass := os.Getenv("BASICPASS")
		if user == "" || pass == "" {
			log.Fatal("BASICUSER or BASICPASS environment variables not set")
		}

		// if r.URL.Path == "/" {
		if !strings.Contains(r.URL.Path, "tpconfig") {
			handler.ServeHTTP(w, r)
			return
		}

		// log.Printf("url hit: %s by %s (%s)", r.URL.Path, r.RemoteAddr, r.Header.Get("X-Forwarded-For"))
		//rUser, rPass, ok := r.BasicAuth()
		rUser, rPass, ok := PretendBasicAuth(r)
		if !ok || subtle.ConstantTimeCompare([]byte(rUser), []byte(user)) != 1 || subtle.ConstantTimeCompare([]byte(rPass), []byte(pass)) != 1 {
			http.Redirect(w, r, "tplogin", 302)
			return
			// below here is basic auth stuff
			log.Printf("unauthorized: %s", r.URL.Path)
			w.Header().Set("WWW-Authenticate", `Basic realm="Hi. Please log in."`)
			w.WriteHeader(401)
			w.Write([]byte("Unauthorized.\n"))
			return
		}
		handler.ServeHTTP(w, r)
	}
}


func PretendBasicAuth(r *http.Request) (string, string, bool) {
	cookie, err := r.Cookie("pretendba")
	if err != nil {
		return "", "", false
	}
	cookieDecoded, err := url.QueryUnescape(cookie.Value)
	if err != nil {
		return "", "", false
	}
	cookieBytes, err := base64.StdEncoding.DecodeString(cookieDecoded)
	if err != nil {
		return "", "", false
	}
	parts := strings.Split(string(cookieBytes), ":")
	if len(parts) != 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func (r *CertificateReloader) LoadCertificate(hostname string, certFile, keyFile string) error {
	fmt.Println("loading cert...")
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return fmt.Errorf("could not load certificate for host %s: %v", hostname, err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.certs == nil {
		r.certs = make(map[string]*tls.Certificate)
	}
	r.certs[hostname] = &cert
	return nil
}

func (r *CertificateReloader) ClearCache() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.certs = make(map[string]*tls.Certificate)
}

//go:embed config.html
var configHTML []byte

func handleConfig(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case "GET":
        w.Header().Set("Content-Type", "text/html")
        w.Write(configHTML)
    case "POST":
        // handle POST request logic here
        // http.Redirect(w, r, "/config", http.StatusSeeOther)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

// tcp tunnel over http
var httpsAddr = ":443"
func main() {
	reloader := &CertificateReloader{}
    mux := http.NewServeMux()
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { if strings.Contains(r.URL.Path, "tpconfig") {
            handleConfig(w, r)
            return
        }
        if strings.Contains(r.URL.Path, "tplogin") {
            handleConfig(w, r)
            return
        }
        fmt.Fprintln(w, "Hello, world!")
    })
    server := &http.Server{
    	Addr: httpsAddr, // :443
    	TLSConfig: &tls.Config{
    		GetCertificate: reloader.GetCertificate,
    	},
    	Handler: BasicAuth(mux),
    }
    fmt.Println("listening...")
    if err := server.ListenAndServeTLS("", ""); err != nil {
        log.Fatal(err)
    }
}

